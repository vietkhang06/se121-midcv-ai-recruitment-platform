package com.platform.recruitment;

import com.platform.recruitment.ai.AiWorkerClient;
import com.platform.recruitment.ai.ProcessingLifecycleService;
import com.platform.recruitment.candidate.CandidateProfileRepository;
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

import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProcessingIdempotencyTest {

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

    @BeforeEach
    void setUp() {
        lifecycleService = new ProcessingLifecycleService(
                aiWorkerClient, jobRepository, jobRequirementRepository,
                cvRepository, cvVersionRepository, cvSectionRepository,
                candidateProfileRepository, gitHubProfileRepository,
                gitHubRepositoryRepository, gitHubAssessmentRepository
        );

        job = Job.builder().title("Backend Dev").industry("Tech").description("Java, Spring").build();
        job.setId(UUID.randomUUID());
    }

    @Test
    void testIdempotentProcessing_SameJobProcessedTwice_ClearsOldDraftRequirements() {
        when(jobRepository.findById(job.getId())).thenReturn(Optional.of(job));
        
        JobRequirement oldReq = JobRequirement.builder().job(job).skillName("OldSkill").build();
        when(jobRequirementRepository.findByJobId(job.getId())).thenReturn(List.of(oldReq));

        Map<String, Object> aiWorkerResponse = Map.of(
                "job_id", job.getId().toString(),
                "status", "SUCCESS",
                "required_skills", List.of(Map.of("normalized_name", "Java", "min_years_exp", 3))
        );
        when(aiWorkerClient.extractJd(job.getId(), job.getTitle(), job.getIndustry(), job.getDescription()))
                .thenReturn(aiWorkerResponse);

        // Run process job description
        lifecycleService.processJobDescription(job.getId());

        // Verify old requirements were deleted before saving new ones
        verify(jobRequirementRepository, times(1)).deleteAll(List.of(oldReq));
        verify(jobRequirementRepository, times(1)).save(any(JobRequirement.class));
    }
}
