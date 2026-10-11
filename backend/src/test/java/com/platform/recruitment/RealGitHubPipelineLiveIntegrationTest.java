package com.platform.recruitment;

import com.platform.recruitment.candidate.CandidateProfile;
import com.platform.recruitment.candidate.CandidateProfileRepository;
import com.platform.recruitment.candidate.CandidateService;
import com.platform.recruitment.github.GitHubAssessment;
import com.platform.recruitment.github.GitHubAssessmentRepository;
import com.platform.recruitment.github.GitHubProfile;
import com.platform.recruitment.github.GitHubProfileRepository;
import com.platform.recruitment.user.Role;
import com.platform.recruitment.user.User;
import com.platform.recruitment.user.UserRepository;
import com.platform.recruitment.worker.JobQueue;
import com.platform.recruitment.worker.PipelineWorker;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * End-to-End Live Integration Test verifying the entire GitHub Pipeline across:
 * Spring Boot -> JobQueue (PostgreSQL) -> PipelineWorker -> AiWorkerClient -> AI Worker (port 8000) -> GitHub API -> PostgreSQL persistence & retrieval.
 */
@SpringBootTest
public class RealGitHubPipelineLiveIntegrationTest {

    @Autowired private CandidateService candidateService;
    @Autowired private CandidateProfileRepository candidateProfileRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private JobQueue jobQueue;
    @Autowired private PipelineWorker pipelineWorker;
    @Autowired private GitHubProfileRepository gitHubProfileRepository;
    @Autowired private GitHubAssessmentRepository gitHubAssessmentRepository;
    @Autowired private JdbcTemplate jdbcTemplate;

    private User testUser;
    private CandidateProfile testCandidateProfile;
    private final List<UUID> createdJobIds = new ArrayList<>();

    @org.junit.jupiter.api.BeforeEach
    void setUp() {
        org.junit.jupiter.api.Assumptions.assumeTrue(
                isAiWorkerReachable(),
                "FastAPI AI Worker (http://127.0.0.1:8000) is not reachable; skipping live GitHub pipeline test"
        );
    }

    private static boolean isAiWorkerReachable() {
        try (java.net.Socket socket = new java.net.Socket()) {
            socket.connect(new java.net.InetSocketAddress("127.0.0.1", 8000), 500);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    @AfterEach
    void cleanUp() {
        if (testCandidateProfile != null) {
            // Delete github profile and assessments for test candidate
            gitHubProfileRepository.findByCandidateId(testCandidateProfile.getId()).ifPresent(gp -> {
                gitHubAssessmentRepository.findByGithubProfileId(gp.getId()).ifPresent(gitHubAssessmentRepository::delete);
                gitHubProfileRepository.delete(gp);
            });
            candidateProfileRepository.delete(testCandidateProfile);
        }
        if (testUser != null) {
            userRepository.delete(testUser);
        }
        for (UUID jobId : createdJobIds) {
            jdbcTemplate.update("DELETE FROM job_events WHERE job_id = ?", jobId);
            jdbcTemplate.update("DELETE FROM processing_jobs WHERE id = ?", jobId);
        }
    }

    @Test
    @DisplayName("Live Pipeline E2E: Candidate profile update triggers JobQueue, Worker executes via AI Worker, and persists to PostgreSQL")
    void testLivePipeline_ProfileSaveToAiWorkerToDatabasePersistenceAndRetrieval() {
        // 1. Create a real candidate user and profile in PostgreSQL
        String email = "candidate.e2e." + UUID.randomUUID() + "@midcv.vn";
        testUser = userRepository.save(User.builder()
                .email(email)
                .passwordHash("$2a$10$dummyHashForLivePipelineIntegrationTest")
                .role(Role.CANDIDATE)
                .build());

        testCandidateProfile = candidateProfileRepository.save(CandidateProfile.builder()
                .user(testUser)
                .fullName("Nguyen Van Octocat")
                .targetIndustry("Technology")
                .build());

        // 2. Candidate updates profile with GitHub URL (https://github.com/octocat)
        CandidateProfile updateData = CandidateProfile.builder()
                .fullName("Nguyen Van Octocat")
                .targetIndustry("Technology")
                .githubUrl("https://github.com/octocat")
                .build();

        CandidateProfile savedProfile = candidateService.updateProfile(testUser, updateData);
        assertEquals("https://github.com/octocat", savedProfile.getGithubUrl());

        // 3. Verify a GITHUB_ANALYSIS job was enqueued in processing_jobs in PostgreSQL
        List<Map<String, Object>> activeJobs = jdbcTemplate.queryForList(
                "SELECT id, kind, state, entity_id FROM processing_jobs WHERE kind = 'GITHUB_ANALYSIS' AND entity_id = ? AND state = 'QUEUED'",
                savedProfile.getId()
        );
        assertFalse(activeJobs.isEmpty(), "JobQueue must have an active QUEUED job for the candidate profile");
        UUID jobId = (UUID) activeJobs.get(0).get("id");
        createdJobIds.add(jobId);

        // 4. PipelineWorker claims and processes the job via AiWorkerClient -> AI Worker (port 8000)
        pipelineWorker.tick();

        // 5. Verify the job has reached a terminal state (SUCCEEDED) in PostgreSQL
        Map<String, Object> finishedJob = jdbcTemplate.queryForMap(
                "SELECT state, step, progress FROM processing_jobs WHERE id = ?",
                jobId
        );
        assertEquals("SUCCEEDED", finishedJob.get("state"), "PipelineWorker must complete the job as SUCCEEDED");
        assertEquals(100, ((Number) finishedJob.get("progress")).intValue());

        // 6. Verify real persistence in github_profiles table in PostgreSQL
        Optional<GitHubProfile> persistedProfileOpt = gitHubProfileRepository.findByCandidateId(savedProfile.getId());
        assertTrue(persistedProfileOpt.isPresent(), "GitHubProfile must be persisted in PostgreSQL");

        GitHubProfile persistedProfile = persistedProfileOpt.get();
        assertEquals("octocat", persistedProfile.getUsername().toLowerCase());
        assertNotNull(persistedProfile.getStatus(), "Status must be non-null (SYNCED or RATE_LIMITED)");
        assertNotNull(persistedProfile.getActivitySignal(), "ActivitySignal must be non-null");

        // 7. Verify real persistence in github_assessments table in PostgreSQL
        Optional<GitHubAssessment> persistedAssessmentOpt = gitHubAssessmentRepository.findByGithubProfileId(persistedProfile.getId());
        assertTrue(persistedAssessmentOpt.isPresent(), "GitHubAssessment must be persisted in PostgreSQL");
        assertNotNull(persistedAssessmentOpt.get().getOverallSupportingRating(), "Overall supporting rating must be non-null");

        // 8. Verify separate retrieval from application repository
        GitHubProfile reloadedProfile = gitHubProfileRepository.findById(persistedProfile.getId()).orElseThrow();
        assertEquals(savedProfile.getId(), reloadedProfile.getCandidate().getId());
    }
}
