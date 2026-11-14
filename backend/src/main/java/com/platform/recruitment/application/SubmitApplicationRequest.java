package com.platform.recruitment.application;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class SubmitApplicationRequest {

    @NotNull(message = "Job ID is required")
    private UUID jobId;

    @NotNull(message = "CV ID is required")
    private UUID cvId;

    /** Missing means no consent. The frontend requires an explicit choice. */
    private Boolean aiAnalysisConsent;
}
