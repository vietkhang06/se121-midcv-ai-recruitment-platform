package com.platform.recruitment.embedding;

import com.platform.recruitment.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "embeddings")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Embedding extends BaseEntity {

    @Column(name = "entity_type", nullable = false)
    private String entityType; // JOB, CV, GITHUB

    @Column(name = "entity_id", nullable = false)
    private UUID entityId;

    @Builder.Default
    @Column(name = "model_provider")
    private String modelProvider = "OPENAI";

    @Builder.Default
    @Column(name = "model_name")
    private String modelName = "text-embedding-3-small";

    @Builder.Default
    @Column(name = "model_version")
    private String modelVersion = "v1.0";

    @Builder.Default
    @Column(name = "dimension")
    private Integer dimension = 1536;

    @Builder.Default
    @Column(name = "status")
    private String status = "ACTIVE";
}
