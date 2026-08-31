package com.platform.recruitment.matching;

import com.platform.recruitment.github.GitHubActivitySignal;
import com.platform.recruitment.github.GitHubAssessment;
import com.platform.recruitment.github.GitHubAssessmentRepository;
import com.platform.recruitment.github.GitHubProfile;
import com.platform.recruitment.github.GitHubProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class GitHubScoringService {

    private final GitHubProfileRepository gitHubProfileRepository;
    private final GitHubAssessmentRepository gitHubAssessmentRepository;

    public Optional<BigDecimal> calculateGitHubSupportingScore(UUID candidateId, String jobIndustry, String jobDescription) {
        // Check job relevance: Non-technical jobs (e.g. Marketing, Finance) do NOT use GitHub score
        if (jobIndustry != null && (jobIndustry.equalsIgnoreCase("Marketing") || jobIndustry.equalsIgnoreCase("Finance") || jobIndustry.equalsIgnoreCase("Design"))) {
            log.info("Job industry '{}' is non-technical. Disabling GitHub supporting score.", jobIndustry);
            return Optional.empty();
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

        // 1. Language Match (40%)
        double languageScore = 90.0;
        Optional<GitHubAssessment> assessmentOpt = gitHubAssessmentRepository.findByGithubProfileId(profile.getId());
        if (assessmentOpt.isPresent() && assessmentOpt.get().getLanguageRankSummary() != null) {
            String rank = assessmentOpt.get().getLanguageRankSummary().toLowerCase();
            if (jobDescription != null && jobDescription.toLowerCase().contains("java") && rank.contains("java")) {
                languageScore = 95.0;
            }
        }

        // 2. Technology Evidence (35%)
        double techScore = 85.0;

        // 3. Activity Signal (15%)
        double activityScore = 70.0;
        if (profile.getActivitySignal() == GitHubActivitySignal.HIGH) {
            activityScore = 100.0;
        } else if (profile.getActivitySignal() == GitHubActivitySignal.MODERATE) {
            activityScore = 85.0;
        } else if (profile.getActivitySignal() == GitHubActivitySignal.LOW) {
            activityScore = 60.0;
        }

        // 4. Recency (10%)
        double recencyScore = 80.0;

        double total = (0.40 * languageScore) + (0.35 * techScore) + (0.15 * activityScore) + (0.10 * recencyScore);
        BigDecimal finalScore = BigDecimal.valueOf(total).setScale(2, RoundingMode.HALF_UP);
        log.info("Calculated GitHub Supporting Score: {} for candidate: {}", finalScore, candidateId);
        return Optional.of(finalScore);
    }
}
