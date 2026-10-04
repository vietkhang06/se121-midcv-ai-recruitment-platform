package com.platform.recruitment.matching;

import com.platform.recruitment.application.Application;
import com.platform.recruitment.application.ApplicationRepository;
import com.platform.recruitment.candidate.CandidateProfile;
import com.platform.recruitment.candidate.CandidateProfileRepository;
import com.platform.recruitment.common.ResourceNotFoundException;
import com.platform.recruitment.cv.CV;
import com.platform.recruitment.cv.CVRepository;
import com.platform.recruitment.cv.CVVersion;
import com.platform.recruitment.cv.CVVersionRepository;
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
import java.util.ArrayList;
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
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private CVVersionRepository cvVersionRepository;
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.fasterxml.jackson.databind.ObjectMapper objectMapper;
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private EvidenceRepository evidenceRepository;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.platform.recruitment.github.GitHubProfileRepository gitHubProfileRepository;

    private final RequiredSkillMatcher requiredSkillMatcher;
    private final PreferredSkillMatcher preferredSkillMatcher;
    private final ExperienceMatcher experienceMatcher;
    private final EducationMatcher educationMatcher;
    private final ProjectRelevanceMatcher projectRelevanceMatcher;
    private final GitHubScoringService gitHubScoringService;

    public void setCvVersionRepository(CVVersionRepository cvVersionRepository) {
        this.cvVersionRepository = cvVersionRepository;
    }

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private SkillNormalizer skillNormalizer = new SkillNormalizer();

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.platform.recruitment.embedding.PgvectorCosineSimilarity pgvectorCosineSimilarity = new com.platform.recruitment.embedding.PgvectorCosineSimilarity();

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

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
        
        // Prefer confirmed CV profile content if available
        if (!cvs.isEmpty() && cvVersionRepository != null) {
            List<CVVersion> versions = cvVersionRepository.findByCvIdOrderByVersionNumberDesc(cvs.get(0).getId());
            Optional<CVVersion> confirmedVersion = versions.stream()
                    .filter(v -> "CONFIRMED".equalsIgnoreCase(v.getStatus()))
                    .findFirst();
            if (confirmedVersion.isPresent()) {
                String confirmedText = confirmedVersion.get().getRawTextContent();
                String structuredJson = confirmedVersion.get().getStructuredJsonContent();
                StringBuilder combined = new StringBuilder();
                if (confirmedText != null && !confirmedText.isBlank()) {
                    combined.append(confirmedText).append("\n");
                }
                if (structuredJson != null && !structuredJson.isBlank()) {
                    combined.append(extractTextFromStructuredJson(structuredJson));
                }
                if (combined.length() > 0) {
                    cvRawText = combined.toString();
                }
            }
        }

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
            insufficientResult.setIsGithubActive(false);
            insufficientResult.setGithubFallbackApplied(true);
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

        // Native PostgreSQL pgvector evaluation with grounded semantic similarity fallback
        UUID cvDocVersionId = findCvDocumentVersionId(candidate);
        UUID jdDocVersionId = findJdDocumentVersionId(job.getId());
        BigDecimal semanticScore = null;
        String semanticMethod = "PGVECTOR_COSINE_SIMILARITY";
        if (jdbcTemplate != null && cvDocVersionId != null && jdDocVersionId != null) {
            semanticScore = pgvectorCosineSimilarity.evaluatePgvectorSemanticSimilarity(cvDocVersionId, jdDocVersionId);
        }
        if (semanticScore == null) {
            semanticScore = pgvectorCosineSimilarity.evaluateSemanticSimilarity(job.getDescription(), cvRawText);
            semanticMethod = "TF_CONCEPT_COSINE_SIMILARITY";
        }

        // AUDIT ENFORCEMENT: Never fabricate a default 50.00 score!
        // If semantic similarity cannot be computed or lacks vector representation, mark NOT_AVAILABLE.
        boolean semanticAvailable = (semanticScore != null && (cvRawText != null && !cvRawText.isBlank()));
        String semanticStatus = semanticAvailable ? "AVAILABLE" : "NOT_AVAILABLE";
        if (!semanticAvailable) {
            semanticScore = null;
        }

        // 3. Core Score Calculation with Transparent Dynamic Re-weighting
        // Configured weights: SkillReq=0.32, SkillPref=0.08, Exp=0.25, Edu=0.10, Proj=0.10, Semantic=0.15
        BigDecimal cfgReq = BigDecimal.valueOf(0.32);
        BigDecimal cfgPref = BigDecimal.valueOf(0.08);
        BigDecimal cfgExp = BigDecimal.valueOf(0.25);
        BigDecimal cfgEdu = BigDecimal.valueOf(0.10);
        BigDecimal cfgProj = BigDecimal.valueOf(0.10);
        BigDecimal cfgSem = BigDecimal.valueOf(0.15);

        BigDecimal effReq, effPref, effExp, effEdu, effProj, effSem;
        BigDecimal contribReq, contribPref, contribExp, contribEdu, contribProj, contribSem;

        if (semanticAvailable) {
            effReq = cfgReq;
            effPref = cfgPref;
            effExp = cfgExp;
            effEdu = cfgEdu;
            effProj = cfgProj;
            effSem = cfgSem;
        } else {
            // Re-normalize available core factor weights so their sum is exactly 1.0000
            // Sum of available = 0.32 + 0.08 + 0.25 + 0.10 + 0.10 = 0.85
            BigDecimal sumAvail = BigDecimal.valueOf(0.85);
            effReq = cfgReq.divide(sumAvail, 4, RoundingMode.HALF_UP);   // ~0.3765
            effPref = cfgPref.divide(sumAvail, 4, RoundingMode.HALF_UP); // ~0.0941
            effExp = cfgExp.divide(sumAvail, 4, RoundingMode.HALF_UP);   // ~0.2941
            effEdu = cfgEdu.divide(sumAvail, 4, RoundingMode.HALF_UP);   // ~0.1176
            effProj = BigDecimal.ONE.subtract(effReq).subtract(effPref).subtract(effExp).subtract(effEdu); // balance to 1.0000
            effSem = BigDecimal.ZERO;
        }

        contribReq = reqSkillScore.multiply(effReq).setScale(2, RoundingMode.HALF_UP);
        contribPref = prefSkillScore.multiply(effPref).setScale(2, RoundingMode.HALF_UP);
        contribExp = expScore.multiply(effExp).setScale(2, RoundingMode.HALF_UP);
        contribEdu = eduScore.multiply(effEdu).setScale(2, RoundingMode.HALF_UP);
        contribProj = projScore.multiply(effProj).setScale(2, RoundingMode.HALF_UP);
        contribSem = semanticAvailable ? semanticScore.multiply(effSem).setScale(2, RoundingMode.HALF_UP) : BigDecimal.ZERO;

        double coreVal = (effReq.doubleValue() * reqSkillScore.doubleValue()) +
                         (effPref.doubleValue() * prefSkillScore.doubleValue()) +
                         (effExp.doubleValue() * expScore.doubleValue()) +
                         (effEdu.doubleValue() * eduScore.doubleValue()) +
                         (effProj.doubleValue() * projScore.doubleValue()) +
                         (semanticAvailable ? effSem.doubleValue() * semanticScore.doubleValue() : 0.0);
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
            // Fallback without penalty: S_overall = S_core
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
        boolean githubActive = (scoreGithub != null && weightGithub.compareTo(BigDecimal.ZERO) > 0);
        result.setIsGithubActive(githubActive);
        result.setGithubFallbackApplied(!githubActive);
        result.setRequiredSkillsTotal(reqTotal);
        result.setRequiredSkillsMatched(reqMatched);
        result.setRequiredSkillsMissing(reqMissing);
        result.setPreferredSkillsTotal(prefTotal);
        result.setPreferredSkillsMatched(prefMatched);
        result.setPreferredSkillsMissing(prefMissing);
        result.setStatus("COMPLETED");
        result.setMatchingAlgorithmVersion("v2.0");

        MatchResult savedResult = matchResultRepository.save(result);

        // 5b. Idempotency & Duplicate Prevention: purge previous factors and evidences for this match result
        matchFactorRepository.deleteByMatchResultId(savedResult.getId());
        if (evidenceRepository != null) {
            evidenceRepository.deleteByMatchResultId(savedResult.getId());
        }

        // 6. Save Grounded MatchFactors for Transparent Score Reconstruction
        saveMatchFactor(savedResult, "SKILL_REQUIRED", "Kỹ năng bắt buộc", "CV", reqSkillScore, reqSkillScore, reqSkillScore,
                cfgReq, effReq, contribReq, "AVAILABLE", "EXACT_AND_ALIAS_TAXONOMY_MATCH", null);
        saveMatchFactor(savedResult, "SKILL_PREFERRED", "Kỹ năng ưu tiên", "CV", prefSkillScore, prefSkillScore, prefSkillScore,
                cfgPref, effPref, contribPref, "AVAILABLE", "KEYWORD_FREQUENCY_MATCH", null);
        saveMatchFactor(savedResult, "EXPERIENCE", "Kinh nghiệm làm việc", "CV", expScore, expScore, expScore,
                cfgExp, effExp, contribExp, "AVAILABLE", "RELEVANT_YEARS_EXTRACTION", null);
        saveMatchFactor(savedResult, "EDUCATION", "Học vấn & Bằng cấp", "CV", eduScore, eduScore, eduScore,
                cfgEdu, effEdu, contribEdu, "AVAILABLE", "DEGREE_AND_MAJOR_RELEVANCE", null);
        saveMatchFactor(savedResult, "PROJECT", "Dự án liên quan", "CV", projScore, projScore, projScore,
                cfgProj, effProj, contribProj, "AVAILABLE", "PROJECT_STACK_KEYWORD_MATCH", null);
        saveMatchFactor(savedResult, "SEMANTIC", "Mức độ phù hợp ngữ nghĩa", "CV", semanticScore, semanticScore, semanticScore,
                cfgSem, effSem, contribSem, semanticStatus, semanticMethod, cvDocVersionId != null ? cvDocVersionId.toString() : null);

        if (scoreGithub != null && weightGithub.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal contribGithub = scoreGithub.multiply(weightGithub).setScale(2, RoundingMode.HALF_UP);
            saveMatchFactor(savedResult, "GITHUB_SUPPORTING", "Đánh giá GitHub bổ trợ", "GITHUB", scoreGithub, scoreGithub, scoreGithub,
                    weightGithub, weightGithub, contribGithub, "AVAILABLE", "GITHUB_PUBLIC_SIGNAL_ANALYSIS", candidateId != null ? candidateId.toString() : null);
        }

        // 7. Save Grounded Evidences into PostgreSQL evidences table
        if (evidenceRepository != null) {
            for (JobRequirement req : allReqs) {
                if (skillNormalizer.matchesSkill(req.getSkillName(), cvRawText)) {
                    String grounded = extractGroundedSnippet(cvRawText, req.getSkillName());
                    String snippetText = grounded != null ? grounded : String.format("Kỹ năng '%s' (%s) được xác thực trong hồ sơ CV ứng viên.", req.getSkillName(), req.getRequirementType());
                    Evidence skillEvidence = Evidence.builder()
                            .matchResult(savedResult)
                            .sourceType("CV")
                            .sourceId(cvDocVersionId != null ? cvDocVersionId.toString() : null)
                            .section("SKILLS")
                            .requirementId(req.getId() != null ? req.getId().toString() : null)
                            .requirementText(req.getSkillName())
                            .candidateValue(req.getSkillName())
                            .matchStatus("VERIFIED")
                            .snippet(snippetText)
                            .normalizedValue(BigDecimal.valueOf(100.00))
                            .validationStatus("VERIFIED")
                            .build();
                    evidenceRepository.save(skillEvidence);
                }
            }
            if (expScore.compareTo(BigDecimal.ZERO) > 0) {
                Evidence expEvidence = Evidence.builder()
                        .matchResult(savedResult)
                        .sourceType("CV")
                        .sourceId(cvDocVersionId != null ? cvDocVersionId.toString() : null)
                        .section("EXPERIENCE")
                        .requirementText("Kinh nghiệm làm việc phù hợp ngành " + job.getIndustry())
                        .snippet(String.format("Kinh nghiệm làm việc được ghi nhận trong CV với mức đánh giá %s%% phù hợp ngành %s.", expScore, job.getIndustry()))
                        .normalizedValue(expScore)
                        .validationStatus("VERIFIED")
                        .build();
                evidenceRepository.save(expEvidence);
            }
            if (scoreGithub != null && weightGithub.compareTo(BigDecimal.ZERO) > 0) {
                List<String> relevantRepos = gitHubScoringService.findRelevantRepositories(candidateId, job.getDescription());
                for (String rName : relevantRepos) {
                    Evidence ghEvidence = Evidence.builder()
                            .matchResult(savedResult)
                            .sourceType("GITHUB")
                            .sourceId(candidateId != null ? candidateId.toString() : null)
                            .section("REPOSITORIES")
                            .requirementText("Kho lưu trữ mã nguồn liên quan")
                            .candidateValue(rName)
                            .matchStatus("VERIFIED")
                            .snippet(String.format("Kho lưu trữ mã nguồn '%s' được ghi nhận trong hồ sơ GitHub công khai của ứng viên, phù hợp yêu cầu kỹ thuật vị trí %s.", rName, job.getTitle()))
                            .normalizedValue(scoreGithub)
                            .validationStatus("VERIFIED")
                            .build();
                    evidenceRepository.save(ghEvidence);
                }
            }
        }

        log.info("Persisted MatchResult ID: {} with ReqMissing: {}, S_core: {}, S_github: {}, S_overall: {}", savedResult.getId(), reqMissing, scoreCore, scoreGithub, scoreOverall);
        return savedResult;
    }

    @Transactional
    public MatchInspectionResponse getMatchInspection(UUID applicationId) {
        Application application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Application", "id", applicationId));

        UUID jobId = application.getJob().getId();
        UUID candidateId = application.getCandidate().getId();

        MatchResult result = matchResultRepository.findByApplicationId(applicationId)
                .orElseGet(() -> calculateAndPersistMatchResult(jobId, candidateId));

        Job job = application.getJob();
        CandidateProfile candidate = application.getCandidate();

        List<JobRequirement> allReqs = jobRequirementRepository.findByJobId(jobId);

        String cvRawText = "";
        if (application.getAppliedCv() != null && application.getAppliedCv().getRawText() != null) {
            cvRawText = application.getAppliedCv().getRawText();
        } else {
            List<CV> cvs = cvRepository.findByCandidateId(candidateId);
            if (!cvs.isEmpty() && cvs.get(0).getRawText() != null) {
                cvRawText = cvs.get(0).getRawText();
            }
        }

        List<MatchInspectionResponse.SkillItem> reqSkillItems = new ArrayList<>();
        List<MatchInspectionResponse.SkillItem> prefSkillItems = new ArrayList<>();

        for (JobRequirement req : allReqs) {
            boolean matched = skillNormalizer.matchesSkill(req.getSkillName(), cvRawText);
            String grounded = matched ? extractGroundedSnippet(cvRawText, req.getSkillName()) : null;
            MatchInspectionResponse.SkillItem item = MatchInspectionResponse.SkillItem.builder()
                    .skillName(req.getSkillName())
                    .requirementType(req.getRequirementType().name())
                    .status(matched ? "MATCH" : "MISSING")
                    .evidenceText(grounded != null ? grounded : (matched ? "Kỹ năng được ghi nhận trong hồ sơ CV ứng viên." : "Không tìm thấy minh chứng trực tiếp trong CV."))
                    .build();
            if (req.getRequirementType() == RequirementType.REQUIRED) {
                reqSkillItems.add(item);
            } else {
                prefSkillItems.add(item);
            }
        }

        List<MatchFactor> factors = matchFactorRepository.findByMatchResultId(result.getId());
        List<MatchInspectionResponse.FactorItem> factorItems = new ArrayList<>();
        for (MatchFactor f : factors) {
            String status = f.getStatus() != null ? f.getStatus() : "AVAILABLE";
            factorItems.add(MatchInspectionResponse.FactorItem.builder()
                    .factorName(f.getFactorType())
                    .score(f.getScore())
                    .weight(f.getWeight())
                    .configuredWeight(f.getConfiguredWeight() != null ? f.getConfiguredWeight() : f.getWeight())
                    .effectiveWeight(f.getEffectiveWeight() != null ? f.getEffectiveWeight() : f.getWeight())
                    .weightedContribution(f.getWeightedContribution())
                    .status(status)
                    .calculationMethod(f.getCalculationMethod())
                    .algorithmVersion(f.getAlgorithmVersion() != null ? f.getAlgorithmVersion() : "v2.0")
                    .explanation(String.format("Đánh giá thành phần %s (%s) với trọng số hiệu dụng %s",
                            f.getFactorName() != null ? f.getFactorName() : f.getFactorType(),
                            status,
                            f.getEffectiveWeight() != null ? f.getEffectiveWeight() : f.getWeight()))
                    .evidence(f.getEvidenceReference())
                    .build());
        }

        // GitHub Assessment
        MatchInspectionResponse.GitHubAssessmentInfo ghInfo;
        Optional<com.platform.recruitment.github.GitHubProfile> ghProfileOpt = gitHubProfileRepository != null
                ? gitHubProfileRepository.findByCandidateId(candidateId)
                : Optional.empty();
        if (ghProfileOpt.isPresent() && Boolean.TRUE.equals(result.getIsGithubActive()) && result.getGithubScore() != null) {
            com.platform.recruitment.github.GitHubProfile gh = ghProfileOpt.get();
            ghInfo = MatchInspectionResponse.GitHubAssessmentInfo.builder()
                    .connected(true)
                    .status("SYNCED")
                    .username(gh.getUsername())
                    .publicRepoCount(gh.getPublicReposCount())
                    .activitySignal(gh.getActivitySignal() != null ? gh.getActivitySignal().name() : "HIGH")
                    .overallAssessment("Ứng viên có tài khoản GitHub công khai liên kết với hồ sơ tuyển dụng.")
                    .build();
        } else {
            ghInfo = MatchInspectionResponse.GitHubAssessmentInfo.builder()
                    .connected(false)
                    .status("NOT_CONNECTED")
                    .build();
        }

        String explanation = result.getAiSummary();
        if (explanation == null || explanation.isBlank()) {
            explanation = String.format("Ứng viên %s đạt điểm tổng thể %s%%. Đáp ứng %d/%d kỹ năng bắt buộc.",
                    candidate.getFullName(), result.getOverallScore(), result.getRequiredSkillsMatched(), result.getRequiredSkillsTotal());
        }

        return MatchInspectionResponse.builder()
                .applicationId(applicationId)
                .jobTitle(job.getTitle())
                .candidateName(candidate.getFullName())
                .algorithmVersion(result.getMatchingAlgorithmVersion() != null ? result.getMatchingAlgorithmVersion() : "v2.0")
                .calculationStatus(result.getStatus())
                .overallScore(result.getOverallScore())
                .coreScore(result.getCoreScore())
                .githubScore(result.getGithubScore())
                .githubScoreActive(result.getIsGithubActive() != null ? result.getIsGithubActive() : false)
                .requiredSkillsStatus(reqSkillItems)
                .preferredSkillsStatus(prefSkillItems)
                .matchFactors(factorItems)
                .humanReadableExplanation(explanation)
                .githubAssessment(ghInfo)
                .build();
    }

    private void saveMatchFactor(MatchResult result, String factorType, String factorName, String sourceType,
                                 BigDecimal score, Object rawValue, BigDecimal normalizedValue,
                                 BigDecimal configuredWeight, BigDecimal effectiveWeight, BigDecimal weightedContribution,
                                 String status, String calculationMethod, String evidenceRef) {
        String rawValStr = rawValue != null ? rawValue.toString() : null;
        MatchFactor factor = MatchFactor.builder()
                .matchResult(result)
                .sourceType(sourceType)
                .factorType(factorType)
                .factorName(factorName)
                .score(score != null ? score : BigDecimal.ZERO)
                .rawValue(rawValStr)
                .normalizedValue(normalizedValue != null ? normalizedValue : BigDecimal.ZERO)
                .weight(effectiveWeight != null ? effectiveWeight : BigDecimal.ZERO)
                .configuredWeight(configuredWeight)
                .effectiveWeight(effectiveWeight)
                .weightedContribution(weightedContribution != null ? weightedContribution : BigDecimal.ZERO)
                .status(status)
                .calculationMethod(calculationMethod)
                .evidenceReference(evidenceRef)
                .algorithmVersion("v2.0")
                .build();
        matchFactorRepository.save(factor);
    }

    private UUID findCvDocumentVersionId(CandidateProfile candidate) {
        if (jdbcTemplate == null || candidate == null || candidate.getUser() == null) return null;
        try {
            List<UUID> ids = jdbcTemplate.query(
                    "SELECT v.id FROM document_versions v JOIN documents d ON d.id=v.document_id " +
                    "WHERE d.owner_id=? AND d.kind='CV' AND v.embedding IS NOT NULL AND v.state='READY' " +
                    "ORDER BY v.version_no DESC LIMIT 1",
                    (rs, rowNum) -> (UUID) rs.getObject("id"),
                    candidate.getUser().getId()
            );
            return ids.isEmpty() ? null : ids.get(0);
        } catch (Exception e) {
            return null;
        }
    }

    private UUID findJdDocumentVersionId(UUID jobId) {
        if (jdbcTemplate == null || jobId == null) return null;
        try {
            List<UUID> ids = jdbcTemplate.query(
                    "SELECT v.id FROM document_versions v JOIN documents d ON d.id=v.document_id " +
                    "WHERE (d.id=? OR v.id IN (SELECT jd_version_id FROM screening_runs WHERE job_id=?)) " +
                    "AND v.embedding IS NOT NULL AND v.state='READY' ORDER BY v.version_no DESC LIMIT 1",
                    (rs, rowNum) -> (UUID) rs.getObject("id"),
                    jobId, jobId
            );
            return ids.isEmpty() ? null : ids.get(0);
        } catch (Exception e) {
            return null;
        }
    }

    private String extractGroundedSnippet(String text, String keyword) {
        if (text == null || keyword == null || keyword.isBlank()) return null;
        String lowerText = text.toLowerCase();
        String lowerKeyword = keyword.toLowerCase().trim();
        int idx = lowerText.indexOf(lowerKeyword);
        if (idx < 0) return null;

        int start = Math.max(0, idx - 30);
        int end = Math.min(text.length(), idx + keyword.length() + 50);

        if (start > 0 && Character.isLetterOrDigit(text.charAt(start))) {
            while (start > 0 && Character.isLetterOrDigit(text.charAt(start - 1))) start--;
        }
        if (end < text.length() && Character.isLetterOrDigit(text.charAt(end - 1))) {
            while (end < text.length() && Character.isLetterOrDigit(text.charAt(end))) end++;
        }

        String snippet = text.substring(start, end).trim().replaceAll("\\s+", " ");
        if (start > 0) snippet = "..." + snippet;
        if (end < text.length()) snippet = snippet + "...";
        return snippet;
    }

    private String extractTextFromStructuredJson(String json) {
        if (json == null || json.isBlank()) return "";
        try {
            com.fasterxml.jackson.databind.ObjectMapper mapper = this.objectMapper != null ? this.objectMapper : new com.fasterxml.jackson.databind.ObjectMapper();
            com.fasterxml.jackson.databind.JsonNode root = mapper.readTree(json);
            StringBuilder sb = new StringBuilder();

            // Skills
            com.fasterxml.jackson.databind.JsonNode skillsNode = root.get("skills");
            if (skillsNode != null && skillsNode.isArray()) {
                sb.append("Skills: ");
                for (com.fasterxml.jackson.databind.JsonNode skill : skillsNode) {
                    if (skill.has("name")) {
                        sb.append(skill.get("name").asText()).append(", ");
                    }
                }
                sb.append("\n");
            }

            // Summary
            if (root.has("summary") && !root.get("summary").isNull()) {
                com.fasterxml.jackson.databind.JsonNode sNode = root.get("summary");
                String summary = "";
                if (sNode.isObject() && sNode.has("content")) {
                    com.fasterxml.jackson.databind.JsonNode cNode = sNode.get("content");
                    summary = (cNode.isObject() && cNode.has("value")) ? cNode.get("value").asText() : cNode.asText();
                } else if (sNode.isObject() && sNode.has("summary")) {
                    com.fasterxml.jackson.databind.JsonNode innerNode = sNode.get("summary");
                    summary = (innerNode.isObject() && innerNode.has("value")) ? innerNode.get("value").asText() : innerNode.asText();
                } else {
                    summary = sNode.asText();
                }
                // strip basic HTML tags if any
                summary = summary.replaceAll("<[^>]*>", " ");
                sb.append("Summary: ").append(summary).append("\n");
            }

            // Experience
            com.fasterxml.jackson.databind.JsonNode expNode = root.has("work_experience") ? root.get("work_experience")
                    : (root.has("experience") ? root.get("experience") : root.get("experiences"));
            if (expNode != null && expNode.isArray()) {
                for (com.fasterxml.jackson.databind.JsonNode exp : expNode) {
                    if (exp.has("company")) sb.append(exp.get("company").asText()).append(" ");
                    if (exp.has("role")) sb.append(exp.get("role").asText()).append(" ");
                    if (exp.has("position") && !exp.has("role")) sb.append(exp.get("position").asText()).append(" ");
                    if (exp.has("description")) {
                        String desc = exp.get("description").asText().replaceAll("<[^>]*>", " ");
                        sb.append(desc).append(" ");
                    }
                    if (exp.has("technologies") && exp.get("technologies").isArray()) {
                        for (com.fasterxml.jackson.databind.JsonNode t : exp.get("technologies")) {
                            sb.append(t.asText()).append(" ");
                        }
                    }
                    sb.append("\n");
                }
            }

            // Projects
            com.fasterxml.jackson.databind.JsonNode projNode = root.get("projects");
            if (projNode != null && projNode.isArray()) {
                for (com.fasterxml.jackson.databind.JsonNode p : projNode) {
                    if (p.has("name")) sb.append(p.get("name").asText()).append(" ");
                    if (p.has("role")) sb.append(p.get("role").asText()).append(" ");
                    if (p.has("description")) {
                        String desc = p.get("description").asText().replaceAll("<[^>]*>", " ");
                        sb.append(desc).append(" ");
                    }
                    if (p.has("techStack") && p.get("techStack").isArray()) {
                        for (com.fasterxml.jackson.databind.JsonNode t : p.get("techStack")) {
                            sb.append(t.asText()).append(" ");
                        }
                    }
                    if (p.has("technologies") && p.get("technologies").isArray()) {
                        for (com.fasterxml.jackson.databind.JsonNode t : p.get("technologies")) {
                            sb.append(t.asText()).append(" ");
                        }
                    }
                    sb.append("\n");
                }
            }

            // Education
            com.fasterxml.jackson.databind.JsonNode eduNode = root.has("education") ? root.get("education") : root.get("educations");
            if (eduNode != null && eduNode.isArray()) {
                for (com.fasterxml.jackson.databind.JsonNode e : eduNode) {
                    if (e.has("institution")) sb.append(e.get("institution").asText()).append(" ");
                    if (e.has("degree")) sb.append(e.get("degree").asText()).append(" ");
                    if (e.has("field_of_study")) sb.append(e.get("field_of_study").asText()).append(" ");
                    else if (e.has("fieldOfStudy")) sb.append(e.get("fieldOfStudy").asText()).append(" ");
                    sb.append("\n");
                }
            }

            return sb.toString();
        } catch (Exception e) {
            log.warn("Failed to parse structured JSON content for matching: {}", e.getMessage());
            return "";
        }
    }
}
