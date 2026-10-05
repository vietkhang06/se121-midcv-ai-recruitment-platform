package com.platform.recruitment.admin.dto;

import com.platform.recruitment.company.CompanyVerification;
import lombok.*;

import java.time.ZonedDateTime;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompanyAdminDto {
    private UUID id;
    private String name;
    private String taxCode;
    private String website;
    private String size;
    private String industry;
    private String description;
    private CompanyVerification verificationStatus;
    private com.platform.recruitment.company.CompanyOperationalStatus operationalStatus;

    private UUID reviewedById;
    private String reviewedByEmail;
    private ZonedDateTime reviewedAt;
    private String reviewNotes;

    private Long version;
    private ZonedDateTime createdAt;
    private ZonedDateTime updatedAt;

    private String recruiterEmail;
    private String recruiterName;
    private String recruiterPhone;
    private long activeJobsCount;
}
