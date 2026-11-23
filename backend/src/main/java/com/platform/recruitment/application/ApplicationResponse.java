package com.platform.recruitment.application;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.ZonedDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApplicationResponse {

    private UUID id;
    private UUID jobId;
    private String jobTitle;
    private ApplicationJobSummary job;
    private UUID candidateId;
    private String candidateName;
    private UUID appliedCvId;
    private UUID appliedCvVersionId;
    private Integer appliedCvVersionNumber;
    private ApplicationStatus status;
    private java.math.BigDecimal matchScore;
    private String matchStatus;
    private Boolean aiAnalysisConsent;
    /** Effective recruiter access, separate from the persisted subscription plan. */
    private Boolean proDetailAvailable;
    private String recruiterPlan;
    private Boolean developmentProAccess;
    private Boolean aiScoringAvailable;
    private String aiScoringReasonCode;
    private String aiScoringReason;
    private String matchClassification;
    private ZonedDateTime appliedAt;
    private String candidateEmail;
    private String candidatePhone;
    private String candidateHeadline;
    private String candidateGithubUrl;
    /** Personal details in the confirmed CV snapshot at submission time, never account profile fallbacks. */
    private String appliedCvFullName;
    private String appliedCvEmail;
    private String appliedCvPhone;
    private String appliedCvHeadline;
    private String appliedCvGithubUrl;
    private SnapshotInfo snapshot;

    public void redactMatchForStandardPlan() {
        proDetailAvailable = false;
        if (Boolean.FALSE.equals(aiAnalysisConsent)) {
            matchClassification = "CHUA_KHA_DUNG";
            matchScore = null;
            matchStatus = "CONSENT_NOT_GIVEN";
            return;
        }
        if ("CONSENT_NOT_GIVEN".equals(matchStatus)) {
            matchClassification = "CHUA_KHA_DUNG";
            matchScore = null;
            return;
        }
        matchClassification = matchScore == null ? "CHUA_KHA_DUNG"
                : com.platform.recruitment.product.AiScreeningAccessService.classifyScore(matchScore);
        matchScore = null;
        matchStatus = matchClassification;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SnapshotInfo {
        private String cvTitle;
        private String rawTextSnapshot;
        private ZonedDateTime snapshotCreatedAt;
    }
}
