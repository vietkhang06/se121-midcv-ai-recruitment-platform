package com.platform.recruitment.github;

import com.platform.recruitment.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.ZonedDateTime;

@Entity
@Table(name = "github_repositories")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GitHubRepository extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "github_profile_id", nullable = false)
    private GitHubProfile githubProfile;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "repo_url", nullable = false)
    private String repoUrl;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "primary_language")
    private String primaryLanguage;

    @Builder.Default
    @Column(name = "stars_count")
    private Integer starsCount = 0;

    @Builder.Default
    @Column(name = "forks_count")
    private Integer forksCount = 0;

    @Builder.Default
    @Column(name = "is_archived")
    private Boolean isArchived = false;

    @Column(name = "updated_at_github")
    private ZonedDateTime updatedAtGithub;
}
