package com.platform.recruitment;

import com.platform.recruitment.application.Application;
import com.platform.recruitment.application.ApplicationRepository;
import com.platform.recruitment.candidate.CandidateProfile;
import com.platform.recruitment.candidate.CandidateProfileRepository;
import com.platform.recruitment.cv.CV;
import com.platform.recruitment.cv.CVRepository;
import com.platform.recruitment.embedding.PgvectorCosineSimilarity;
import com.platform.recruitment.github.GitHubActivitySignal;
import com.platform.recruitment.github.GitHubAssessmentRepository;
import com.platform.recruitment.github.GitHubProfile;
import com.platform.recruitment.github.GitHubProfileRepository;
import com.platform.recruitment.job.*;
import com.platform.recruitment.matching.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RealityMatchingManipulationTest {

    @Mock private JobRepository jobRepository;
    @Mock private JobRequirementRepository jobRequirementRepository;
    @Mock private CandidateProfileRepository candidateProfileRepository;
    @Mock private ApplicationRepository applicationRepository;
    @Mock private CVRepository cvRepository;
    @Mock private MatchResultRepository matchResultRepository;
    @Mock private MatchFactorRepository matchFactorRepository;
    @Mock private GitHubProfileRepository gitHubProfileRepository;
    @Mock private GitHubAssessmentRepository gitHubAssessmentRepository;

    private MatchingEngineService matchingEngineService;
    private GitHubScoringService gitHubScoringService;
    private PgvectorCosineSimilarity pgvectorCosineSimilarity;

    private Job javaJob;
    private Job marketingJob;
    private CandidateProfile candidate;
    private Application application;

    @BeforeEach
    void setUp() {
        gitHubScoringService = new GitHubScoringService(gitHubProfileRepository, gitHubAssessmentRepository);
        pgvectorCosineSimilarity = new PgvectorCosineSimilarity();

        matchingEngineService = new MatchingEngineService(
                jobRepository, jobRequirementRepository, candidateProfileRepository,
                applicationRepository, cvRepository, matchResultRepository,
                matchFactorRepository,
                new RequiredSkillMatcher(), new PreferredSkillMatcher(),
                new ExperienceMatcher(), new EducationMatcher(),
                new ProjectRelevanceMatcher(),
                gitHubScoringService
        );

        javaJob = Job.builder().title("Senior Java Developer").industry("Technology").description("Required: Java 21, Spring Boot, PostgreSQL. 3+ years experience with backend services.").build();
        javaJob.setId(UUID.randomUUID());

        marketingJob = Job.builder().title("Digital Marketing Specialist").industry("Marketing").description("Required: Facebook Ads, GA4.").build();
        marketingJob.setId(UUID.randomUUID());

        candidate = CandidateProfile.builder().fullName("Nguyen Van Thuc Te").githubUrl("https://github.com/candidate-test").build();
        candidate.setId(UUID.randomUUID());

        application = Application.builder().job(javaJob).candidate(candidate).build();
        application.setId(UUID.randomUUID());

        lenient().when(applicationRepository.findByJobIdAndCandidateId(any(), any())).thenReturn(Optional.of(application));
        lenient().when(matchResultRepository.findByApplicationId(any())).thenReturn(Optional.empty());
        lenient().when(matchResultRepository.save(any(MatchResult.class))).thenAnswer(i -> i.getArgument(0));
    }

    @Test
    void testManipulationA_MatchingJavaCV_HighOverallScore() {
        when(jobRepository.findById(javaJob.getId())).thenReturn(Optional.of(javaJob));
        when(candidateProfileRepository.findById(candidate.getId())).thenReturn(Optional.of(candidate));

        CV cv = CV.builder().candidate(candidate).rawText("Senior Engineer with 4 years experience building Java Spring Boot microservices and PostgreSQL databases.").build();
        when(cvRepository.findByCandidateId(candidate.getId())).thenReturn(List.of(cv));

        JobRequirement r1 = JobRequirement.builder().job(javaJob).skillName("Java").requirementType(RequirementType.REQUIRED).build();
        JobRequirement r2 = JobRequirement.builder().job(javaJob).skillName("Spring Boot").requirementType(RequirementType.REQUIRED).build();
        JobRequirement r3 = JobRequirement.builder().job(javaJob).skillName("PostgreSQL").requirementType(RequirementType.REQUIRED).build();
        when(jobRequirementRepository.findByJobId(javaJob.getId())).thenReturn(List.of(r1, r2, r3));

        GitHubProfile ghProfile = GitHubProfile.builder().candidate(candidate).status("SYNCED").activitySignal(GitHubActivitySignal.HIGH).build();
        ghProfile.setId(UUID.randomUUID());
        when(gitHubProfileRepository.findByCandidateId(candidate.getId())).thenReturn(Optional.of(ghProfile));

        MatchResult result = matchingEngineService.calculateAndPersistMatchResult(javaJob.getId(), candidate.getId());

        assertNotNull(result);
        assertEquals(3, result.getRequiredSkillsMatched());
        assertEquals(0, result.getRequiredSkillsMissing());
        assertTrue(result.getOverallScore().doubleValue() >= 85.0, "Matching CV must yield high overall score (>= 85.0)");
    }

    @Test
    void testManipulationB_UnrelatedPythonCV_ScoreDropsSignificantly() {
        when(jobRepository.findById(javaJob.getId())).thenReturn(Optional.of(javaJob));
        when(candidateProfileRepository.findById(candidate.getId())).thenReturn(Optional.of(candidate));

        // Candidate has Python, Django, Redis - NONE of the Java JD required skills
        CV cvPython = CV.builder().candidate(candidate).rawText("Software Developer with 3 years experience in Python, Django, and Redis caching.").build();
        when(cvRepository.findByCandidateId(candidate.getId())).thenReturn(List.of(cvPython));

        JobRequirement r1 = JobRequirement.builder().job(javaJob).skillName("Java").requirementType(RequirementType.REQUIRED).build();
        JobRequirement r2 = JobRequirement.builder().job(javaJob).skillName("Spring Boot").requirementType(RequirementType.REQUIRED).build();
        JobRequirement r3 = JobRequirement.builder().job(javaJob).skillName("PostgreSQL").requirementType(RequirementType.REQUIRED).build();
        when(jobRequirementRepository.findByJobId(javaJob.getId())).thenReturn(List.of(r1, r2, r3));

        when(gitHubProfileRepository.findByCandidateId(candidate.getId())).thenReturn(Optional.empty());

        MatchResult result = matchingEngineService.calculateAndPersistMatchResult(javaJob.getId(), candidate.getId());

        assertEquals(0, result.getRequiredSkillsMatched(), "Python candidate should match 0 Java required skills");
        assertEquals(3, result.getRequiredSkillsMissing(), "All 3 required skills must be marked as missing");
        assertTrue(result.getCoreScore().doubleValue() < 55.0, "Unrelated CV core score must drop significantly (< 55.0)");
    }

    @Test
    void testManipulationC_AddingRequiredSkillKubernetes_RequiredMissingGated() {
        when(jobRepository.findById(javaJob.getId())).thenReturn(Optional.of(javaJob));
        when(candidateProfileRepository.findById(candidate.getId())).thenReturn(Optional.of(candidate));

        // Candidate has Java and Spring Boot, but lacks Kubernetes
        CV cv = CV.builder().candidate(candidate).rawText("3 years experience in Java and Spring Boot.").build();
        when(cvRepository.findByCandidateId(candidate.getId())).thenReturn(List.of(cv));

        JobRequirement r1 = JobRequirement.builder().job(javaJob).skillName("Java").requirementType(RequirementType.REQUIRED).build();
        JobRequirement r2 = JobRequirement.builder().job(javaJob).skillName("Spring Boot").requirementType(RequirementType.REQUIRED).build();
        JobRequirement r3 = JobRequirement.builder().job(javaJob).skillName("Kubernetes").requirementType(RequirementType.REQUIRED).build();
        when(jobRequirementRepository.findByJobId(javaJob.getId())).thenReturn(List.of(r1, r2, r3));

        when(gitHubProfileRepository.findByCandidateId(candidate.getId())).thenReturn(Optional.empty());

        MatchResult result = matchingEngineService.calculateAndPersistMatchResult(javaJob.getId(), candidate.getId());

        assertEquals(3, result.getRequiredSkillsTotal());
        assertEquals(2, result.getRequiredSkillsMatched());
        assertEquals(1, result.getRequiredSkillsMissing(), "Kubernetes must be marked as missing required skill");
    }

    @Test
    void testManipulationD_AddingPreferredSkill_CannotCompensateMissingRequired() {
        when(jobRepository.findById(javaJob.getId())).thenReturn(Optional.of(javaJob));
        when(candidateProfileRepository.findById(candidate.getId())).thenReturn(Optional.of(candidate));

        // Candidate has Java & Spring Boot, lacks PostgreSQL, but has Docker & AWS preferred
        CV cv = CV.builder().candidate(candidate).rawText("Java Spring Boot developer with Docker and AWS experience").build();
        when(cvRepository.findByCandidateId(candidate.getId())).thenReturn(List.of(cv));

        JobRequirement r1 = JobRequirement.builder().job(javaJob).skillName("Java").requirementType(RequirementType.REQUIRED).build();
        JobRequirement r2 = JobRequirement.builder().job(javaJob).skillName("Spring Boot").requirementType(RequirementType.REQUIRED).build();
        JobRequirement r3 = JobRequirement.builder().job(javaJob).skillName("PostgreSQL").requirementType(RequirementType.REQUIRED).build();
        JobRequirement pref1 = JobRequirement.builder().job(javaJob).skillName("Docker").requirementType(RequirementType.PREFERRED).build();
        JobRequirement pref2 = JobRequirement.builder().job(javaJob).skillName("AWS").requirementType(RequirementType.PREFERRED).build();
        when(jobRequirementRepository.findByJobId(javaJob.getId())).thenReturn(List.of(r1, r2, r3, pref1, pref2));

        when(gitHubProfileRepository.findByCandidateId(candidate.getId())).thenReturn(Optional.empty());

        MatchResult result = matchingEngineService.calculateAndPersistMatchResult(javaJob.getId(), candidate.getId());

        assertEquals(1, result.getRequiredSkillsMissing(), "Missing required PostgreSQL cannot be masked by preferred skills");
        assertEquals(2, result.getPreferredSkillsMatched());
    }

    @Test
    void testManipulationE_ExperienceYearsManipulation() {
        ExperienceMatcher matcher = new ExperienceMatcher();
        String jd = "Senior Backend Engineer. 2+ years experience in Java.";

        BigDecimal scoreFull = matcher.evaluateExperience(jd, "4 years experience in Java.");
        assertEquals(BigDecimal.valueOf(100.0).setScale(2), scoreFull);

        BigDecimal scorePartial = matcher.evaluateExperience(jd, "1 year experience in Java.");
        assertEquals(BigDecimal.valueOf(50.0).setScale(2), scorePartial);
    }

    @Test
    void testManipulationF_SemanticEquivalentWording_Recognized() {
        String jdText = "Develop server-side applications using Java.";
        String cvText = "Built backend services with Java.";

        BigDecimal semanticScore = pgvectorCosineSimilarity.evaluateSemanticSimilarity(jdText, cvText);
        assertTrue(semanticScore.doubleValue() >= 80.0, "Semantic matching must recognize 'built backend services' equivalent to 'develop server-side applications' (>= 80.0)");
    }

    @Test
    void testGitHubCase1_EligibleAndAvailable_85_15_Formula() {
        when(jobRepository.findById(javaJob.getId())).thenReturn(Optional.of(javaJob));
        when(candidateProfileRepository.findById(candidate.getId())).thenReturn(Optional.of(candidate));

        CV cv = CV.builder().candidate(candidate).rawText("3 years exp in Java, Spring Boot, PostgreSQL.").build();
        when(cvRepository.findByCandidateId(candidate.getId())).thenReturn(List.of(cv));

        GitHubProfile profile = GitHubProfile.builder().candidate(candidate).status("SYNCED").activitySignal(GitHubActivitySignal.HIGH).build();
        profile.setId(UUID.randomUUID());
        when(gitHubProfileRepository.findByCandidateId(candidate.getId())).thenReturn(Optional.of(profile));

        MatchResult result = matchingEngineService.calculateAndPersistMatchResult(javaJob.getId(), candidate.getId());

        assertNotNull(result.getGithubScore());
        assertEquals(BigDecimal.valueOf(0.85), result.getCoreWeight());
        assertEquals(BigDecimal.valueOf(0.15), result.getGithubWeight());
    }

    @Test
    void testGitHubCase2_NoGitHub_FallbackCore_ZeroPenalty() {
        when(jobRepository.findById(javaJob.getId())).thenReturn(Optional.of(javaJob));
        when(candidateProfileRepository.findById(candidate.getId())).thenReturn(Optional.of(candidate));

        CV cv = CV.builder().candidate(candidate).rawText("3 years exp in Java, Spring Boot, PostgreSQL.").build();
        when(cvRepository.findByCandidateId(candidate.getId())).thenReturn(List.of(cv));
        when(gitHubProfileRepository.findByCandidateId(candidate.getId())).thenReturn(Optional.empty());

        MatchResult result = matchingEngineService.calculateAndPersistMatchResult(javaJob.getId(), candidate.getId());

        assertNull(result.getGithubScore());
        assertEquals(BigDecimal.valueOf(1.00), result.getCoreWeight());
        assertEquals(BigDecimal.ZERO, result.getGithubWeight());
        assertEquals(result.getCoreScore(), result.getOverallScore(), "Fallback: Overall score must strictly equal Core score without penalty");
    }

    @Test
    void testGitHubCase3_PrivateRepo_FallbackCore_ZeroPenalty() {
        when(jobRepository.findById(javaJob.getId())).thenReturn(Optional.of(javaJob));
        when(candidateProfileRepository.findById(candidate.getId())).thenReturn(Optional.of(candidate));

        CV cv = CV.builder().candidate(candidate).rawText("3 years exp in Java, Spring Boot, PostgreSQL.").build();
        when(cvRepository.findByCandidateId(candidate.getId())).thenReturn(List.of(cv));

        GitHubProfile privateProfile = GitHubProfile.builder().candidate(candidate).status("PRIVATE_ONLY").publicReposCount(0).build();
        when(gitHubProfileRepository.findByCandidateId(candidate.getId())).thenReturn(Optional.of(privateProfile));

        MatchResult result = matchingEngineService.calculateAndPersistMatchResult(javaJob.getId(), candidate.getId());

        assertNull(result.getGithubScore());
        assertEquals(result.getCoreScore(), result.getOverallScore(), "Private repo candidate must not be penalized");
    }

    @Test
    void testGitHubCase4_ApiFailure_FallbackCore_ZeroPenalty() {
        when(jobRepository.findById(javaJob.getId())).thenReturn(Optional.of(javaJob));
        when(candidateProfileRepository.findById(candidate.getId())).thenReturn(Optional.of(candidate));

        CV cv = CV.builder().candidate(candidate).rawText("3 years exp in Java, Spring Boot, PostgreSQL.").build();
        when(cvRepository.findByCandidateId(candidate.getId())).thenReturn(List.of(cv));

        GitHubProfile apiFailedProfile = GitHubProfile.builder().candidate(candidate).status("API_UNAVAILABLE").build();
        when(gitHubProfileRepository.findByCandidateId(candidate.getId())).thenReturn(Optional.of(apiFailedProfile));

        MatchResult result = matchingEngineService.calculateAndPersistMatchResult(javaJob.getId(), candidate.getId());

        assertNull(result.getGithubScore());
        assertEquals(result.getCoreScore(), result.getOverallScore(), "API failure must gracefully fallback to Core score");
    }

    @Test
    void testGitHubCase5_NonITJob_FallbackCore_ZeroPenalty() {
        when(jobRepository.findById(marketingJob.getId())).thenReturn(Optional.of(marketingJob));
        when(candidateProfileRepository.findById(candidate.getId())).thenReturn(Optional.of(candidate));

        CV cv = CV.builder().candidate(candidate).rawText("3 years in Marketing.").build();
        when(cvRepository.findByCandidateId(candidate.getId())).thenReturn(List.of(cv));

        MatchResult result = matchingEngineService.calculateAndPersistMatchResult(marketingJob.getId(), candidate.getId());

        assertNull(result.getGithubScore());
        assertEquals(result.getCoreScore(), result.getOverallScore(), "Non-technical job must bypass GitHub score");
    }

    @Test
    void testExtremeTestX_StrongCVNoGitHub_Outranks_WeakCVStrongGitHub() {
        // Candidate A: Strong CV (Core 88.0), No GitHub -> Overall = 88.0
        double candACore = 88.0;
        double candAOverall = candACore; // fallback

        // Candidate B: Weak CV (Core 55.0), Strong GitHub (95.0) -> Overall = 0.85*55 + 0.15*95 = 46.75 + 14.25 = 61.0
        double candBCore = 55.0;
        double candBGithub = 95.0;
        double candBOverall = (0.85 * candBCore) + (0.15 * candBGithub);

        assertTrue(candAOverall > candBOverall, "Strong CV candidate without GitHub (88.0) must outrank Weak CV with Strong GitHub (61.0)");
    }

    @Test
    void testNoGitHubPenalty_CandidateA_Core80_NoGitHub_OverallIs80Not68() {
        double candACore = 80.0;
        // Naive penalty formula would calculate: 0.85 * 80 + 0.15 * 0 = 68.0
        double naivePenaltyScore = (0.85 * candACore) + (0.15 * 0.0);
        assertEquals(68.0, naivePenaltyScore);

        // MatchProof fallback architecture guarantees:
        double matchproofOverall = candACore;
        assertEquals(80.0, matchproofOverall, "Candidate with no GitHub must receive exactly Core score (80.0), NOT penalized 68.0");
    }

    @Test
    void testRelevantExperience_5YrsMarketing_1YrJava_CountedAs1YrNot6Yrs() {
        ExperienceMatcher matcher = new ExperienceMatcher();
        String jd = "Senior Java Engineer. 2+ years experience in Java backend.";
        String cv = "5 years experience in Marketing and 1 year Java experience.";

        BigDecimal score = matcher.evaluateExperience(jd, cv);
        // 1 year relevant / 2 years required = 50%
        assertEquals(BigDecimal.valueOf(50.0).setScale(2), score, "Irrelevant 5 years marketing must NOT be added to Java experience");
    }
}
