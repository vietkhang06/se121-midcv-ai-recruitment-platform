package com.platform.recruitment;

import com.platform.recruitment.application.*;
import com.platform.recruitment.job.Job;
import com.platform.recruitment.matching.ApplicationAiPolicy;
import com.platform.recruitment.matching.JobMatchingPolicy;
import com.platform.recruitment.worker.JobQueue;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/** Service-level fault injection; real transaction rollback is covered in ApplicationAiHttpAcceptanceTest. */
class ApplicationAiLifecycleTest {
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final JobQueue queue = mock(JobQueue.class);
    private final ApplicationAiDispatch dispatcher = new ApplicationAiDispatch(jdbc, queue);
    private final UUID app = UUID.randomUUID(), owner = UUID.randomUUID(), cv = UUID.randomUUID(), jd = UUID.randomUUID(), hr = UUID.randomUUID();
    private void pending(boolean consent, boolean entitled) {
        when(jdbc.queryForList(contains("WHERE a.ai_dispatch_pending=true"))).thenReturn(List.of(Map.of(
                "id", app, "user_id", owner, "applied_cv_version_id", cv, "applied_jd_version_id", jd,
                "jd_owner", hr, "ai_analysis_consent", consent, "ai_scoring_eligible_snapshot", entitled, "status", "SUBMITTED")));
    }
    @Test void queueFailureNeverClearsDurableIntent() {
        pending(true, true);
        when(queue.enqueue(owner, "MATCH", app)).thenThrow(new IllegalStateException("injected queue failure"));
        assertThrows(IllegalStateException.class, dispatcher::dispatchOne);
        verify(jdbc, never()).update(eq("UPDATE applications SET ai_dispatch_pending=false WHERE id=?"), eq(app));
    }
    @Test void dispatchUsesOnlyPinnedVersionsAndClearsIntentLast() {
        pending(true, true);
        dispatcher.dispatchOne();
        var order = inOrder(queue, jdbc);
        order.verify(queue).enqueue(owner, "EMBED", cv);
        order.verify(queue).enqueue(hr, "EMBED", jd);
        order.verify(queue).enqueue(owner, "MATCH", app);
        order.verify(jdbc).update("UPDATE applications SET ai_dispatch_pending=false WHERE id=?", app);
    }
    @Test void declinedOrIneligibleNeverEnqueuesMatching() {
        pending(false, true);
        dispatcher.dispatchOne();
        pending(true, false);
        dispatcher.dispatchOne();
        verifyNoInteractions(queue);
    }
    @Test void processingIsSeparateFromRecruitmentDecisionAndDoesNotDependOnScore() {
        var a = Application.builder().status(ApplicationStatus.SUBMITTED).aiAnalysisConsent(true)
                .aiScoringEligibleSnapshot(true).aiDispatchPending(true).build();
        a.setId(app);
        assertEquals("AI_WAITING_DISPATCH", ApplicationAiState.resolve(a, null, jdbc));
        a.setAiDispatchPending(false);
        when(jdbc.queryForList(contains("kind='MATCH'"), eq(app))).thenReturn(List.of(Map.of("state", "FAILED", "step", "FAILED")));
        assertEquals("AI_FAILED", ApplicationAiState.resolve(a, null, jdbc));
        assertEquals(ApplicationStatus.SUBMITTED, a.getStatus());
        a.setAiScoringEligibleSnapshot(false);
        assertEquals("PACKAGE_NOT_ELIGIBLE", ApplicationAiState.resolve(a, null, jdbc));
        a.setAiAnalysisConsent(false);
        assertEquals("CONSENT_NOT_GIVEN", ApplicationAiState.resolve(a, null, jdbc));
    }
    @Test void policySnapshotRoundtripPreservesWeightsAndVersion() {
        var job = Job.builder().title("Java").build(); job.setId(UUID.randomUUID());
        var policy = JobMatchingPolicy.createDefaultPolicy(job);
        policy.setPolicyVersion(7);
        String snapshot = ApplicationAiPolicy.encode(policy);
        policy.setPolicyVersion(8);
        var pinned = ApplicationAiPolicy.decode(snapshot, job);
        assertEquals(7, pinned.getPolicyVersion());
        assertEquals(policy.getGithubWeight(), pinned.getGithubWeight());
        assertEquals(policy.getSkillRequiredWeight(), pinned.getSkillRequiredWeight());
    }
    @Test void matchWorkerRechecksConsentAfterGithubObservation() {
        var manager = mock(org.springframework.transaction.PlatformTransactionManager.class);
        when(manager.getTransaction(any())).thenReturn(new org.springframework.transaction.support.SimpleTransactionStatus());
        var worker = new com.platform.recruitment.worker.PipelineWorker(jdbc, null, queue, null,
                null, null, null, null, null, manager);
        var github = mock(com.platform.recruitment.github.ApplicationGithubEvidenceService.class);
        var matching = mock(com.platform.recruitment.matching.MatchingEngineService.class);
        org.springframework.test.util.ReflectionTestUtils.setField(worker, "applicationGithub", github);
        org.springframework.test.util.ReflectionTestUtils.setField(worker, "applicationMatching", matching);
        UUID task = UUID.randomUUID();
        when(jdbc.queryForList(eq("SELECT job_id,candidate_id,status,ai_analysis_consent,ai_scoring_eligible_snapshot FROM applications WHERE id=?"),eq(app)))
                .thenReturn(List.of(Map.of("ai_analysis_consent",true,"ai_scoring_eligible_snapshot",true,"status","SUBMITTED")));
        when(jdbc.queryForList(eq("SELECT job_id,candidate_id,status,ai_analysis_consent,ai_scoring_eligible_snapshot FROM applications WHERE id=? FOR UPDATE"),eq(app)))
                .thenReturn(List.of(Map.of("ai_analysis_consent",false,"ai_scoring_eligible_snapshot",true,"status","SUBMITTED")));
        when(queue.ownsLease(eq(task),any(UUID.class))).thenReturn(true);
        org.springframework.test.util.ReflectionTestUtils.invokeMethod(worker,"processApplicationMatch",task,app);
        verify(github).capture(eq(app),eq(task),any(UUID.class));
        verify(queue).assertLease(eq(task),any(UUID.class));
        verify(queue).complete(eq(task),any(UUID.class));
        verifyNoInteractions(matching);
    }
}
