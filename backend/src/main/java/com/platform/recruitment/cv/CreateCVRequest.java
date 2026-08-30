package com.platform.recruitment.cv;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateCVRequest {

    @NotBlank(message = "CV title is required")
    private String title;

    @NotNull(message = "Creation path is required")
    private CVCreationPath creationPath; // UPLOAD or BUILDER

    private String targetIndustry;

    private String rawText;

    private Boolean isDefault;
}
