package com.platform.recruitment.matching;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MatchInspectionResponse {
    private UUID applicationId;
    private String jobTitle;
    private String candidateName;
    private BigDecimal overallScore;
    private BigDecimal coreScore;
    private BigDecimal githubScore;
    private Boolean githubScoreActive;
    private List<SkillItem> requiredSkillsStatus;
    private List<SkillItem> preferredSkillsStatus;
    private List<FactorItem> matchFactors;
    private String humanReadableExplanation;
    private GitHubAssessmentInfo githubAssessment;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SkillItem {
        private String skillName;
        private String requirementType;
        private String status;
        private String evidenceText;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FactorItem {
        private String factorName;
        private BigDecimal score;
        private String status;
        private String explanation;
        private String evidence;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GitHubAssessmentInfo {
        private boolean connected;
        private String status;
        private String username;
        private Integer publicRepoCount;
        private List<String> topLanguages;
        private Map<String, Double> languageDistribution;
        private String activitySignal;
        private Integer latestActivityDaysAgo;
        private List<RepoItem> repos;
        private String overallAssessment;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RepoItem {
        private String name;
        private String description;
        private String primaryLanguage;
        private Integer stars;
        private Integer forks;
        private Integer updatedDaysAgo;
        private String relevanceExplanation;
    }
}
