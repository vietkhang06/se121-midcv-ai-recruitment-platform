package com.platform.recruitment.github;

import com.platform.recruitment.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "github_repository_topics")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GitHubRepositoryTopic extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "repository_id", nullable = false)
    private GitHubRepository repository;

    @Column(name = "topic_name", nullable = false)
    private String topicName;
}
