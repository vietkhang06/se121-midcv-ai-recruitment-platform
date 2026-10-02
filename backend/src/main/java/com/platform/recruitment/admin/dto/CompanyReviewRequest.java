package com.platform.recruitment.admin.dto;

import com.platform.recruitment.company.CompanyVerification;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompanyReviewRequest {
    @NotNull(message = "Trạng thái mới không được để trống")
    private CompanyVerification status;

    private String reason;

    private Long version;
}
