package com.platform.recruitment.job;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class CreateJobRequest {

    @NotBlank(message = "Job title is required")
    private String title;

    @NotBlank(message = "Industry is required")
    private String industry;

    @NotBlank(message = "Seniority is required")
    private String seniority;

    private BigDecimal minSalary;

    private BigDecimal maxSalary;

    private String location;

    private String employmentType;

    @NotBlank(message = "Job description is required")
    private String description;

    private List<RequirementItem> requirements;

    @Data
    public static class RequirementItem {
        @NotBlank(message = "Skill name is required")
        private String skillName;
        private RequirementType type; // REQUIRED or PREFERRED
        private Integer minYearsExp;
    }
}
