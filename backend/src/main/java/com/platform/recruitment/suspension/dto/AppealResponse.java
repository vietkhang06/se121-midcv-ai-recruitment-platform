package com.platform.recruitment.suspension.dto;

import com.platform.recruitment.suspension.AppealStatus;
import com.platform.recruitment.suspension.SuspensionAppeal;
import com.platform.recruitment.suspension.SuspensionTargetType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.ZonedDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AppealResponse {
    private UUID id;
    private UUID appellantUserId;
    private String appellantEmail;
    private UUID suspensionId;
    private SuspensionTargetType targetType;
    private UUID targetId;
    private String subject;
    private String content;
    private AppealStatus status;
    private UUID evidenceAttachmentId;
    private ZonedDateTime submittedAt;
    private UUID reviewedBy;
    private String reviewerEmail;
    private ZonedDateTime reviewedAt;
    private String resolutionNote;
    private ZonedDateTime createdAt;

    public static AppealResponse fromEntity(SuspensionAppeal entity) {
        if (entity == null) {
            return null;
        }
        return AppealResponse.builder()
                .id(entity.getId())
                .appellantUserId(entity.getAppellantUser() != null ? entity.getAppellantUser().getId() : null)
                .appellantEmail(entity.getAppellantUser() != null ? entity.getAppellantUser().getEmail() : null)
                .suspensionId(entity.getSuspension() != null ? entity.getSuspension().getId() : null)
                .targetType(entity.getTargetType())
                .targetId(entity.getTargetId())
                .subject(entity.getSubject())
                .content(entity.getContent())
                .status(entity.getStatus())
                .evidenceAttachmentId(entity.getEvidenceAttachmentId())
                .submittedAt(entity.getSubmittedAt())
                .reviewedBy(entity.getReviewedBy() != null ? entity.getReviewedBy().getId() : null)
                .reviewerEmail(entity.getReviewedBy() != null ? entity.getReviewedBy().getEmail() : null)
                .reviewedAt(entity.getReviewedAt())
                .resolutionNote(entity.getResolutionNote())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
