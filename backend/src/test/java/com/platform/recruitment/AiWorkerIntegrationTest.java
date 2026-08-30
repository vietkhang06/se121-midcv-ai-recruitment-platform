package com.platform.recruitment;

import com.platform.recruitment.ai.AiWorkerClient;
import com.platform.recruitment.ai.ProcessingLifecycleService;
import com.platform.recruitment.candidate.CandidateProfileRepository;
import com.platform.recruitment.cv.CV;
import com.platform.recruitment.cv.CVCreationPath;
import com.platform.recruitment.cv.CVRepository;
import com.platform.recruitment.cv.CVSectionRepository;
import com.platform.recruitment.cv.CVVersionRepository;
import com.platform.recruitment.github.GitHubAssessmentRepository;
import com.platform.recruitment.github.GitHubProfileRepository;
import com.platform.recruitment.github.GitHubRepositoryRepository;
import com.platform.recruitment.job.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AiWorkerIntegrationTest {

    @Mock private AiWorkerClient aiWorkerClient;
    @Mock private JobRepository jobRepository;
    @Mock private JobRequirementRepository jobRequirementRepository;
    @Mock private CVRepository cvRepository;
    @Mock private CVVersionRepository cvVersionRepository;
    @Mock private CVSectionRepository cvSectionRepository;
    @Mock private CandidateProfileRepository candidateProfileRepository;
    @Mock private GitHubProfileRepository gitHubProfileRepository;
    @Mock private GitHubRepositoryRepository gitHubRepositoryRepository;
    @Mock private GitHubAssessmentRepository gitHubAssessmentRepository;

    private ProcessingLifecycleService lifecycleService;

    private Job job;
    private CV cv;

    @BeforeEach
    void setUp() {
        lifecycleService = new ProcessingLifecycleService(
                aiWorkerClient,
                jobRepository,
                jobRequirementRepository,
                cvRepository,
                cvVersionRepository,
                cvSectionRepository,
                candidateProfileRepository,
                gitHubProfileRepository,
                gitHubRepositoryRepository,
                gitHubAssessmentRepository
        );

        job = Job.builder()
                .title("Senior Java Spring Developer")
                .industry("Technology")
                .description("Required: Java 21, Spring Boot. Preferred: Docker.")
                .status(JobStatus.PUBLISHED)
                .build();
        job.setId(UUID.randomUUID());

        cv = CV.builder()
                .title("Java Engineer CV")
                .creationPath(CVCreationPath.BUILDER)
                .rawText("Nguyen Van Candidate. Skills: Java 21, Spring Boot.")
                .build();
        cv.setId(UUID.randomUUID());
    }

    @Test
    void testEndToEnd_JobDescriptionProcessingLifecycle_PersistsRequirements() {
        when(jobRepository.findById(job.getId())).thenReturn(Optional.of(job));
        when(jobRequirementRepository.findByJobId(job.getId())).thenReturn(List.of());

        Map<String, Object> aiWorkerResponse = Map.of(
                "job_id", job.getId().toString(),
                "status", "SUCCESS",
                "required_skills", List.of(
                        Map.of("normalized_name", "Java", "min_years_exp", 3),
                        Map.of("normalized_name", "Spring Boot", "min_years_exp", 2)
                ),
                "preferred_skills", List.of(
                        Map.of("normalized_name", "Docker", "min_years_exp", 1)
                )
        );

        when(aiWorkerClient.extractJd(job.getId(), job.getTitle(), job.getIndustry(), job.getDescription()))
                .thenReturn(aiWorkerResponse);

        // Execute Lifecycle Service
        lifecycleService.processJobDescription(job.getId());

        // Verify Save operations were called for required & preferred skills
        verify(jobRequirementRepository, times(3)).save(any(JobRequirement.class));
    }
}
