package com.platform.recruitment.github;

import com.platform.recruitment.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.ZonedDateTime;

@Entity
@Table(name = "github_assessments")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GitHubAssessment extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "github_profile_id", nullable = false, unique = true)
    private GitHubProfile githubProfile;

    @Column(name = "summary_notes", columnDefinition = "TEXT")
    private String summaryNotes;

    @Column(name = "language_rank_summary", columnDefinition = "TEXT")
    private String languageRankSummary;

    @Column(name = "overall_supporting_rating")
    private String overallSupportingRating;

    @Builder.Default
    @Column(name = "evaluated_at")
    private ZonedDateTime evaluatedAt = ZonedDateTime.now();
}
