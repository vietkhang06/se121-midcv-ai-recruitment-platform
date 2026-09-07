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
class GoldenMatchingCasesTest {

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

    private Job javaJob;
    private Job marketingJob;
    private CandidateProfile candidateJava;
    private Application application;

    @BeforeEach
    void setUp() {
        gitHubScoringService = new GitHubScoringService(gitHubProfileRepository, gitHubAssessmentRepository);

        matchingEngineService = new MatchingEngineService(
                jobRepository, jobRequirementRepository, candidateProfileRepository,
                applicationRepository, cvRepository, matchResultRepository,
                matchFactorRepository,
                new RequiredSkillMatcher(), new PreferredSkillMatcher(),
                new ExperienceMatcher(), new EducationMatcher(),
                new ProjectRelevanceMatcher(),
                gitHubScoringService
        );

        javaJob = Job.builder().title("Senior Java Developer").industry("Technology").description("Required: Java 21, Spring Boot, PostgreSQL. Preferred: Docker, AWS. 2+ years exp.").build();
        javaJob.setId(UUID.randomUUID());

        marketingJob = Job.builder().title("Digital Marketing Executive").industry("Marketing").description("Required: Facebook Ads, GA4.").build();
        marketingJob.setId(UUID.randomUUID());

        candidateJava = CandidateProfile.builder().fullName("Nguyen Van Java").githubUrl("https://github.com/candidate-java").build();
        candidateJava.setId(UUID.randomUUID());

        application = Application.builder().job(javaJob).candidate(candidateJava).build();
        application.setId(UUID.randomUUID());

        lenient().when(applicationRepository.findByJobIdAndCandidateId(any(), any())).thenReturn(Optional.of(application));
        lenient().when(matchResultRepository.findByApplicationId(any())).thenReturn(Optional.empty());
        lenient().when(matchResultRepository.save(any(MatchResult.class))).thenAnswer(i -> i.getArgument(0));
    }

    @Test
    void testCaseA_BackendJava_HighCore_HighGitHub_85_15_Formula() {
        when(jobRepository.findById(javaJob.getId())).thenReturn(Optional.of(javaJob));
        when(candidateProfileRepository.findById(candidateJava.getId())).thenReturn(Optional.of(candidateJava));

        CV cv = CV.builder().candidate(candidateJava).rawText("3 years exp in Java, Spring Boot, PostgreSQL.").build();
        when(cvRepository.findByCandidateId(candidateJava.getId())).thenReturn(List.of(cv));

        JobRequirement req1 = JobRequirement.builder().job(javaJob).skillName("Java").requirementType(RequirementType.REQUIRED).build();
        when(jobRequirementRepository.findByJobId(javaJob.getId())).thenReturn(List.of(req1));

        GitHubProfile ghProfile = GitHubProfile.builder().candidate(candidateJava).status("SYNCED").activitySignal(GitHubActivitySignal.HIGH).build();
        ghProfile.setId(UUID.randomUUID());
        when(gitHubProfileRepository.findByCandidateId(candidateJava.getId())).thenReturn(Optional.of(ghProfile));

        MatchResult result = matchingEngineService.calculateAndPersistMatchResult(javaJob.getId(), candidateJava.getId());

        assertNotNull(result);
        assertNotNull(result.getGithubScore());
        assertEquals(BigDecimal.valueOf(0.85), result.getCoreWeight());
        assertEquals(BigDecimal.valueOf(0.15), result.getGithubWeight());
        assertTrue(result.getOverallScore().doubleValue() > 80.0);
    }

    @Test
    void testCaseB_GitHubUnavailable_Fallback_OverallEqualsCore() {
        when(jobRepository.findById(javaJob.getId())).thenReturn(Optional.of(javaJob));
        when(candidateProfileRepository.findById(candidateJava.getId())).thenReturn(Optional.of(candidateJava));

        CV cv = CV.builder().candidate(candidateJava).rawText("3 years exp in Java, Spring Boot.").build();
        when(cvRepository.findByCandidateId(candidateJava.getId())).thenReturn(List.of(cv));
        when(gitHubProfileRepository.findByCandidateId(candidateJava.getId())).thenReturn(Optional.empty());

        MatchResult result = matchingEngineService.calculateAndPersistMatchResult(javaJob.getId(), candidateJava.getId());

        assertNull(result.getGithubScore());
        assertEquals(result.getCoreScore(), result.getOverallScore());
    }

