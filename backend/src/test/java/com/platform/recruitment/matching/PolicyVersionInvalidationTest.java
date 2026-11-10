package com.platform.recruitment.matching;

import com.platform.recruitment.application.Application;
import com.platform.recruitment.application.ApplicationRepository;
import com.platform.recruitment.candidate.CandidateProfile;
import com.platform.recruitment.company.RecruiterProfileRepository;
import com.platform.recruitment.job.Job;
import com.platform.recruitment.job.JobRepository;
import com.platform.recruitment.suspension.SuspensionGuard;
import com.platform.recruitment.user.Role;
import com.platform.recruitment.user.User;
import com.platform.recruitment.worker.JobQueue;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Mocks verify invalidation wiring only; the live queue/database acceptance is separate. */
@ExtendWith(MockitoExtension.class)
class PolicyVersionInvalidationTest {
    @Mock JobRepository jobs;
    @Mock JobMatchingPolicyRepository policies;
    @Mock RecruiterProfileRepository recruiters;
    @Mock ApplicationRepository applications;
    @Mock MatchingEngineService matching;
    @Mock SuspensionGuard suspension;
    @Mock MatchResultRepository results;
    @Mock JobQueue queue;

    @Test
    void changeToPolicyInvalidatesOldScoresAndEnqueuesRecalculation() {
        UUID jobId = UUID.randomUUID();
        UUID ownerId = UUID.randomUUID();
        UUID applicationId = UUID.randomUUID();
        Job job = mock(Job.class);
        when(job.getId()).thenReturn(jobId);
        when(jobs.findById(jobId)).thenReturn(Optional.of(job));

        JobMatchingPolicy policy = JobMatchingPolicy.createDefaultPolicy(job);
        when(policies.findByJobId(jobId)).thenReturn(Optional.of(policy));
        when(policies.save(policy)).thenReturn(policy);
        MatchResult old = MatchResult.builder().status("COMPLETED").policyVersion(1).build();
        when(results.findByApplicationJobId(jobId)).thenReturn(List.of(old));
        User owner = new User();
        owner.setId(ownerId);
        Application application = Application.builder()
                .candidate(CandidateProfile.builder().user(owner).build()).build();
        application.setId(applicationId);
        when(applications.findByJobId(jobId)).thenReturn(List.of(application));

        JobMatchingPolicyService service = new JobMatchingPolicyService(
                policies, jobs, recruiters, applications, matching, suspension);
        ReflectionTestUtils.setField(service, "resultRepository", results);
        ReflectionTestUtils.setField(service, "jobQueue", queue);

        User admin = new User();
        admin.setRole(Role.ADMIN);
        JobMatchingPolicyDto output = service.updatePolicy(admin, jobId,
                JobMatchingPolicyDto.fromEntity(policy));

        assertEquals(2, output.getPolicyVersion());
        assertEquals("STALE_POLICY", old.getStatus());
        verify(results).saveAll(anyList());
        verify(queue).enqueue(ownerId, "MATCH", applicationId);
    }

    @Test
    void pendingOldPolicyResultsAreNotIncludedInRecruiterRanking() {
        UUID jobId = UUID.randomUUID();
        MatchResult old = MatchResult.builder().status("STALE_POLICY").build();
        MatchResult current = MatchResult.builder().status("COMPLETED").build();
        when(results.findByApplicationJobIdWithCandidate(jobId))
                .thenReturn(List.of(old, current));
        List<MatchResult> ranked = new CandidateRankingService(results)
                .getRankedCandidatesForJob(jobId, null);
        assertEquals(List.of(current), ranked);
    }
}
