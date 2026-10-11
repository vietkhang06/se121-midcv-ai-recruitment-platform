package com.platform.recruitment;

import com.platform.recruitment.event.Events;
import com.platform.recruitment.worker.JobQueue;
import org.junit.jupiter.api.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Real database-backed integration test for processing_jobs schema and JobQueue persistence.
 * Verifies that migration V18 allows GITHUB_ANALYSIS and preserves one_active_job deduplication.
 */
public class GitHubProcessingSchemaDatabaseIntegrationTest {

    private static JdbcTemplate jdbcTemplate;
    private static DataSourceTransactionManager txManager;
    private static boolean databaseAvailable = false;

    private JobQueue jobQueue;
    private Events events;
    private UUID testOwnerId;
    private final List<UUID> createdJobIds = new ArrayList<>();

    @BeforeAll
    static void initDataSource() {
        try {
            DriverManagerDataSource ds = new DriverManagerDataSource();
            ds.setDriverClassName("org.postgresql.Driver");
            ds.setUrl("jdbc:postgresql://localhost:5432/airecruit_db");
            ds.setUsername("postgres");
            ds.setPassword("postgres_secure_pass");

            jdbcTemplate = new JdbcTemplate(ds);
            jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            txManager = new DataSourceTransactionManager(ds);
            databaseAvailable = true;
        } catch (Exception ex) {
            databaseAvailable = false;
        }
    }

    @BeforeEach
    void setUp() {
        Assumptions.assumeTrue(databaseAvailable, "PostgreSQL database must be available on localhost:5432");

        events = new Events(jdbcTemplate, new com.fasterxml.jackson.databind.ObjectMapper());
        jobQueue = new JobQueue(jdbcTemplate, events, txManager);

        // Fetch an existing user from the database to satisfy the foreign key constraint
        List<UUID> userIds = jdbcTemplate.query(
                "SELECT id FROM users LIMIT 1",
                (rs, rowNum) -> rs.getObject("id", UUID.class)
        );
        assertFalse(userIds.isEmpty(), "Database must contain at least one user for test ownership");
        testOwnerId = userIds.get(0);
    }

    @AfterEach
    void tearDown() {
        if (databaseAvailable && !createdJobIds.isEmpty()) {
            for (UUID id : createdJobIds) {
                jdbcTemplate.update("DELETE FROM job_events WHERE job_id = ?", id);
                jdbcTemplate.update("DELETE FROM processing_jobs WHERE id = ?", id);
            }
            createdJobIds.clear();
        }
    }

    @Test
    @DisplayName("DB Schema: Enqueuing GITHUB_ANALYSIS succeeds against migrated PostgreSQL schema")
    void testEnqueueGithubAnalysis_SucceedsAgainstPostgresSchema() {
        UUID candidateProfileId = UUID.randomUUID();

        UUID jobId = jobQueue.enqueue(testOwnerId, "GITHUB_ANALYSIS", candidateProfileId);
        assertNotNull(jobId, "JobQueue.enqueue must return a valid UUID");
        createdJobIds.add(jobId);

        // Query the real database row to confirm persistence
        Map<String, Object> row = jdbcTemplate.queryForMap(
                "SELECT id, owner_id, kind, entity_id, state, step, progress FROM processing_jobs WHERE id = ?",
                jobId
        );

        assertEquals(jobId, row.get("id"));
        assertEquals(testOwnerId, row.get("owner_id"));
        assertEquals("GITHUB_ANALYSIS", row.get("kind"));
        assertEquals(candidateProfileId, row.get("entity_id"));
        assertEquals("QUEUED", row.get("state"));
        assertEquals(0, ((Number) row.get("progress")).intValue());
    }

    @Test
    @DisplayName("DB Schema: Claiming GITHUB_ANALYSIS job transitions state to RUNNING in PostgreSQL")
    void testClaimGithubAnalysisJob_TransitionsStateToRunning() {
        UUID candidateProfileId = UUID.randomUUID();
        UUID jobId = jobQueue.enqueue(testOwnerId, "GITHUB_ANALYSIS", candidateProfileId);
        createdJobIds.add(jobId);

        UUID workerId = UUID.randomUUID();
        Optional<Map<String, Object>> claimed = jobQueue.claim(workerId);

        assertTrue(claimed.isPresent(), "JobQueue.claim must claim the available job");
        Map<String, Object> job = claimed.get();

        // If another job was in queue, let's verify our specific job state
        Map<String, Object> dbRow = jdbcTemplate.queryForMap(
                "SELECT state, locked_by FROM processing_jobs WHERE id = ?",
                jobId
        );
        assertEquals("RUNNING", dbRow.get("state"));
        assertNotNull(dbRow.get("locked_by"));
    }

