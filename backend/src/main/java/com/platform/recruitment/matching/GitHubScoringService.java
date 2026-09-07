package com.platform.recruitment.matching;

import com.platform.recruitment.github.GitHubActivitySignal;
import com.platform.recruitment.github.GitHubAssessment;
import com.platform.recruitment.github.GitHubAssessmentRepository;
import com.platform.recruitment.github.GitHubProfile;
import com.platform.recruitment.github.GitHubProfileRepository;
import com.platform.recruitment.github.GitHubRepository;
import com.platform.recruitment.github.GitHubRepositoryRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
public class GitHubScoringService {

    private final GitHubProfileRepository gitHubProfileRepository;
    private final GitHubAssessmentRepository gitHubAssessmentRepository;
    private final GitHubRepositoryRepository gitHubRepositoryRepository;

    public GitHubScoringService(GitHubProfileRepository gitHubProfileRepository,
                                GitHubAssessmentRepository gitHubAssessmentRepository) {
        this(gitHubProfileRepository, gitHubAssessmentRepository, null);
    }

    @Autowired
    public GitHubScoringService(GitHubProfileRepository gitHubProfileRepository,
                                GitHubAssessmentRepository gitHubAssessmentRepository,
                                @Autowired(required = false) GitHubRepositoryRepository gitHubRepositoryRepository) {
        this.gitHubProfileRepository = gitHubProfileRepository;
        this.gitHubAssessmentRepository = gitHubAssessmentRepository;
        this.gitHubRepositoryRepository = gitHubRepositoryRepository;
    }

    public Optional<BigDecimal> calculateGitHubSupportingScore(UUID candidateId, String jobIndustry, String jobDescription) {
        // 1. Check job relevance: Non-technical jobs (e.g. Marketing, Finance, HR) do NOT use GitHub score
        if (jobIndustry != null && (jobIndustry.equalsIgnoreCase("Marketing") 
                || jobIndustry.equalsIgnoreCase("Finance") 
                || jobIndustry.equalsIgnoreCase("Design")
                || jobIndustry.equalsIgnoreCase("Sales")
                || jobIndustry.equalsIgnoreCase("Human Resources"))) {
            log.info("Job industry '{}' is non-technical. Disabling GitHub supporting score.", jobIndustry);
            return Optional.empty();
        }

        // Also check if job is IT but strictly non-coding/irrelevant (e.g. Helpdesk, Technical Support, Recruiter)
        if (jobDescription != null) {
            String lowerDesc = jobDescription.toLowerCase();
            if (lowerDesc.contains("helpdesk") || lowerDesc.contains("it support") 
                    || lowerDesc.contains("technical support") || lowerDesc.contains("recruiter")
                    || lowerDesc.contains("no github required") || lowerDesc.contains("no coding required")) {
                log.info("Job description indicates non-coding IT role. Disabling GitHub supporting score.");
                return Optional.empty();
            }
        }

        Optional<GitHubProfile> profileOpt = gitHubProfileRepository.findByCandidateId(candidateId);
        if (profileOpt.isEmpty()) {
            log.info("Candidate '{}' has no GitHub profile. Returning fallback empty.", candidateId);
            return Optional.empty();
        }

        GitHubProfile profile = profileOpt.get();
        if (!"SYNCED".equalsIgnoreCase(profile.getStatus())) {
            log.info("Candidate '{}' GitHub status is '{}'. Returning fallback empty.", candidateId, profile.getStatus());
            return Optional.empty();
        }

        List<GitHubRepository> repos = (gitHubRepositoryRepository != null)
                ? gitHubRepositoryRepository.findByGithubProfileId(profile.getId())
                : List.of();

        Optional<GitHubAssessment> assessmentOpt = gitHubAssessmentRepository.findByGithubProfileId(profile.getId());
        String rank = assessmentOpt.map(GitHubAssessment::getLanguageRankSummary).orElse("").toLowerCase();
        String lowerJd = (jobDescription != null) ? jobDescription.toLowerCase() : "";

        // 1. Language Match (40%)
        double languageScore = 85.0;
        if (!repos.isEmpty()) {
            boolean matchesKeyLang = false;
            boolean hasAnyOverlap = false;
            for (GitHubRepository r : repos) {
                String rLang = r.getPrimaryLanguage() != null ? r.getPrimaryLanguage().toLowerCase() : "";
                if (!rLang.isEmpty() && lowerJd.contains(rLang)) {
                    hasAnyOverlap = true;
                    if (lowerJd.contains("java") && rLang.contains("java")) matchesKeyLang = true;
                    if (lowerJd.contains("python") && rLang.contains("python")) matchesKeyLang = true;
                    if (lowerJd.contains("typescript") && rLang.contains("typescript")) matchesKeyLang = true;
                }
            }
            if (matchesKeyLang) {
                languageScore = 95.0;
            } else if (hasAnyOverlap) {
                languageScore = 80.0;
            } else {
                // Completely unrelated language observed (e.g. only Python repo for Java JD)
                languageScore = 40.0;
            }
        } else if (!rank.isBlank()) {
            if (lowerJd.contains("java") && rank.contains("java")) {
                languageScore = 95.0;
            } else if (lowerJd.contains("python") && rank.contains("python")) {
                languageScore = 95.0;
            } else if (lowerJd.contains("typescript") && rank.contains("typescript")) {
                languageScore = 95.0;
            } else if (lowerJd.contains("java") && !rank.contains("java")) {
                languageScore = 45.0;
            } else {
                languageScore = 90.0;
            }
        } else {
            languageScore = 90.0;
        }

        // 2. Technology Evidence & Relevant Repositories (35%)
        double techScore = 85.0;
        if (!repos.isEmpty()) {
            int relevantCount = 0;
            for (GitHubRepository r : repos) {
                String rName = r.getName() != null ? r.getName().toLowerCase() : "";
                String rDesc = r.getDescription() != null ? r.getDescription().toLowerCase() : "";
                String rLang = r.getPrimaryLanguage() != null ? r.getPrimaryLanguage().toLowerCase() : "";

                boolean isRelevant = false;
                if (!rLang.isEmpty() && lowerJd.contains(rLang)) isRelevant = true;
                if (rName.contains("backend") || rName.contains("api") || rName.contains("service") 
                        || rName.contains("spring") || rName.contains("postgres") || rName.contains("docker")) {
                    isRelevant = true;
                }
                if (rDesc.contains("spring") || rDesc.contains("postgres") || rDesc.contains("docker")
                        || rDesc.contains("microservice") || rDesc.contains("matching")) {
                    isRelevant = true;
                }
                if (isRelevant) {
                    relevantCount++;
                }
            }
            if (relevantCount >= 2) {
                techScore = 95.0;
            } else if (relevantCount == 1) {
                techScore = 85.0;
            } else {
                // Only unrelated repos (e.g. photography, personal notes)
                techScore = 40.0;
            }
        }

        // 3. Activity Signal (15%)
        double activityScore = 70.0;
        if (profile.getActivitySignal() == GitHubActivitySignal.HIGH) {
            activityScore = 100.0;
        } else if (profile.getActivitySignal() == GitHubActivitySignal.MODERATE) {
            activityScore = 85.0;
        } else if (profile.getActivitySignal() == GitHubActivitySignal.LOW) {
            activityScore = 60.0;
        } else if (profile.getActivitySignal() == GitHubActivitySignal.LIMITED_OBSERVABLE_ACTIVITY) {
            activityScore = 40.0;
        }

        // 4. Recency (10%)
        double recencyScore = 80.0;
        if (!repos.isEmpty()) {
            ZonedDateTime latest = null;
            for (GitHubRepository r : repos) {
                if (r.getUpdatedAtGithub() != null) {
                    if (latest == null || r.getUpdatedAtGithub().isAfter(latest)) {
                        latest = r.getUpdatedAtGithub();
                    }
                }
            }
            if (latest != null) {
                long days = java.time.Duration.between(latest, ZonedDateTime.now()).toDays();
                if (days <= 14) recencyScore = 100.0;
                else if (days <= 60) recencyScore = 85.0;
                else if (days <= 180) recencyScore = 60.0;
                else recencyScore = 40.0;
            }
        }

        double total = (0.40 * languageScore) + (0.35 * techScore) + (0.15 * activityScore) + (0.10 * recencyScore);
        BigDecimal finalScore = BigDecimal.valueOf(total).setScale(2, RoundingMode.HALF_UP);
        log.info("Calculated GitHub Supporting Score: {} (Lang: {}, Tech: {}, Act: {}, Rec: {}) for candidate: {}", 
                finalScore, languageScore, techScore, activityScore, recencyScore, candidateId);
        return Optional.of(finalScore);
    }

