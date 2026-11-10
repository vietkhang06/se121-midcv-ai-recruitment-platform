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
    private String companyDescription;
    private String companyDescriptionHtml;
    private boolean companyVerified;
    private String title;
    private java.time.ZonedDateTime promotedUntil;
    private Integer aiScreeningPolicyVersion;
    private String aiScreeningPackageCode;
    private List<String> occupationCodes;
    private String industry;
    private String industryOther;
    private String seniority;
    private String seniorityOther;
    private JobStatus status;
    private BigDecimal minSalary;
    private BigDecimal maxSalary;
    private Boolean salaryNegotiable;
    private String salaryCurrency;
    private String salaryPeriod;
    private String location;
    private String employmentType;
    private String employmentTypeOther;
    private String description;
    private String descriptionHtml;
    private String candidateRequirements;
    private String benefitsContent;
    private String workAddress;
    private String workingTime;
    private String applicationInstructions;
    private java.time.LocalDate applicationDeadline;

    private List<String> responsibilities;
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
