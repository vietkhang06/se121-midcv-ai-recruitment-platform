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
    private UUID candidateId;
    private String candidateName;
    private UUID appliedCvId;
    private ApplicationStatus status;
    private ZonedDateTime appliedAt;
    private SnapshotInfo snapshot;

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
