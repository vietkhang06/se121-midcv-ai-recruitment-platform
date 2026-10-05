package com.platform.recruitment.admin.dto;

import lombok.*;

import java.util.List;
import java.util.Map;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminDashboardStatsDto {
    private long totalUsers;
    private long candidatesCount;
    private long recruitersCount;
    private long activeUsersCount;
    private long suspendedUsersCount;

    private long companiesPendingCount;
    private long companiesUnderReviewCount;
    private long companiesVerifiedCount;
    private long companiesRejectedCount;
    private long companiesSuspendedCount;

    private long activeJobsCount;
    private long suspendedJobsCount;

    private long pendingReportsCount;

    private List<AdminAuditLogDto> recentAuditLogs;
    private Map<String, Object> aiStatus;
}
