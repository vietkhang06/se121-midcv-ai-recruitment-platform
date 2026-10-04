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
public class MatchScoreResponse {
    private UUID id;
    private UUID jobId;
    private UUID candidateId;
    private UUID applicationId;
    private BigDecimal overallScore;
    private BigDecimal coreScore;
    private BigDecimal githubScore;
    private String status;
    private String algorithmVersion;
    private ZonedDateTime createdAt;

    public static MatchScoreResponse fromEntity(MatchResult entity) {
        if (entity == null) {
            return null;
        }
        return MatchScoreResponse.builder()
                .id(entity.getId())
                .jobId(entity.getJob() != null ? entity.getJob().getId() : null)
                .candidateId(entity.getCandidate() != null ? entity.getCandidate().getId() : null)
                .applicationId(entity.getApplication() != null ? entity.getApplication().getId() : null)
                .overallScore(entity.getOverallScore())
                .coreScore(entity.getCoreScore())
                .githubScore(entity.getGithubScore())
                .status(entity.getStatus() != null ? entity.getStatus().name() : null)
                .algorithmVersion(entity.getAlgorithmVersion())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
