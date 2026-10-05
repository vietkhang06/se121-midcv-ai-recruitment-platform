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
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MatchingFactorAndPolicyTest {

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
    @Mock private JobMatchingPolicyRepository jobMatchingPolicyRepository;

    private MatchingEngineService matchingEngineService;
    private GitHubScoringService gitHubScoringService;

    private Job testJob;
    private CandidateProfile testCandidate;
    private Application testApp;
    private UUID jobId;
    private UUID candidateId;

    @BeforeEach
    void setUp() {
        gitHubScoringService = new GitHubScoringService(gitHubProfileRepository, gitHubAssessmentRepository);

        matchingEngineService = new MatchingEngineService(
                jobRepository, jobRequirementRepository, candidateProfileRepository,
                applicationRepository, cvRepository, matchResultRepository,
                matchFactorRepository,
                new RequiredSkillMatcher(),
                new PreferredSkillMatcher(),
                new ExperienceMatcher(),
                new EducationMatcher(),
                new ProjectRelevanceMatcher(),
                gitHubScoringService
        );

        ReflectionTestUtils.setField(matchingEngineService, "jobMatchingPolicyRepository", jobMatchingPolicyRepository);

        jobId = UUID.randomUUID();
        candidateId = UUID.randomUUID();

        testJob = Job.builder()
                .title("Senior Backend Engineer")
                .description("Yêu cầu Java, Spring Boot, PostgreSQL. Tối thiểu 3 năm kinh nghiệm phát triển hệ thống backend.")
                .industry("IT")
                .build();
        testJob.setId(jobId);

        testCandidate = CandidateProfile.builder()
                .fullName("Nguyen Van A")
                .build();
        testCandidate.setId(candidateId);

        testApp = Application.builder()
                .job(testJob)
                .candidate(testCandidate)
                .build();
        testApp.setId(UUID.randomUUID());

        when(jobRepository.findById(jobId)).thenReturn(Optional.of(testJob));
        when(candidateProfileRepository.findById(candidateId)).thenReturn(Optional.of(testCandidate));
        when(applicationRepository.findByJobIdAndCandidateId(jobId, candidateId)).thenReturn(Optional.of(testApp));
        when(matchResultRepository.findByApplicationId(testApp.getId())).thenReturn(Optional.empty());
        when(matchResultRepository.save(any(MatchResult.class))).thenAnswer(invocation -> {
            MatchResult mr = invocation.getArgument(0);
            mr.setId(UUID.randomUUID());
            return mr;
        });
    }

    @Test
    @DisplayName("Missing evidence for required skill must have status MISSING_EVIDENCE and score 0 without dropping weight")
    void missingEvidenceDoesNotInflateScore() {
        // JD requires "Java" and "Golang"
        JobRequirement r1 = JobRequirement.builder().job(testJob).skillName("Java").requirementType(RequirementType.REQUIRED).build();
        JobRequirement r2 = JobRequirement.builder().job(testJob).skillName("Golang").requirementType(RequirementType.REQUIRED).build();
        when(jobRequirementRepository.findByJobId(jobId)).thenReturn(List.of(r1, r2));

        // Candidate CV only mentions Python and Frontend (no Java, no Golang)
        CV cv = CV.builder().candidate(testCandidate).rawText("Kỹ năng: Python, HTML, CSS, ReactJS. Kinh nghiệm 1 năm làm frontend.").build();
        when(cvRepository.findByCandidateId(candidateId)).thenReturn(List.of(cv));
        when(jobMatchingPolicyRepository.findByJobId(jobId)).thenReturn(Optional.empty()); // defaults applied

        matchingEngineService.calculateAndPersistMatchResult(jobId, candidateId);

        ArgumentCaptor<MatchFactor> factorCaptor = ArgumentCaptor.forClass(MatchFactor.class);
        verify(matchFactorRepository, atLeastOnce()).save(factorCaptor.capture());

        List<MatchFactor> factors = factorCaptor.getAllValues();
        MatchFactor reqFactor = factors.stream()
                .filter(f -> "SKILL_REQUIRED".equals(f.getFactorType()))
                .findFirst()
                .orElseThrow();

        assertEquals(MatchFactorStatus.MISSING_EVIDENCE.name(), reqFactor.getStatus());
        assertEquals(0, reqFactor.getScore().compareTo(BigDecimal.ZERO));
        assertEquals(0, reqFactor.getWeightedContribution().compareTo(BigDecimal.ZERO));
        assertTrue(reqFactor.getEffectiveWeight().compareTo(BigDecimal.ZERO) > 0, "Effective weight must be preserved for missing evidence!");
    }

    @Test
    @DisplayName("Factor with no job requirement must be NOT_APPLICABLE and its weight re-distributed")
    void notApplicableFactorDropsFromDenominatorAndReweightsCore() {
        // JD requires "Java" but has NO preferred skills
        JobRequirement r1 = JobRequirement.builder().job(testJob).skillName("Java").requirementType(RequirementType.REQUIRED).build();
        when(jobRequirementRepository.findByJobId(jobId)).thenReturn(List.of(r1));

        CV cv = CV.builder().candidate(testCandidate).rawText("Kỹ năng: Java, Spring Boot. Kinh nghiệm 4 năm làm backend backend Java.").build();
        when(cvRepository.findByCandidateId(candidateId)).thenReturn(List.of(cv));
        when(jobMatchingPolicyRepository.findByJobId(jobId)).thenReturn(Optional.empty());

        matchingEngineService.calculateAndPersistMatchResult(jobId, candidateId);

        ArgumentCaptor<MatchFactor> factorCaptor = ArgumentCaptor.forClass(MatchFactor.class);
        verify(matchFactorRepository, atLeastOnce()).save(factorCaptor.capture());

        List<MatchFactor> factors = factorCaptor.getAllValues();
        MatchFactor prefFactor = factors.stream()
                .filter(f -> "SKILL_PREFERRED".equals(f.getFactorType()))
                .findFirst()
                .orElseThrow();

        assertEquals(MatchFactorStatus.NOT_APPLICABLE.name(), prefFactor.getStatus());
        assertEquals(0, prefFactor.getEffectiveWeight().compareTo(BigDecimal.ZERO), "Not applicable factor must have effective weight 0");

        // Verify that sum of effective weights of core factors equals 1.0000
        BigDecimal coreEffSum = factors.stream()
                .filter(f -> !"GITHUB_SUPPORTING".equals(f.getFactorType()))
                .map(MatchFactor::getEffectiveWeight)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        assertTrue(coreEffSum.subtract(BigDecimal.ONE).abs().compareTo(new BigDecimal("0.005")) <= 0,
                "Sum of core effective weights must equal 1.0000, got: " + coreEffSum);
    }

    @Test
    @DisplayName("Custom JobMatchingPolicy weights are applied and version is recorded")
    void jobMatchingPolicyCustomWeightsApplied() {
        JobRequirement r1 = JobRequirement.builder().job(testJob).skillName("Java").requirementType(RequirementType.REQUIRED).build();
        when(jobRequirementRepository.findByJobId(jobId)).thenReturn(List.of(r1));

        CV cv = CV.builder().candidate(testCandidate).rawText("Kỹ năng: Java, Spring Boot. Đại học Bách Khoa ngành CNTT. Kinh nghiệm 5 năm.").build();
        when(cvRepository.findByCandidateId(candidateId)).thenReturn(List.of(cv));

        // Custom policy: heavy required skills weight 0.50, experience 0.20, education 0.10, project 0.10, semantic 0.10, pref 0.00
        JobMatchingPolicy customPolicy = JobMatchingPolicy.builder()
                .job(testJob)
                .skillRequiredWeight(new BigDecimal("0.5000"))
                .skillPreferredWeight(new BigDecimal("0.0000"))
                .experienceWeight(new BigDecimal("0.2000"))
                .educationWeight(new BigDecimal("0.1000"))
                .projectWeight(new BigDecimal("0.1000"))
                .semanticWeight(new BigDecimal("0.1000"))
                .coreWeight(new BigDecimal("0.8500"))
                .githubWeight(new BigDecimal("0.1500"))
                .isGithubActive(true)
                .policyVersion(3)
                .build();

        when(jobMatchingPolicyRepository.findByJobId(jobId)).thenReturn(Optional.of(customPolicy));

        MatchResult result = matchingEngineService.calculateAndPersistMatchResult(jobId, candidateId);

        assertEquals(3, result.getPolicyVersion());
        assertNotNull(result.getPolicySnapshot());
        assertTrue(result.getPolicySnapshot().contains("0.5000"));
    }

    @Test
    @DisplayName("GitHub disabled in policy marks GITHUB_SUPPORTING as NOT_APPLICABLE and gives 100% weight to Core CV")
    void githubDisabledResultsInNotApplicable() {
        JobRequirement r1 = JobRequirement.builder().job(testJob).skillName("Java").requirementType(RequirementType.REQUIRED).build();
        when(jobRequirementRepository.findByJobId(jobId)).thenReturn(List.of(r1));

        CV cv = CV.builder().candidate(testCandidate).rawText("Kỹ năng: Java. Kinh nghiệm 3 năm.").build();
        when(cvRepository.findByCandidateId(candidateId)).thenReturn(List.of(cv));

        JobMatchingPolicy noGithubPolicy = JobMatchingPolicy.createDefaultPolicy(testJob);
        noGithubPolicy.setIsGithubActive(false);
        when(jobMatchingPolicyRepository.findByJobId(jobId)).thenReturn(Optional.of(noGithubPolicy));

        MatchResult result = matchingEngineService.calculateAndPersistMatchResult(jobId, candidateId);

        assertEquals(0, result.getCoreWeight().compareTo(BigDecimal.valueOf(1.0000)));
        assertEquals(0, result.getGithubWeight().compareTo(BigDecimal.ZERO));
        assertEquals(0, result.getOverallScore().compareTo(result.getCoreScore()), "Overall score must equal core score when GitHub is disabled");
    }

    @Test
    @DisplayName("GitHub active but candidate has no profile marks GITHUB_SUPPORTING as MISSING_EVIDENCE with score 0 and no fake score")
    void githubActiveMissingProfileResultsInMissingEvidence() {
        JobRequirement r1 = JobRequirement.builder().job(testJob).skillName("Java").requirementType(RequirementType.REQUIRED).build();
        when(jobRequirementRepository.findByJobId(jobId)).thenReturn(List.of(r1));

        CV cv = CV.builder().candidate(testCandidate).rawText("Kỹ năng: Java. Kinh nghiệm 3 năm.").build();
        when(cvRepository.findByCandidateId(candidateId)).thenReturn(List.of(cv));
        when(jobMatchingPolicyRepository.findByJobId(jobId)).thenReturn(Optional.empty()); // default active

        MatchResult result = matchingEngineService.calculateAndPersistMatchResult(jobId, candidateId);

        ArgumentCaptor<MatchFactor> factorCaptor = ArgumentCaptor.forClass(MatchFactor.class);
        verify(matchFactorRepository, atLeastOnce()).save(factorCaptor.capture());

        MatchFactor ghFactor = factorCaptor.getAllValues().stream()
                .filter(f -> "GITHUB_SUPPORTING".equals(f.getFactorType()))
                .findFirst()
                .orElseThrow();

        assertEquals(MatchFactorStatus.MISSING_EVIDENCE.name(), ghFactor.getStatus());
        assertEquals(0, ghFactor.getScore().compareTo(BigDecimal.ZERO));
        assertEquals(0, ghFactor.getWeightedContribution().compareTo(BigDecimal.ZERO));
    }
}
