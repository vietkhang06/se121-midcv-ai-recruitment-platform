package com.platform.recruitment.github;

import com.platform.recruitment.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "github_repository_languages")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GitHubRepositoryLanguage extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "repository_id", nullable = false)
    private GitHubRepository repository;

    @Column(name = "language_name", nullable = false)
    private String languageName;

    @Builder.Default
    @Column(name = "bytes_count")
    private Long bytesCount = 0L;

    @Builder.Default
    @Column(name = "percentage_ratio", precision = 5, scale = 2)
    private BigDecimal percentageRatio = BigDecimal.ZERO;
}