    public List<String> findRelevantRepositories(UUID candidateId, String jobDescription) {
        if (gitHubRepositoryRepository == null) return List.of();
        Optional<GitHubProfile> profileOpt = gitHubProfileRepository.findByCandidateId(candidateId);
        if (profileOpt.isEmpty()) return List.of();

        List<GitHubRepository> repos = gitHubRepositoryRepository.findByGithubProfileId(profileOpt.get().getId());
        String lowerJd = jobDescription != null ? jobDescription.toLowerCase() : "";

        List<String> relevantNames = new ArrayList<>();
        for (GitHubRepository r : repos) {
            String rName = r.getName() != null ? r.getName().toLowerCase() : "";
            String rDesc = r.getDescription() != null ? r.getDescription().toLowerCase() : "";
            String rLang = r.getPrimaryLanguage() != null ? r.getPrimaryLanguage().toLowerCase() : "";

            boolean isRelevant = false;
            if (!rLang.isEmpty() && lowerJd.contains(rLang)) isRelevant = true;
            if (rName.contains("backend") || rName.contains("api") || rName.contains("service") 
                    || rName.contains("spring") || rName.contains("postgres") || rName.contains("docker")) {
                isRelevant = true;
            }
            if (rDesc.contains("spring") || rDesc.contains("postgres") || rDesc.contains("docker")
                    || rDesc.contains("microservice") || rDesc.contains("matching")) {
                isRelevant = true;
            }
            if (isRelevant) {
                relevantNames.add(r.getName());
            }
        }
        return relevantNames;
    }
}
