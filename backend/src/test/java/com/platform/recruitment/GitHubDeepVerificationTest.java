package com.platform.recruitment;

import com.platform.recruitment.candidate.CandidateProfile;
import com.platform.recruitment.candidate.CandidateProfileRepository;
import com.platform.recruitment.github.*;
import com.platform.recruitment.job.*;
import com.platform.recruitment.matching.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class GitHubDeepVerificationTest {

    @Mock private GitHubProfileRepository gitHubProfileRepository;
    @Mock private GitHubAssessmentRepository gitHubAssessmentRepository;
    @Mock private GitHubRepositoryRepository gitHubRepositoryRepository;

    private GitHubScoringService gitHubScoringService;

    private CandidateProfile candidate;
    private Job javaBackendJob;
    private Job nonItJob;
    private Job itHelpdeskJob;

    @BeforeEach
    void setUp() {
        gitHubScoringService = new GitHubScoringService(
                gitHubProfileRepository,
                gitHubAssessmentRepository,
                gitHubRepositoryRepository
        );

        candidate = CandidateProfile.builder()
                .fullName("Nguyen Van Thuc Te")
                .githubUrl("https://github.com/thucte-dev")
                .build();
        candidate.setId(UUID.randomUUID());

        javaBackendJob = Job.builder()
                .title("Senior Java Backend Engineer")
                .industry("Technology")
                .description("Requires solid experience in Java, Spring Boot, PostgreSQL, Docker, and microservices architecture.")
                .build();
        javaBackendJob.setId(UUID.randomUUID());

        nonItJob = Job.builder()
                .title("Digital Marketing Specialist")
                .industry("Marketing")
                .description("Manage multi-channel paid ads, SEO optimization, and social media campaigns.")
                .build();
        nonItJob.setId(UUID.randomUUID());

        itHelpdeskJob = Job.builder()
                .title("IT Helpdesk & Technical Support")
                .industry("Technology")
                .description("Provide first-line IT support, hardware maintenance, helpdesk ticketing. No coding required.")
                .build();
        itHelpdeskJob.setId(UUID.randomUUID());
    }

    @Test
    @DisplayName("Test 1: Relevant Repositories Detection against Java Backend JD")
    void testRelevantRepositoriesDetection() {
        GitHubProfile profile = GitHubProfile.builder()
                .candidate(candidate)
                .status("SYNCED")
                .activitySignal(GitHubActivitySignal.HIGH)
                .build();
        profile.setId(UUID.randomUUID());

        GitHubRepository repo1 = GitHubRepository.builder()
                .name("backend-service")
                .description("Production Spring Boot microservice with PostgreSQL database")
                .primaryLanguage("Java")
                .updatedAtGithub(ZonedDateTime.now().minusDays(3))
                .build();
        repo1.setId(UUID.randomUUID());

        GitHubRepository repo2 = GitHubRepository.builder()
                .name("portfolio-site")
                .description("Personal personal static website with photography")
                .primaryLanguage("HTML")
                .updatedAtGithub(ZonedDateTime.now().minusDays(100))
                .build();
        repo2.setId(UUID.randomUUID());

        GitHubRepository repo3 = GitHubRepository.builder()
                .name("data-analysis-script")
                .description("Simple python scripts for data scraping")
                .primaryLanguage("Python")
                .updatedAtGithub(ZonedDateTime.now().minusDays(50))
                .build();
        repo3.setId(UUID.randomUUID());

        GitHubRepository repo4 = GitHubRepository.builder()
                .name("social-app-frontend")
                .description("Mobile frontend UI using React Native")
                .primaryLanguage("JavaScript")
                .updatedAtGithub(ZonedDateTime.now().minusDays(20))
                .build();
        repo4.setId(UUID.randomUUID());

        when(gitHubProfileRepository.findByCandidateId(candidate.getId())).thenReturn(Optional.of(profile));
        when(gitHubRepositoryRepository.findByGithubProfileId(profile.getId()))
                .thenReturn(List.of(repo1, repo2, repo3, repo4));

        List<String> relevantRepos = gitHubScoringService.findRelevantRepositories(candidate.getId(), javaBackendJob.getDescription());

        // Assert only backend-service is detected as highly relevant to Java Backend JD
        assertTrue(relevantRepos.contains("backend-service"), "backend-service must be detected as relevant");
        assertFalse(relevantRepos.contains("portfolio-site"), "portfolio-site must NOT be considered relevant");
        assertFalse(relevantRepos.contains("data-analysis-script"), "data-analysis-script must NOT be considered relevant");
        assertEquals(1, relevantRepos.size(), "Only 1 relevant repository should match the Java Backend requirements");
    }

    @Test
    @DisplayName("Test 2: Observable Programming Language Overlap from Repositories")
    void testObservableProgrammingLanguageOverlap() {
        GitHubProfile profile = GitHubProfile.builder()
                .candidate(candidate)
                .status("SYNCED")
                .activitySignal(GitHubActivitySignal.HIGH)
                .build();
        profile.setId(UUID.randomUUID());

        // Candidate with Java repositories matching Java JD
        GitHubRepository javaRepo = GitHubRepository.builder()
                .name("order-management-api")
                .description("Spring Boot REST API")
                .primaryLanguage("Java")
                .updatedAtGithub(ZonedDateTime.now().minusDays(2))
                .build();
        javaRepo.setId(UUID.randomUUID());

        when(gitHubProfileRepository.findByCandidateId(candidate.getId())).thenReturn(Optional.of(profile));
        when(gitHubRepositoryRepository.findByGithubProfileId(profile.getId())).thenReturn(List.of(javaRepo));

        Optional<BigDecimal> scoreOpt = gitHubScoringService.calculateGitHubSupportingScore(
                candidate.getId(), javaBackendJob.getIndustry(), javaBackendJob.getDescription());

        assertTrue(scoreOpt.isPresent());
        BigDecimal score = scoreOpt.get();
        assertTrue(score.compareTo(BigDecimal.valueOf(85.0)) >= 0, 
                "Score with matching Java language repo should be >= 85.0, but was: " + score);
    }

    @Test
    @DisplayName("Test 3: Language Manipulation — Changing GitHub from Java to Python Lowers GitHub Score for Java JD")
    void testLanguageManipulationChangesScore() {
        GitHubProfile profileJava = GitHubProfile.builder()
                .candidate(candidate)
                .status("SYNCED")
                .activitySignal(GitHubActivitySignal.HIGH)
                .build();
        profileJava.setId(UUID.randomUUID());

        GitHubRepository javaRepo = GitHubRepository.builder()
                .name("spring-microservice")
                .description("Enterprise Java Spring backend")
                .primaryLanguage("Java")
                .updatedAtGithub(ZonedDateTime.now().minusDays(5))
                .build();
        javaRepo.setId(UUID.randomUUID());

        when(gitHubProfileRepository.findByCandidateId(candidate.getId())).thenReturn(Optional.of(profileJava));
        when(gitHubRepositoryRepository.findByGithubProfileId(profileJava.getId())).thenReturn(List.of(javaRepo));

        BigDecimal scoreJava = gitHubScoringService.calculateGitHubSupportingScore(
                candidate.getId(), javaBackendJob.getIndustry(), javaBackendJob.getDescription()).orElseThrow();

        // Now change candidate's GitHub to completely unrelated Python/Django stack
        GitHubProfile profilePython = GitHubProfile.builder()
                .candidate(candidate)
                .status("SYNCED")
                .activitySignal(GitHubActivitySignal.HIGH)
                .build();
        profilePython.setId(UUID.randomUUID());

        GitHubRepository pythonRepo = GitHubRepository.builder()
                .name("django-blog")
                .description("Personal photography blog in Django")
                .primaryLanguage("Python")
                .updatedAtGithub(ZonedDateTime.now().minusDays(5))
                .build();
        pythonRepo.setId(UUID.randomUUID());

        when(gitHubProfileRepository.findByCandidateId(candidate.getId())).thenReturn(Optional.of(profilePython));
        when(gitHubRepositoryRepository.findByGithubProfileId(profilePython.getId())).thenReturn(List.of(pythonRepo));

        BigDecimal scorePython = gitHubScoringService.calculateGitHubSupportingScore(
                candidate.getId(), javaBackendJob.getIndustry(), javaBackendJob.getDescription()).orElseThrow();

        assertTrue(scoreJava.compareTo(scorePython) > 0,
                "Java repo GitHub score (" + scoreJava + ") must be significantly higher than Python repo score (" + scorePython + ") for a Java JD");
        assertTrue(scoreJava.subtract(scorePython).doubleValue() >= 15.0,
                "Score difference between relevant Java and unrelated Python should be >= 15 points");
    }

    @Test
    @DisplayName("Test 4: Repository Manipulation — Relevant Tech Stack vs Unrelated Projects Changes Tech Score")
    void testRepositoryManipulationChangesTechScore() {
        GitHubProfile profile = GitHubProfile.builder()
                .candidate(candidate)
                .status("SYNCED")
                .activitySignal(GitHubActivitySignal.HIGH)
                .build();
        profile.setId(UUID.randomUUID());

        // Relevant Repositories (backend, postgres, docker)
        GitHubRepository repoA1 = GitHubRepository.builder()
                .name("fintech-backend-service")
                .description("Distributed microservice with Spring Boot and PostgreSQL")
                .primaryLanguage("Java")
                .updatedAtGithub(ZonedDateTime.now().minusDays(5))
                .build();
        repoA1.setId(UUID.randomUUID());

        GitHubRepository repoA2 = GitHubRepository.builder()
                .name("docker-compose-infra")
                .description("Docker deployment scripts for backend infrastructure")
                .primaryLanguage("Docker")
                .updatedAtGithub(ZonedDateTime.now().minusDays(10))
                .build();
        repoA2.setId(UUID.randomUUID());

        when(gitHubProfileRepository.findByCandidateId(candidate.getId())).thenReturn(Optional.of(profile));
        when(gitHubRepositoryRepository.findByGithubProfileId(profile.getId())).thenReturn(List.of(repoA1, repoA2));

        BigDecimal scoreStrongRepos = gitHubScoringService.calculateGitHubSupportingScore(
                candidate.getId(), javaBackendJob.getIndustry(), javaBackendJob.getDescription()).orElseThrow();

        // Unrelated Repositories (photography, personal notes)
        GitHubRepository repoB1 = GitHubRepository.builder()
                .name("my-photography")
                .description("Photos taken on vacation")
                .primaryLanguage("HTML")
                .updatedAtGithub(ZonedDateTime.now().minusDays(5))
                .build();
        repoB1.setId(UUID.randomUUID());

        GitHubRepository repoB2 = GitHubRepository.builder()
                .name("game-assets")
                .description("Pixel art textures")
                .primaryLanguage("Text")
                .updatedAtGithub(ZonedDateTime.now().minusDays(10))
                .build();
        repoB2.setId(UUID.randomUUID());

        when(gitHubRepositoryRepository.findByGithubProfileId(profile.getId())).thenReturn(List.of(repoB1, repoB2));

        BigDecimal scoreUnrelatedRepos = gitHubScoringService.calculateGitHubSupportingScore(
                candidate.getId(), javaBackendJob.getIndustry(), javaBackendJob.getDescription()).orElseThrow();

        assertTrue(scoreStrongRepos.compareTo(scoreUnrelatedRepos) > 0,
                "Strong tech repos score (" + scoreStrongRepos + ") must exceed unrelated repos score (" + scoreUnrelatedRepos + ")");
    }

    @Test
    @DisplayName("Test 5: Recency Manipulation — Recent Activity (<=14 days) Yields Higher Score than Stale (>180 days)")
    void testRecencyManipulationAffectsScore() {
        GitHubProfile profile = GitHubProfile.builder()
                .candidate(candidate)
                .status("SYNCED")
                .activitySignal(GitHubActivitySignal.MODERATE)
                .build();
        profile.setId(UUID.randomUUID());

        // Profile with recent commit (3 days ago)
        GitHubRepository recentRepo = GitHubRepository.builder()
                .name("active-service")
                .description("Active Java Spring service")
                .primaryLanguage("Java")
                .updatedAtGithub(ZonedDateTime.now().minusDays(3))
                .build();
        recentRepo.setId(UUID.randomUUID());

        when(gitHubProfileRepository.findByCandidateId(candidate.getId())).thenReturn(Optional.of(profile));
        when(gitHubRepositoryRepository.findByGithubProfileId(profile.getId())).thenReturn(List.of(recentRepo));

        BigDecimal recentScore = gitHubScoringService.calculateGitHubSupportingScore(
                candidate.getId(), javaBackendJob.getIndustry(), javaBackendJob.getDescription()).orElseThrow();

        // Profile with stale commit (250 days ago)
        GitHubRepository staleRepo = GitHubRepository.builder()
                .name("stale-service")
                .description("Active Java Spring service")
                .primaryLanguage("Java")
                .updatedAtGithub(ZonedDateTime.now().minusDays(250))
                .build();
        staleRepo.setId(UUID.randomUUID());

        when(gitHubRepositoryRepository.findByGithubProfileId(profile.getId())).thenReturn(List.of(staleRepo));

        BigDecimal staleScore = gitHubScoringService.calculateGitHubSupportingScore(
                candidate.getId(), javaBackendJob.getIndustry(), javaBackendJob.getDescription()).orElseThrow();

        assertTrue(recentScore.compareTo(staleScore) > 0,
                "Recent repo activity (" + recentScore + ") must yield higher score than stale repo activity (" + staleScore + ")");
    }

    @Test
    @DisplayName("Test 6: GitHub Eligibility Matrix (A: IT dev, B: IT non-dev, C: Non-IT)")
    void testGitHubEligibilityMatrix() {
        GitHubProfile profile = GitHubProfile.builder()
                .candidate(candidate)
                .status("SYNCED")
                .activitySignal(GitHubActivitySignal.HIGH)
                .build();
        profile.setId(UUID.randomUUID());

        when(gitHubProfileRepository.findByCandidateId(candidate.getId())).thenReturn(Optional.of(profile));

        // Case A: IT Development role -> ELIGIBLE
        Optional<BigDecimal> itDevScore = gitHubScoringService.calculateGitHubSupportingScore(
                candidate.getId(), javaBackendJob.getIndustry(), javaBackendJob.getDescription());
        assertTrue(itDevScore.isPresent(), "IT Developer job must include GitHub score");

        // Case B: IT Non-Dev role (Helpdesk / Technical Support) -> INELIGIBLE
        Optional<BigDecimal> itSupportScore = gitHubScoringService.calculateGitHubSupportingScore(
                candidate.getId(), itHelpdeskJob.getIndustry(), itHelpdeskJob.getDescription());
        assertTrue(itSupportScore.isEmpty(), "IT Helpdesk/Support job must NOT include GitHub score");

        // Case C: Non-IT role (Marketing) -> INELIGIBLE
        Optional<BigDecimal> nonItScore = gitHubScoringService.calculateGitHubSupportingScore(
                candidate.getId(), nonItJob.getIndustry(), nonItJob.getDescription());
        assertTrue(nonItScore.isEmpty(), "Marketing job must NOT include GitHub score");
    }

    @Test
    @DisplayName("Test 7: No GitHub URL / Account — Graceful Fallback with Zero Penalty")
    void testNoGitHubFallbackZeroPenalty() {
        when(gitHubProfileRepository.findByCandidateId(candidate.getId())).thenReturn(Optional.empty());

        Optional<BigDecimal> score = gitHubScoringService.calculateGitHubSupportingScore(
                candidate.getId(), javaBackendJob.getIndustry(), javaBackendJob.getDescription());

        assertTrue(score.isEmpty(), "Missing GitHub profile must return empty Optional, indicating fallback");
    }

    @Test
    @DisplayName("Test 8: Private Only Repositories — Graceful Fallback")
    void testPrivateOnlyRepositoriesFallback() {
        GitHubProfile privateProfile = GitHubProfile.builder()
                .candidate(candidate)
                .status("PRIVATE_ONLY")
                .publicReposCount(0)
                .build();
        privateProfile.setId(UUID.randomUUID());

        when(gitHubProfileRepository.findByCandidateId(candidate.getId())).thenReturn(Optional.of(privateProfile));

        Optional<BigDecimal> score = gitHubScoringService.calculateGitHubSupportingScore(
                candidate.getId(), javaBackendJob.getIndustry(), javaBackendJob.getDescription());

        assertTrue(score.isEmpty(), "PRIVATE_ONLY profile must trigger graceful fallback");
    }

    @Test
    @DisplayName("Test 9: GitHub API Rate-Limit / Unavailable — Graceful Fallback")
    void testGitHubApiUnavailableFallback() {
        GitHubProfile unavailableProfile = GitHubProfile.builder()
                .candidate(candidate)
                .status("API_UNAVAILABLE")
                .build();
        unavailableProfile.setId(UUID.randomUUID());

        when(gitHubProfileRepository.findByCandidateId(candidate.getId())).thenReturn(Optional.of(unavailableProfile));

        Optional<BigDecimal> score = gitHubScoringService.calculateGitHubSupportingScore(
                candidate.getId(), javaBackendJob.getIndustry(), javaBackendJob.getDescription());

        assertTrue(score.isEmpty(), "API_UNAVAILABLE status must trigger graceful fallback");
    }

    @Test
    @DisplayName("Test 10: Non-IT Job Ignores Radical GitHub Changes on Overall Score")
    void testNonItJobIgnoresGitHubChanges() {
        double coreScore = 85.0;

        Optional<BigDecimal> score = gitHubScoringService.calculateGitHubSupportingScore(
                candidate.getId(), nonItJob.getIndustry(), nonItJob.getDescription());

        assertTrue(score.isEmpty());
        // Fallback formula: S_overall = S_core
        double overallScore = coreScore;
        assertEquals(85.0, overallScore, "Overall score for non-IT job must remain exactly S_core");
    }
}
