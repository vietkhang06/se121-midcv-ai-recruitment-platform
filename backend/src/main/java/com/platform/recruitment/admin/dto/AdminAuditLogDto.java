package com.platform.recruitment.admin.dto;

import lombok.*;

import java.time.ZonedDateTime;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminAuditLogDto {
    private UUID id;
    private UUID adminId;
    private String adminEmail;
    private String action;
    private String targetType;
    private UUID targetId;
    private String previousState;
    private String newState;
    private String reason;
    private String ipAddress;
    private String correlationId;
    private ZonedDateTime createdAt;
}
