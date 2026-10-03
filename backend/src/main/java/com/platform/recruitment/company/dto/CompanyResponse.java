package com.platform.recruitment.company.dto;

import com.platform.recruitment.company.Company;
import com.platform.recruitment.company.CompanyVerification;
import lombok.*;

import java.time.ZonedDateTime;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompanyResponse {
    private UUID id;
    private String name;
    private String taxCode;
    private String website;
    private String size;
    private String industry;
    private String description;
    private CompanyVerification verificationStatus;
    private String verificationReason;
    private String reviewNotes;
    private ZonedDateTime reviewedAt;
    private Long version;
    private ZonedDateTime createdAt;
    private ZonedDateTime updatedAt;

    public static CompanyResponse fromEntity(Company company) {
        if (company == null) return null;
        return CompanyResponse.builder()
                .id(company.getId())
                .name(company.getName())
                .taxCode(company.getTaxCode())
                .website(company.getWebsite())
                .size(company.getSize())
                .industry(company.getIndustry())
                .description(company.getDescription())
                .verificationStatus(company.getVerificationStatus())
                .verificationReason(company.getReviewNotes())
                .reviewNotes(company.getReviewNotes())
                .reviewedAt(company.getReviewedAt())
                .version(company.getVersion())
                .createdAt(company.getCreatedAt())
                .updatedAt(company.getUpdatedAt())
                .build();
    }
}
