package com.platform.recruitment.cv;

import com.platform.recruitment.candidate.CandidateProfile;
import com.platform.recruitment.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "cv_evidence_attachments")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CVEvidenceAttachment extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidate_id", nullable = false)
    private CandidateProfile candidate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cv_id", nullable = false)
    private CV cv;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cv_version_id")
    private CVVersion cvVersion;

    @Column(name = "item_type", nullable = false, length = 50)
    private String itemType; // CERTIFICATION, LANGUAGE

    @Column(name = "item_id", nullable = false, length = 100)
    private String itemId;

    @Column(name = "file_name", nullable = false)
    private String fileName;

    @Column(name = "storage_key", nullable = false)
    private String storageKey;

    @Column(name = "file_type", nullable = false, length = 100)
    private String fileType;

    @Column(name = "file_size", nullable = false)
    private Integer fileSize;

    @Builder.Default
    @Column(name = "status", nullable = false, length = 50)
    private String status = "UNVERIFIED";
}