    @Test
    void testCaseC_MarketingJob_GitHubDisabled_Fallback_OverallEqualsCore() {
        when(jobRepository.findById(marketingJob.getId())).thenReturn(Optional.of(marketingJob));
        when(candidateProfileRepository.findById(candidateJava.getId())).thenReturn(Optional.of(candidateJava));

        CV cv = CV.builder().candidate(candidateJava).rawText("2 years experience in Digital Marketing.").build();
        when(cvRepository.findByCandidateId(candidateJava.getId())).thenReturn(List.of(cv));

        MatchResult result = matchingEngineService.calculateAndPersistMatchResult(marketingJob.getId(), candidateJava.getId());

        assertNull(result.getGithubScore());
        assertEquals(result.getCoreScore(), result.getOverallScore());
    }

    @Test
    void testCaseD_JavaRequirement_CandidateWithJavaScriptOnly_NotMatched() {
        RequiredSkillMatcher matcher = new RequiredSkillMatcher();
        JobRequirement reqJava = JobRequirement.builder().skillName("Java").requirementType(RequirementType.REQUIRED).build();
        
        BigDecimal score = matcher.evaluateRequiredSkills(List.of(reqJava), "2 years experience in JavaScript only");
        
        assertEquals(BigDecimal.ZERO.setScale(2), score);
    }

    @Test
    void testCaseE_AWSRequired_CandidateWithoutAWS_MissingDeductionWithoutCrash() {
        RequiredSkillMatcher matcher = new RequiredSkillMatcher();
        JobRequirement reqAws = JobRequirement.builder().skillName("AWS").requirementType(RequirementType.REQUIRED).build();

        BigDecimal score = matcher.evaluateRequiredSkills(List.of(reqAws), "Java Spring Boot developer with PostgreSQL");

        assertEquals(BigDecimal.ZERO.setScale(2), score);
    }

    @Test
    void testCaseK_RequiredMissing_PreferredFull_RequiredMissingRemainsExplicitlyVisible() {
        when(jobRepository.findById(javaJob.getId())).thenReturn(Optional.of(javaJob));
        when(candidateProfileRepository.findById(candidateJava.getId())).thenReturn(Optional.of(candidateJava));

        // Candidate has Java & Spring Boot, missing PostgreSQL, but has Docker & AWS preferred
        CV cv = CV.builder().candidate(candidateJava).rawText("Java Spring Boot developer with Docker and AWS experience").build();
        when(cvRepository.findByCandidateId(candidateJava.getId())).thenReturn(List.of(cv));

        JobRequirement req1 = JobRequirement.builder().job(javaJob).skillName("Java").requirementType(RequirementType.REQUIRED).build();
        JobRequirement req2 = JobRequirement.builder().job(javaJob).skillName("Spring Boot").requirementType(RequirementType.REQUIRED).build();
        JobRequirement req3 = JobRequirement.builder().job(javaJob).skillName("PostgreSQL").requirementType(RequirementType.REQUIRED).build();
        JobRequirement pref1 = JobRequirement.builder().job(javaJob).skillName("Docker").requirementType(RequirementType.PREFERRED).build();
        JobRequirement pref2 = JobRequirement.builder().job(javaJob).skillName("AWS").requirementType(RequirementType.PREFERRED).build();

        when(jobRequirementRepository.findByJobId(javaJob.getId())).thenReturn(List.of(req1, req2, req3, pref1, pref2));

        MatchResult result = matchingEngineService.calculateAndPersistMatchResult(javaJob.getId(), candidateJava.getId());

        assertEquals(3, result.getRequiredSkillsTotal());
        assertEquals(2, result.getRequiredSkillsMatched());
        assertEquals(1, result.getRequiredSkillsMissing()); // PostgreSQL missing explicitly visible!
        assertEquals(2, result.getPreferredSkillsTotal());
        assertEquals(2, result.getPreferredSkillsMatched());
    }

