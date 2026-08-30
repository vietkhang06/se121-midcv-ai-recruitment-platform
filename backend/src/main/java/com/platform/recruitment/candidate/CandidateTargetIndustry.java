package com.platform.recruitment.candidate;

import com.platform.recruitment.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "candidate_target_industries")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CandidateTargetIndustry extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidate_id", nullable = false)
    private CandidateProfile candidate;

    @Column(name = "industry_name", nullable = false)
    private String industryName;

    @Builder.Default
    @Column(name = "is_primary")
    private Boolean isPrimary = false;
}
