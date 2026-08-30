package com.platform.recruitment.cv;

import com.platform.recruitment.candidate.CandidateProfile;
import com.platform.recruitment.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "cvs")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CV extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidate_id", nullable = false)
    private CandidateProfile candidate;

    @Column(name = "title", nullable = false)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(name = "creation_path", nullable = false)
    private CVCreationPath creationPath;

    @Column(name = "target_industry")
    private String targetIndustry;

    @Column(name = "file_name")
    private String fileName;

    @Column(name = "file_path")
    private String filePath;

    @Column(name = "file_type")
    private String fileType;

    @Column(name = "file_size")
    private Integer fileSize;

    @Builder.Default
    @Column(name = "status")
    private String status = "PENDING_PARSING";

    @Column(name = "raw_text", columnDefinition = "TEXT")
    private String rawText;

    @Builder.Default
    @Column(name = "is_default")
    private Boolean isDefault = false;
}
