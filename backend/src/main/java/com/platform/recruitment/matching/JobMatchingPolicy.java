package com.platform.recruitment.matching;

import com.platform.recruitment.common.BaseEntity;
import com.platform.recruitment.job.Job;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "job_matching_policies")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobMatchingPolicy extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id", nullable = false, unique = true)
    private Job job;

    @Builder.Default
    @Column(name = "skill_required_weight", nullable = false, precision = 5, scale = 4)
    private BigDecimal skillRequiredWeight = new BigDecimal("0.3200");

    @Builder.Default
    @Column(name = "skill_preferred_weight", nullable = false, precision = 5, scale = 4)
    private BigDecimal skillPreferredWeight = new BigDecimal("0.0800");

    @Builder.Default
    @Column(name = "experience_weight", nullable = false, precision = 5, scale = 4)
    private BigDecimal experienceWeight = new BigDecimal("0.2500");

    @Builder.Default
    @Column(name = "education_weight", nullable = false, precision = 5, scale = 4)
    private BigDecimal educationWeight = new BigDecimal("0.1000");

    @Builder.Default
    @Column(name = "project_weight", nullable = false, precision = 5, scale = 4)
    private BigDecimal projectWeight = new BigDecimal("0.1000");

    @Builder.Default
    @Column(name = "semantic_weight", nullable = false, precision = 5, scale = 4)
    private BigDecimal semanticWeight = new BigDecimal("0.1500");

    @Builder.Default
    @Column(name = "core_weight", nullable = false, precision = 5, scale = 4)
    private BigDecimal coreWeight = new BigDecimal("0.8500");

    @Builder.Default
    @Column(name = "github_weight", nullable = false, precision = 5, scale = 4)
    private BigDecimal githubWeight = new BigDecimal("0.1500");

    @Builder.Default
    @Column(name = "is_github_active", nullable = false)
    private Boolean isGithubActive = true;

    @Builder.Default
    @Column(name = "policy_version", nullable = false)
    private Integer policyVersion = 1;

    public static JobMatchingPolicy createDefaultPolicy(Job job) {
        return JobMatchingPolicy.builder()
                .job(job)
                .skillRequiredWeight(new BigDecimal("0.3200"))
                .skillPreferredWeight(new BigDecimal("0.0800"))
                .experienceWeight(new BigDecimal("0.2500"))
                .educationWeight(new BigDecimal("0.1000"))
                .projectWeight(new BigDecimal("0.1000"))
                .semanticWeight(new BigDecimal("0.1500"))
                .coreWeight(new BigDecimal("0.8500"))
                .githubWeight(new BigDecimal("0.1500"))
                .isGithubActive(true)
                .policyVersion(1)
                .build();
    }
}
