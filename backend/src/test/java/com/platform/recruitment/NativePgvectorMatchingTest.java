package com.platform.recruitment;

import com.platform.recruitment.application.Application;
import com.platform.recruitment.application.ApplicationRepository;
import com.platform.recruitment.candidate.CandidateProfile;
import com.platform.recruitment.candidate.CandidateProfileRepository;
import com.platform.recruitment.cv.CV;
import com.platform.recruitment.cv.CVRepository;
import com.platform.recruitment.embedding.PgvectorCosineSimilarity;
import com.platform.recruitment.github.GitHubAssessmentRepository;
import com.platform.recruitment.github.GitHubProfileRepository;
import com.platform.recruitment.job.*;
import com.platform.recruitment.matching.*;
import com.platform.recruitment.taxonomy.TaxonomyService;
import com.platform.recruitment.user.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.math.BigDecimal;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
public class NativePgvectorMatchingTest {

    @Mock private JdbcTemplate jdbcTemplate;
    @Mock private JobRepository jobRepository;
    @Mock private JobRequirementRepository jobRequirementRepository;
    @Mock private CandidateProfileRepository candidateProfileRepository;
    @Mock private ApplicationRepository applicationRepository;
    @Mock private CVRepository cvRepository;
    @Mock private MatchResultRepository matchResultRepository;
    @Mock private MatchFactorRepository matchFactorRepository;
    @Mock private EvidenceRepository evidenceRepository;
    @Mock private GitHubProfileRepository gitHubProfileRepository;
    @Mock private GitHubAssessmentRepository gitHubAssessmentRepository;
    @Mock private TaxonomyService taxonomyService;

    private PgvectorCosineSimilarity pgvectorCosineSimilarity;
    private SkillNormalizer skillNormalizer;
    private MatchingEngineService matchingEngineService;
    private GitHubScoringService gitHubScoringService;

    private Job job;
    private CandidateProfile candidate;
    private Application application;

    @BeforeEach
    void setUp() {
        pgvectorCosineSimilarity = new PgvectorCosineSimilarity(jdbcTemplate);
        skillNormalizer = new SkillNormalizer(taxonomyService);
        gitHubScoringService = new GitHubScoringService(gitHubProfileRepository, gitHubAssessmentRepository);

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

        // Inject dependencies into MatchingEngineService
        try {
            var skillNormField = MatchingEngineService.class.getDeclaredField("skillNormalizer");
            skillNormField.setAccessible(true);
            skillNormField.set(matchingEngineService, skillNormalizer);

            var pgvecField = MatchingEngineService.class.getDeclaredField("pgvectorCosineSimilarity");
            pgvecField.setAccessible(true);
            pgvecField.set(matchingEngineService, pgvectorCosineSimilarity);

            var jdbcField = MatchingEngineService.class.getDeclaredField("jdbcTemplate");
            jdbcField.setAccessible(true);
            jdbcField.set(matchingEngineService, jdbcTemplate);

            var evField = MatchingEngineService.class.getDeclaredField("evidenceRepository");
            evField.setAccessible(true);
            evField.set(matchingEngineService, evidenceRepository);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }

        UUID userId = UUID.randomUUID();
        User user = User.builder().email("candidate.matching@midcv.io").build();
        user.setId(userId);

        candidate = CandidateProfile.builder()
                .user(user)
                .fullName("Tran Van Matching")
                .build();
        candidate.setId(UUID.randomUUID());

        job = Job.builder()
                .title("Fullstack Java & React Architect")
                .industry("Technology")
                .description("Requires 5 years experience in Java Spring Boot and React.")
                .build();
        job.setId(UUID.randomUUID());

        application = Application.builder()
                .job(job)
                .candidate(candidate)
                .build();
        application.setId(UUID.randomUUID());

        when(applicationRepository.findByJobIdAndCandidateId(job.getId(), candidate.getId())).thenReturn(Optional.of(application));
        when(applicationRepository.findById(application.getId())).thenReturn(Optional.of(application));
        when(matchResultRepository.findByApplicationId(application.getId())).thenReturn(Optional.empty());
        when(matchResultRepository.save(any(MatchResult.class))).thenAnswer(i -> i.getArgument(0));
    }

