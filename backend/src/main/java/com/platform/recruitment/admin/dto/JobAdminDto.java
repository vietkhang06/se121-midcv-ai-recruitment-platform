package com.platform.recruitment.admin.dto;

import com.platform.recruitment.job.JobStatus;
import lombok.*;

import java.math.BigDecimal;
import java.time.ZonedDateTime;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobAdminDto {
    private UUID id;
    private UUID companyId;
    private String companyName;
    private String companyVerificationStatus;
    private String title;
    private String industry;
    private String seniority;
    private JobStatus status;
    private BigDecimal minSalary;
    private BigDecimal maxSalary;
    private String location;
    private String employmentType;
    private String description;
    private String moderationReason;
    private ZonedDateTime suspendedAt;
    private ZonedDateTime createdAt;
}
