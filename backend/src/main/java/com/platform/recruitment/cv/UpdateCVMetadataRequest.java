package com.platform.recruitment.cv;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateCVMetadataRequest {

    @NotBlank(message = "CV title is required")
    @Size(max = 255, message = "CV title must be at most 255 characters")
    private String title;
}
