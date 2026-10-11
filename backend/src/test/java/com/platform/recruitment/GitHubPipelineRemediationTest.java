package com.platform.recruitment;

import com.platform.recruitment.ai.AiProcessingController;
import com.platform.recruitment.ai.ProcessingLifecycleService;
import com.platform.recruitment.candidate.CandidateProfile;
import com.platform.recruitment.candidate.CandidateProfileRepository;
import com.platform.recruitment.candidate.CandidateService;
import com.platform.recruitment.candidate.CandidateTargetIndustryRepository;
import com.platform.recruitment.common.ApiResponse;
import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.ErrorCode;
import com.platform.recruitment.common.ResourceNotFoundException;
import com.platform.recruitment.user.Role;
import com.platform.recruitment.user.User;
import com.platform.recruitment.worker.JobQueue;
import com.platform.recruitment.worker.PipelineWorker;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class GitHubPipelineRemediationTest {

    @Mock private CandidateProfileRepository candidateProfileRepository;
    @Mock private CandidateTargetIndustryRepository candidateTargetIndustryRepository;
    @Mock private JobQueue jobQueue;
    @Mock private ProcessingLifecycleService processingLifecycleService;
    @Mock private JdbcTemplate jdbcTemplate;

    private CandidateService candidateService;
    private AiProcessingController aiProcessingController;
    private User testUser;
    private CandidateProfile existingProfile;

    @BeforeEach
    void setUp() {
        candidateService = new CandidateService(candidateProfileRepository, candidateTargetIndustryRepository);
        ReflectionTestUtils.setField(candidateService, "jobQueue", jobQueue);
        ReflectionTestUtils.setField(candidateService, "processingLifecycleService", processingLifecycleService);

        aiProcessingController = new AiProcessingController(processingLifecycleService);
        ReflectionTestUtils.setField(aiProcessingController, "jobQueue", jobQueue);
        ReflectionTestUtils.setField(aiProcessingController, "candidateProfileRepository", candidateProfileRepository);

        testUser = User.builder()
                .email("test.candidate@midcv.io")
                .role(Role.CANDIDATE)
                .build();
        testUser.setId(UUID.randomUUID());

        existingProfile = CandidateProfile.builder()
                .user(testUser)
                .fullName("Nguyen Van Test")
                .githubUrl("https://github.com/old-user")
                .targetIndustry("Technology")
                .build();
        existingProfile.setId(UUID.randomUUID());
    }

    @Test
    @DisplayName("Gate Step 2: Valid GitHub URL change enqueues exactly ONE background job and does not block")
    void testProfileUpdate_WithChangedGithubUrl_EnqueuesExactlyOneJob() {
        when(candidateProfileRepository.findByUserId(testUser.getId())).thenReturn(Optional.of(existingProfile));
        when(candidateProfileRepository.save(any(CandidateProfile.class))).thenAnswer(inv -> inv.getArgument(0));

        UUID expectedJobId = UUID.randomUUID();
        when(jobQueue.enqueue(eq(testUser.getId()), eq("GITHUB_ANALYSIS"), eq(existingProfile.getId())))
                .thenReturn(expectedJobId);

        CandidateProfile updateData = CandidateProfile.builder()
                .fullName("Nguyen Van Test")
                .githubUrl("https://github.com/new-user")
                .build();

        CandidateProfile saved = candidateService.updateProfile(testUser, updateData);

        assertNotNull(saved);
        assertEquals("https://github.com/new-user", saved.getGithubUrl());

        // Verify exactly ONE background task enqueued
        verify(jobQueue, times(1)).enqueue(eq(testUser.getId()), eq("GITHUB_ANALYSIS"), eq(existingProfile.getId()));

        // Verify synchronous processingLifecycleService was NOT called in updateProfile (no blocking network I/O)
        verify(processingLifecycleService, never()).processCandidateGithub(any());
    }

    @Test
    @DisplayName("Gate Step 3: Saving profile with unchanged GitHub URL does NOT enqueue unnecessary job")
    void testProfileUpdate_WithUnchangedGithubUrl_DoesNotEnqueueJob() {
        when(candidateProfileRepository.findByUserId(testUser.getId())).thenReturn(Optional.of(existingProfile));
        when(candidateProfileRepository.save(any(CandidateProfile.class))).thenAnswer(inv -> inv.getArgument(0));

        CandidateProfile updateData = CandidateProfile.builder()
                .fullName("Nguyen Van Test")
                .githubUrl("https://github.com/old-user")
                .build();

        candidateService.updateProfile(testUser, updateData);

        // URL did not change -> no new job enqueued
        verify(jobQueue, never()).enqueue(any(), any(), any());
        verify(processingLifecycleService, never()).processCandidateGithub(any());
    }

    @Test
    @DisplayName("Gate Step 3: Saving unrelated profile fields (bio, phone) does NOT trigger GitHub analysis")
    void testProfileUpdate_WithUnrelatedFields_DoesNotEnqueueJob() {
        when(candidateProfileRepository.findByUserId(testUser.getId())).thenReturn(Optional.of(existingProfile));
        when(candidateProfileRepository.save(any(CandidateProfile.class))).thenAnswer(inv -> inv.getArgument(0));

        CandidateProfile updateData = CandidateProfile.builder()
                .fullName("Nguyen Van Test Updated")
                .phone("0901234567")
                .bio("Updated bio content")
                .githubUrl("https://github.com/old-user")
                .build();

        candidateService.updateProfile(testUser, updateData);

        verify(jobQueue, never()).enqueue(any(), any(), any());
    }

    @Test
    @DisplayName("Gate Step 2 & 3: Manual Sync GitHub triggers processing through the same background queue and returns QUEUED")
    void testManualSync_EnqueuesJobWithSameCanonicalKind_ReturnsQueued() {
        when(candidateProfileRepository.findByUserId(testUser.getId())).thenReturn(Optional.of(existingProfile));

        UUID expectedJobId = UUID.randomUUID();
        when(jobQueue.enqueue(eq(testUser.getId()), eq("GITHUB_ANALYSIS"), eq(existingProfile.getId())))
                .thenReturn(expectedJobId);

        ResponseEntity<ApiResponse<Map<String, Object>>> response = aiProcessingController.triggerGithubProcessing(testUser);

        assertNotNull(response);
        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().isSuccess());

        Map<String, Object> data = response.getBody().getData();
        assertNotNull(data);
        assertEquals("QUEUED", data.get("status"));
        assertEquals(expectedJobId.toString(), data.get("jobId"));

        // Verify same canonical GITHUB_ANALYSIS task enqueued with candidate ID
        verify(jobQueue, times(1)).enqueue(eq(testUser.getId()), eq("GITHUB_ANALYSIS"), eq(existingProfile.getId()));
    }

    @Test
    @DisplayName("Gate Step 3: Manual Sync for candidate without GitHub URL throws VALIDATION_ERROR")
    void testManualSync_WithoutGithubUrl_ThrowsBadRequest() {
        existingProfile.setGithubUrl(null);
        when(candidateProfileRepository.findByUserId(testUser.getId())).thenReturn(Optional.of(existingProfile));

        CustomException ex = assertThrows(CustomException.class, () ->
                aiProcessingController.triggerGithubProcessing(testUser));

        assertEquals(ErrorCode.VALIDATION_ERROR, ex.getErrorCode());
        verify(jobQueue, never()).enqueue(any(), any(), any());
    }

    @Test
    @DisplayName("Gate Step 4: PipelineWorker claims GITHUB_ANALYSIS task and completes lifecycle outside transaction")
    void testPipelineWorker_ExecutesGithubAnalysisJob_AndCompletesJob() {
        UUID jobId = UUID.randomUUID();
        UUID ownerId = testUser.getId();
        UUID candidateId = existingProfile.getId();

        Map<String, Object> claimedJob = new HashMap<>();
        claimedJob.put("id", jobId);
        claimedJob.put("owner_id", ownerId);
        claimedJob.put("entity_id", candidateId);
        claimedJob.put("kind", "GITHUB_ANALYSIS");
        claimedJob.put("request_id", "req-test-123");
        claimedJob.put("attempts", 1);

        when(jobQueue.claim(any())).thenReturn(Optional.of(claimedJob));

        PipelineWorker worker = new PipelineWorker(
                jdbcTemplate, null, jobQueue, mock(com.platform.recruitment.event.Events.class),
                null, null, null, null, null, mock(org.springframework.transaction.PlatformTransactionManager.class)
        );
        ReflectionTestUtils.setField(worker, "processingLifecycleService", processingLifecycleService);

        // Run worker tick
        worker.tick();

        // Verify progress reported
        verify(jobQueue, times(1)).progress(eq(jobId), any(), eq(ownerId), eq("GITHUB_ANALYSIS"), eq(20), anyString());

        // Verify processCandidateGithub was invoked in background worker
        verify(processingLifecycleService, times(1)).processCandidateGithub(eq(candidateId));

        // Verify job completed successfully
        verify(jobQueue, times(1)).complete(eq(jobId), any());
    }

    @Test
    @DisplayName("Gate Step 4: When GitHub analysis fails (timeout/network error), worker marks job FAILED accurately")
    void testPipelineWorker_WhenLifecycleFails_MarksJobFailedAccurately() {
        UUID jobId = UUID.randomUUID();
        UUID ownerId = testUser.getId();
        UUID candidateId = existingProfile.getId();

        Map<String, Object> claimedJob = new HashMap<>();
        claimedJob.put("id", jobId);
        claimedJob.put("owner_id", ownerId);
        claimedJob.put("entity_id", candidateId);
        claimedJob.put("kind", "GITHUB_ANALYSIS");
        claimedJob.put("request_id", "req-test-fail");
        claimedJob.put("attempts", 3); // Max attempts reached so it marks FAILED

        when(jobQueue.claim(any())).thenReturn(Optional.of(claimedJob));
        doThrow(new CustomException(ErrorCode.VALIDATION_ERROR, "GitHub API rate limit exceeded"))
                .when(processingLifecycleService).processCandidateGithub(eq(candidateId));

        org.springframework.transaction.PlatformTransactionManager txManager = mock(org.springframework.transaction.PlatformTransactionManager.class);
        when(txManager.getTransaction(any())).thenReturn(new org.springframework.transaction.support.SimpleTransactionStatus());

        PipelineWorker worker = new PipelineWorker(
                jdbcTemplate, null, jobQueue, mock(com.platform.recruitment.event.Events.class),
                null, null, null, null, null, txManager
        );
        ReflectionTestUtils.setField(worker, "processingLifecycleService", processingLifecycleService);

        worker.tick();

        // Job queue should be failed, not completed
        verify(jobQueue, never()).complete(eq(jobId), any());
        verify(jobQueue, times(1)).fail(eq(jobId), any(), eq("VALIDATION_ERROR"), contains("GitHub API rate limit exceeded"));
    }

    @Test
    @DisplayName("Gate Step 4: Authorization check - user without candidate profile cannot trigger analysis")
    void testAuthorization_UserWithoutCandidateProfile_ThrowsNotFound() {
        UUID unknownUserId = UUID.randomUUID();
        User unknownUser = User.builder().email("unknown@candidate.test").build();
        unknownUser.setId(unknownUserId);

        when(candidateProfileRepository.findByUserId(unknownUserId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () ->
                aiProcessingController.triggerGithubProcessing(unknownUser));

        verify(jobQueue, never()).enqueue(any(), any(), any());
    }
}
