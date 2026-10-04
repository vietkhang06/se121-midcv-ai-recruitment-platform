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
    private String matchingAlgorithmVersion;
    private String aiSummary;
    private ZonedDateTime appliedAt;
}
