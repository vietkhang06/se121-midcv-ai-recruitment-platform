package com.platform.recruitment.suspension;

import com.platform.recruitment.common.BaseEntity;
import com.platform.recruitment.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(name = "suspension_appeals")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SuspensionAppeal extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "appellant_user_id", nullable = false)
    private User appellantUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "suspension_id")
    private SuspensionRecord suspension;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false)
    private SuspensionTargetType targetType;

    @Column(name = "target_id", nullable = false)
    private UUID targetId;

    @Column(name = "subject", nullable = false)
    private String subject;

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private AppealStatus status = AppealStatus.SUBMITTED;

    @Column(name = "evidence_attachment_id")
    private UUID evidenceAttachmentId;

    @Builder.Default
    @Column(name = "submitted_at", nullable = false)
    private ZonedDateTime submittedAt = ZonedDateTime.now();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by")
    private User reviewedBy;

    @Column(name = "reviewed_at")
    private ZonedDateTime reviewedAt;

    @Column(name = "resolution_note", columnDefinition = "TEXT")
    private String resolutionNote;
}
