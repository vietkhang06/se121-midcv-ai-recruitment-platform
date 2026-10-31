package com.platform.recruitment.application;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateApplicationStatusRequest {

    @NotNull(message = "New application status is required")
    private ApplicationStatus status;

    @jakarta.validation.constraints.Size(max = 4000)
    private String decisionNote;

    // Optional compare-and-set guard used by the UI; old clients remain supported.
    private ApplicationStatus expectedStatus;

    public UpdateApplicationStatusRequest(ApplicationStatus status, String decisionNote) {
        this.status = status;
        this.decisionNote = decisionNote;
    }
}
