package com.platform.recruitment.cv;

import com.platform.recruitment.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "cv_sections")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CVSection extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cv_version_id", nullable = false)
    private CVVersion cvVersion;

    @Column(name = "section_type", nullable = false)
    private String sectionType; // WORK_EXPERIENCE, EDUCATION, SKILLS, PROJECTS

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;
}
