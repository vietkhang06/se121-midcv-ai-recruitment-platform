package com.platform.recruitment;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.platform.recruitment.application.Application;
import com.platform.recruitment.application.ApplicationRepository;
import com.platform.recruitment.candidate.CandidateProfile;
import com.platform.recruitment.candidate.CandidateProfileRepository;
import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.ErrorCode;
import com.platform.recruitment.cv.CV;
import com.platform.recruitment.cv.CVRepository;

import com.platform.recruitment.github.*;
import com.platform.recruitment.job.*;
import com.platform.recruitment.matching.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.ZonedDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class GitHubHardenedSignalTest {

    @Mock private JobRepository jobRepository;
    @Mock private JobRequirementRepository jobRequirementRepository;
    @Mock private CandidateProfileRepository candidateProfileRepository;
    @Mock private CVRepository cvRepository;
    @Mock private ApplicationRepository applicationRepository;
    @Mock private MatchResultRepository matchResultRepository;
    @Mock private MatchFactorRepository matchFactorRepository;
    @Mock private EvidenceRepository evidenceRepository;
    @Mock private GitHubProfileRepository gitHubProfileRepository;
    @Mock private GitHubAssessmentRepository gitHubAssessmentRepository;
    @Mock private GitHubRepositoryRepository gitHubRepositoryRepository;
    @Mock private JdbcTemplate jdbcTemplate;

    private GitHubScoringService gitHubScoringService;
    private MatchingEngineService matchingEngineService;
    private ObjectMapper mapper = new ObjectMapper();

    private CandidateProfile candidate;
    private Job javaBackendJob;
    private Job marketingJob;
    private Job helpdeskJob;
    private Application application;

    @BeforeEach
    void setUp() {
        gitHubScoringService = new GitHubScoringService(
                gitHubProfileRepository,
                gitHubAssessmentRepository,
                gitHubRepositoryRepository
        );

        matchingEngineService = new MatchingEngineService(
                jobRepository,
                jobRequirementRepository,
                candidateProfileRepository,
                applicationRepository,
                cvRepository,
                matchResultRepository,
                matchFactorRepository,
                new RequiredSkillMatcher(),
                new PreferredSkillMatcher(),
                new ExperienceMatcher(),
                new EducationMatcher(),
                new ProjectRelevanceMatcher(),
                gitHubScoringService
        );

        candidate = CandidateProfile.builder()
                .fullName("Nguyen Van Test")
                .githubUrl("https://github.com/test-candidate")
                .build();
        candidate.setId(UUID.randomUUID());

        javaBackendJob = Job.builder()
                .title("Senior Java Backend Engineer")
                .industry("Technology")
                .description("Requires Java, Spring Boot, PostgreSQL, Docker microservices. 3+ years experience.")
                .build();
        javaBackendJob.setId(UUID.randomUUID());

        marketingJob = Job.builder()
                .title("Marketing Director")
                .industry("Marketing")
                .description("Requires SEO, paid media, brand management.")
                .build();
        marketingJob.setId(UUID.randomUUID());

        helpdeskJob = Job.builder()
                .title("IT Support Specialist")
                .industry("Technology")
                .description("Provide hardware support and helpdesk ticketing. No coding required.")
                .build();
        helpdeskJob.setId(UUID.randomUUID());

        application = Application.builder()
                .job(javaBackendJob)
                .candidate(candidate)
                .build();
        application.setId(UUID.randomUUID());

        lenient().when(jobRepository.findById(javaBackendJob.getId())).thenReturn(Optional.of(javaBackendJob));
        lenient().when(jobRepository.findById(marketingJob.getId())).thenReturn(Optional.of(marketingJob));
        lenient().when(jobRepository.findById(helpdeskJob.getId())).thenReturn(Optional.of(helpdeskJob));
        lenient().when(candidateProfileRepository.findById(candidate.getId())).thenReturn(Optional.of(candidate));
        lenient().when(applicationRepository.findByJobIdAndCandidateId(any(), any())).thenReturn(Optional.of(application));
        lenient().when(matchResultRepository.findByApplicationId(any())).thenReturn(Optional.empty());
        lenient().when(matchResultRepository.save(any(MatchResult.class))).thenAnswer(inv -> inv.getArgument(0));

        CV cv = CV.builder()
                .candidate(candidate)
                .rawText("3 years experience in Java, Spring Boot, PostgreSQL, Docker.")
                .build();
        lenient().when(cvRepository.findByCandidateId(candidate.getId())).thenReturn(List.of(cv));

        JobRequirement req1 = JobRequirement.builder()
                .job(javaBackendJob)
                .skillName("Java")
                .requirementType(RequirementType.REQUIRED)
                .build();
        lenient().when(jobRequirementRepository.findByJobId(javaBackendJob.getId())).thenReturn(List.of(req1));
    }

    @Test
    @DisplayName("1. Candidate without GitHub Profile: Zero Penalty, Overall = Core, 100% Core Weight")
    void testCandidateWithoutGitHub_ZeroPenalty() {
        when(gitHubProfileRepository.findByCandidateId(candidate.getId())).thenReturn(Optional.empty());

        MatchResult result = matchingEngineService.calculateAndPersistMatchResult(javaBackendJob.getId(), candidate.getId());

        assertNotNull(result);
        assertNull(result.getGithubScore());
        assertEquals(BigDecimal.valueOf(1.00), result.getCoreWeight());
        assertEquals(BigDecimal.ZERO, result.getGithubWeight());
        assertEquals(result.getCoreScore(), result.getOverallScore());
        assertFalse(result.getIsGithubActive(), "isGithubActive must be false when GitHub profile is absent");
        assertTrue(result.getGithubFallbackApplied(), "githubFallbackApplied must be true on fallback");
    }

    @Test
    @DisplayName("2. Non-Technical Job (Marketing): GitHub Disabled, Zero Penalty Fallback")
    void testNonTechnicalJob_GitHubDisabled() {
        Application mktApp = Application.builder().job(marketingJob).candidate(candidate).build();
        mktApp.setId(UUID.randomUUID());
        when(applicationRepository.findByJobIdAndCandidateId(marketingJob.getId(), candidate.getId())).thenReturn(Optional.of(mktApp));

        GitHubProfile profile = GitHubProfile.builder()
                .candidate(candidate)
                .status("SYNCED")
                .activitySignal(GitHubActivitySignal.HIGH)
                .build();
        profile.setId(UUID.randomUUID());
        lenient().when(gitHubProfileRepository.findByCandidateId(candidate.getId())).thenReturn(Optional.of(profile));

        MatchResult result = matchingEngineService.calculateAndPersistMatchResult(marketingJob.getId(), candidate.getId());

        assertNotNull(result);
        assertNull(result.getGithubScore(), "GitHub score must be null for non-technical roles");
        assertEquals(result.getCoreScore(), result.getOverallScore());
        assertFalse(result.getIsGithubActive());
        assertTrue(result.getGithubFallbackApplied());
    }

    @Test
    @DisplayName("3. Technical Job with Non-Coding Role (IT Helpdesk): GitHub Disabled, Zero Penalty")
    void testNonCodingITJob_GitHubDisabled() {
        Application hdApp = Application.builder().job(helpdeskJob).candidate(candidate).build();
        hdApp.setId(UUID.randomUUID());
        when(applicationRepository.findByJobIdAndCandidateId(helpdeskJob.getId(), candidate.getId())).thenReturn(Optional.of(hdApp));

        MatchResult result = matchingEngineService.calculateAndPersistMatchResult(helpdeskJob.getId(), candidate.getId());

        assertNotNull(result);
        assertNull(result.getGithubScore(), "GitHub score must be null for non-coding IT roles");
        assertEquals(result.getCoreScore(), result.getOverallScore());
        assertFalse(result.getIsGithubActive());
        assertTrue(result.getGithubFallbackApplied());
    }

    @Test
    @DisplayName("4. Archived Repositories Exclusion: Ignored from Language, Tech, Recency and Relevant Lists")
    void testArchivedRepositoriesExclusion() {
        GitHubProfile profile = GitHubProfile.builder()
                .candidate(candidate)
                .status("SYNCED")
                .activitySignal(GitHubActivitySignal.HIGH)
                .build();
        profile.setId(UUID.randomUUID());

        GitHubRepository activeRepo = GitHubRepository.builder()
                .name("fintech-api")
                .description("Production Spring Boot microservice")
                .primaryLanguage("Java")
                .isArchived(false)
                .updatedAtGithub(ZonedDateTime.now().minusDays(5))
                .build();
        activeRepo.setId(UUID.randomUUID());

        GitHubRepository archivedRepo = GitHubRepository.builder()
                .name("archived-legacy-service")
                .description("Old Spring Boot postgres service")
                .primaryLanguage("Java")
                .isArchived(true) // ARCHIVED!
                .updatedAtGithub(ZonedDateTime.now().minusDays(1))
                .build();
        archivedRepo.setId(UUID.randomUUID());

        when(gitHubProfileRepository.findByCandidateId(candidate.getId())).thenReturn(Optional.of(profile));
        when(gitHubRepositoryRepository.findByGithubProfileId(profile.getId()))
                .thenReturn(List.of(activeRepo, archivedRepo));

        List<String> relevantRepos = gitHubScoringService.findRelevantRepositories(candidate.getId(), javaBackendJob.getDescription());
        assertEquals(1, relevantRepos.size());
        assertEquals("fintech-api", relevantRepos.get(0));
        assertFalse(relevantRepos.contains("archived-legacy-service"), "Archived repository must NOT be listed in relevant repos");

        Optional<BigDecimal> score = gitHubScoringService.calculateGitHubSupportingScore(
                candidate.getId(), javaBackendJob.getIndustry(), javaBackendJob.getDescription());
        assertTrue(score.isPresent());
    }

    @Test
    @DisplayName("5. Fork Repositories Exclusion in Scoring Pipeline: Excluded from Evidence and Bonus")
    void testForkExclusionInScoringPipeline() {
        Scoring scoring = new Scoring();

        ObjectNode jdNode = mapper.createObjectNode();
        ArrayNode jdSkills = jdNode.putArray("skills");
        jdSkills.addObject().put("canonical", "java").put("priority", "REQUIRED");

        ObjectNode cvNode = mapper.createObjectNode();
        ArrayNode cvSkills = cvNode.putArray("skills");
        cvSkills.addObject().put("canonical", "java");

        ObjectNode gitNode = mapper.createObjectNode();
        gitNode.put("status", "AVAILABLE");
        gitNode.put("fetched_at", ZonedDateTime.now().toString());
        ArrayNode repos = gitNode.putArray("repos");

        // Forked repo with Java
        ObjectNode forkedRepo = repos.addObject();
        forkedRepo.put("name", "forked-spring");
        forkedRepo.put("language", "java");
        forkedRepo.put("fork", true); // FORK
        forkedRepo.put("archived", false);
        forkedRepo.putObject("languages");
        forkedRepo.putArray("topics");

        // Archived repo with Java
        ObjectNode archivedRepo = repos.addObject();
        archivedRepo.put("name", "archived-java");
        archivedRepo.put("language", "java");
        archivedRepo.put("fork", false);
        archivedRepo.put("archived", true); // ARCHIVED
        archivedRepo.putObject("languages");
        archivedRepo.putArray("topics");

        Scoring.Result res = scoring.calculate(cvNode, jdNode, 80.0, gitNode);

        // Neither forked nor archived repo should qualify as evidence
        assertEquals(0.0, res.githubBonus(), "Forked and archived repos must yield 0 bonus");
        List<?> ghEv = (List<?>) res.details().get("github_evidence");
        assertTrue(ghEv == null || ghEv.isEmpty(), "GitHub evidence must not include forked or archived repositories");
    }

    @Test
    @DisplayName("6. GitHub Username Validation & Sanitization: Clean handles and URLs accepted, invalid rejected")
    void testGitHubUsernameValidationAndSanitization() {
        assertEquals("octocat", GithubClient.sanitizeUsername("octocat"));
        assertEquals("octocat", GithubClient.sanitizeUsername("@octocat"));
        assertEquals("octocat", GithubClient.sanitizeUsername("https://github.com/octocat"));
        assertEquals("octocat", GithubClient.sanitizeUsername("https://github.com/octocat/"));
        assertEquals("octo-cat-123", GithubClient.sanitizeUsername("octo-cat-123"));

        assertNull(GithubClient.sanitizeUsername(null));
        assertNull(GithubClient.sanitizeUsername(""));
        assertNull(GithubClient.sanitizeUsername("   "));
        assertNull(GithubClient.sanitizeUsername("not a valid username"));
    }

    @Test
    @DisplayName("7. Cache Query Correctness: Enforces expires_at > now() and lowercases username")
    void testCacheQueryEnforcesExpiration() {
        GithubClient client = new GithubClient(jdbcTemplate, mapper, "dummy-token");

        when(jdbcTemplate.query(
                eq("SELECT payload::text FROM github_cache WHERE username=? AND expires_at>now()"),
                any(RowMapper.class),
                eq("octocat")
        )).thenReturn(List.of("{\"status\":\"AVAILABLE\",\"username\":\"octocat\",\"repos\":[]}"));

        JsonNode payload = client.fetch("OctoCat");

        assertNotNull(payload);
        assertEquals("AVAILABLE", payload.path("status").asText());
        assertEquals("octocat", payload.path("username").asText());
        verify(jdbcTemplate, times(1)).query(
                contains("expires_at>now()"),
                any(RowMapper.class),
                eq("octocat")
        );
    }

    @Test
    @DisplayName("8. Grounded Evidence Grounding: Only Verified Non-Archived Repos are Persisted in Evidence")
    void testGroundedEvidencePersistedCorrectly() {
        GitHubProfile profile = GitHubProfile.builder()
                .candidate(candidate)
                .status("SYNCED")
                .activitySignal(GitHubActivitySignal.HIGH)
                .build();
        profile.setId(UUID.randomUUID());

        GitHubRepository repo = GitHubRepository.builder()
                .name("cloud-gateway-service")
                .description("Spring Cloud backend microservice gateway")
                .primaryLanguage("Java")
                .isArchived(false)
                .updatedAtGithub(ZonedDateTime.now().minusDays(10))
                .build();
        repo.setId(UUID.randomUUID());

        when(gitHubProfileRepository.findByCandidateId(candidate.getId())).thenReturn(Optional.of(profile));
        when(gitHubRepositoryRepository.findByGithubProfileId(profile.getId())).thenReturn(List.of(repo));

        // Inject evidenceRepository for grounding test
        ReflectionTestUtils.setField(matchingEngineService, "evidenceRepository", evidenceRepository);

        MatchResult result = matchingEngineService.calculateAndPersistMatchResult(javaBackendJob.getId(), candidate.getId());

        assertNotNull(result);
        assertNotNull(result.getGithubScore());
        assertTrue(result.getIsGithubActive());
        assertFalse(result.getGithubFallbackApplied());
        assertEquals(BigDecimal.valueOf(0.85), result.getCoreWeight());
        assertEquals(BigDecimal.valueOf(0.15), result.getGithubWeight());

        // Verify evidence saved
        ArgumentCaptor<Evidence> captor = ArgumentCaptor.forClass(Evidence.class);
        verify(evidenceRepository, atLeastOnce()).save(captor.capture());

        boolean foundGhEvidence = captor.getAllValues().stream()
                .anyMatch(ev -> "GITHUB".equals(ev.getSourceType())
                        && ev.getSnippet().contains("cloud-gateway-service")
                        && "VERIFIED".equals(ev.getValidationStatus()));
        assertTrue(foundGhEvidence, "Real repository must be grounded as VERIFIED GitHub evidence");
    }

    @Test
    @DisplayName("9. Score Reconstruction Invariant: 85% Core + 15% GitHub when active")
    void testScoreReconstructionActive() {
        GitHubProfile profile = GitHubProfile.builder()
                .candidate(candidate)
                .status("SYNCED")
                .activitySignal(GitHubActivitySignal.HIGH)
                .build();
        profile.setId(UUID.randomUUID());

        GitHubRepository repo = GitHubRepository.builder()
                .name("backend-api")
                .description("Spring Boot backend API")
                .primaryLanguage("Java")
                .isArchived(false)
                .updatedAtGithub(ZonedDateTime.now().minusDays(2))
                .build();
        repo.setId(UUID.randomUUID());

        when(gitHubProfileRepository.findByCandidateId(candidate.getId())).thenReturn(Optional.of(profile));
        when(gitHubRepositoryRepository.findByGithubProfileId(profile.getId())).thenReturn(List.of(repo));

        MatchResult result = matchingEngineService.calculateAndPersistMatchResult(javaBackendJob.getId(), candidate.getId());

        double expectedOverall = (0.85 * result.getCoreScore().doubleValue()) + (0.15 * result.getGithubScore().doubleValue());
        BigDecimal roundedExpected = BigDecimal.valueOf(Math.max(0.0, Math.min(100.0, expectedOverall))).setScale(2, RoundingMode.HALF_UP);

        assertEquals(roundedExpected, result.getOverallScore());
    }
}
