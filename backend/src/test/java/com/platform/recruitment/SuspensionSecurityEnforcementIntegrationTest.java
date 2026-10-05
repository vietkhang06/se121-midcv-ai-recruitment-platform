package com.platform.recruitment;

import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.ErrorCode;
import com.platform.recruitment.common.UnauthorizedAccessException;
import com.platform.recruitment.company.Company;
import com.platform.recruitment.company.CompanyVerification;
import com.platform.recruitment.company.RecruiterProfile;
import com.platform.recruitment.company.RecruiterProfileRepository;
import com.platform.recruitment.job.*;
import com.platform.recruitment.suspension.SuspensionGuard;
import com.platform.recruitment.user.AccountStatus;
import com.platform.recruitment.user.Role;
import com.platform.recruitment.user.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SuspensionSecurityEnforcementIntegrationTest {

    @Mock
    private RecruiterProfileRepository recruiterProfileRepository;

    @Mock
    private JobRepository jobRepository;

    private SuspensionGuard suspensionGuard;
    private JobService jobService;

    private User activeRecruiterUser;
    private User suspendedRecruiterUser;
    private Company verifiedCompany;
    private Company suspendedCompany;
    private RecruiterProfile activeRecruiterProfile;
    private RecruiterProfile suspendedCompanyRecruiterProfile;
    private Job activeJob;

    @BeforeEach
    void setUp() {
        suspensionGuard = new SuspensionGuard(recruiterProfileRepository);
        jobService = new JobService(jobRepository, recruiterProfileRepository, suspensionGuard);

        UUID companyId1 = UUID.randomUUID();
        verifiedCompany = Company.builder()
                .name("Tech Corp")
                .verificationStatus(CompanyVerification.VERIFIED)
                .build();
        verifiedCompany.setId(companyId1);

        UUID companyId2 = UUID.randomUUID();
        suspendedCompany = Company.builder()
                .name("Scam Corp")
                .verificationStatus(CompanyVerification.VERIFIED)
                .operationalStatus(com.platform.recruitment.company.CompanyOperationalStatus.SUSPENDED)
                .build();
        suspendedCompany.setId(companyId2);

        activeRecruiterUser = User.builder()
                .email("active_recruiter@techcorp.com")
                .role(Role.HR)
                .accountStatus(AccountStatus.ACTIVE)
                .isActive(true)
                .build();
        activeRecruiterUser.setId(UUID.randomUUID());

        suspendedRecruiterUser = User.builder()
                .email("suspended_recruiter@techcorp.com")
                .role(Role.HR)
                .accountStatus(AccountStatus.SUSPENDED)
                .isActive(false)
                .build();
        suspendedRecruiterUser.setId(UUID.randomUUID());

        activeRecruiterProfile = RecruiterProfile.builder()
                .user(activeRecruiterUser)
                .company(verifiedCompany)
                .fullName("John Recruiter")
                .build();

        suspendedCompanyRecruiterProfile = RecruiterProfile.builder()
                .user(activeRecruiterUser)
                .company(suspendedCompany)
                .fullName("Suspended Co Recruiter")
                .build();

        activeJob = Job.builder()
                .company(verifiedCompany)
                .title("Senior Backend Engineer")
                .status(JobStatus.DRAFT)
                .build();
        activeJob.setId(UUID.randomUUID());
    }

    @Test
    @DisplayName("Active recruiter can create draft job successfully")
    void testActiveRecruiterCanCreateJob() {
        when(recruiterProfileRepository.findByUserId(activeRecruiterUser.getId()))
                .thenReturn(Optional.of(activeRecruiterProfile));
        when(jobRepository.save(any(Job.class))).thenAnswer(invocation -> {
            Job j = invocation.getArgument(0);
            j.setId(UUID.randomUUID());
            return j;
        });

        CreateJobRequest request = new CreateJobRequest();
        request.setTitle("Senior Backend Engineer");
        request.setIndustry("IT");
        request.setSeniority("Senior");

        JobResponse response = jobService.createDraftJob(activeRecruiterUser, request);
        assertThat(response).isNotNull();
        assertThat(response.getTitle()).isEqualTo("Senior Backend Engineer");
    }

    @Test
    @DisplayName("Suspended recruiter is blocked from creating draft job with ACCOUNT_SUSPENDED")
    void testSuspendedRecruiterCannotCreateJob() {
        CreateJobRequest request = new CreateJobRequest();
        request.setTitle("New Job");

        assertThatThrownBy(() -> jobService.createDraftJob(suspendedRecruiterUser, request))
                .isInstanceOf(CustomException.class)
                .satisfies(ex -> {
                    CustomException ce = (CustomException) ex;
                    assertThat(ce.getErrorCode()).isEqualTo(ErrorCode.ACCOUNT_SUSPENDED);
                });

        verify(jobRepository, never()).save(any());
    }

    @Test
    @DisplayName("Suspended recruiter is blocked from publishing job with ACCOUNT_SUSPENDED")
    void testSuspendedRecruiterCannotPublishJob() {
        assertThatThrownBy(() -> jobService.publishJob(suspendedRecruiterUser, activeJob.getId()))
                .isInstanceOf(CustomException.class)
                .satisfies(ex -> {
                    CustomException ce = (CustomException) ex;
                    assertThat(ce.getErrorCode()).isEqualTo(ErrorCode.ACCOUNT_SUSPENDED);
                });

        assertThat(activeJob.getStatus()).isEqualTo(JobStatus.DRAFT);
        verify(jobRepository, never()).save(any());
    }

    @Test
    @DisplayName("Suspended company blocks active recruiter with COMPANY_SUSPENDED")
    void testSuspendedCompanyBlocksRecruiter() {
        when(recruiterProfileRepository.findByUserId(activeRecruiterUser.getId()))
                .thenReturn(Optional.of(suspendedCompanyRecruiterProfile));

        CreateJobRequest request = new CreateJobRequest();
        request.setTitle("Job from Suspended Company");

        assertThatThrownBy(() -> jobService.createDraftJob(activeRecruiterUser, request))
                .isInstanceOf(CustomException.class)
                .satisfies(ex -> {
                    CustomException ce = (CustomException) ex;
                    assertThat(ce.getErrorCode()).isEqualTo(ErrorCode.COMPANY_SUSPENDED);
                });

        verify(jobRepository, never()).save(any());
    }

    @Test
    @DisplayName("Recruiter cannot manage job of another company (multi-tenant protection)")
    void testMultiTenantJobOwnership() {
        Company otherCompany = Company.builder()
                .name("Other Company")
                .verificationStatus(CompanyVerification.VERIFIED)
                .build();
        otherCompany.setId(UUID.randomUUID());

        Job otherJob = Job.builder()
                .company(otherCompany)
                .title("Other Job")
                .status(JobStatus.DRAFT)
                .build();
        otherJob.setId(UUID.randomUUID());

        when(jobRepository.findById(otherJob.getId())).thenReturn(Optional.of(otherJob));
        when(recruiterProfileRepository.findByUserId(activeRecruiterUser.getId()))
                .thenReturn(Optional.of(activeRecruiterProfile));

        assertThatThrownBy(() -> jobService.publishJob(activeRecruiterUser, otherJob.getId()))
                .isInstanceOf(UnauthorizedAccessException.class);
    }

    @Test
    @DisplayName("After reactivation, recruiter permissions are restored")
    void testReactivatedRecruiterRegainsAccess() {
        // Initially suspended
        assertThat(suspendedRecruiterUser.isSuspended()).isTrue();

        // Admin reactivates
        suspendedRecruiterUser.reactivate();
        assertThat(suspendedRecruiterUser.isSuspended()).isFalse();
        assertThat(suspendedRecruiterUser.getAccountStatus()).isEqualTo(AccountStatus.ACTIVE);
        assertThat(suspendedRecruiterUser.getIsActive()).isTrue();

        // Check guard passes
        suspensionGuard.checkRecruiterOperationAllowed(suspendedRecruiterUser);
    }
}
