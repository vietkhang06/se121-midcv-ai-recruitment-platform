package com.platform.recruitment.matching;

import com.platform.recruitment.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "evidences")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Evidence extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "match_result_id", nullable = false)
    private MatchResult matchResult;

    @Column(name = "source_type", nullable = false)
    private String sourceType; // CV, JD, GITHUB

    @Column(name = "source_id")
    private String sourceId;

    @Column(name = "section")
    private String section;

    @Column(name = "snippet", nullable = false, columnDefinition = "TEXT")
    private String snippet;

    @Column(name = "normalized_value", precision = 5, scale = 2)
    private BigDecimal normalizedValue;

    @Column(name = "requirement_id")
    private String requirementId;

    @Column(name = "requirement_text", columnDefinition = "TEXT")
    private String requirementText;

    @Column(name = "candidate_value", columnDefinition = "TEXT")
    private String candidateValue;

    @Builder.Default
    @Column(name = "match_status")
    private String matchStatus = "MATCH";

    @Column(name = "similarity_confidence", precision = 5, scale = 4)
    private BigDecimal similarityConfidence;

    @Builder.Default
    @Column(name = "validation_status")
    private String validationStatus = "VERIFIED";
}
