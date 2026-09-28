package com.platform.recruitment;

import com.platform.recruitment.application.*;
import com.platform.recruitment.candidate.CandidateProfile;
import com.platform.recruitment.candidate.CandidateProfileRepository;
import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.UnauthorizedAccessException;
import com.platform.recruitment.company.Company;
import com.platform.recruitment.company.CompanyVerification;
import com.platform.recruitment.company.RecruiterProfile;
import com.platform.recruitment.company.RecruiterProfileRepository;
import com.platform.recruitment.cv.*;
import com.platform.recruitment.job.Job;
import com.platform.recruitment.job.JobRepository;
import com.platform.recruitment.job.JobRequirement;
import com.platform.recruitment.job.JobStatus;
import com.platform.recruitment.job.RequirementType;
import com.platform.recruitment.matching.*;
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
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class EndToEndCoreProductFlowIntegrationTest {

    @Mock private CandidateProfileRepository candidateProfileRepository;
    @Mock private RecruiterProfileRepository recruiterProfileRepository;
    @Mock private CVRepository cvRepository;
    @Mock private CVVersionRepository cvVersionRepository;
    @Mock private JobRepository jobRepository;
    @Mock private ApplicationRepository applicationRepository;
    @Mock private ApplicationCVSnapshotRepository snapshotRepository;
    @Mock private MatchResultRepository matchResultRepository;
    @Mock private CandidateRankingService candidateRankingService;
    @Mock private ApplicationAuditLogRepository auditLogRepository;
    @Mock private MatchingEngineService matchingEngineService;

    @InjectMocks
    private ApplicationService applicationService;

    private User candidateUser;
    private CandidateProfile candidateProfile;
    private User recruiterUser;
    private Company hiringCompany;
    private RecruiterProfile recruiterProfile;
    private Job backendJob;
    private CV candidateCv;
    private CVVersion confirmedVersion;

    @BeforeEach
    void setUp() {
        // Step 1: Candidate setup
        candidateUser = User.builder().email("candidate@midcv.io").role(Role.CANDIDATE).build();
        candidateUser.setId(UUID.randomUUID());

        candidateProfile = CandidateProfile.builder()
                .user(candidateUser)
                .fullName("Nguyen Van A")
                .githubUrl("https://github.com/nguyenvana")
                .build();
        candidateProfile.setId(UUID.randomUUID());

        // Step 2: Hiring company & recruiter setup
        hiringCompany = Company.builder()
                .name("MidCV Technologies")
                .verificationStatus(CompanyVerification.VERIFIED)
                .build();
        hiringCompany.setId(UUID.randomUUID());

        recruiterUser = User.builder().email("hr@midcv.io").role(Role.HR).build();
        recruiterUser.setId(UUID.randomUUID());

        recruiterProfile = RecruiterProfile.builder()
                .user(recruiterUser)
                .company(hiringCompany)
                .fullName("HR Director")
                .build();
        recruiterProfile.setId(UUID.randomUUID());

        // Step 3: Published Job setup
        backendJob = Job.builder()
                .company(hiringCompany)
                .title("Senior Cloud Architect")
                .status(JobStatus.PUBLISHED)
                .build();
        backendJob.setId(UUID.randomUUID());

        // Step 4: CV setup (Confirmed after DRAFT phase)
        candidateCv = CV.builder()
                .candidate(candidateProfile)
                .title("Nguyen Van A - Resume")
                .rawText("Cloud Architect with 6 years experience in AWS, Kubernetes, Terraform, Go, Java")
                .status("CONFIRMED")
                .build();
        candidateCv.setId(UUID.randomUUID());

        confirmedVersion = CVVersion.builder()
                .cv(candidateCv)
                .versionNumber(1)
                .title("Nguyen Van A - Resume v1.0")
                .status("CONFIRMED")
                .rawTextContent(candidateCv.getRawText())
                .confirmedAt(ZonedDateTime.now())
                .build();
        confirmedVersion.setId(UUID.randomUUID());
    }

    @Test
    @DisplayName("AC-P10-01: Full 15-step core flow - Application submission, snapshot freeze, matching calculation, recruiter ranking and status transition")
    void testFullRecruitmentLifecycle() {
        // Step 1: Candidate submits application
        when(candidateProfileRepository.findByUserId(candidateUser.getId())).thenReturn(Optional.of(candidateProfile));
        when(jobRepository.findById(backendJob.getId())).thenReturn(Optional.of(backendJob));
        when(cvRepository.findById(candidateCv.getId())).thenReturn(Optional.of(candidateCv));
        when(cvVersionRepository.findByCvIdOrderByVersionNumberDesc(candidateCv.getId())).thenReturn(List.of(confirmedVersion));
        when(applicationRepository.existsByJobIdAndCandidateId(backendJob.getId(), candidateProfile.getId())).thenReturn(false);

        when(applicationRepository.save(any(Application.class))).thenAnswer(invocation -> {
            Application app = invocation.getArgument(0);
            app.setId(UUID.randomUUID());
            return app;
        });

        SubmitApplicationRequest submitReq = new SubmitApplicationRequest();
        submitReq.setJobId(backendJob.getId());
        submitReq.setCvId(candidateCv.getId());

        ApplicationResponse appResp = applicationService.submitApplication(candidateUser, submitReq);

        assertNotNull(appResp);
        assertEquals(ApplicationStatus.SUBMITTED, appResp.getStatus());
        assertEquals(backendJob.getId(), appResp.getJobId());

        // Verify immutable snapshot creation
        verify(snapshotRepository, times(1)).save(any(ApplicationCVSnapshot.class));

        // Step 2: Recruiter retrieves ranked applications
        when(recruiterProfileRepository.findByUserId(recruiterUser.getId())).thenReturn(Optional.of(recruiterProfile));

        Application submittedApp = Application.builder()
                .job(backendJob)
                .candidate(candidateProfile)
                .appliedCv(candidateCv)
                .appliedCvVersion(confirmedVersion)
                .status(ApplicationStatus.SUBMITTED)
                .build();
        submittedApp.setId(appResp.getId());

        MatchResult matchResult = MatchResult.builder()
                .application(submittedApp)
                .overallScore(new BigDecimal("91.20"))
                .coreScore(new BigDecimal("92.00"))
                .githubScore(new BigDecimal("86.67"))
                .requiredSkillsMissing(0)
                .status("HIGH")
                .build();

        when(candidateRankingService.getRankedCandidatesForJob(backendJob.getId(), null))
                .thenReturn(List.of(matchResult));
        when(snapshotRepository.findByApplicationId(submittedApp.getId())).thenReturn(Optional.empty());

        List<ApplicationResponse> ranked = applicationService.getRankedApplicationsForJob(recruiterUser, backendJob.getId(), null);
        assertEquals(1, ranked.size());
        assertEquals(new BigDecimal("91.20"), ranked.get(0).getMatchScore());
        assertEquals("HIGH", ranked.get(0).getMatchStatus());

        // Step 3: Recruiter makes human decision (SHORTLISTED)
        when(applicationRepository.findById(submittedApp.getId())).thenReturn(Optional.of(submittedApp));

        UpdateApplicationStatusRequest shortlistReq = UpdateApplicationStatusRequest.builder()
                .status(ApplicationStatus.SHORTLISTED)
                .decisionNote("Excellent architectural experience, 0 missing mandatory skills.")
                .build();

        ApplicationResponse decisionResp = applicationService.updateApplicationStatus(recruiterUser, submittedApp.getId(), shortlistReq);
        assertEquals(ApplicationStatus.SHORTLISTED, decisionResp.getStatus());

        // Verify audit log captured
        ArgumentCaptor<ApplicationAuditLog> logCaptor = ArgumentCaptor.forClass(ApplicationAuditLog.class);
        verify(auditLogRepository, times(1)).save(logCaptor.capture());
        assertEquals(ApplicationStatus.SUBMITTED, logCaptor.getValue().getPreviousStatus());
        assertEquals(ApplicationStatus.SHORTLISTED, logCaptor.getValue().getNewStatus());
        assertEquals(recruiterUser, logCaptor.getValue().getRecruiterUser());
    }

    @Test
    @DisplayName("AC-P10-02 & AC-P3-04: Candidate cannot submit DRAFT CV without human confirmation gate")
    void testCandidateDraftCv_CannotApply() {
        CV draftCv = CV.builder()
                .candidate(candidateProfile)
                .title("Draft CV")
                .status("DRAFT")
                .build();
        draftCv.setId(UUID.randomUUID());

        CVVersion draftVersion = CVVersion.builder()
                .cv(draftCv)
                .versionNumber(1)
                .status("DRAFT")
                .build();

        when(candidateProfileRepository.findByUserId(candidateUser.getId())).thenReturn(Optional.of(candidateProfile));
        when(jobRepository.findById(backendJob.getId())).thenReturn(Optional.of(backendJob));
        when(cvRepository.findById(draftCv.getId())).thenReturn(Optional.of(draftCv));
        when(cvVersionRepository.findByCvIdOrderByVersionNumberDesc(draftCv.getId())).thenReturn(List.of(draftVersion));

        SubmitApplicationRequest submitReq = new SubmitApplicationRequest();
        submitReq.setJobId(backendJob.getId());
        submitReq.setCvId(draftCv.getId());

        CustomException ex = assertThrows(CustomException.class, () ->
                applicationService.submitApplication(candidateUser, submitReq)
        );

        assertTrue(ex.getMessage().contains("DRAFT"));
        verify(applicationRepository, never()).save(any());
    }

    @Test
    @DisplayName("AC-P10-02: Cross-company Recruiter cannot access or modify candidate applications")
    void testCrossCompanyRecruiter_Forbidden() {
        Company otherComp = Company.builder().name("Competitor Ltd").build();
        otherComp.setId(UUID.randomUUID());

        User otherHrUser = User.builder().email("other@competitor.com").role(Role.HR).build();
        otherHrUser.setId(UUID.randomUUID());

        RecruiterProfile otherRecruiter = RecruiterProfile.builder()
                .user(otherHrUser)
                .company(otherComp)
                .fullName("Spy HR")
                .build();

        when(recruiterProfileRepository.findByUserId(otherHrUser.getId())).thenReturn(Optional.of(otherRecruiter));
        when(jobRepository.findById(backendJob.getId())).thenReturn(Optional.of(backendJob));

        assertThrows(UnauthorizedAccessException.class, () ->
                applicationService.getRankedApplicationsForJob(otherHrUser, backendJob.getId(), null)
        );
    }
}
