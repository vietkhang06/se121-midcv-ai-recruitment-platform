package com.platform.recruitment.application;

import com.platform.recruitment.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.ZonedDateTime;

@Entity
@Table(name = "application_cv_snapshots")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApplicationCVSnapshot extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id", nullable = false, unique = true)
    private Application application;

    @Column(name = "cv_title", nullable = false)
    private String cvTitle;

    @Column(name = "raw_text_snapshot", nullable = false, columnDefinition = "TEXT")
    private String rawTextSnapshot;

    @Column(name = "structured_json_snapshot", nullable = false, columnDefinition = "TEXT")
    private String structuredJsonSnapshot;

    @Builder.Default
    @Column(name = "snapshot_created_at")
    private ZonedDateTime snapshotCreatedAt = ZonedDateTime.now();
}
