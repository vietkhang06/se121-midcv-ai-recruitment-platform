package com.platform.recruitment.cv;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CVProcessingStatusResponse {
    private UUID cvId;
    private UUID jobId;
    private String status;
    private String stage;
    private int progress;
    private String message;
    private boolean retryable;
    private String errorCode;
    private String correlationId;
    private Instant updatedAt;
}
