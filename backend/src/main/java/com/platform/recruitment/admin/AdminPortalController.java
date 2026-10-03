package com.platform.recruitment.admin;

import com.platform.recruitment.admin.dto.*;
import com.platform.recruitment.admin.model.ReportStatus;
import com.platform.recruitment.admin.model.ReportTargetType;
import com.platform.recruitment.admin.service.AdminService;
import com.platform.recruitment.common.ApiResponse;
import com.platform.recruitment.company.CompanyVerification;
import com.platform.recruitment.job.JobStatus;
import com.platform.recruitment.user.User;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminPortalController {

    private final AdminService adminService;

    // ==========================================
    // 1. DASHBOARD
    // ==========================================
    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<AdminDashboardStatsDto>> getDashboardStats() {
        AdminDashboardStatsDto stats = adminService.getDashboardStats();
        return ResponseEntity.ok(ApiResponse.success("Thống kê bảng điều khiển quản trị", stats));
    }

    // ==========================================
    // 2. CANDIDATE & RECRUITER MODERATION
    // ==========================================
    @GetMapping("/candidates")
    public ResponseEntity<ApiResponse<Page<UserAdminDto>>> listCandidates(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<UserAdminDto> candidates = adminService.listCandidates(query, isActive, pageable);
        return ResponseEntity.ok(ApiResponse.success(candidates));
    }

    @GetMapping("/recruiters")
    public ResponseEntity<ApiResponse<Page<UserAdminDto>>> listRecruiters(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<UserAdminDto> recruiters = adminService.listRecruiters(query, isActive, pageable);
        return ResponseEntity.ok(ApiResponse.success(recruiters));
    }

    @PostMapping("/users/{id}/suspend")
    public ResponseEntity<ApiResponse<Void>> suspendUser(
            @AuthenticationPrincipal User adminUser,
            @PathVariable UUID id,
            @RequestBody(required = false) UserModerationRequest request,
            HttpServletRequest servletRequest) {
        String reason = (request != null && request.getReason() != null) ? request.getReason() : "Đình chỉ bởi Quản trị viên";
        adminService.suspendUser(adminUser, id, reason, servletRequest.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.success("Đình chỉ tài khoản thành công", null));
    }

    @PostMapping("/users/{id}/reactivate")
    public ResponseEntity<ApiResponse<Void>> reactivateUser(
            @AuthenticationPrincipal User adminUser,
            @PathVariable UUID id,
            @RequestBody(required = false) UserModerationRequest request,
            HttpServletRequest servletRequest) {
        String reason = (request != null && request.getReason() != null) ? request.getReason() : "Kích hoạt lại bởi Quản trị viên";
        adminService.reactivateUser(adminUser, id, reason, servletRequest.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.success("Kích hoạt lại tài khoản thành công", null));
    }

    // ==========================================
    // 4. JOB MODERATION
    // ==========================================
    @GetMapping("/jobs")
    public ResponseEntity<ApiResponse<Page<JobAdminDto>>> listJobs(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) JobStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<JobAdminDto> jobs = adminService.listJobs(query, status, pageable);
        return ResponseEntity.ok(ApiResponse.success(jobs));
    }

    @PostMapping("/jobs/{id}/suspend")
    public ResponseEntity<ApiResponse<Void>> suspendJob(
            @AuthenticationPrincipal User adminUser,
            @PathVariable UUID id,
            @RequestBody(required = false) JobModerationRequest request,
            HttpServletRequest servletRequest) {
        String reason = (request != null && request.getReason() != null) ? request.getReason() : "Đình chỉ tin tuyển dụng do vi phạm tiêu chuẩn cộng đồng";
        adminService.suspendJob(adminUser, id, reason, servletRequest.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.success("Đình chỉ tin tuyển dụng thành công", null));
    }

    @PostMapping("/jobs/{id}/restore")
    public ResponseEntity<ApiResponse<Void>> restoreJob(
            @AuthenticationPrincipal User adminUser,
            @PathVariable UUID id,
            HttpServletRequest servletRequest) {
        adminService.restoreJob(adminUser, id, servletRequest.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.success("Khôi phục tin tuyển dụng thành công", null));
    }

    // ==========================================
    // 5. REPORTS MODERATION
    // ==========================================
    @GetMapping("/reports")
    public ResponseEntity<ApiResponse<Page<ReportAdminDto>>> listReports(
            @RequestParam(required = false) ReportStatus status,
            @RequestParam(required = false) ReportTargetType targetType,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<ReportAdminDto> reports = adminService.listReports(status, targetType, pageable);
        return ResponseEntity.ok(ApiResponse.success(reports));
    }

    @PostMapping("/reports/{id}/resolve")
    public ResponseEntity<ApiResponse<Void>> resolveReport(
            @AuthenticationPrincipal User adminUser,
            @PathVariable UUID id,
            @RequestBody(required = false) ResolveReportRequest request,
            HttpServletRequest servletRequest) {
        String notes = (request != null && request.getResolutionNotes() != null) ? request.getResolutionNotes() : "Đã xử lý";
        adminService.resolveReport(adminUser, id, notes, servletRequest.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.success("Đã xử lý báo cáo vi phạm", null));
    }

    @PostMapping("/reports/{id}/dismiss")
    public ResponseEntity<ApiResponse<Void>> dismissReport(
            @AuthenticationPrincipal User adminUser,
            @PathVariable UUID id,
            @RequestBody(required = false) ResolveReportRequest request,
            HttpServletRequest servletRequest) {
        String notes = (request != null && request.getResolutionNotes() != null) ? request.getResolutionNotes() : "Bác bỏ báo cáo";
        adminService.dismissReport(adminUser, id, notes, servletRequest.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.success("Đã bác bỏ báo cáo vi phạm", null));
    }

    // ==========================================
    // 6. TAXONOMY MANAGEMENT
    // ==========================================
    @GetMapping("/taxonomy/skills")
    public ResponseEntity<ApiResponse<Map<String, Object>>> listTaxonomySkills(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) Boolean active,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Map<String, Object> data = adminService.listTaxonomySkills(query, active, page, size);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @PostMapping("/taxonomy/skills")
    public ResponseEntity<ApiResponse<UUID>> createTaxonomySkill(
            @AuthenticationPrincipal User adminUser,
            @Valid @RequestBody CreateTaxonomySkillRequest request,
            HttpServletRequest servletRequest) {
        UUID skillId = adminService.createTaxonomySkill(adminUser, request, servletRequest.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.success("Tạo mới kỹ năng taxonomy thành công", skillId));
    }

    @PutMapping("/taxonomy/skills/{id}/toggle")
    public ResponseEntity<ApiResponse<Boolean>> toggleTaxonomySkill(
            @AuthenticationPrincipal User adminUser,
            @PathVariable UUID id,
            HttpServletRequest servletRequest) {
        boolean nextActive = adminService.toggleTaxonomySkill(adminUser, id, servletRequest.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.success("Cập nhật trạng thái kỹ năng thành công", nextActive));
    }

    // ==========================================
    // 7. AUDIT LOGS
    // ==========================================
    @GetMapping("/audit-logs")
    public ResponseEntity<ApiResponse<Page<AdminAuditLogDto>>> listAuditLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<AdminAuditLogDto> logs = adminService.listAuditLogs(pageable);
        return ResponseEntity.ok(ApiResponse.success(logs));
    }
}
