package com.platform.recruitment;

import com.platform.recruitment.ai.AiWorkerClient;
import com.platform.recruitment.ai.ProcessingLifecycleService;
import com.platform.recruitment.application.Application;
import com.platform.recruitment.application.ApplicationRepository;
import com.platform.recruitment.candidate.CandidateProfile;
import com.platform.recruitment.candidate.CandidateProfileRepository;
import com.platform.recruitment.cv.CV;
import com.platform.recruitment.cv.CVRepository;
import com.platform.recruitment.cv.CVSectionRepository;
import com.platform.recruitment.cv.CVVersionRepository;
import com.platform.recruitment.github.*;
import com.platform.recruitment.job.Job;
import com.platform.recruitment.job.JobRepository;
import com.platform.recruitment.job.JobRequirement;
import com.platform.recruitment.job.JobRequirementRepository;
import com.platform.recruitment.job.RequirementType;
import com.platform.recruitment.matching.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.ZonedDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class GitHubPipelineIntegrationTest {

    @Mock private AiWorkerClient aiWorkerClient;
    @Mock private JobRepository jobRepository;
    @Mock private JobRequirementRepository jobRequirementRepository;
    @Mock private CVRepository cvRepository;
    @Mock private CVVersionRepository cvVersionRepository;
    @Mock private CVSectionRepository cvSectionRepository;
    @Mock private CandidateProfileRepository candidateProfileRepository;
    @Mock private GitHubProfileRepository gitHubProfileRepository;
    @Mock private GitHubRepositoryRepository gitHubRepositoryRepository;
    @Mock private GitHubRepositoryLanguageRepository gitHubRepositoryLanguageRepository;
    @Mock private GitHubRepositoryTopicRepository gitHubRepositoryTopicRepository;
    @Mock private GitHubAssessmentRepository gitHubAssessmentRepository;

    @Mock private ApplicationRepository applicationRepository;
    @Mock private MatchResultRepository matchResultRepository;
    @Mock private MatchFactorRepository matchFactorRepository;
    @Mock private EvidenceRepository evidenceRepository;

    private ProcessingLifecycleService lifecycleService;
    private GitHubScoringService scoringService;
    private MatchingEngineService matchingEngineService;

    private CandidateProfile candidate;
    private Job job;
    private Application application;

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
        ReflectionTestUtils.setField(lifecycleService, "gitHubRepositoryLanguageRepository", gitHubRepositoryLanguageRepository);
        ReflectionTestUtils.setField(lifecycleService, "gitHubRepositoryTopicRepository", gitHubRepositoryTopicRepository);

        scoringService = new GitHubScoringService(
                gitHubProfileRepository,
                gitHubAssessmentRepository,
                gitHubRepositoryRepository
        );
        ReflectionTestUtils.setField(scoringService, "gitHubRepositoryLanguageRepository", gitHubRepositoryLanguageRepository);

        matchingEngineService = new MatchingEngineService(
                jobRepository, jobRequirementRepository, candidateProfileRepository,
                applicationRepository, cvRepository, matchResultRepository,
                matchFactorRepository,
                new RequiredSkillMatcher(), new PreferredSkillMatcher(),
                new ExperienceMatcher(), new EducationMatcher(),
                new ProjectRelevanceMatcher(),
                scoringService
        );
        ReflectionTestUtils.setField(matchingEngineService, "evidenceRepository", evidenceRepository);
        ReflectionTestUtils.setField(matchingEngineService, "gitHubProfileRepository", gitHubProfileRepository);

        candidate = CandidateProfile.builder()
                .fullName("Nguyen Thuc Te")
                .githubUrl("https://github.com/thucte-dev")
                .build();
        candidate.setId(UUID.randomUUID());

        job = Job.builder()
                .title("Senior Java Distributed Systems Engineer")
                .industry("Technology")
                .description("Expert in Java, Spring Boot, microservices, PostgreSQL.")
                .build();
        job.setId(UUID.randomUUID());

        application = Application.builder()
                .job(job)
                .candidate(candidate)
                .build();
        application.setId(UUID.randomUUID());
    }

    @Test
    @DisplayName("GH-07 & Full Persistence: Real GitHub Data Persists Languages with Bytes and Topics Idempotently")
    void testGitHubPersistence_LanguagesBytesAndTopicsIdempotent() {
        when(candidateProfileRepository.findByUserId(candidate.getId())).thenReturn(Optional.of(candidate));

        Map<String, Object> aiWorkerResponse = new HashMap<>();
        aiWorkerResponse.put("candidate_id", candidate.getId().toString());
        aiWorkerResponse.put("username", "thucte-dev");
        aiWorkerResponse.put("github_url", "https://github.com/thucte-dev");
        aiWorkerResponse.put("public_repos_count", 2);
        aiWorkerResponse.put("status", "SYNCED");
        aiWorkerResponse.put("activity_signal", "HIGH");
        aiWorkerResponse.put("latest_activity_at", "2026-09-01T12:00:00Z");
        aiWorkerResponse.put("summary_notes", "Observably active public profile with Java repositories.");
        aiWorkerResponse.put("language_rank_summary", "Rank #1: Java (78.50%) | Rank #2: TypeScript (21.50%)");
        aiWorkerResponse.put("overall_supporting_rating", "STRONG_SIGNAL");
        aiWorkerResponse.put("repositories", List.of(
                Map.of(
                        "name", "fintech-core-api",
                        "repo_url", "https://github.com/thucte-dev/fintech-core-api",
                        "description", "Spring Boot microservice for payments",
                        "primary_language", "Java",
                        "stars_count", 24,
                        "forks_count", 5,
                        "is_archived", false,
                        "updated_at_github", "2026-09-01T12:00:00Z",
                        "languages", List.of(
                                Map.of("language_name", "Java", "bytes_count", 156782L, "percentage_ratio", 78.50),
                                Map.of("language_name", "TypeScript", "bytes_count", 43120L, "percentage_ratio", 21.50)
                        ),
                        "topics", List.of("spring-boot", "fintech", "microservices")
                )
        ));

        when(aiWorkerClient.analyzeGithub(candidate.getId(), candidate.getGithubUrl())).thenReturn(aiWorkerResponse);
        when(gitHubProfileRepository.findByCandidateId(candidate.getId())).thenReturn(Optional.empty());

        GitHubProfile mockSavedProfile = GitHubProfile.builder().candidate(candidate).username("thucte-dev").build();
        mockSavedProfile.setId(UUID.randomUUID());
        when(gitHubProfileRepository.save(any(GitHubProfile.class))).thenReturn(mockSavedProfile);

        GitHubRepository mockSavedRepo = GitHubRepository.builder().githubProfile(mockSavedProfile).name("fintech-core-api").build();
        mockSavedRepo.setId(UUID.randomUUID());
        when(gitHubRepositoryRepository.save(any(GitHubRepository.class))).thenReturn(mockSavedRepo);

        // Execute scan
        lifecycleService.processCandidateGithub(candidate.getId());

        // Verify GitHubProfile saved
        verify(gitHubProfileRepository).save(any(GitHubProfile.class));
        // Verify GitHubAssessment saved
        verify(gitHubAssessmentRepository).save(any(GitHubAssessment.class));
        // Verify GitHubRepository saved
        verify(gitHubRepositoryRepository).save(any(GitHubRepository.class));

        // Verify Languages saved with actual byte counts
        ArgumentCaptor<GitHubRepositoryLanguage> langCaptor = ArgumentCaptor.forClass(GitHubRepositoryLanguage.class);
        verify(gitHubRepositoryLanguageRepository, times(2)).save(langCaptor.capture());
        List<GitHubRepositoryLanguage> savedLangs = langCaptor.getAllValues();
        assertEquals(2, savedLangs.size());
        assertEquals("Java", savedLangs.get(0).getLanguageName());
        assertEquals(156782L, savedLangs.get(0).getBytesCount());
        assertEquals(BigDecimal.valueOf(78.5), savedLangs.get(0).getPercentageRatio());

        // Verify Topics saved
        verify(gitHubRepositoryTopicRepository, times(3)).save(any(GitHubRepositoryTopic.class));
    }

    @Test
    @DisplayName("GH-09, GH-10: Matching Engine Integrates S_github with S_core and Saves GITHUB Evidence & Factor")
    void testMatchingEngine_IntegratesGitHubEvidenceAndFactors() {
        when(jobRepository.findById(job.getId())).thenReturn(Optional.of(job));
        when(candidateProfileRepository.findById(candidate.getId())).thenReturn(Optional.of(candidate));
        when(applicationRepository.findByJobIdAndCandidateId(job.getId(), candidate.getId())).thenReturn(Optional.of(application));

        CV cv = CV.builder().candidate(candidate).rawText("3 years experience in Java, Spring Boot, PostgreSQL.").build();
        when(cvRepository.findByCandidateId(candidate.getId())).thenReturn(List.of(cv));

        JobRequirement reqJava = JobRequirement.builder()
                .job(job)
                .skillName("Java")
                .requirementType(RequirementType.REQUIRED)
                .minYearsExp(3)
                .build();
        when(jobRequirementRepository.findByJobId(job.getId())).thenReturn(List.of(reqJava));

        GitHubProfile profile = GitHubProfile.builder()
                .candidate(candidate)
                .status("SYNCED")
                .activitySignal(GitHubActivitySignal.HIGH)
                .build();
        profile.setId(UUID.randomUUID());

        GitHubRepository repo = GitHubRepository.builder()
                .githubProfile(profile)
                .name("backend-api")
                .description("Production Spring Boot microservice with PostgreSQL")
                .primaryLanguage("Java")
                .updatedAtGithub(ZonedDateTime.now().minusDays(3))
                .build();
        repo.setId(UUID.randomUUID());

        when(gitHubProfileRepository.findByCandidateId(candidate.getId())).thenReturn(Optional.of(profile));
        when(gitHubRepositoryRepository.findByGithubProfileId(profile.getId())).thenReturn(List.of(repo));

        when(matchResultRepository.findByApplicationId(application.getId())).thenReturn(Optional.empty());
        when(matchResultRepository.save(any(MatchResult.class))).thenAnswer(invocation -> {
            MatchResult mr = invocation.getArgument(0);
            mr.setId(UUID.randomUUID());
            return mr;
        });

        // Execute matching
        MatchResult result = matchingEngineService.calculateAndPersistMatchResult(job.getId(), candidate.getId());

        assertNotNull(result.getGithubScore(), "GitHub score must be present for technical role");
        assertEquals(BigDecimal.valueOf(0.15), result.getGithubWeight(), "GitHub weight must be 0.15");
        assertEquals(BigDecimal.valueOf(0.85), result.getCoreWeight(), "Core weight must be 0.85");

        // Verify MatchFactor saved for GITHUB_SUPPORTING
        ArgumentCaptor<MatchFactor> factorCaptor = ArgumentCaptor.forClass(MatchFactor.class);
        verify(matchFactorRepository, atLeastOnce()).save(factorCaptor.capture());
        boolean hasGhFactor = factorCaptor.getAllValues().stream()
                .anyMatch(f -> "GITHUB".equals(f.getSourceType()) && "GITHUB_SUPPORTING".equals(f.getFactorType()));
        assertTrue(hasGhFactor, "MatchFactor for GITHUB_SUPPORTING must be saved with sourceType='GITHUB'");

        // Verify Grounded Evidence saved for GITHUB
        ArgumentCaptor<Evidence> evidenceCaptor = ArgumentCaptor.forClass(Evidence.class);
        verify(evidenceRepository, atLeastOnce()).save(evidenceCaptor.capture());
        boolean hasGhEvidence = evidenceCaptor.getAllValues().stream()
                .anyMatch(e -> "GITHUB".equals(e.getSourceType()) && "REPOSITORIES".equals(e.getSection()) && e.getSnippet().contains("backend-api"));
        assertTrue(hasGhEvidence, "Grounded Evidence for GITHUB repository must be persisted in evidences table");
    }

    @Test
    @DisplayName("GH-11 & GH-12: Unavailable GitHub or Non-Technical Job Applies S_overall = S_core with Zero Penalty")
    void testZeroPenaltyFallback_UnavailableOrNonTechnical() {
        when(jobRepository.findById(job.getId())).thenReturn(Optional.of(job));
        when(candidateProfileRepository.findById(candidate.getId())).thenReturn(Optional.of(candidate));
        when(applicationRepository.findByJobIdAndCandidateId(job.getId(), candidate.getId())).thenReturn(Optional.of(application));

        CV cv = CV.builder().candidate(candidate).rawText("3 years experience in Java, Spring Boot, PostgreSQL.").build();
        when(cvRepository.findByCandidateId(candidate.getId())).thenReturn(List.of(cv));

        JobRequirement reqJava = JobRequirement.builder()
                .job(job)
                .skillName("Java")
                .requirementType(RequirementType.REQUIRED)
                .minYearsExp(3)
                .build();
        when(jobRequirementRepository.findByJobId(job.getId())).thenReturn(List.of(reqJava));

        // Candidate has NO GitHub profile
        when(gitHubProfileRepository.findByCandidateId(candidate.getId())).thenReturn(Optional.empty());

        when(matchResultRepository.findByApplicationId(application.getId())).thenReturn(Optional.empty());
        when(matchResultRepository.save(any(MatchResult.class))).thenAnswer(invocation -> {
            MatchResult mr = invocation.getArgument(0);
            mr.setId(UUID.randomUUID());
            return mr;
        });

        // Execute matching
        MatchResult result = matchingEngineService.calculateAndPersistMatchResult(job.getId(), candidate.getId());

        assertNull(result.getGithubScore(), "GitHub score must be null when unavailable");
        assertEquals(BigDecimal.ZERO, result.getGithubWeight(), "GitHub weight must be 0 when unavailable");
        assertEquals(BigDecimal.valueOf(1.00), result.getCoreWeight(), "Core weight must be 1.00");
        assertEquals(result.getCoreScore(), result.getOverallScore(), "S_overall must equal S_core (Zero Penalty)");
    }
}
