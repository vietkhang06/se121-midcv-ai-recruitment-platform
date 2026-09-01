package com.platform.recruitment;

import com.platform.recruitment.application.ApplicationRepository;
import com.platform.recruitment.application.ApplicationService;
import com.platform.recruitment.common.UnauthorizedAccessException;
import com.platform.recruitment.company.Company;
import com.platform.recruitment.company.RecruiterProfile;
import com.platform.recruitment.company.RecruiterProfileRepository;
import com.platform.recruitment.job.Job;
import com.platform.recruitment.job.JobRepository;
import com.platform.recruitment.user.Role;
import com.platform.recruitment.user.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class RecruiterSecurityOwnershipTest {

    @Mock
    private RecruiterProfileRepository recruiterProfileRepository;

    @Mock
    private JobRepository jobRepository;

    @Mock
    private ApplicationRepository applicationRepository;

    @InjectMocks
    private ApplicationService applicationService;

    private User recruiterUserA;
    private RecruiterProfile recruiterA;
    private Company companyA;

    private Company companyB;
    private Job jobB;

    @BeforeEach
    void setUp() {
        UUID userAId = UUID.randomUUID();
        UUID recAId = UUID.randomUUID();
        UUID compAId = UUID.randomUUID();

        UUID compBId = UUID.randomUUID();
        UUID jobBId = UUID.randomUUID();

        recruiterUserA = User.builder().email("hrA@companyA.com").role(Role.HR).build();
        recruiterUserA.setId(userAId);

        companyA = Company.builder().name("Company A").build();
        companyA.setId(compAId);

        recruiterA = RecruiterProfile.builder().user(recruiterUserA).company(companyA).fullName("HR Manager A").build();
        recruiterA.setId(recAId);

        companyB = Company.builder().name("Company B").build();
        companyB.setId(compBId);

        jobB = Job.builder().company(companyB).title("Job of Company B").build();
        jobB.setId(jobBId);
    }

    @Test
    @DisplayName("Cross-Company Access: Recruiter A accessing Recruiter B job -> Throws 403 UnauthorizedAccessException")
    void testRecruiterCrossCompanyAccess_Rejected() {
        when(recruiterProfileRepository.findByUserId(recruiterUserA.getId())).thenReturn(Optional.of(recruiterA));
        when(jobRepository.findById(jobB.getId())).thenReturn(Optional.of(jobB));

        UnauthorizedAccessException exception = assertThrows(
                UnauthorizedAccessException.class,
                () -> applicationService.getApplicationsForJob(recruiterUserA, jobB.getId())
        );

        assertTrue(exception.getMessage().contains("Recruiter does not own the company"));
        verify(applicationRepository, never()).findByJobId(any());
    }
}
