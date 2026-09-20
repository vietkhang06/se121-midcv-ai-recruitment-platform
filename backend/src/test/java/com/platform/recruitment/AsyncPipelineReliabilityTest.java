package com.platform.recruitment;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.platform.recruitment.ai.AiClient;
import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.ErrorCode;
import com.platform.recruitment.cv.TextReader;
import com.platform.recruitment.document.Documents;
import com.platform.recruitment.event.Events;
import com.platform.recruitment.github.GithubClient;
import com.platform.recruitment.matching.Scoring;
import com.platform.recruitment.worker.JobQueue;
import com.platform.recruitment.worker.PipelineWorker;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.SimpleTransactionStatus;
import org.springframework.transaction.support.TransactionCallback;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AsyncPipelineReliabilityTest {

    @Mock private JdbcTemplate jdbcTemplate;
    @Mock private Events events;
    @Mock private PlatformTransactionManager transactionManager;
    @Mock private Documents docs;
    @Mock private TextReader reader;
    @Mock private AiClient ai;
    @Mock private GithubClient github;
    @Mock private Scoring scoring;

    private JobQueue queue;
    private PipelineWorker worker;
    private ObjectMapper mapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        lenient().when(transactionManager.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
        lenient().doNothing().when(transactionManager).commit(any());
        lenient().doNothing().when(transactionManager).rollback(any());

        queue = new JobQueue(jdbcTemplate, events, transactionManager);
        worker = new PipelineWorker(
                jdbcTemplate,
                mapper,
                queue,
                events,
                docs,
                reader,
                ai,
                github,
                scoring,
                transactionManager
        );
    }

    @Test
    @DisplayName("1. Atomic Claim: Uses FOR UPDATE SKIP LOCKED and sets lease/attempts")
    void testAtomicClaimSingleWorker() {
        UUID workerId = UUID.randomUUID();
        UUID jobId = UUID.randomUUID();

        // 1. Stale query returns empty
        when(jdbcTemplate.queryForList(contains("lease_until<now() RETURNING"))).thenReturn(List.of());

        // 2. Candidates query with FOR UPDATE SKIP LOCKED
        Map<String, Object> candidateJob = new HashMap<>();
        candidateJob.put("id", jobId);
        candidateJob.put("state", "QUEUED");
        when(jdbcTemplate.queryForList(contains("FOR UPDATE SKIP LOCKED"))).thenReturn(List.of(candidateJob));

        // 3. Running job query returns the claimed job
        Map<String, Object> runningJob = new HashMap<>();
        runningJob.put("id", jobId);
        runningJob.put("state", "RUNNING");
        runningJob.put("locked_by", workerId);
        runningJob.put("attempts", 1);
        when(jdbcTemplate.queryForList(eq("SELECT * FROM processing_jobs WHERE id=?"), eq(jobId))).thenReturn(List.of(runningJob));

        Optional<Map<String, Object>> claimed = queue.claim(workerId);

        assertTrue(claimed.isPresent());
        assertEquals("RUNNING", claimed.get().get("state"));
        assertEquals(workerId, claimed.get().get("locked_by"));

        // Verify update set lease_until, attempts=attempts+1 and locked_by
        verify(jdbcTemplate).update(
                contains("UPDATE processing_jobs SET state='RUNNING',locked_by=?,lease_until=now()+interval '15 minutes',attempts=attempts+1"),
                eq(workerId),
                eq(jobId)
        );
    }

    @Test
    @DisplayName("2. Manual Retry: Failed job can be retried by owner, enqueuing new attempt")
    void testFailedJobRetryEnqueuesNewAttempt() {
        UUID jobId = UUID.randomUUID();
        UUID ownerId = UUID.randomUUID();
        UUID entityId = UUID.randomUUID();
        JobQueue.Actor actor = new JobQueue.Actor(ownerId, "CANDIDATE");

        Map<String, Object> failedRow = new HashMap<>();
        failedRow.put("id", jobId);
        failedRow.put("owner_id", ownerId);
        failedRow.put("kind", "EXTRACT");
        failedRow.put("entity_id", entityId);
        failedRow.put("state", "FAILED");

        when(jdbcTemplate.queryForList(contains("SELECT p.* FROM processing_jobs p WHERE p.id=?"), eq(jobId), eq(ownerId), eq(ownerId)))
                .thenReturn(List.of(failedRow));

        UUID nextJobId = UUID.randomUUID();
        when(jdbcTemplate.query(
                contains("INSERT INTO processing_jobs"),
                any(RowMapper.class),
                any(), eq(ownerId), eq("EXTRACT"), eq(entityId), any()
        )).thenReturn(List.of(nextJobId));

        Map<String, Object> retryResult = queue.retry(jobId, actor);
        assertEquals(nextJobId, retryResult.get("jobId"));
        assertEquals("QUEUED", retryResult.get("state"));
    }

    @Test
    @DisplayName("3. Stale Lease Expiry: Transitions job & document_versions to FAILED")
    void testStaleJobLeaseExpiryFailsVersion() {
        UUID workerId = UUID.randomUUID();
        UUID jobId = UUID.randomUUID();
        UUID ownerId = UUID.randomUUID();
        UUID versionId = UUID.randomUUID();

        Map<String, Object> expiredJob = new HashMap<>();
        expiredJob.put("id", jobId);
        expiredJob.put("owner_id", ownerId);
        expiredJob.put("kind", "EXTRACT");
        expiredJob.put("entity_id", versionId);
        expiredJob.put("request_id", "req-exhausted");

        when(jdbcTemplate.queryForList(contains("lease_until<now() RETURNING")))
                .thenReturn(List.of(expiredJob));
        when(jdbcTemplate.queryForList(contains("FOR UPDATE SKIP LOCKED"))).thenReturn(List.of());

        queue.claim(workerId);

        // Verify document_versions is marked FAILED so it does not stay stuck in PROCESSING
        verify(jdbcTemplate).update(
                contains("UPDATE document_versions SET state='FAILED',error_code='WORKER_LEASE_EXPIRED'"),
                eq(versionId)
        );
        verify(events).emit(
                eq(jobId),
                eq(ownerId),
                eq("ERROR"),
                eq("LEASE_EXPIRED"),
                eq("WORKER_LEASE_EXPIRED"),
                contains("không nhận được kết quả trong thời hạn"),
                isNull()
        );
    }

    @Test
    @DisplayName("4. Stale Worker Fencing: Late worker cannot commit after lease is lost")
    void testStaleWorkerFencing() {
        UUID workerId = UUID.randomUUID();
        UUID jobId = UUID.randomUUID();

        // assertLease finds no row because lease expired or locked_by changed
        when(jdbcTemplate.queryForList(
                eq("SELECT id FROM processing_jobs WHERE id=? AND locked_by=? AND state='RUNNING' AND lease_until>now() FOR UPDATE"),
                eq(jobId),
                eq(workerId)
        )).thenReturn(List.of());

        CustomException ex = assertThrows(CustomException.class, () -> queue.assertLease(jobId, workerId));
        assertEquals(ErrorCode.JOB_LEASE_LOST, ex.getErrorCode());
        assertEquals("Tác vụ không còn giữ quyền xử lý.", ex.getMessage());
    }

    @Test
    @DisplayName("5. Heartbeat Extension: Progress calls extend lease_until")
    void testHeartbeatExtensionDuringProgress() {
        UUID workerId = UUID.randomUUID();
        UUID jobId = UUID.randomUUID();
        UUID ownerId = UUID.randomUUID();

        when(jdbcTemplate.update(
                contains("UPDATE processing_jobs SET step=?,progress=?,lease_until=now()+interval '15 minutes',updated_at=now()"),
                eq("LLM_EXTRACTION"),
                eq(30),
                eq(jobId),
                eq(workerId)
        )).thenReturn(1);

        assertDoesNotThrow(() -> queue.progress(jobId, workerId, ownerId, "LLM_EXTRACTION", 30, "Đang bóc tách."));

        verify(events).emit(eq(jobId), eq(ownerId), eq("INFO"), eq("LLM_EXTRACTION"), eq("STEP_STARTED"), eq("Đang bóc tách."), isNull());
    }

    @Test
    @DisplayName("6. Transient Failure Retry: Retries scheduled with backoff when attempts < 3")
    void testTransientFailureRetryScheduling() {
        UUID workerId = UUID.randomUUID();
        UUID jobId = UUID.randomUUID();

        when(jdbcTemplate.update(
                contains("UPDATE processing_jobs SET state='QUEUED',step='RETRY_BACKOFF'"),
                eq("AI_TIMEOUT"),
                eq("Connection timed out to LLM"),
                eq("5"),
                eq(jobId),
                eq(workerId)
        )).thenReturn(1);

        assertDoesNotThrow(() -> queue.retryWithBackoff(jobId, workerId, "AI_TIMEOUT", "Connection timed out to LLM", 5));

        verify(jdbcTemplate).update(
                contains("available_at=now() + (? || ' seconds')::interval"),
                eq("AI_TIMEOUT"),
                eq("Connection timed out to LLM"),
                eq("5"),
                eq(jobId),
                eq(workerId)
        );
    }

    @Test
    @DisplayName("7. Permanent Failure: VALIDATION_ERROR fails immediately without retry")
    void testPermanentFailureFailsImmediately() {
        UUID workerId = UUID.randomUUID();
        UUID jobId = UUID.randomUUID();

        when(jdbcTemplate.update(
                contains("UPDATE processing_jobs SET state='FAILED',step='FAILED'"),
                eq("VALIDATION_ERROR"),
                eq("Schema validation failed"),
                eq(jobId),
                eq(workerId)
        )).thenReturn(1);

        assertDoesNotThrow(() -> queue.fail(jobId, workerId, "VALIDATION_ERROR", "Schema validation failed"));

        verify(jdbcTemplate).update(
                contains("UPDATE processing_jobs SET state='FAILED',step='FAILED'"),
                eq("VALIDATION_ERROR"),
                eq("Schema validation failed"),
                eq(jobId),
                eq(workerId)
        );
    }

    @Test
    @DisplayName("8. Idempotent Enqueue: Active job returns existing job ID without duplicate enqueue")
    void testIdempotentEnqueueActiveJob() {
        UUID ownerId = UUID.randomUUID();
        UUID entityId = UUID.randomUUID();
        UUID existingJobId = UUID.randomUUID();

        when(jdbcTemplate.query(
                contains("ON CONFLICT(kind,entity_id) WHERE state IN ('QUEUED','RUNNING')"),
                any(RowMapper.class),
                any(UUID.class),
                eq(ownerId),
                eq("EXTRACT"),
                eq(entityId),
                any()
        )).thenReturn(List.of(existingJobId));

        UUID returnedId = queue.enqueue(ownerId, "EXTRACT", entityId);

        assertEquals(existingJobId, returnedId);
        // Since proposed != existing, JOB_QUEUED is not emitted again
        verify(events, never()).emit(eq(existingJobId), any(), any(), eq("QUEUED"), eq("JOB_QUEUED"), any(), any());
    }

    @Test
    @DisplayName("9. Idempotent Match Completion: Complete sets state=SUCCEEDED and lease_until=NULL")
    void testCompleteClearsLeaseAndMarksSucceeded() {
        UUID workerId = UUID.randomUUID();
        UUID jobId = UUID.randomUUID();

        when(jdbcTemplate.update(
                contains("UPDATE processing_jobs SET state='SUCCEEDED',step='DONE',progress=100,locked_by=NULL,lease_until=NULL"),
                eq(jobId),
                eq(workerId)
        )).thenReturn(1);

        assertDoesNotThrow(() -> queue.complete(jobId, workerId));

        verify(jdbcTemplate).update(
                contains("state='SUCCEEDED',step='DONE'"),
                eq(jobId),
                eq(workerId)
        );
    }
}
