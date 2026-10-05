package com.platform.recruitment;

import com.platform.recruitment.common.CompanyNotVerifiedException;
import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.ErrorCode;
import com.platform.recruitment.company.Company;
import com.platform.recruitment.company.CompanyOperationalStatus;
import com.platform.recruitment.company.CompanyRepository;
import com.platform.recruitment.company.CompanyVerification;
import com.platform.recruitment.company.RecruiterProfile;
import com.platform.recruitment.company.RecruiterProfileRepository;
import com.platform.recruitment.company.service.CompanyVerificationService;
import com.platform.recruitment.job.Job;
import com.platform.recruitment.job.JobRepository;
import com.platform.recruitment.job.JobResponse;
import com.platform.recruitment.job.JobService;
import com.platform.recruitment.job.JobStatus;
import com.platform.recruitment.suspension.SuspensionGuard;
import com.platform.recruitment.suspension.SuspensionRecord;
import com.platform.recruitment.suspension.SuspensionRecordRepository;
import com.platform.recruitment.suspension.SuspensionStatus;
import com.platform.recruitment.suspension.SuspensionTargetType;
import com.platform.recruitment.user.AccountStatus;
import com.platform.recruitment.user.Role;
import com.platform.recruitment.user.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CompanyVerificationAndOperationalStatusTest {

    @Mock
    private CompanyRepository companyRepository;

    @Mock
    private RecruiterProfileRepository recruiterProfileRepository;

    @Mock
    private JobRepository jobRepository;

    @Mock
    private SuspensionRecordRepository suspensionRecordRepository;

    @Mock
    private com.platform.recruitment.admin.service.AdminAuditLogService adminAuditLogService;

    private CompanyVerificationService companyVerificationService;
    private SuspensionGuard suspensionGuard;
    private JobService jobService;

    private User adminUser;
    private User recruiterUser;
    private RecruiterProfile recruiterProfile;
    private Company testCompany;
    private Job testJob;

    @BeforeEach
    void setUp() {
        companyVerificationService = new CompanyVerificationService(
                companyRepository,
                recruiterProfileRepository,
                jobRepository,
                adminAuditLogService,
                suspensionRecordRepository
        );

        suspensionGuard = new SuspensionGuard(recruiterProfileRepository);
        jobService = new JobService(jobRepository, recruiterProfileRepository, suspensionGuard);

        adminUser = User.builder()
                .email("admin@platform.com")
                .role(Role.ADMIN)
                .accountStatus(AccountStatus.ACTIVE)
                .isActive(true)
                .build();
        adminUser.setId(UUID.randomUUID());

        recruiterUser = User.builder()
                .email("recruiter@company.com")
                .role(Role.HR)
                .accountStatus(AccountStatus.ACTIVE)
                .isActive(true)
                .build();
        recruiterUser.setId(UUID.randomUUID());

        testCompany = Company.builder()
                .name("Acme Corp")
                .taxCode("0123456789")
                .verificationStatus(CompanyVerification.VERIFIED)
                .operationalStatus(CompanyOperationalStatus.ACTIVE)
                .build();
        testCompany.setId(UUID.randomUUID());

        recruiterProfile = RecruiterProfile.builder()
                .user(recruiterUser)
                .company(testCompany)
                .fullName("John Recruiter")
                .build();
        recruiterProfile.setId(UUID.randomUUID());

        testJob = Job.builder()
                .company(testCompany)
                .title("Software Engineer")
                .status(JobStatus.DRAFT)
                .build();
        testJob.setId(UUID.randomUUID());
    }

    @Test
    @DisplayName("Company VERIFIED + ACTIVE is permitted to publish job")
    void testVerifiedAndActive_AllowedToPublishJob() {
        testCompany.setVerificationStatus(CompanyVerification.VERIFIED);
        testCompany.setOperationalStatus(CompanyOperationalStatus.ACTIVE);

        when(jobRepository.findById(testJob.getId())).thenReturn(Optional.of(testJob));
        when(recruiterProfileRepository.findByUserId(recruiterUser.getId())).thenReturn(Optional.of(recruiterProfile));
        when(jobRepository.save(any(Job.class))).thenAnswer(i -> i.getArgument(0));

        JobResponse response = jobService.publishJob(recruiterUser, testJob.getId());

        assertThat(response.getStatus()).isEqualTo(JobStatus.PUBLISHED);
        verify(jobRepository, times(1)).save(testJob);
    }

    @Test
    @DisplayName("Company VERIFIED + SUSPENDED is blocked from publishing job")
    void testVerifiedAndSuspended_BlockedFromPublishingJob() {
        testCompany.setVerificationStatus(CompanyVerification.VERIFIED);
        testCompany.setOperationalStatus(CompanyOperationalStatus.SUSPENDED);

        when(recruiterProfileRepository.findByUserId(recruiterUser.getId())).thenReturn(Optional.of(recruiterProfile));

        assertThatThrownBy(() -> jobService.publishJob(recruiterUser, testJob.getId()))
                .isInstanceOf(CustomException.class)
                .satisfies(ex -> {
                    CustomException ce = (CustomException) ex;
                    assertThat(ce.getErrorCode()).isEqualTo(ErrorCode.COMPANY_SUSPENDED);
                });

        verify(jobRepository, never()).save(any());
    }

    @Test
    @DisplayName("Company PENDING + ACTIVE is blocked from publishing job")
    void testPendingAndActive_BlockedFromPublishingJob() {
        testCompany.setVerificationStatus(CompanyVerification.PENDING);
        testCompany.setOperationalStatus(CompanyOperationalStatus.ACTIVE);

        when(jobRepository.findById(testJob.getId())).thenReturn(Optional.of(testJob));
        when(recruiterProfileRepository.findByUserId(recruiterUser.getId())).thenReturn(Optional.of(recruiterProfile));

        assertThatThrownBy(() -> jobService.publishJob(recruiterUser, testJob.getId()))
                .isInstanceOf(CompanyNotVerifiedException.class)
                .hasMessageContaining("PENDING");

        verify(jobRepository, never()).save(any());
    }

    @Test
    @DisplayName("Company REJECTED + ACTIVE is blocked from publishing job")
    void testRejectedAndActive_BlockedFromPublishingJob() {
        testCompany.setVerificationStatus(CompanyVerification.REJECTED);
        testCompany.setOperationalStatus(CompanyOperationalStatus.ACTIVE);

        when(jobRepository.findById(testJob.getId())).thenReturn(Optional.of(testJob));
        when(recruiterProfileRepository.findByUserId(recruiterUser.getId())).thenReturn(Optional.of(recruiterProfile));

        assertThatThrownBy(() -> jobService.publishJob(recruiterUser, testJob.getId()))
                .isInstanceOf(CompanyNotVerifiedException.class)
                .hasMessageContaining("REJECTED");

        verify(jobRepository, never()).save(any());
    }

    @Test
    @DisplayName("Lifting suspension on VERIFIED + SUSPENDED restores operationalStatus to ACTIVE and preserves VERIFIED")
    void testLiftSuspension_PreservesVerifiedStatus() {
        testCompany.setVerificationStatus(CompanyVerification.VERIFIED);
        testCompany.setOperationalStatus(CompanyOperationalStatus.SUSPENDED);

        when(companyRepository.findById(testCompany.getId())).thenReturn(Optional.of(testCompany));
        when(companyRepository.save(any(Company.class))).thenAnswer(i -> i.getArgument(0));
        when(jobRepository.findByCompanyId(testCompany.getId())).thenReturn(List.of());

        companyVerificationService.restore(adminUser, testCompany.getId(), "Doanh nghiệp đã giải trình đầy đủ", null, "127.0.0.1");

        assertThat(testCompany.getOperationalStatus()).isEqualTo(CompanyOperationalStatus.ACTIVE);
        assertThat(testCompany.getVerificationStatus()).isEqualTo(CompanyVerification.VERIFIED);
    }

    @Test
    @DisplayName("Lifting suspension on PENDING + SUSPENDED restores operationalStatus to ACTIVE but does NOT verify company")
    void testLiftSuspension_DoesNotAutoVerifyPendingCompany() {
        testCompany.setVerificationStatus(CompanyVerification.PENDING);
        testCompany.setOperationalStatus(CompanyOperationalStatus.SUSPENDED);

        when(companyRepository.findById(testCompany.getId())).thenReturn(Optional.of(testCompany));
        when(companyRepository.save(any(Company.class))).thenAnswer(i -> i.getArgument(0));
        when(jobRepository.findByCompanyId(testCompany.getId())).thenReturn(List.of());

        companyVerificationService.restore(adminUser, testCompany.getId(), "Gỡ đình chỉ tạm thời", null, "127.0.0.1");

        assertThat(testCompany.getOperationalStatus()).isEqualTo(CompanyOperationalStatus.ACTIVE);
        assertThat(testCompany.getVerificationStatus()).isEqualTo(CompanyVerification.PENDING);
    }

    @Test
    @DisplayName("Lifting suspension on REJECTED + SUSPENDED restores operationalStatus to ACTIVE but does NOT verify company")
    void testLiftSuspension_DoesNotAutoVerifyRejectedCompany() {
        testCompany.setVerificationStatus(CompanyVerification.REJECTED);
        testCompany.setOperationalStatus(CompanyOperationalStatus.SUSPENDED);

        when(companyRepository.findById(testCompany.getId())).thenReturn(Optional.of(testCompany));
        when(companyRepository.save(any(Company.class))).thenAnswer(i -> i.getArgument(0));
        when(jobRepository.findByCompanyId(testCompany.getId())).thenReturn(List.of());

        companyVerificationService.restore(adminUser, testCompany.getId(), "Gỡ đình chỉ tài khoản doanh nghiệp", null, "127.0.0.1");

        assertThat(testCompany.getOperationalStatus()).isEqualTo(CompanyOperationalStatus.ACTIVE);
        assertThat(testCompany.getVerificationStatus()).isEqualTo(CompanyVerification.REJECTED);
    }

    @Test
    @DisplayName("Suspending company cascades active published jobs to SUSPENDED with moderation reason")
    void testSuspendCompany_CascadesToPublishedJobs() {
        testCompany.setVerificationStatus(CompanyVerification.VERIFIED);
        testCompany.setOperationalStatus(CompanyOperationalStatus.ACTIVE);

        Job publishedJob = Job.builder()
                .company(testCompany)
                .title("Senior Dev")
                .status(JobStatus.PUBLISHED)
                .build();
        publishedJob.setId(UUID.randomUUID());

        Job draftJob = Job.builder()
                .company(testCompany)
                .title("Intern")
                .status(JobStatus.DRAFT)
                .build();
        draftJob.setId(UUID.randomUUID());

        when(companyRepository.findById(testCompany.getId())).thenReturn(Optional.of(testCompany));
        when(companyRepository.save(any(Company.class))).thenAnswer(i -> i.getArgument(0));
        when(jobRepository.findByCompanyId(testCompany.getId())).thenReturn(List.of(publishedJob, draftJob));

        companyVerificationService.suspend(adminUser, testCompany.getId(), "Hành vi gian lận hồ sơ", null, "127.0.0.1");

        assertThat(testCompany.getOperationalStatus()).isEqualTo(CompanyOperationalStatus.SUSPENDED);
        assertThat(publishedJob.getStatus()).isEqualTo(JobStatus.SUSPENDED);
        assertThat(publishedJob.getModerationReason()).isEqualTo("Doanh nghiệp bị tạm đình chỉ hoạt động");
        // Draft job should not be modified
        assertThat(draftJob.getStatus()).isEqualTo(JobStatus.DRAFT);
    }

    @Test
    @DisplayName("Public getJobById blocks viewing job of a suspended company")
    void testGetJobById_SuspendedCompany_ThrowsForbidden() {
        testCompany.setOperationalStatus(CompanyOperationalStatus.SUSPENDED);
        testJob.setStatus(JobStatus.PUBLISHED);

        when(jobRepository.findById(testJob.getId())).thenReturn(Optional.of(testJob));

        assertThatThrownBy(() -> jobService.getJobById(testJob.getId()))
                .isInstanceOf(CustomException.class)
                .satisfies(ex -> {
                    CustomException ce = (CustomException) ex;
                    assertThat(ce.getErrorCode()).isEqualTo(ErrorCode.COMPANY_SUSPENDED);
                });
    }
}
