package com.platform.recruitment.matching;

import com.platform.recruitment.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "match_factors")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MatchFactor extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "match_result_id", nullable = false)
    private MatchResult matchResult;

    @Column(name = "source_type", nullable = false)
    private String sourceType; // CV, GITHUB, JD

    @Column(name = "factor_type", nullable = false)
    private String factorType; // REQUIRED_SKILL, EXP_YEARS, GH_LANG_MATCH, GH_ACTIVITY

    @Column(name = "factor_name", nullable = false)
    private String factorName;

    @Column(name = "raw_value", columnDefinition = "TEXT")
    private String rawValue;

    @Column(name = "normalized_value", precision = 5, scale = 2)
    private BigDecimal normalizedValue;

    @Column(name = "weight", nullable = false, precision = 4, scale = 3)
    private BigDecimal weight;

    @Column(name = "configured_weight", precision = 5, scale = 4)
    private BigDecimal configuredWeight;

    @Column(name = "effective_weight", precision = 5, scale = 4)
    private BigDecimal effectiveWeight;

    @Column(name = "weighted_contribution", precision = 6, scale = 2)
    private BigDecimal weightedContribution;

    @Column(name = "score", nullable = false, precision = 5, scale = 2)
    private BigDecimal score;

    @Builder.Default
    @Column(name = "status", nullable = false)
    private String status = "AVAILABLE";

    @Column(name = "calculation_method")
    private String calculationMethod;

    @Column(name = "evidence_reference", columnDefinition = "TEXT")
    private String evidenceReference;

    @Builder.Default
    @Column(name = "algorithm_version")
    private String algorithmVersion = "v2.0";
}
