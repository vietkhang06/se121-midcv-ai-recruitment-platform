package com.platform.recruitment.admin;

import com.platform.recruitment.admin.dto.CompanyAdminDto;
import com.platform.recruitment.admin.dto.CompanyReviewRequest;
import com.platform.recruitment.common.ApiResponse;
import com.platform.recruitment.company.CompanyVerification;
import com.platform.recruitment.company.service.CompanyVerificationService;
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

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/companies")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminCompanyVerificationController {

    private final CompanyVerificationService companyVerificationService;

    @GetMapping
    public ResponseEntity<ApiResponse<com.platform.recruitment.common.PageResponse<CompanyAdminDto>>> listCompanies(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) CompanyVerification status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sort,
            @RequestParam(defaultValue = "desc") String direction) {
        Pageable pageable = com.platform.recruitment.common.PaginationUtils.createPageable(
                page, size, sort, direction, java.util.Set.of("createdAt", "name", "verificationStatus", "updatedAt"), "createdAt");
        Page<CompanyAdminDto> result = companyVerificationService.listCompanies(query, status, pageable);
        String sortField = (sort == null || sort.isBlank()) ? "createdAt" : sort;
        String sortDir = (direction == null || direction.isBlank()) ? "desc" : direction.toLowerCase();
        return ResponseEntity.ok(ApiResponse.success(com.platform.recruitment.common.PageResponse.of(result, sortField, sortDir)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CompanyAdminDto>> getCompanyDetail(@PathVariable UUID id) {
        CompanyAdminDto company = companyVerificationService.getCompanyDetail(id);
        return ResponseEntity.ok(ApiResponse.success(company));
    }

    @PostMapping("/{id}/transition")
    public ResponseEntity<ApiResponse<CompanyAdminDto>> transitionCompanyVerification(
            @AuthenticationPrincipal User adminUser,
            @PathVariable UUID id,
            @Valid @RequestBody CompanyReviewRequest request,
            HttpServletRequest servletRequest) {
        CompanyAdminDto updated = companyVerificationService.transitionVerification(
                adminUser,
                id,
                request.getStatus(),
                request.getReason(),
                request.getVersion(),
                servletRequest.getRemoteAddr()
        );
        return ResponseEntity.ok(ApiResponse.success("Cập nhật trạng thái thẩm định thành công", updated));
    }

    @PostMapping("/{id}/verification/start-review")
    public ResponseEntity<ApiResponse<CompanyAdminDto>> startReview(
            @AuthenticationPrincipal User adminUser,
            @PathVariable UUID id,
            @RequestBody(required = false) CompanyReviewRequest request,
            HttpServletRequest servletRequest) {
        String notes = request != null ? request.getReason() : null;
        Long version = request != null ? request.getVersion() : null;
        CompanyAdminDto updated = companyVerificationService.startReview(adminUser, id, notes, version, servletRequest.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.success("Bắt đầu thẩm định hồ sơ công ty", updated));
    }

    @PostMapping("/{id}/verification/approve")
    public ResponseEntity<ApiResponse<CompanyAdminDto>> approve(
            @AuthenticationPrincipal User adminUser,
            @PathVariable UUID id,
            @RequestBody(required = false) CompanyReviewRequest request,
            HttpServletRequest servletRequest) {
        String notes = request != null ? request.getReason() : "Hồ sơ công ty đạt chuẩn xác minh";
        Long version = request != null ? request.getVersion() : null;
        CompanyAdminDto updated = companyVerificationService.approve(adminUser, id, notes, version, servletRequest.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.success("Phê duyệt xác minh doanh nghiệp thành công", updated));
    }

    @PostMapping("/{id}/verification/request-changes")
    public ResponseEntity<ApiResponse<CompanyAdminDto>> requestChanges(
            @AuthenticationPrincipal User adminUser,
            @PathVariable UUID id,
            @Valid @RequestBody CompanyReviewRequest request,
            HttpServletRequest servletRequest) {
        Long version = request != null ? request.getVersion() : null;
        String reason = request != null ? request.getReason() : null;
        CompanyAdminDto updated = companyVerificationService.requestChanges(adminUser, id, reason, version, servletRequest.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.success("Đã gửi yêu cầu sửa đổi/bổ sung hồ sơ đến nhà tuyển dụng", updated));
    }

    @PostMapping("/{id}/verification/reject")
    public ResponseEntity<ApiResponse<CompanyAdminDto>> reject(
            @AuthenticationPrincipal User adminUser,
            @PathVariable UUID id,
            @Valid @RequestBody CompanyReviewRequest request,
            HttpServletRequest servletRequest) {
        Long version = request != null ? request.getVersion() : null;
        String reason = request != null ? request.getReason() : null;
        CompanyAdminDto updated = companyVerificationService.reject(adminUser, id, reason, version, servletRequest.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.success("Từ chối xác minh doanh nghiệp", updated));
    }

    @PostMapping("/{id}/verification/suspend")
    public ResponseEntity<ApiResponse<CompanyAdminDto>> suspend(
            @AuthenticationPrincipal User adminUser,
            @PathVariable UUID id,
            @Valid @RequestBody CompanyReviewRequest request,
            HttpServletRequest servletRequest) {
        Long version = request != null ? request.getVersion() : null;
        String reason = request != null ? request.getReason() : null;
        CompanyAdminDto updated = companyVerificationService.suspend(adminUser, id, reason, version, servletRequest.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.success("Đình chỉ hoạt động doanh nghiệp thành công", updated));
    }

    @PostMapping("/{id}/verification/restore")
    public ResponseEntity<ApiResponse<CompanyAdminDto>> restore(
            @AuthenticationPrincipal User adminUser,
            @PathVariable UUID id,
            @RequestBody(required = false) CompanyReviewRequest request,
            HttpServletRequest servletRequest) {
        String notes = request != null ? request.getReason() : "Khôi phục hoạt động doanh nghiệp";
        Long version = request != null ? request.getVersion() : null;
        CompanyAdminDto updated = companyVerificationService.restore(adminUser, id, notes, version, servletRequest.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.success("Khôi phục hoạt động doanh nghiệp thành công", updated));
    }

    /**
     * Legacy handler for backward compatibility with older clients.
     * Delegates directly to CompanyVerificationService.
     */
    @Deprecated
    @PutMapping("/{id}/verification")
    public ResponseEntity<ApiResponse<CompanyAdminDto>> updateVerificationLegacy(
            @AuthenticationPrincipal User adminUser,
            @PathVariable UUID id,
            @RequestParam CompanyVerification status,
            @RequestParam(required = false) String reason,
            HttpServletRequest servletRequest) {
        CompanyAdminDto updated = companyVerificationService.transitionVerification(
                adminUser,
                id,
                status,
                reason != null ? reason : "Cập nhật qua Admin API Legacy",
                null,
                servletRequest.getRemoteAddr()
        );
        return ResponseEntity.ok(ApiResponse.success("Cập nhật trạng thái thẩm định doanh nghiệp thành công", updated));
    }
}
