package com.platform.recruitment.job;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.AssertTrue;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class CreateJobRequest {

    @NotBlank(message = "Job title is required")
    private String title;

    @NotBlank(message = "Industry is required")
    private String industry;

    private String industryOther;

    @NotBlank(message = "Seniority is required")
    private String seniority;

    private String seniorityOther;

    @DecimalMin(value = "0.00", message = "Minimum salary cannot be negative")
    @Digits(integer = 10, fraction = 2, message = "Minimum salary exceeds supported precision")
    private BigDecimal minSalary;

    @DecimalMin(value = "0.00", message = "Maximum salary cannot be negative")
    @Digits(integer = 10, fraction = 2, message = "Maximum salary exceeds supported precision")
    private BigDecimal maxSalary;

    private Boolean salaryNegotiable = false;

    private String salaryCurrency = "VND";

    @AssertTrue(message = "Unsupported salary currency")
    public boolean isSalaryCurrencyValid() {
        return salaryCurrency == null || java.util.Set.of("VND", "USD", "EUR", "GBP", "JPY", "CNY", "KRW", "SGD", "AUD", "CAD").contains(salaryCurrency);
    }

    @AssertTrue(message = "Minimum salary must not exceed maximum salary")
    public boolean isSalaryRangeValid() {
        if (Boolean.TRUE.equals(salaryNegotiable)) return minSalary == null && maxSalary == null;
        return minSalary == null || maxSalary == null || minSalary.compareTo(maxSalary) <= 0;
    }

    private String location;

    private String employmentType;

    private String employmentTypeOther;

    @AssertTrue(message = "Custom classification values are required only for OTHER")
    public boolean isCustomClassificationValid() {
        return validCustom(industry, industryOther) && validCustom(seniority, seniorityOther)
                && validCustom(employmentType, employmentTypeOther);
    }

    private boolean validCustom(String canonical, String custom) {
        boolean other = "OTHER".equalsIgnoreCase(canonical);
        return other ? custom != null && !custom.isBlank() && custom.trim().length() <= 80
                : custom == null || custom.isBlank();
    }

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
