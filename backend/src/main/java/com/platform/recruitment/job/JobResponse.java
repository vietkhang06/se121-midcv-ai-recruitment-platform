package com.platform.recruitment.job;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobResponse {

    private UUID id;
    private UUID companyId;
    private String companyName;
    private String title;
    private String industry;
    private String seniority;
    private JobStatus status;
    private BigDecimal minSalary;
    private BigDecimal maxSalary;
    private String location;
    private String employmentType;
    private String description;
    private List<RequirementResponse> requirements;
    private ZonedDateTime createdAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RequirementResponse {
        private UUID id;
        private String skillName;
        private RequirementType requirementType;
        private Integer minYearsExp;
    }
}
