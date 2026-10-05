package com.platform.recruitment.matching;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobMatchingPolicyDto {

    private UUID id;
    private UUID jobId;

    @NotNull(message = "Trọng số kỹ năng bắt buộc không được để trống")
    @DecimalMin(value = "0.0", message = "Trọng số không được âm")
    @DecimalMax(value = "1.0", message = "Trọng số không được vượt quá 1.0")
    private BigDecimal skillRequiredWeight;

    @NotNull(message = "Trọng số kỹ năng ưu tiên không được để trống")
    @DecimalMin(value = "0.0", message = "Trọng số không được âm")
    @DecimalMax(value = "1.0", message = "Trọng số không được vượt quá 1.0")
    private BigDecimal skillPreferredWeight;

    @NotNull(message = "Trọng số kinh nghiệm không được để trống")
    @DecimalMin(value = "0.0", message = "Trọng số không được âm")
    @DecimalMax(value = "1.0", message = "Trọng số không được vượt quá 1.0")
    private BigDecimal experienceWeight;

    @NotNull(message = "Trọng số học vấn không được để trống")
    @DecimalMin(value = "0.0", message = "Trọng số không được âm")
    @DecimalMax(value = "1.0", message = "Trọng số không được vượt quá 1.0")
    private BigDecimal educationWeight;

    @NotNull(message = "Trọng số dự án không được để trống")
    @DecimalMin(value = "0.0", message = "Trọng số không được âm")
    @DecimalMax(value = "1.0", message = "Trọng số không được vượt quá 1.0")
    private BigDecimal projectWeight;

    @NotNull(message = "Trọng số đối sánh ngữ nghĩa không được để trống")
    @DecimalMin(value = "0.0", message = "Trọng số không được âm")
    @DecimalMax(value = "1.0", message = "Trọng số không được vượt quá 1.0")
    private BigDecimal semanticWeight;

    @NotNull(message = "Trọng số cốt lõi CV không được để trống")
    @DecimalMin(value = "0.0", message = "Trọng số không được âm")
    @DecimalMax(value = "1.0", message = "Trọng số không được vượt quá 1.0")
    private BigDecimal coreWeight;

    @NotNull(message = "Trọng số GitHub không được để trống")
    @DecimalMin(value = "0.0", message = "Trọng số không được âm")
    @DecimalMax(value = "1.0", message = "Trọng số không được vượt quá 1.0")
    private BigDecimal githubWeight;

    private Boolean isGithubActive;
    private Integer policyVersion;

    public static JobMatchingPolicyDto fromEntity(JobMatchingPolicy policy) {
        if (policy == null) return null;
        return JobMatchingPolicyDto.builder()
                .id(policy.getId())
                .jobId(policy.getJob() != null ? policy.getJob().getId() : null)
                .skillRequiredWeight(policy.getSkillRequiredWeight())
                .skillPreferredWeight(policy.getSkillPreferredWeight())
                .experienceWeight(policy.getExperienceWeight())
                .educationWeight(policy.getEducationWeight())
                .projectWeight(policy.getProjectWeight())
                .semanticWeight(policy.getSemanticWeight())
                .coreWeight(policy.getCoreWeight())
                .githubWeight(policy.getGithubWeight())
                .isGithubActive(policy.getIsGithubActive())
                .policyVersion(policy.getPolicyVersion())
                .build();
    }
}
