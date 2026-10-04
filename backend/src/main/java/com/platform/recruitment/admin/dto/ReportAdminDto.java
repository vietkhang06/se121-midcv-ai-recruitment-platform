package com.platform.recruitment.admin.dto;

import com.platform.recruitment.admin.model.ReportStatus;
import com.platform.recruitment.admin.model.ReportTargetType;
import lombok.*;

import java.time.ZonedDateTime;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportAdminDto {
    private UUID id;
    private UUID reporterId;
    private String reporterEmail;
    private ReportTargetType targetType;
    private UUID targetId;
    private String targetTitle;
    private String reason;
    private String details;
    private ReportStatus status;
    private String resolutionNotes;
    private UUID resolvedById;
    private String resolvedByEmail;
    private ZonedDateTime resolvedAt;
    private ZonedDateTime createdAt;
}
