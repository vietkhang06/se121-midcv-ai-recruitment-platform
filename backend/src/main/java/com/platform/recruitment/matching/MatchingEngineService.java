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
    private EvidenceRepository evidenceRepository;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.platform.recruitment.github.GitHubProfileRepository gitHubProfileRepository;

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

        // Native PostgreSQL pgvector evaluation with seamless in-memory fallback
        UUID cvDocVersionId = findCvDocumentVersionId(candidate);
        UUID jdDocVersionId = findJdDocumentVersionId(job.getId());
        BigDecimal semanticScore = null;
        if (jdbcTemplate != null && cvDocVersionId != null && jdDocVersionId != null) {
            semanticScore = pgvectorCosineSimilarity.evaluatePgvectorSemanticSimilarity(cvDocVersionId, jdDocVersionId);
        }
        if (semanticScore == null) {
            semanticScore = pgvectorCosineSimilarity.evaluateSemanticSimilarity(job.getDescription(), cvRawText);
        }
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
        result.setMatchingAlgorithmVersion("v1.0");

        MatchResult savedResult = matchResultRepository.save(result);

        // 5b. Idempotency & Duplicate Prevention: purge previous factors and evidences for this match result
        matchFactorRepository.deleteByMatchResultId(savedResult.getId());
        if (evidenceRepository != null) {
            evidenceRepository.deleteByMatchResultId(savedResult.getId());
        }

        // 6. Save MatchFactors for Full Score Reconstruction
        saveMatchFactor(savedResult, "SKILL_REQUIRED", reqSkillScore, BigDecimal.valueOf(0.32)); // 0.40 * 0.80
        saveMatchFactor(savedResult, "SKILL_PREFERRED", prefSkillScore, BigDecimal.valueOf(0.08)); // 0.40 * 0.20
        saveMatchFactor(savedResult, "EXPERIENCE", expScore, BigDecimal.valueOf(0.25));
        saveMatchFactor(savedResult, "EDUCATION", eduScore, BigDecimal.valueOf(0.10));
        saveMatchFactor(savedResult, "PROJECT", projScore, BigDecimal.valueOf(0.10));
        saveMatchFactor(savedResult, "SEMANTIC", semanticScore, BigDecimal.valueOf(0.15));
        if (scoreGithub != null && weightGithub.compareTo(BigDecimal.ZERO) > 0) {
            saveMatchFactor(savedResult, "GITHUB_SUPPORTING", scoreGithub, weightGithub);
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
            String status = "MODERATE";
            if (f.getScore() != null) {
                if (f.getScore().compareTo(BigDecimal.valueOf(80)) >= 0) status = "HIGH";
                else if (f.getScore().compareTo(BigDecimal.valueOf(50)) < 0) status = "LOW";
            }
            factorItems.add(MatchInspectionResponse.FactorItem.builder()
                    .factorName(f.getFactorType())
                    .score(f.getScore())
                    .status(status)
                    .explanation("Đánh giá thành phần " + f.getFactorType() + " với trọng số " + f.getWeight())
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

    private void saveMatchFactor(MatchResult result, String factorType, BigDecimal score, BigDecimal weight) {
        String sourceType = "CV";
        if ("GITHUB_SUPPORTING".equalsIgnoreCase(factorType)) {
            sourceType = "GITHUB";
        }
        MatchFactor factor = MatchFactor.builder()
                .matchResult(result)
                .sourceType(sourceType)
                .factorType(factorType)
                .factorName(factorType)
                .score(score)
                .weight(weight)
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
}
