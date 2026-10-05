package com.platform.recruitment.suspension.dto;

import com.platform.recruitment.suspension.SuspensionRecord;
import com.platform.recruitment.suspension.SuspensionStatus;
import com.platform.recruitment.suspension.SuspensionTargetType;
import lombok.*;

import java.time.ZonedDateTime;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SuspensionNoticeResponse {
    private UUID id;
    private SuspensionTargetType targetType;
    private UUID targetId;
    private String reasonCode;
    private String reasonText;
    private ZonedDateTime suspendedAt;
    private ZonedDateTime expiresAt;
    private SuspensionStatus status;
    private boolean hasActiveAppeal;
    private String companyName;

    public static SuspensionNoticeResponse fromEntity(SuspensionRecord record, boolean hasActiveAppeal, String companyName) {
        if (record == null) return null;
        return SuspensionNoticeResponse.builder()
                .id(record.getId())
                .targetType(record.getTargetType())
                .targetId(record.getTargetId())
                .reasonCode(record.getReasonCode())
                .reasonText(record.getReasonText())
                .suspendedAt(record.getSuspendedAt())
                .expiresAt(record.getExpiresAt())
                .status(record.getStatus())
                .hasActiveAppeal(hasActiveAppeal)
                .companyName(companyName)
                .build();
    }
}