    @Test
    @DisplayName("Pgvector 1: Real PostgreSQL pgvector cosine similarity executes <=> distance query")
    void testPgvectorCosineSimilarity_RealQueryExecution() {
        UUID cvVersionId = UUID.randomUUID();
        UUID jdVersionId = UUID.randomUUID();

        // Mock PostgreSQL vector distance result: 1 - distance = 0.8875 -> score 88.75
        when(jdbcTemplate.queryForList(
                contains("cv.embedding <=> jd.embedding"),
                eq(cvVersionId),
                eq(jdVersionId)
        )).thenReturn(List.of(Map.of("score", 88.75)));

        BigDecimal score = pgvectorCosineSimilarity.evaluatePgvectorSemanticSimilarity(cvVersionId, jdVersionId);

        assertNotNull(score);
        assertEquals(BigDecimal.valueOf(88.75), score);
    }

    @Test
    @DisplayName("Pgvector 2: Seamless fallback to concept cosine when DB/embedding is missing")
    void testPgvectorCosineSimilarity_FallbackWhenEmbeddingsMissing() {
        UUID cvVersionId = UUID.randomUUID();
        UUID jdVersionId = UUID.randomUUID();

        // DB returns empty (embeddings not ready)
        when(jdbcTemplate.queryForList(
                contains("cv.embedding <=> jd.embedding"),
                eq(cvVersionId),
                eq(jdVersionId)
        )).thenReturn(Collections.emptyList());

        BigDecimal dbScore = pgvectorCosineSimilarity.evaluatePgvectorSemanticSimilarity(cvVersionId, jdVersionId);
        assertNull(dbScore, "Should return null to signal fallback");

        // Fallback concept cosine works
        BigDecimal fallbackScore = pgvectorCosineSimilarity.evaluateSemanticSimilarity(
                "Java Spring Boot microservices PostgreSQL",
                "Senior developer with 4 years experience in Java and Spring Boot"
        );
        assertNotNull(fallbackScore);
        assertTrue(fallbackScore.compareTo(BigDecimal.ZERO) > 0);
    }

    @Test
    @DisplayName("Taxonomy 1: SkillNormalizer leverages TaxonomyService for canonical lookup")
    void testSkillNormalizer_LeveragesTaxonomyService() {
        TaxonomyService.TaxonomySkill skill = new TaxonomyService.TaxonomySkill(
                UUID.randomUUID(), "Kubernetes", "kubernetes", "DEVOPS", "Container orchestrator", "SYSTEM", "v1", true
        );
        TaxonomyService.TaxonomyMatch match = new TaxonomyService.TaxonomyMatch(
                skill, "k8s", TaxonomyService.MatchType.EXACT_ALIAS
        );

        when(taxonomyService.lookup("k8s")).thenReturn(Optional.of(match));

        String canonical = skillNormalizer.getCanonicalName("k8s");
        assertEquals("kubernetes", canonical);

        boolean matched = skillNormalizer.matchesSkill("Kubernetes", "Hands-on experience deploying microservices with k8s.");
        assertTrue(matched, "k8s alias should match Kubernetes requirement via taxonomy");
    }

    @Test
    @DisplayName("Taxonomy 2: Java vs JavaScript strict discrimination preserved")
    void testSkillNormalizer_JavaVsJavaScriptProtection() {
        assertFalse(skillNormalizer.matchesSkill("Java", "Expert in JavaScript only and frontend frameworks"));
        assertTrue(skillNormalizer.matchesSkill("Java", "Backend developer with 3 years Java and JavaScript experience"));
    }