    @Test
    void testTEST03_PrivateRepository_Fallback_OverallEqualsCore() {
        when(jobRepository.findById(javaJob.getId())).thenReturn(Optional.of(javaJob));
        when(candidateProfileRepository.findById(candidateJava.getId())).thenReturn(Optional.of(candidateJava));

        CV cv = CV.builder().candidate(candidateJava).rawText("3 years exp in Java, Spring Boot, PostgreSQL.").build();
        when(cvRepository.findByCandidateId(candidateJava.getId())).thenReturn(List.of(cv));

        GitHubProfile privateProfile = GitHubProfile.builder()
                .candidate(candidateJava)
                .status("PRIVATE_ONLY")
                .publicReposCount(0)
                .build();
        when(gitHubProfileRepository.findByCandidateId(candidateJava.getId())).thenReturn(Optional.of(privateProfile));

        MatchResult result = matchingEngineService.calculateAndPersistMatchResult(javaJob.getId(), candidateJava.getId());

        assertNull(result.getGithubScore());
        assertEquals(BigDecimal.valueOf(1.00), result.getCoreWeight());
        assertEquals(BigDecimal.ZERO, result.getGithubWeight());
        assertEquals(result.getCoreScore(), result.getOverallScore());
    }

    @Test
    void testTEST04_GitHubApiUnavailableOrFailure_Fallback_OverallEqualsCore() {
        when(jobRepository.findById(javaJob.getId())).thenReturn(Optional.of(javaJob));
        when(candidateProfileRepository.findById(candidateJava.getId())).thenReturn(Optional.of(candidateJava));

        CV cv = CV.builder().candidate(candidateJava).rawText("3 years exp in Java, Spring Boot, PostgreSQL.").build();
        when(cvRepository.findByCandidateId(candidateJava.getId())).thenReturn(List.of(cv));

        GitHubProfile failedProfile = GitHubProfile.builder()
                .candidate(candidateJava)
                .status("API_UNAVAILABLE")
                .build();
        when(gitHubProfileRepository.findByCandidateId(candidateJava.getId())).thenReturn(Optional.of(failedProfile));

        MatchResult result = matchingEngineService.calculateAndPersistMatchResult(javaJob.getId(), candidateJava.getId());

        assertNull(result.getGithubScore());
        assertEquals(BigDecimal.valueOf(1.00), result.getCoreWeight());
        assertEquals(BigDecimal.ZERO, result.getGithubWeight());
        assertEquals(result.getCoreScore(), result.getOverallScore());
    }

    @Test
    void testTEST08_CandidateWithRelevantExperience_MatchesTargetJD() {
        ExperienceMatcher matcher = new ExperienceMatcher();
        String jd = "Senior Java Engineer. 3+ years experience with Spring Boot and microservices.";
        String cv = "Software Engineer with 4 years experience building Java Spring Boot microservices.";

        BigDecimal score = matcher.evaluateExperience(jd, cv);
        assertEquals(BigDecimal.valueOf(100.0).setScale(2), score);
    }

    @Test
    void testTEST09_CandidateWithUnrelatedExperienceOnly_FilteredOutWithoutFalseCredit() {
        ExperienceMatcher matcher = new ExperienceMatcher();
        String jd = "Senior Java Engineer. 3+ years experience with Java backend.";
        String cv = "5 years experience in Marketing campaigns and social media management.";

        BigDecimal score = matcher.evaluateExperience(jd, cv);
        assertEquals(BigDecimal.ZERO.setScale(2), score);
    }

    @Test
    void testTEST10_CandidateWithNoCV_ReturnsInsufficientDataStatus() {
        CandidateProfile emptyCandidate = CandidateProfile.builder()
                .fullName("New Candidate No CV")
                .build();
        emptyCandidate.setId(UUID.randomUUID());

        when(jobRepository.findById(javaJob.getId())).thenReturn(Optional.of(javaJob));
        when(candidateProfileRepository.findById(emptyCandidate.getId())).thenReturn(Optional.of(emptyCandidate));
        when(cvRepository.findByCandidateId(emptyCandidate.getId())).thenReturn(List.of());

        MatchResult result = matchingEngineService.calculateAndPersistMatchResult(javaJob.getId(), emptyCandidate.getId());

        assertEquals("INSUFFICIENT_DATA", result.getStatus());
        assertEquals(BigDecimal.ZERO, result.getOverallScore());
        assertEquals(BigDecimal.ZERO, result.getCoreScore());
        assertTrue(result.getAiSummary().contains("Insufficient candidate profile/CV data"));
    }
}


