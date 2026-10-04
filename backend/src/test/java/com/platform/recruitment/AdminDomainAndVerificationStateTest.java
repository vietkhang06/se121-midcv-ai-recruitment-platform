package com.platform.recruitment;

import com.platform.recruitment.admin.model.AdminAuditLog;
import com.platform.recruitment.admin.model.ReportStatus;
import com.platform.recruitment.admin.model.ReportTargetType;
import com.platform.recruitment.admin.model.SystemReport;
import com.platform.recruitment.common.CompanyNotVerifiedException;
import com.platform.recruitment.company.Company;
import com.platform.recruitment.company.CompanyVerification;
import com.platform.recruitment.company.RecruiterProfile;
import com.platform.recruitment.company.RecruiterProfileRepository;
import com.platform.recruitment.job.Job;
import com.platform.recruitment.job.JobRepository;
import com.platform.recruitment.job.JobService;
import com.platform.recruitment.job.JobStatus;
import com.platform.recruitment.user.Role;
import com.platform.recruitment.user.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.ZonedDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AdminDomainAndVerificationStateTest {

    @Mock
    private JobRepository jobRepository;

    @Mock
    private RecruiterProfileRepository recruiterProfileRepository;

    @InjectMocks
    private JobService jobService;

    private User adminUser;
    private User recruiterUser;
    private Company testCompany;
    private RecruiterProfile recruiterProfile;
    private Job testJob;

    @BeforeEach
    void setUp() {
        adminUser = User.builder()
                .email("admin@midcv.io")
                .role(Role.ADMIN)
                .isActive(true)
                .build();
        adminUser.setId(UUID.randomUUID());

        recruiterUser = User.builder()
                .email("hr@enterprise.com")
                .role(Role.HR)
                .isActive(true)
                .build();
        recruiterUser.setId(UUID.randomUUID());

        testCompany = Company.builder()
                .name("Enterprise Corp")
                .verificationStatus(CompanyVerification.PENDING)
                .version(0L)
                .build();
        testCompany.setId(UUID.randomUUID());

        recruiterProfile = RecruiterProfile.builder()
                .user(recruiterUser)
                .company(testCompany)
                .fullName("HR Manager")
                .build();
        recruiterProfile.setId(UUID.randomUUID());

        testJob = Job.builder()
                .company(testCompany)
                .title("Staff Cloud Engineer")
                .industry("Information Technology")
                .seniority("Staff")
                .status(JobStatus.DRAFT)
                .description("Cloud Architecture and Kubernetes Operations")
                .build();
        testJob.setId(UUID.randomUUID());
    }

    @Test
    @DisplayName("Gating Rule: Non-verified company states must reject job publication")
    void testNonVerifiedCompanyStates_BlockedFromPublishing() {
        when(recruiterProfileRepository.findByUserId(recruiterUser.getId())).thenReturn(Optional.of(recruiterProfile));
        when(jobRepository.findById(testJob.getId())).thenReturn(Optional.of(testJob));

        CompanyVerification[] blockedStates = {
                CompanyVerification.PENDING,
                CompanyVerification.UNDER_REVIEW,
                CompanyVerification.CHANGES_REQUESTED,
                CompanyVerification.REJECTED,
                CompanyVerification.SUSPENDED
        };

        for (CompanyVerification state : blockedStates) {
            testCompany.setVerificationStatus(state);
            CompanyNotVerifiedException ex = assertThrows(CompanyNotVerifiedException.class, () -> {
                jobService.publishJob(recruiterUser, testJob.getId());
            });
            assertTrue(ex.getMessage().contains("Only VERIFIED companies can publish jobs"));
        }

        verify(jobRepository, never()).save(any());
    }

    @Test
    @DisplayName("Gating Rule: VERIFIED company publishes job successfully")
    void testVerifiedCompany_PublishSuccess() {
        testCompany.setVerificationStatus(CompanyVerification.VERIFIED);
        when(recruiterProfileRepository.findByUserId(recruiterUser.getId())).thenReturn(Optional.of(recruiterProfile));
        when(jobRepository.findById(testJob.getId())).thenReturn(Optional.of(testJob));
        when(jobRepository.save(any(Job.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = jobService.publishJob(recruiterUser, testJob.getId());

        assertNotNull(response);
        assertEquals(JobStatus.PUBLISHED, response.getStatus());
        verify(jobRepository, times(1)).save(testJob);
    }

    @Test
    @DisplayName("Company entity correctly tracks review metadata and version")
    void testCompanyReviewMetadataTracking() {
        testCompany.setVerificationStatus(CompanyVerification.UNDER_REVIEW);
        testCompany.setReviewedBy(adminUser);
        testCompany.setReviewedAt(ZonedDateTime.now());
        testCompany.setReviewNotes("Checking business registration certificate.");

        assertEquals(CompanyVerification.UNDER_REVIEW, testCompany.getVerificationStatus());
        assertEquals(adminUser, testCompany.getReviewedBy());
        assertNotNull(testCompany.getReviewedAt());
        assertEquals("Checking business registration certificate.", testCompany.getReviewNotes());
        assertEquals(0L, testCompany.getVersion());
    }

    @Test
    @DisplayName("SystemReport domain model records report details and resolution")
    void testSystemReportDomainModel() {
        SystemReport report = SystemReport.builder()
                .reporter(recruiterUser)
                .targetType(ReportTargetType.JOB)
                .targetId(testJob.getId())
                .reason("Misleading job description")
                .details("Salary advertised does not match actual requirements.")
                .status(ReportStatus.PENDING)
                .build();
        report.setId(UUID.randomUUID());

        assertEquals(ReportStatus.PENDING, report.getStatus());
        assertEquals(ReportTargetType.JOB, report.getTargetType());
        assertEquals(testJob.getId(), report.getTargetId());

        // Admin resolves report
        report.setStatus(ReportStatus.RESOLVED);
        report.setResolvedBy(adminUser);
        report.setResolvedAt(ZonedDateTime.now());
        report.setResolutionNotes("Job has been suspended for revision.");

        assertEquals(ReportStatus.RESOLVED, report.getStatus());
        assertEquals(adminUser, report.getResolvedBy());
        assertNotNull(report.getResolvedAt());
    }

    @Test
    @DisplayName("AdminAuditLog records immutable administration action")
    void testAdminAuditLogDomainModel() {
        AdminAuditLog auditLog = AdminAuditLog.builder()
                .admin(adminUser)
                .action("SUSPEND_COMPANY")
                .targetType("COMPANY")
                .targetId(testCompany.getId())
                .previousState("VERIFIED")
                .newState("SUSPENDED")
                .reason("Fraudulent business documentation reported by candidate.")
                .correlationId(UUID.randomUUID().toString())
                .ipAddress("10.0.0.1")
                .build();
        auditLog.setId(UUID.randomUUID());

        assertEquals("SUSPEND_COMPANY", auditLog.getAction());
        assertEquals("COMPANY", auditLog.getTargetType());
        assertEquals(testCompany.getId(), auditLog.getTargetId());
        assertEquals("VERIFIED", auditLog.getPreviousState());
        assertEquals("SUSPENDED", auditLog.getNewState());
        assertEquals(adminUser, auditLog.getAdmin());
    }
}
