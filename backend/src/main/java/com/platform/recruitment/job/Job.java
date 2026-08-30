package com.platform.recruitment.job;

import com.platform.recruitment.common.BaseEntity;
import com.platform.recruitment.company.Company;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "jobs")
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

    @Column(name = "industry", nullable = false)
    private String industry;

    @Column(name = "seniority", nullable = false)
    private String seniority;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private JobStatus status = JobStatus.DRAFT;

    @Column(name = "min_salary")
    private BigDecimal minSalary;

    @Column(name = "max_salary")
    private BigDecimal maxSalary;

    @Column(name = "location")
    private String location;

    @Column(name = "employment_type")
    private String employmentType;

    @Column(name = "description", nullable = false, columnDefinition = "TEXT")
    private String description;

    @Builder.Default
    @OneToMany(mappedBy = "job", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<JobRequirement> requirements = new ArrayList<>();
}
