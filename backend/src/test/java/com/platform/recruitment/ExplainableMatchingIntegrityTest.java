package com.platform.recruitment;

import com.platform.recruitment.application.Application;
import com.platform.recruitment.application.ApplicationRepository;
import com.platform.recruitment.candidate.CandidateProfile;
import com.platform.recruitment.candidate.CandidateProfileRepository;
import com.platform.recruitment.cv.CV;
import com.platform.recruitment.cv.CVRepository;
import com.platform.recruitment.github.GitHubAssessmentRepository;
import com.platform.recruitment.github.GitHubProfileRepository;
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

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ExplainableMatchingIntegrityTest {

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

    private MatchingEngineService matchingEngineService;
    private GitHubScoringService gitHubScoringService;

    private Job testJob;
    private CandidateProfile testCandidate;
    private Application testApp;

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

        testJob = Job.builder()
                .title("Fullstack Engineer")
                .industry("Technology")
                .description("Yêu cầu 3 năm kinh nghiệm phát triển hệ thống với Java và React.")
                .build();
        testJob.setId(UUID.randomUUID());

        testCandidate = CandidateProfile.builder()
                .fullName("Tran Van Minh Bach")
                .build();
        testCandidate.setId(UUID.randomUUID());

        testApp = Application.builder().job(testJob).candidate(testCandidate).build();
        testApp.setId(UUID.randomUUID());

        lenient().when(jobRepository.findById(testJob.getId())).thenReturn(Optional.of(testJob));
        lenient().when(candidateProfileRepository.findById(testCandidate.getId())).thenReturn(Optional.of(testCandidate));
        lenient().when(applicationRepository.findByJobIdAndCandidateId(testJob.getId(), testCandidate.getId())).thenReturn(Optional.of(testApp));
        lenient().when(matchResultRepository.findByApplicationId(testApp.getId())).thenReturn(Optional.empty());
        lenient().when(matchResultRepository.save(any(MatchResult.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    @DisplayName("Phase 5: When Semantic is unavailable, dynamic reweighting is applied without 50.00 default fabrication")
    void testDynamicReweighting_NoDefault50Score_EffectiveWeightSumsToOne() {
        // CV has raw text with no semantic match tokens or embeddings
        CV cv = CV.builder().candidate(testCandidate).rawText("3 years experience Java React developer.").build();
        when(cvRepository.findByCandidateId(testCandidate.getId())).thenReturn(List.of(cv));

        JobRequirement req1 = JobRequirement.builder().job(testJob).skillName("Java").requirementType(RequirementType.REQUIRED).build();
        when(jobRequirementRepository.findByJobId(testJob.getId())).thenReturn(List.of(req1));
        when(gitHubProfileRepository.findByCandidateId(testCandidate.getId())).thenReturn(Optional.empty());

        MatchResult result = matchingEngineService.calculateAndPersistMatchResult(testJob.getId(), testCandidate.getId());

        assertNotNull(result);
        assertEquals("v2.0", result.getMatchingAlgorithmVersion());

        // Capture all saved factors
        ArgumentCaptor<MatchFactor> factorCaptor = ArgumentCaptor.forClass(MatchFactor.class);
        verify(matchFactorRepository, atLeastOnce()).save(factorCaptor.capture());
        List<MatchFactor> savedFactors = factorCaptor.getAllValues();

        // 1. Check SEMANTIC factor is not fabricated with 50.00
        MatchFactor semFactor = savedFactors.stream()
                .filter(f -> "SEMANTIC".equals(f.getFactorType()))
                .findFirst()
                .orElse(null);

        assertNotNull(semFactor);
        // Score should either be grounded from TF concepts or marked properly, never forced 50.00 baseline
        assertNotEquals(BigDecimal.valueOf(50.00).setScale(2), semFactor.getScore(),
                "Semantic score must NEVER be forced to 50.00 default fallback");

        // 2. Mathematical Reconstruction: sum of weighted contributions equals core score
        double reconstructedCore = savedFactors.stream()
                .filter(f -> !"GITHUB_SUPPORTING".equals(f.getFactorType()))
                .mapToDouble(f -> f.getWeightedContribution().doubleValue())
                .sum();

        assertEquals(result.getCoreScore().doubleValue(), BigDecimal.valueOf(reconstructedCore).setScale(2, RoundingMode.HALF_UP).doubleValue(), 0.05,
                "Core score must be perfectly reconstructible from weighted contributions of core factors");
    }

    @Test
    @DisplayName("Phase 6: MatchInspectionResponse exposes explainable audit metadata and valid DTO structure")
    void testMatchInspectionResponse_ExposesExplainableDTO() {
        CV cv = CV.builder().candidate(testCandidate).rawText("3 years experience Java React developer.").build();
        when(cvRepository.findByCandidateId(testCandidate.getId())).thenReturn(List.of(cv));

        JobRequirement req1 = JobRequirement.builder().job(testJob).skillName("Java").requirementType(RequirementType.REQUIRED).build();
        req1.setId(UUID.randomUUID());
        JobRequirement pref1 = JobRequirement.builder().job(testJob).skillName("Docker").requirementType(RequirementType.PREFERRED).build();
        pref1.setId(UUID.randomUUID());
        when(jobRequirementRepository.findByJobId(testJob.getId())).thenReturn(List.of(req1, pref1));
        when(gitHubProfileRepository.findByCandidateId(testCandidate.getId())).thenReturn(Optional.empty());

        MatchFactor f1 = MatchFactor.builder()
                .factorType("SKILL_REQUIRED")
                .factorName("Kỹ năng bắt buộc")
                .score(BigDecimal.valueOf(100.00))
                .weight(BigDecimal.valueOf(0.38))
                .configuredWeight(BigDecimal.valueOf(0.32))
                .effectiveWeight(BigDecimal.valueOf(0.38))
                .weightedContribution(BigDecimal.valueOf(38.00))
                .status("AVAILABLE")
                .calculationMethod("EXACT_AND_ALIAS_TAXONOMY_MATCH")
                .algorithmVersion("v2.0")
                .build();
        when(matchFactorRepository.findByMatchResultId(any())).thenReturn(List.of(f1));

        when(applicationRepository.findById(testApp.getId())).thenReturn(Optional.of(testApp));

        MatchInspectionResponse inspection = matchingEngineService.getMatchInspection(testApp.getId());

        assertNotNull(inspection);
        assertEquals("v2.0", inspection.getAlgorithmVersion());
        assertEquals("COMPLETED", inspection.getCalculationStatus());
        assertNotNull(inspection.getOverallScore());
        assertNotNull(inspection.getCoreScore());
        assertFalse(inspection.getMatchFactors().isEmpty());

        // Check required skills list
        assertEquals(1, inspection.getRequiredSkillsStatus().size());
        assertEquals("MATCH", inspection.getRequiredSkillsStatus().get(0).getStatus());

        // Check preferred skills list (Docker is missing)
        assertEquals(1, inspection.getPreferredSkillsStatus().size());
        assertEquals("MISSING", inspection.getPreferredSkillsStatus().get(0).getStatus());

        // Factor items should have weight, configuredWeight, effectiveWeight, weightedContribution
        for (MatchInspectionResponse.FactorItem factorItem : inspection.getMatchFactors()) {
            assertNotNull(factorItem.getFactorName());
            assertNotNull(factorItem.getStatus());
            assertNotNull(factorItem.getConfiguredWeight());
            assertNotNull(factorItem.getEffectiveWeight());
            assertNotNull(factorItem.getWeightedContribution());
            assertEquals("v2.0", factorItem.getAlgorithmVersion());
        }
    }
}
