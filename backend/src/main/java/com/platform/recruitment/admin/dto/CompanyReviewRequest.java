package com.platform.recruitment.admin.dto;

import com.platform.recruitment.company.CompanyVerification;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompanyReviewRequest {
    // Optional for canonical action endpoints; generic transition validates it in the service.
    private CompanyVerification status;

    private String reason;

    private Long version;
}
