package com.platform.recruitment.job;

import com.platform.recruitment.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "job_requirements")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobRequirement extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id", nullable = false)
    private Job job;

    @Column(name = "skill_name", nullable = false)
    private String skillName;

    @Enumerated(EnumType.STRING)
    @Column(name = "requirement_type", nullable = false)
    private RequirementType requirementType;

    @Column(name = "min_years_exp")
    private Integer minYearsExp;
}
