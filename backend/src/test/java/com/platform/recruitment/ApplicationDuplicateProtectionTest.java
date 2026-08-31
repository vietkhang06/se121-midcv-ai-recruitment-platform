package com.platform.recruitment;

import com.platform.recruitment.application.*;
import com.platform.recruitment.candidate.CandidateProfile;
import com.platform.recruitment.candidate.CandidateProfileRepository;
import com.platform.recruitment.common.DuplicateApplicationException;
import com.platform.recruitment.cv.CV;
import com.platform.recruitment.cv.CVRepository;
import com.platform.recruitment.job.Job;
import com.platform.recruitment.job.JobRepository;
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

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class ApplicationDuplicateProtectionTest {

    @Mock
    private ApplicationRepository applicationRepository;

    @Mock
    private ApplicationCVSnapshotRepository snapshotRepository;

    @Mock
    private JobRepository jobRepository;

    @Mock
    private CandidateProfileRepository candidateProfileRepository;

    @Mock
    private CVRepository cvRepository;

    @InjectMocks
    private ApplicationService applicationService;

    private User candidateUser;
    private CandidateProfile candidate;
    private Job job1;
    private Job job2;
    private CV cv;
    private SubmitApplicationRequest request1;

    @BeforeEach
    void setUp() {
        UUID candidateUserId = UUID.randomUUID();
        UUID candidateProfileId = UUID.randomUUID();
        UUID job1Id = UUID.randomUUID();
        UUID job2Id = UUID.randomUUID();
        UUID cvId = UUID.randomUUID();

        candidateUser = User.builder().email("candidate@test.com").role(Role.CANDIDATE).build();
        candidateUser.setId(candidateUserId);

        candidate = CandidateProfile.builder().user(candidateUser).fullName("Nguyen Van A").build();
        candidate.setId(candidateProfileId);

        job1 = Job.builder().title("Backend Engineer").status(JobStatus.PUBLISHED).build();
        job1.setId(job1Id);

        job2 = Job.builder().title("Frontend Engineer").status(JobStatus.PUBLISHED).build();
        job2.setId(job2Id);

        cv = CV.builder().candidate(candidate).title("Java CV").build();
        cv.setId(cvId);

        request1 = new SubmitApplicationRequest();
        request1.setJobId(job1Id);
        request1.setCvId(cvId);
    }

    @Test
    @DisplayName("Case A: Normal Application Submission -> Success")
    void testNormalApplication_Success() {
        when(candidateProfileRepository.findByUserId(candidateUser.getId())).thenReturn(Optional.of(candidate));
        when(jobRepository.findById(job1.getId())).thenReturn(Optional.of(job1));
        when(cvRepository.findById(cv.getId())).thenReturn(Optional.of(cv));
        when(applicationRepository.existsByJobIdAndCandidateId(job1.getId(), candidate.getId())).thenReturn(false);

        Application mockApp = Application.builder().job(job1).candidate(candidate).appliedCv(cv).status(ApplicationStatus.SUBMITTED).build();
        mockApp.setId(UUID.randomUUID());
        when(applicationRepository.save(any(Application.class))).thenReturn(mockApp);

        ApplicationResponse response = applicationService.submitApplication(candidateUser, request1);

        assertNotNull(response);
        assertEquals(job1.getId(), response.getJobId());
        assertEquals(candidate.getId(), response.getCandidateId());
        verify(applicationRepository, times(1)).save(any(Application.class));
        verify(snapshotRepository, times(1)).save(any(ApplicationCVSnapshot.class));
    }

    @Test
    @DisplayName("Case B: Duplicate Application Submission -> Rejected with 409 Conflict")
    void testDuplicateApplication_Rejection409() {
        when(candidateProfileRepository.findByUserId(candidateUser.getId())).thenReturn(Optional.of(candidate));
        when(jobRepository.findById(job1.getId())).thenReturn(Optional.of(job1));
        when(cvRepository.findById(cv.getId())).thenReturn(Optional.of(cv));
        when(applicationRepository.existsByJobIdAndCandidateId(job1.getId(), candidate.getId())).thenReturn(true);

        DuplicateApplicationException exception = assertThrows(
                DuplicateApplicationException.class,
                () -> applicationService.submitApplication(candidateUser, request1)
        );

        assertTrue(exception.getMessage().contains("already submitted an application"));
        verify(applicationRepository, never()).save(any(Application.class));
        verify(snapshotRepository, never()).save(any(ApplicationCVSnapshot.class));
    }

    @Test
    @DisplayName("Case C: Candidate applies to another job -> Allowed")
    void testCandidateAppliesToAnotherJob_Allowed() {
        SubmitApplicationRequest request2 = new SubmitApplicationRequest();
        request2.setJobId(job2.getId());
        request2.setCvId(cv.getId());

        when(candidateProfileRepository.findByUserId(candidateUser.getId())).thenReturn(Optional.of(candidate));
        when(jobRepository.findById(job2.getId())).thenReturn(Optional.of(job2));
        when(cvRepository.findById(cv.getId())).thenReturn(Optional.of(cv));
        when(applicationRepository.existsByJobIdAndCandidateId(job2.getId(), candidate.getId())).thenReturn(false);

        Application mockApp2 = Application.builder().job(job2).candidate(candidate).appliedCv(cv).status(ApplicationStatus.SUBMITTED).build();
        mockApp2.setId(UUID.randomUUID());
        when(applicationRepository.save(any(Application.class))).thenReturn(mockApp2);

        ApplicationResponse response = applicationService.submitApplication(candidateUser, request2);

        assertNotNull(response);
        assertEquals(job2.getId(), response.getJobId());
        verify(applicationRepository, times(1)).save(any(Application.class));
    }
}
