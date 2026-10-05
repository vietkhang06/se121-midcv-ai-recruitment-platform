package com.platform.recruitment.suspension.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewAppealRequest {

    @NotBlank(message = "Lý do / ghi chú xử lý không được để trống")
    private String resolutionNote;
}
