package com.platform.recruitment.matching;

import com.platform.recruitment.application.Application;
import com.platform.recruitment.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "match_results")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MatchResult extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id", nullable = false, unique = true)
    private Application application;

    @Column(name = "core_score", nullable = false, precision = 5, scale = 2)
    private BigDecimal coreScore;

    @Column(name = "github_score", precision = 5, scale = 2)
    private BigDecimal githubScore;

    @Column(name = "overall_score", nullable = false, precision = 5, scale = 2)
    private BigDecimal overallScore;

    @Builder.Default
    @Column(name = "core_weight", precision = 3, scale = 2)
    private BigDecimal coreWeight = new BigDecimal("0.85");

    @Builder.Default
    @Column(name = "github_weight", precision = 3, scale = 2)
    private BigDecimal githubWeight = new BigDecimal("0.15");

    @Builder.Default
    @Column(name = "is_github_active")
    private Boolean isGithubActive = true;

    @Builder.Default
    @Column(name = "github_fallback_applied")
    private Boolean githubFallbackApplied = false;

    @Column(name = "ai_summary", columnDefinition = "TEXT")
    private String aiSummary;
}
