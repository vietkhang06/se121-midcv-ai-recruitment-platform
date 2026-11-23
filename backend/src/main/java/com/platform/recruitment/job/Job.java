package com.platform.recruitment.job;

import com.platform.recruitment.common.BaseEntity;
import com.platform.recruitment.company.Company;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.ZonedDateTime;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "jobs")
@org.hibernate.annotations.DynamicUpdate
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Job extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Column(name = "title", nullable = false)
    private String title;
    @org.hibernate.annotations.Generated(event = {org.hibernate.generator.EventType.INSERT, org.hibernate.generator.EventType.UPDATE})
    @Column(name = "published_at", insertable = false, updatable = false)
    private ZonedDateTime publishedAt;

    @Column(name = "promoted_until")
    private ZonedDateTime promotedUntil;
    @Column(name = "ai_screening_policy_version")
    private Integer aiScreeningPolicyVersion;
    @Column(name = "ai_screening_package_code", length = 40)
    private String aiScreeningPackageCode;
    @Builder.Default
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(name = "occupation_codes", nullable = false, columnDefinition = "jsonb")
    private List<String> occupationCodes = new ArrayList<>();

    @Column(name = "industry", nullable = false)
    private String industry;

    @Column(name = "industry_other", length = 80)
    private String industryOther;

    @Column(name = "seniority", nullable = false)
    private String seniority;

    @Column(name = "seniority_other", length = 80)
    private String seniorityOther;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private JobStatus status = JobStatus.DRAFT;

    @Column(name = "min_salary")
    private BigDecimal minSalary;

    @Column(name = "max_salary")
    private BigDecimal maxSalary;

    @Builder.Default
    @Column(name = "salary_negotiable", nullable = false)
    private Boolean salaryNegotiable = false;

    @Builder.Default
    @Column(name = "salary_currency", nullable = false, length = 3)
    private String salaryCurrency = "VND";

    @Column(name = "location")
    private String location;

    @Column(name = "employment_type")
    private String employmentType;

    @Column(name = "employment_type_other", length = 80)
    private String employmentTypeOther;

    @Column(name = "description", nullable = false, columnDefinition = "TEXT")
    private String description;
    @Column(name = "description_html", columnDefinition = "TEXT")
    private String descriptionHtml;

    @Column(name = "responsibilities_html", columnDefinition = "TEXT")
    private String responsibilitiesHtml;

    @Column(name = "vacancy_count")
    private Integer vacancyCount;
    @Column(name = "candidate_requirements", columnDefinition = "TEXT")
    private String candidateRequirements;
    @Column(name = "benefits_content", columnDefinition = "TEXT")
    private String benefitsContent;
    @Column(name = "work_address", columnDefinition = "TEXT")
    private String workAddress;
    @Column(name = "working_time", columnDefinition = "TEXT")
    private String workingTime;
    @Column(name = "application_instructions", columnDefinition = "TEXT")
    private String applicationInstructions;
    @Column(name = "application_deadline")
    private LocalDate applicationDeadline;

    @Builder.Default
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(name = "responsibilities", nullable = false, columnDefinition = "jsonb")
    private List<String> responsibilities = new ArrayList<>();

    @Column(name = "moderation_reason", columnDefinition = "TEXT")
    private String moderationReason;

    @Column(name = "suspended_at")
    private ZonedDateTime suspendedAt;

    @Builder.Default
    @OneToMany(mappedBy = "job", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<JobRequirement> requirements = new ArrayList<>();
}