    @Test
    @DisplayName("DB Deduplication: Repeated enqueue for same candidate profile returns existing active job without duplication")
    void testOneActiveJobIndex_PreventsDuplicateActiveJobs() {
        UUID candidateProfileId = UUID.randomUUID();

        // First enqueue
        UUID firstJobId = jobQueue.enqueue(testOwnerId, "GITHUB_ANALYSIS", candidateProfileId);
        createdJobIds.add(firstJobId);

        // Second enqueue while first is still QUEUED
        UUID secondJobId = jobQueue.enqueue(testOwnerId, "GITHUB_ANALYSIS", candidateProfileId);

        // Deduplication contract: Must return the existing active job ID
        assertEquals(firstJobId, secondJobId, "Subsequent enqueue for same candidate must return identical active job ID");

        // Verify exactly ONE record exists in processing_jobs for this entity
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM processing_jobs WHERE kind = 'GITHUB_ANALYSIS' AND entity_id = ? AND state IN ('QUEUED', 'RUNNING')",
                Integer.class,
                candidateProfileId
        );
        assertEquals(1, count, "Only exactly one active job must exist in PostgreSQL");
    }

    @Test
    @DisplayName("DB Schema: Existing job kinds (EXTRACT, MATCH) continue to be accepted")
    void testExistingJobKinds_ContinueToWork() {
        UUID extractEntity = UUID.randomUUID();
        UUID matchEntity = UUID.randomUUID();

        UUID extractJobId = jobQueue.enqueue(testOwnerId, "EXTRACT", extractEntity);
        UUID matchJobId = jobQueue.enqueue(testOwnerId, "MATCH", matchEntity);

        assertNotNull(extractJobId);
        assertNotNull(matchJobId);
        createdJobIds.add(extractJobId);
        createdJobIds.add(matchJobId);

        String extractKind = jdbcTemplate.queryForObject(
                "SELECT kind FROM processing_jobs WHERE id = ?",
                String.class,
                extractJobId
        );
        String matchKind = jdbcTemplate.queryForObject(
                "SELECT kind FROM processing_jobs WHERE id = ?",
                String.class,
                matchJobId
        );

        assertEquals("EXTRACT", extractKind);
        assertEquals("MATCH", matchKind);
    }

    @Test
    @DisplayName("DB Lifecycle: Completed job (SUCCEEDED) permits later manual sync with new job ID")
    void testTerminalState_AllowsSubsequentSync() {
        UUID candidateProfileId = UUID.randomUUID();
        UUID firstJobId = jobQueue.enqueue(testOwnerId, "GITHUB_ANALYSIS", candidateProfileId);
        createdJobIds.add(firstJobId);

        UUID workerId = UUID.randomUUID();
        // Claim the job
        jobQueue.claim(workerId);

        // Complete the job (transitions to SUCCEEDED)
        jobQueue.complete(firstJobId, workerId);

        // Verify first job is SUCCEEDED
        String state = jdbcTemplate.queryForObject(
                "SELECT state FROM processing_jobs WHERE id = ?",
                String.class,
                firstJobId
        );
        assertEquals("SUCCEEDED", state);

        // Now perform a later manual sync
        UUID secondJobId = jobQueue.enqueue(testOwnerId, "GITHUB_ANALYSIS", candidateProfileId);
        createdJobIds.add(secondJobId);

        // Must produce a NEW job ID because the previous one reached terminal state
        assertNotEquals(firstJobId, secondJobId, "Subsequent sync after terminal state must create a new job ID");

        // Verify there are now two jobs for this candidate profile, one SUCCEEDED and one QUEUED
        Integer totalCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM processing_jobs WHERE kind = 'GITHUB_ANALYSIS' AND entity_id = ?",
                Integer.class,
                candidateProfileId
        );
        assertEquals(2, totalCount);
    }
}
