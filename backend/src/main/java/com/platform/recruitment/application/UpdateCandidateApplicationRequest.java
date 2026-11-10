package com.platform.recruitment.application;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

/** Candidate-owned fields that remain editable while an application is submitted. */
@Data
public class UpdateCandidateApplicationRequest {

    @NotNull(message = "Vui lòng chọn có hoặc không cho phép phân tích CV bằng AI.")
    private Boolean aiAnalysisConsent;

    @Size(max = 5000, message = "Thư ứng tuyển không được vượt quá 5.000 ký tự.")
    private String coverLetter;

    /** Optimistic guard so a candidate cannot overwrite a recruiter decision from a stale screen. */
    private ApplicationStatus expectedStatus;
}
