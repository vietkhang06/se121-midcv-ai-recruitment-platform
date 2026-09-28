package com.platform.recruitment.application;

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
public class ApplicationAuditLogResponse {
    private UUID id;
    private UUID applicationId;
    private UUID recruiterUserId;
    private ApplicationStatus previousStatus;
    private ApplicationStatus newStatus;
    private String decisionNote;
    private ZonedDateTime createdAt;
}
