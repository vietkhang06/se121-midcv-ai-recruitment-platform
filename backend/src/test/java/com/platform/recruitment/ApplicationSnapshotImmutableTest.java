package com.platform.recruitment;

import com.platform.recruitment.application.*;
import com.platform.recruitment.candidate.CandidateProfile;
import com.platform.recruitment.candidate.CandidateProfileRepository;
import com.platform.recruitment.company.Company;
import com.platform.recruitment.company.CompanyVerification;
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
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ApplicationSnapshotImmutableTest {

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
    private CandidateProfile candidateProfile;
    private Job publishedJob;
    private CV originalCV;

    @BeforeEach
    void setUp() {
        candidateUser = User.builder()
                .email("candidate@example.com")
                .passwordHash("hashed")
                .role(Role.CANDIDATE)
                .build();
        candidateUser.setId(UUID.randomUUID());

        candidateProfile = CandidateProfile.builder()
                .user(candidateUser)
                .fullName("Nguyen Van Candidate")
                .build();
        candidateProfile.setId(UUID.randomUUID());

        Company company = Company.builder()
                .name("Verified Tech Corp")
                .verificationStatus(CompanyVerification.VERIFIED)
                .build();
        company.setId(UUID.randomUUID());

        publishedJob = Job.builder()
                .company(company)
                .title("Java Spring Developer")
                .industry("Technology")
                .seniority("Mid")
                .status(JobStatus.PUBLISHED)
                .description("Job description")
                .build();
        publishedJob.setId(UUID.randomUUID());

        originalCV = CV.builder()
                .candidate(candidateProfile)
                .title("Original Java CV v1.0")
                .creationPath(CVCreationPath.BUILDER)
                .rawText("Skill: Java 17, Spring Boot. Experience: 2 Years.")
                .build();
        originalCV.setId(UUID.randomUUID());
    }

    @Test
    void testSubmitApplication_CreatesImmutableCVSnapshot() {
        SubmitApplicationRequest request = new SubmitApplicationRequest();
        request.setJobId(publishedJob.getId());
        request.setCvId(originalCV.getId());

        when(candidateProfileRepository.findByUserId(candidateUser.getId())).thenReturn(Optional.of(candidateProfile));
        when(jobRepository.findById(publishedJob.getId())).thenReturn(Optional.of(publishedJob));
        when(cvRepository.findById(originalCV.getId())).thenReturn(Optional.of(originalCV));
        when(applicationRepository.existsByJobIdAndCandidateId(publishedJob.getId(), candidateProfile.getId())).thenReturn(false);

        when(applicationRepository.save(any())).thenAnswer(invocation -> {
            Application app = invocation.getArgument(0);
            app.setId(UUID.randomUUID());
            return app;
        });

        ArgumentCaptor<ApplicationCVSnapshot> snapshotCaptor = ArgumentCaptor.forClass(ApplicationCVSnapshot.class);

        ApplicationResponse response = applicationService.submitApplication(candidateUser, request);

        assertNotNull(response);
        verify(snapshotRepository, times(1)).save(snapshotCaptor.capture());

        ApplicationCVSnapshot capturedSnapshot = snapshotCaptor.getValue();
        assertEquals("Original Java CV v1.0", capturedSnapshot.getCvTitle());
        assertEquals("Skill: Java 17, Spring Boot. Experience: 2 Years.", capturedSnapshot.getRawTextSnapshot());

        // Simulate Candidate modifying CV in library later
        originalCV.setRawText("Skill: Java 17, Spring Boot, Python, AWS Cloud. Experience: 3 Years.");
        originalCV.setTitle("Updated CV v2.0");

        // The snapshot remains untouched with original raw text snapshot
        assertEquals("Skill: Java 17, Spring Boot. Experience: 2 Years.", capturedSnapshot.getRawTextSnapshot());
        assertEquals("Original Java CV v1.0", capturedSnapshot.getCvTitle());
    }
}
