package com.platform.recruitment;

import com.platform.recruitment.application.ApplicationRepository;

import com.platform.recruitment.application.ApplicationService;
import com.platform.recruitment.application.SubmitApplicationRequest;
import com.platform.recruitment.candidate.CandidateProfile;
import com.platform.recruitment.candidate.CandidateProfileRepository;
import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.cv.CV;
import com.platform.recruitment.cv.CVCreationPath;
import com.platform.recruitment.cv.CVRepository;
import com.platform.recruitment.job.Job;
import com.platform.recruitment.job.JobRepository;
import com.platform.recruitment.job.JobStatus;
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
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ApplicationUnpublishedJobRuleTest {

    @Mock
    private ApplicationRepository applicationRepository;

    @Mock
    private JobRepository jobRepository;

    @Mock
    private CandidateProfileRepository candidateProfileRepository;

    @Mock
    private CVRepository cvRepository;

    @InjectMocks
    private ApplicationService applicationService;

    private User candidateUser;
    private CandidateProfile candidateProfile;
    private Job draftJob;
    private CV candidateCV;

    @BeforeEach
    void setUp() {
        candidateUser = User.builder()
                .email("candidate@example.com")
                .role(Role.CANDIDATE)
                .build();
        candidateUser.setId(UUID.randomUUID());

        candidateProfile = CandidateProfile.builder()
                .user(candidateUser)
                .fullName("Nguyen Van Candidate")
                .build();
        candidateProfile.setId(UUID.randomUUID());

        draftJob = Job.builder()
                .title("Draft Java Job")
                .status(JobStatus.DRAFT)
                .description("Draft description")
                .build();
        draftJob.setId(UUID.randomUUID());

        candidateCV = CV.builder()
                .candidate(candidateProfile)
                .title("Java CV")
                .creationPath(CVCreationPath.BUILDER)
                .build();
        candidateCV.setId(UUID.randomUUID());
    }

    @Test
    void testSubmitApplication_DraftJob_ThrowsCustomException() {
        SubmitApplicationRequest request = new SubmitApplicationRequest();
        request.setJobId(draftJob.getId());
        request.setCvId(candidateCV.getId());

        when(candidateProfileRepository.findByUserId(candidateUser.getId())).thenReturn(Optional.of(candidateProfile));
        when(jobRepository.findById(draftJob.getId())).thenReturn(Optional.of(draftJob));

        CustomException ex = assertThrows(CustomException.class, () -> {
            applicationService.submitApplication(candidateUser, request);
        });

        assertTrue(ex.getMessage().contains("Only PUBLISHED jobs accept applications"));
        verify(applicationRepository, never()).save(any());
    }
}