    @Test
    @DisplayName("MatchingEngine 1: Uses real pgvector when document_versions have embeddings")
    void testMatchingEngineService_UsesRealPgvectorWhenAvailable() {
        when(jobRepository.findById(job.getId())).thenReturn(Optional.of(job));
        when(candidateProfileRepository.findById(candidate.getId())).thenReturn(Optional.of(candidate));

        CV cv = CV.builder()
                .candidate(candidate)
                .rawText("5 years Java Spring Boot and React developer with PostgreSQL database experience.")
                .build();
        when(cvRepository.findByCandidateId(candidate.getId())).thenReturn(List.of(cv));

        JobRequirement req1 = JobRequirement.builder().job(job).skillName("Java").requirementType(RequirementType.REQUIRED).build();
        when(jobRequirementRepository.findByJobId(job.getId())).thenReturn(List.of(req1));

        UUID cvDocVersionId = UUID.randomUUID();
        UUID jdDocVersionId = UUID.randomUUID();

        // Mock document_versions resolution
        when(jdbcTemplate.query(
                contains("SELECT v.id FROM document_versions v JOIN documents d"),
                any(RowMapper.class),
                eq(candidate.getUser().getId())
        )).thenReturn(List.of(cvDocVersionId));

        when(jdbcTemplate.query(
                contains("WHERE (d.id=? OR v.id IN (SELECT jd_version_id FROM screening_runs"),
                any(RowMapper.class),
                eq(job.getId()),
                eq(job.getId())
        )).thenReturn(List.of(jdDocVersionId));

        // Mock pgvector score = 92.50
        when(jdbcTemplate.queryForList(
                contains("cv.embedding <=> jd.embedding"),
                eq(cvDocVersionId),
                eq(jdDocVersionId)
        )).thenReturn(List.of(Map.of("score", 92.50)));

        MatchResult result = matchingEngineService.calculateAndPersistMatchResult(job.getId(), candidate.getId());

        assertNotNull(result);
        assertEquals("COMPLETED", result.getStatus());
        assertTrue(result.getCoreScore().doubleValue() > 0);

        // Verify match factors contain SEMANTIC factor
        verify(matchFactorRepository).save(argThat(factor ->
                "SEMANTIC".equals(factor.getFactorType()) &&
                factor.getScore().compareTo(BigDecimal.valueOf(92.50)) == 0 &&
                factor.getWeight().compareTo(BigDecimal.valueOf(0.15)) == 0
        ));
    }

    @Test
    @DisplayName("Explainability 1: Evidence snippets are grounded directly in candidate CV source text")
    void testExplainability_EvidenceSnippetsGroundedInCv() {
        when(jobRepository.findById(job.getId())).thenReturn(Optional.of(job));
        when(candidateProfileRepository.findById(candidate.getId())).thenReturn(Optional.of(candidate));

        String rawCv = "Senior Software Engineer. Core competencies include Java microservice architecture, Spring Boot, and PostgreSQL.";
        CV cv = CV.builder().candidate(candidate).rawText(rawCv).build();
        when(cvRepository.findByCandidateId(candidate.getId())).thenReturn(List.of(cv));

        JobRequirement reqJava = JobRequirement.builder().job(job).skillName("Java").requirementType(RequirementType.REQUIRED).build();
        when(jobRequirementRepository.findByJobId(job.getId())).thenReturn(List.of(reqJava));

        MatchInspectionResponse inspection = matchingEngineService.getMatchInspection(application.getId());

        assertNotNull(inspection);
        assertEquals(1, inspection.getRequiredSkillsStatus().size());
        MatchInspectionResponse.SkillItem javaItem = inspection.getRequiredSkillsStatus().get(0);
        assertEquals("Java", javaItem.getSkillName());
        assertEquals("MATCH", javaItem.getStatus());
        assertTrue(javaItem.getEvidenceText().contains("Java"), "Evidence must cite actual candidate text");
    }
}
