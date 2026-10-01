package com.platform.recruitment;

import com.platform.recruitment.application.*;
import com.platform.recruitment.candidate.CandidateProfile;
import com.platform.recruitment.common.UnauthorizedAccessException;
import com.platform.recruitment.company.Company;
import com.platform.recruitment.company.RecruiterProfile;
import com.platform.recruitment.company.RecruiterProfileRepository;
import com.platform.recruitment.cv.CV;
import com.platform.recruitment.job.Job;
import com.platform.recruitment.job.JobRepository;
import com.platform.recruitment.matching.CandidateRankingService;
import com.platform.recruitment.matching.MatchResult;
import com.platform.recruitment.matching.MatchResultRepository;
import com.platform.recruitment.user.Role;
import com.platform.recruitment.user.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class CandidateRankingAndRecruiterDecisionIntegrationTest {

    @Mock
    private ApplicationRepository applicationRepository;

    @Mock
    private ApplicationCVSnapshotRepository snapshotRepository;

    @Mock
    private JobRepository jobRepository;

    @Mock
    private RecruiterProfileRepository recruiterProfileRepository;

    @Mock
    private MatchResultRepository matchResultRepository;

    @Mock
    private CandidateRankingService candidateRankingService;

    @Mock
    private ApplicationAuditLogRepository auditLogRepository;

    @InjectMocks
    private ApplicationService applicationService;

    private User recruiterUser;
    private User otherRecruiterUser;
    private Company myCompany;
    private Company otherCompany;
    private RecruiterProfile recruiter;
    private RecruiterProfile otherRecruiter;
    private Job job;
    private Job otherJob;

    private Application app1;
    private Application app2;
    private MatchResult mr1;
    private MatchResult mr2;

    @BeforeEach
    void setUp() {
        myCompany = Company.builder().name("TechCorp").build();
        myCompany.setId(UUID.randomUUID());

        otherCompany = Company.builder().name("OtherCorp").build();
        otherCompany.setId(UUID.randomUUID());

        recruiterUser = User.builder().email("recruiter@techcorp.com").role(Role.HR).build();
        recruiterUser.setId(UUID.randomUUID());

        otherRecruiterUser = User.builder().email("hacker@othercorp.com").role(Role.HR).build();
        otherRecruiterUser.setId(UUID.randomUUID());

        recruiter = RecruiterProfile.builder().user(recruiterUser).company(myCompany).fullName("HR Lead").build();
        recruiter.setId(UUID.randomUUID());

        otherRecruiter = RecruiterProfile.builder().user(otherRecruiterUser).company(otherCompany).fullName("Other HR").build();
        otherRecruiter.setId(UUID.randomUUID());

        job = Job.builder().company(myCompany).title("Senior Backend Engineer").build();
        job.setId(UUID.randomUUID());

        otherJob = Job.builder().company(otherCompany).title("Other Job").build();
        otherJob.setId(UUID.randomUUID());

        // Candidate 1
        CandidateProfile cand1 = CandidateProfile.builder().fullName("Alice Developer").build();
        cand1.setId(UUID.fromString("11111111-1111-1111-1111-111111111111"));
        CV cv1 = CV.builder().candidate(cand1).title("Alice CV").build();
        cv1.setId(UUID.randomUUID());

        app1 = Application.builder()
                .job(job)
                .candidate(cand1)
                .appliedCv(cv1)
                .status(ApplicationStatus.SUBMITTED)
                .build();
        app1.setId(UUID.randomUUID());

        mr1 = MatchResult.builder()
                .application(app1)
                .overallScore(new BigDecimal("92.50"))
                .coreScore(new BigDecimal("90.00"))
                .requiredSkillsMissing(0)
                .status("HIGH")
                .build();

        // Candidate 2
        CandidateProfile cand2 = CandidateProfile.builder().fullName("Bob Coder").build();
        cand2.setId(UUID.fromString("22222222-2222-2222-2222-222222222222"));
        CV cv2 = CV.builder().candidate(cand2).title("Bob CV").build();
        cv2.setId(UUID.randomUUID());

        app2 = Application.builder()
                .job(job)
                .candidate(cand2)
                .appliedCv(cv2)
                .status(ApplicationStatus.SUBMITTED)
                .build();
        app2.setId(UUID.randomUUID());

        mr2 = MatchResult.builder()
                .application(app2)
                .overallScore(new BigDecimal("78.00"))
                .coreScore(new BigDecimal("75.00"))
                .requiredSkillsMissing(1)
                .status("MEDIUM")
                .build();
    }

    @Test
    @DisplayName("AC-P9-01: Recruiter retrieves deterministically ranked candidate applications for a job")
    void testGetRankedApplications_DeterministicOrder() {
        when(recruiterProfileRepository.findByUserId(recruiterUser.getId())).thenReturn(Optional.of(recruiter));
        when(jobRepository.findById(job.getId())).thenReturn(Optional.of(job));
        when(candidateRankingService.getRankedCandidatesForJob(job.getId(), null)).thenReturn(List.of(mr1, mr2));
        when(snapshotRepository.findByApplicationId(app1.getId())).thenReturn(Optional.empty());
        when(snapshotRepository.findByApplicationId(app2.getId())).thenReturn(Optional.empty());

        List<ApplicationResponse> ranked = applicationService.getRankedApplicationsForJob(recruiterUser, job.getId(), null);

        assertNotNull(ranked);
        assertEquals(2, ranked.size());

        // First candidate: Alice (Score 92.50, missing 0)
        assertEquals(app1.getId(), ranked.get(0).getId());
        assertEquals(new BigDecimal("92.50"), ranked.get(0).getMatchScore());
        assertEquals("HIGH", ranked.get(0).getMatchStatus());

        // Second candidate: Bob (Score 78.00, missing 1)
        assertEquals(app2.getId(), ranked.get(1).getId());
        assertEquals(new BigDecimal("78.00"), ranked.get(1).getMatchScore());
        assertEquals("MEDIUM", ranked.get(1).getMatchStatus());
    }

    @Test
    @DisplayName("AC-P9-02: Recruiter executes human decision (SHORTLISTED) with auditable logging")
    void testRecruiterShortlistsCandidate_CreatesAuditLog() {
        when(recruiterProfileRepository.findByUserId(recruiterUser.getId())).thenReturn(Optional.of(recruiter));
        when(applicationRepository.findById(app1.getId())).thenReturn(Optional.of(app1));
        when(applicationRepository.save(any(Application.class))).thenAnswer(i -> i.getArgument(0));

        UpdateApplicationStatusRequest request = UpdateApplicationStatusRequest.builder()
                .status(ApplicationStatus.SHORTLISTED)
                .decisionNote("Strong architectural background and 0 missing mandatory skills.")
                .build();

        ApplicationResponse updated = applicationService.updateApplicationStatus(recruiterUser, app1.getId(), request);

        assertEquals(ApplicationStatus.SHORTLISTED, updated.getStatus());
        assertEquals(ApplicationStatus.SHORTLISTED, app1.getStatus());

        // Verify audit log captured
        ArgumentCaptor<ApplicationAuditLog> logCaptor = ArgumentCaptor.forClass(ApplicationAuditLog.class);
        verify(auditLogRepository, times(1)).save(logCaptor.capture());

        ApplicationAuditLog capturedLog = logCaptor.getValue();
        assertEquals(app1, capturedLog.getApplication());
        assertEquals(recruiterUser, capturedLog.getRecruiterUser());
        assertEquals(ApplicationStatus.SUBMITTED, capturedLog.getPreviousStatus());
        assertEquals(ApplicationStatus.SHORTLISTED, capturedLog.getNewStatus());
        assertEquals("Strong architectural background and 0 missing mandatory skills.", capturedLog.getDecisionNote());
    }

    @Test
    @DisplayName("AC-P9-02: Recruiter executes human decision (REJECTED) with explicit decision note")
    void testRecruiterRejectsCandidate_HumanActionRecorded() {
        when(recruiterProfileRepository.findByUserId(recruiterUser.getId())).thenReturn(Optional.of(recruiter));
        when(applicationRepository.findById(app2.getId())).thenReturn(Optional.of(app2));
        when(applicationRepository.save(any(Application.class))).thenAnswer(i -> i.getArgument(0));

        UpdateApplicationStatusRequest request = UpdateApplicationStatusRequest.builder()
                .status(ApplicationStatus.REJECTED)
                .decisionNote("Missing mandatory cloud architecture skill.")
                .build();

        ApplicationResponse updated = applicationService.updateApplicationStatus(recruiterUser, app2.getId(), request);

        assertEquals(ApplicationStatus.REJECTED, updated.getStatus());
        assertEquals(ApplicationStatus.REJECTED, app2.getStatus());

        ArgumentCaptor<ApplicationAuditLog> logCaptor = ArgumentCaptor.forClass(ApplicationAuditLog.class);
        verify(auditLogRepository, times(1)).save(logCaptor.capture());

        ApplicationAuditLog capturedLog = logCaptor.getValue();
        assertEquals(ApplicationStatus.SUBMITTED, capturedLog.getPreviousStatus());
        assertEquals(ApplicationStatus.REJECTED, capturedLog.getNewStatus());
        assertEquals("Missing mandatory cloud architecture skill.", capturedLog.getDecisionNote());
    }

    @Test
    @DisplayName("AC-P9-02 & AC-P10-02: Cross-company recruiter cannot change application status or view ranked candidates")
    void testUnauthorizedRecruiter_CannotManageApplication() {
        when(recruiterProfileRepository.findByUserId(otherRecruiterUser.getId())).thenReturn(Optional.of(otherRecruiter));
        when(applicationRepository.findById(app1.getId())).thenReturn(Optional.of(app1));

        UpdateApplicationStatusRequest request = UpdateApplicationStatusRequest.builder()
                .status(ApplicationStatus.HIRED)
                .decisionNote("Unauthorized attempt")
                .build();

        assertThrows(UnauthorizedAccessException.class, () ->
                applicationService.updateApplicationStatus(otherRecruiterUser, app1.getId(), request)
        );

        verify(applicationRepository, never()).save(any());
        verify(auditLogRepository, never()).save(any());
    }

    @Test
    @DisplayName("AC-P9-01: Recruiter can query application audit logs to review decision history")
    void testGetApplicationAuditLogs() {
        when(recruiterProfileRepository.findByUserId(recruiterUser.getId())).thenReturn(Optional.of(recruiter));
        when(applicationRepository.findById(app1.getId())).thenReturn(Optional.of(app1));

        ApplicationAuditLog logEntry = ApplicationAuditLog.builder()
                .application(app1)
                .recruiterUser(recruiterUser)
                .previousStatus(ApplicationStatus.SUBMITTED)
                .newStatus(ApplicationStatus.INTERVIEWING)
                .decisionNote("Invited for Round 1 technical interview.")
                .build();
        logEntry.setId(UUID.randomUUID());

        when(auditLogRepository.findByApplicationIdOrderByCreatedAtDesc(app1.getId()))
                .thenReturn(List.of(logEntry));

        List<ApplicationAuditLogResponse> logs = applicationService.getApplicationAuditLogs(recruiterUser, app1.getId());

        assertNotNull(logs);
        assertEquals(1, logs.size());
        assertEquals(ApplicationStatus.INTERVIEWING, logs.get(0).getNewStatus());
        assertEquals("Invited for Round 1 technical interview.", logs.get(0).getDecisionNote());
    }
}
