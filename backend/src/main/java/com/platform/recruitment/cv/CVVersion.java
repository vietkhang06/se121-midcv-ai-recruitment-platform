package com.platform.recruitment.cv;

import com.platform.recruitment.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "cv_versions")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CVVersion extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cv_id", nullable = false)
    private CV cv;

    @Column(name = "version_number", nullable = false)
    private Integer versionNumber;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "raw_text_content", columnDefinition = "TEXT")
    private String rawTextContent;

    @Column(name = "structured_json_content", columnDefinition = "TEXT")
    private String structuredJsonContent;
}
