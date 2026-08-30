package com.platform.recruitment;

import com.platform.recruitment.common.CompanyNotVerifiedException;
import com.platform.recruitment.company.Company;
import com.platform.recruitment.company.CompanyVerification;
import com.platform.recruitment.company.RecruiterProfile;
import com.platform.recruitment.company.RecruiterProfileRepository;
import com.platform.recruitment.job.*;
import com.platform.recruitment.user.Role;
import com.platform.recruitment.user.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CompanyVerificationRuleTest {

    @Mock
    private JobRepository jobRepository;

    @Mock
    private RecruiterProfileRepository recruiterProfileRepository;

    @InjectMocks
    private JobService jobService;

    private User recruiterUser;
    private Company pendingCompany;
    private Company verifiedCompany;
    private RecruiterProfile recruiterProfile;
    private Job draftJob;

    @BeforeEach
    void setUp() {
        recruiterUser = User.builder()
                .email("hr@techcorp.com")
                .passwordHash("hashed")
                .role(Role.HR)
                .isActive(true)
                .build();
        recruiterUser.setId(UUID.randomUUID());

        pendingCompany = Company.builder()
                .name("Pending Tech Corp")
                .verificationStatus(CompanyVerification.PENDING)
                .build();
        pendingCompany.setId(UUID.randomUUID());

        verifiedCompany = Company.builder()
                .name("Verified Tech Corp")
                .verificationStatus(CompanyVerification.VERIFIED)
                .build();
        verifiedCompany.setId(UUID.randomUUID());

        recruiterProfile = RecruiterProfile.builder()
                .user(recruiterUser)
                .company(pendingCompany)
                .fullName("Nguyen Van HR")
                .build();
        recruiterProfile.setId(UUID.randomUUID());

        draftJob = Job.builder()
                .company(pendingCompany)
                .title("Senior Java Developer")
                .industry("Technology")
                .seniority("Senior")
                .status(JobStatus.DRAFT)
                .description("Job description text")
                .build();
        draftJob.setId(UUID.randomUUID());
    }

    @Test
    void testPublishJob_PendingCompany_ThrowsException() {
        when(recruiterProfileRepository.findByUserId(recruiterUser.getId())).thenReturn(Optional.of(recruiterProfile));
        when(jobRepository.findById(draftJob.getId())).thenReturn(Optional.of(draftJob));

        CompanyNotVerifiedException ex = assertThrows(CompanyNotVerifiedException.class, () -> {
            jobService.publishJob(recruiterUser, draftJob.getId());
        });

        assertTrue(ex.getMessage().contains("Only VERIFIED companies can publish jobs"));
        verify(jobRepository, never()).save(any());
    }

    @Test
    void testPublishJob_VerifiedCompany_Success() {
        // Change company to VERIFIED
        recruiterProfile.setCompany(verifiedCompany);
        draftJob.setCompany(verifiedCompany);

        when(recruiterProfileRepository.findByUserId(recruiterUser.getId())).thenReturn(Optional.of(recruiterProfile));
        when(jobRepository.findById(draftJob.getId())).thenReturn(Optional.of(draftJob));
        when(jobRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        JobResponse response = jobService.publishJob(recruiterUser, draftJob.getId());

        assertNotNull(response);
        assertEquals(JobStatus.PUBLISHED, response.getStatus());
        verify(jobRepository, times(1)).save(any());
    }
}
