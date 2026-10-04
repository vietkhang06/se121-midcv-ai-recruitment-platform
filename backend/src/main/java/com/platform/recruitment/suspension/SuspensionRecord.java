package com.platform.recruitment.suspension;

import com.platform.recruitment.common.BaseEntity;
import com.platform.recruitment.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(name = "suspension_records")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SuspensionRecord extends BaseEntity {

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false)
    private SuspensionTargetType targetType;

    @Column(name = "target_id", nullable = false)
    private UUID targetId;

    @Builder.Default
    @Column(name = "reason_code", nullable = false)
    private String reasonCode = "POLICY_VIOLATION";

    @Column(name = "reason_text", nullable = false, columnDefinition = "TEXT")
    private String reasonText;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "suspended_by")
    private User suspendedBy;

    @Builder.Default
    @Column(name = "suspended_at", nullable = false)
    private ZonedDateTime suspendedAt = ZonedDateTime.now();

    @Column(name = "expires_at")
    private ZonedDateTime expiresAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lifted_by")
    private User liftedBy;

    @Column(name = "lifted_at")
    private ZonedDateTime liftedAt;

    @Column(name = "resolution_note", columnDefinition = "TEXT")
    private String resolutionNote;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private SuspensionStatus status = SuspensionStatus.ACTIVE;
}
