package com.platform.recruitment.candidate;

import com.platform.recruitment.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "candidate_languages")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CandidateLanguage extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidate_id", nullable = false)
    private CandidateProfile candidate;

    @Column(name = "language_name", nullable = false)
    private String languageName;

    @Builder.Default
    @Column(name = "proficiency_level")
    private String proficiencyLevel = "INTERMEDIATE";
}
