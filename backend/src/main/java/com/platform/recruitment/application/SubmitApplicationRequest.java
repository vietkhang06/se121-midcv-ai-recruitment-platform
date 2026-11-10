package com.platform.recruitment.application;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class SubmitApplicationRequest {

    @NotNull(message = "Vui lòng chọn tin tuyển dụng.")
    private UUID jobId;

    @NotNull(message = "Vui lòng chọn CV để ứng tuyển.")
    private UUID cvId;
    private Boolean aiAnalysisConsent = false;
    @jakarta.validation.constraints.Size(max = 5000, message = "Thư ứng tuyển không được vượt quá 5.000 ký tự.")
    private String coverLetter;
}
