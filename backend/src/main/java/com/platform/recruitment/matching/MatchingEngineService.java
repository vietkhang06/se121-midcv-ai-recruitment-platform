package com.platform.recruitment.matching;

import com.platform.recruitment.application.Application;
import com.platform.recruitment.application.ApplicationRepository;
import com.platform.recruitment.candidate.CandidateProfile;
import com.platform.recruitment.candidate.CandidateProfileRepository;
import com.platform.recruitment.common.ResourceNotFoundException;
import com.platform.recruitment.cv.CV;
import com.platform.recruitment.cv.CVRepository;
import com.platform.recruitment.job.Job;
import com.platform.recruitment.job.JobRepository;
import com.platform.recruitment.job.JobRequirement;
import com.platform.recruitment.job.JobRequirementRepository;
import com.platform.recruitment.job.RequirementType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MatchingEngineService {

    private final JobRepository jobRepository;
    private final JobRequirementRepository jobRequirementRepository;
    private final CandidateProfileRepository candidateProfileRepository;
    private final ApplicationRepository applicationRepository;
    private final CVRepository cvRepository;
    private final MatchResultRepository matchResultRepository;
    private final MatchFactorRepository matchFactorRepository;

    private final RequiredSkillMatcher requiredSkillMatcher;
    private final PreferredSkillMatcher preferredSkillMatcher;
    private final ExperienceMatcher experienceMatcher;
    private final EducationMatcher educationMatcher;
    private final ProjectRelevanceMatcher projectRelevanceMatcher;
    private final GitHubScoringService gitHubScoringService;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private SkillNormalizer skillNormalizer = new SkillNormalizer();

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.platform.recruitment.embedding.PgvectorCosineSimilarity pgvectorCosineSimilarity = new com.platform.recruitment.embedding.PgvectorCosineSimilarity();

    @Transactional
    public MatchResult calculateAndPersistMatchResult(UUID jobId, UUID candidateId) {
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job", "id", jobId));

        CandidateProfile candidate = candidateProfileRepository.findById(candidateId)
                .orElseThrow(() -> new ResourceNotFoundException("CandidateProfile", "id", candidateId));

        // Find or create Application baseline
        Application application = applicationRepository.findByJobIdAndCandidateId(jobId, candidateId)
                .orElseGet(() -> applicationRepository.save(Application.builder()
                        .job(job)
                        .candidate(candidate)
                        .build()));

        // Get latest CV for candidate
        List<CV> cvs = cvRepository.findByCandidateId(candidateId);
        String cvRawText = cvs.isEmpty() ? "" : cvs.get(0).getRawText();

        // Insufficient candidate data handling: DO NOT calculate misleading scores
        if (cvs.isEmpty() || cvRawText == null || cvRawText.trim().isEmpty()) {
            MatchResult insufficientResult = matchResultRepository.findByApplicationId(application.getId())
                    .orElseGet(() -> MatchResult.builder()
                            .application(application)
                            .build());

            insufficientResult.setCoreScore(BigDecimal.ZERO);
            insufficientResult.setGithubScore(null);
            insufficientResult.setOverallScore(BigDecimal.ZERO);
            insufficientResult.setCoreWeight(BigDecimal.valueOf(1.00));
            insufficientResult.setGithubWeight(BigDecimal.ZERO);
            insufficientResult.setStatus("INSUFFICIENT_DATA");
            insufficientResult.setAiSummary("Insufficient candidate profile/CV data to calculate reliable match score.");
            insufficientResult.setRequiredSkillsTotal(0);
            insufficientResult.setRequiredSkillsMatched(0);
            insufficientResult.setRequiredSkillsMissing(0);
            insufficientResult.setPreferredSkillsTotal(0);
            insufficientResult.setPreferredSkillsMatched(0);
            insufficientResult.setPreferredSkillsMissing(0);
            insufficientResult.setMatchingAlgorithmVersion("v1.0");

            log.info("Candidate {} has insufficient CV data for job {}. Setting status INSUFFICIENT_DATA.", candidateId, jobId);
            return matchResultRepository.save(insufficientResult);
        }

        List<JobRequirement> allReqs = jobRequirementRepository.findByJobId(jobId);
        List<JobRequirement> requiredSkills = allReqs.stream()
                .filter(r -> r.getRequirementType() == RequirementType.REQUIRED)
                .collect(Collectors.toList());
        List<JobRequirement> preferredSkills = allReqs.stream()
                .filter(r -> r.getRequirementType() == RequirementType.PREFERRED)
                .collect(Collectors.toList());

        // 1. Calculate Required & Preferred Skill Counts for Required Skill Gate
        int reqTotal = requiredSkills.size();
        int reqMatched = 0;
        for (JobRequirement req : requiredSkills) {
            if (skillNormalizer.matchesSkill(req.getSkillName(), cvRawText)) {
                reqMatched++;
            }
        }
        int reqMissing = reqTotal - reqMatched;

        int prefTotal = preferredSkills.size();
        int prefMatched = 0;
        for (JobRequirement pref : preferredSkills) {
            if (skillNormalizer.matchesSkill(pref.getSkillName(), cvRawText)) {
                prefMatched++;
            }
        }
        int prefMissing = prefTotal - prefMatched;

        // 2. Component Sub-scores
        BigDecimal reqSkillScore = requiredSkillMatcher.evaluateRequiredSkills(requiredSkills, cvRawText);
        BigDecimal prefSkillScore = preferredSkillMatcher.evaluatePreferredSkills(preferredSkills, cvRawText);

        // SkillScore = 0.80 * Required + 0.20 * Preferred
        double skillScoreVal = Math.max(0.0, Math.min(100.0, (0.80 * reqSkillScore.doubleValue()) + (0.20 * prefSkillScore.doubleValue())));
        BigDecimal skillScore = BigDecimal.valueOf(skillScoreVal).setScale(2, RoundingMode.HALF_UP);

        BigDecimal expScore = experienceMatcher.evaluateExperience(job.getDescription(), cvRawText);
        BigDecimal eduScore = educationMatcher.evaluateEducation(job.getDescription(), cvRawText);
        BigDecimal projScore = projectRelevanceMatcher.evaluateProjectRelevance(job.getDescription(), cvRawText);
        BigDecimal semanticScore = pgvectorCosineSimilarity.evaluateSemanticSimilarity(job.getDescription(), cvRawText);
        if (semanticScore.compareTo(BigDecimal.ZERO) <= 0 && cvRawText != null && !cvRawText.isBlank()) {
            semanticScore = BigDecimal.valueOf(50.00); // Default baseline if no explicit semantic tokens match
        }

        // 3. Core Score Formula: S_core = 0.40 * Skill + 0.25 * Exp + 0.10 * Edu + 0.10 * Proj + 0.15 * Semantic
        double coreVal = (0.40 * skillScore.doubleValue()) +
                         (0.25 * expScore.doubleValue()) +
                         (0.10 * eduScore.doubleValue()) +
                         (0.10 * projScore.doubleValue()) +
                         (0.15 * semanticScore.doubleValue());

        double boundedCoreVal = Math.max(0.0, Math.min(100.0, coreVal));
        BigDecimal scoreCore = BigDecimal.valueOf(boundedCoreVal).setScale(2, RoundingMode.HALF_UP);

        // 4. GitHub Supporting Score & Overall Formula
        Optional<BigDecimal> githubScoreOpt = gitHubScoringService.calculateGitHubSupportingScore(candidateId, job.getIndustry(), job.getDescription());
        
        BigDecimal scoreGithub = null;
        BigDecimal weightCore = BigDecimal.valueOf(1.00);
        BigDecimal weightGithub = BigDecimal.ZERO;
        BigDecimal scoreOverall;

        if (githubScoreOpt.isPresent()) {
            scoreGithub = githubScoreOpt.get();
            weightCore = BigDecimal.valueOf(0.85);
            weightGithub = BigDecimal.valueOf(0.15);
            double overallVal = (0.85 * scoreCore.doubleValue()) + (0.15 * scoreGithub.doubleValue());
            double boundedOverall = Math.max(0.0, Math.min(100.0, overallVal));
            scoreOverall = BigDecimal.valueOf(boundedOverall).setScale(2, RoundingMode.HALF_UP);
        } else {
            // Fallback: S_overall = S_core
            scoreOverall = scoreCore;
        }

        // 5. Save or Update MatchResult
        MatchResult result = matchResultRepository.findByApplicationId(application.getId())
                .orElseGet(() -> MatchResult.builder()
                        .application(application)
                        .build());

        result.setCoreScore(scoreCore);
        result.setGithubScore(scoreGithub);
        result.setCoreWeight(weightCore);
        result.setGithubWeight(weightGithub);
        result.setOverallScore(scoreOverall);
        result.setRequiredSkillsTotal(reqTotal);
        result.setRequiredSkillsMatched(reqMatched);
        result.setRequiredSkillsMissing(reqMissing);
        result.setPreferredSkillsTotal(prefTotal);
        result.setPreferredSkillsMatched(prefMatched);
        result.setPreferredSkillsMissing(prefMissing);
        result.setStatus("COMPLETED");
        result.setMatchingAlgorithmVersion("v1.0");

        MatchResult savedResult = matchResultRepository.save(result);

        // 6. Save MatchFactors for Full Score Reconstruction
        saveMatchFactor(savedResult, "SKILL_REQUIRED", reqSkillScore, BigDecimal.valueOf(0.32)); // 0.40 * 0.80
        saveMatchFactor(savedResult, "SKILL_PREFERRED", prefSkillScore, BigDecimal.valueOf(0.08)); // 0.40 * 0.20
        saveMatchFactor(savedResult, "EXPERIENCE", expScore, BigDecimal.valueOf(0.25));
        saveMatchFactor(savedResult, "EDUCATION", eduScore, BigDecimal.valueOf(0.10));
        saveMatchFactor(savedResult, "PROJECT", projScore, BigDecimal.valueOf(0.10));
        saveMatchFactor(savedResult, "SEMANTIC", semanticScore, BigDecimal.valueOf(0.15));

        log.info("Persisted MatchResult ID: {} with ReqMissing: {}, S_core: {}, S_github: {}, S_overall: {}", savedResult.getId(), reqMissing, scoreCore, scoreGithub, scoreOverall);
        return savedResult;
    }

    private void saveMatchFactor(MatchResult result, String factorType, BigDecimal score, BigDecimal weight) {
        MatchFactor factor = MatchFactor.builder()
                .matchResult(result)
                .factorType(factorType)
                .score(score)
                .weight(weight)
                .build();
        matchFactorRepository.save(factor);
    }
}
