package com.platform.recruitment.github;

import com.platform.recruitment.candidate.CandidateProfile;
import com.platform.recruitment.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.ZonedDateTime;

@Entity
@Table(name = "github_profiles")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GitHubProfile extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidate_id", nullable = false, unique = true)
    private CandidateProfile candidate;

    @Column(name = "username", nullable = false)
    private String username;

    @Column(name = "github_url", nullable = false)
    private String githubUrl;

    @Builder.Default
    @Column(name = "public_repos_count")
    private Integer publicReposCount = 0;

    @Builder.Default
    @Column(name = "status")
    private String status = "SYNCED";

    @Enumerated(EnumType.STRING)
    @Column(name = "activity_signal")
    private GitHubActivitySignal activitySignal;

    @Column(name = "latest_activity_at")
    private ZonedDateTime latestActivityAt;

    @Builder.Default
    @Column(name = "observation_window_days")
    private Integer observationWindowDays = 180;

    @Column(name = "calculated_at")
    private ZonedDateTime calculatedAt;

    @Builder.Default
    @Column(name = "synced_at")
    private ZonedDateTime syncedAt = ZonedDateTime.now();
}
