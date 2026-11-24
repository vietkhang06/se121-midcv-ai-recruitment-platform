package com.platform.recruitment.matching;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.ZonedDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CandidateRankingResponse {
    private UUID id;
    private int rank;
    private UUID applicationId;
    private UUID candidateId;
    private String candidateName;
    private UUID candidateAvatarId;
    private String headline;
    private BigDecimal overallScore;
    private BigDecimal coreScore;
    private BigDecimal githubScore;
    private Integer requiredSkillsMatched;
    private Integer requiredSkillsTotal;
    private Integer requiredSkillsMissing;
    private Integer preferredSkillsMatched;
    private Integer preferredSkillsTotal;
    private Boolean isGithubActive;
    private Boolean githubFallbackApplied;
    private String status;
    private String calculationStatus;
    private com.platform.recruitment.application.ApplicationStatus applicationStatus;
    private String matchingAlgorithmVersion;
    private String aiSummary;
    private ZonedDateTime appliedAt;

    public void redactForStandardPlan(com.platform.recruitment.product.AiScreeningAccessService policy) {
        if (overallScore != null && "PGVECTOR_READY".equals(calculationStatus)) status = policy.classify(overallScore);
        overallScore = null;
        coreScore = null;
        githubScore = null;
        requiredSkillsMatched = null;
        requiredSkillsTotal = null;
        requiredSkillsMissing = null;
        preferredSkillsMatched = null;
        preferredSkillsTotal = null;
        isGithubActive = null;
        githubFallbackApplied = null;
        matchingAlgorithmVersion = null;
        aiSummary = null;
    }

    public void redactForStandardPlan() {
        if (overallScore != null && "PGVECTOR_READY".equals(calculationStatus)) status =
                com.platform.recruitment.product.AiScreeningAccessService.classifyScore(overallScore);
        overallScore = null;
        coreScore = null;
        githubScore = null;
        requiredSkillsMatched = null;
        requiredSkillsTotal = null;
        requiredSkillsMissing = null;
        preferredSkillsMatched = null;
        preferredSkillsTotal = null;
        isGithubActive = null;
        githubFallbackApplied = null;
        matchingAlgorithmVersion = null;
        aiSummary = null;
    }
}
