package com.platform.recruitment.suspension;

import com.platform.recruitment.common.ApiResponse;
import com.platform.recruitment.common.PageResponse;
import com.platform.recruitment.suspension.dto.AppealResponse;
import com.platform.recruitment.suspension.dto.ReviewAppealRequest;
import com.platform.recruitment.user.User;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/appeals")
@RequiredArgsConstructor
public class AdminAppealController {

    private final SuspensionAppealService appealService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<AppealResponse>>> listAppeals(
            @RequestParam(required = false) AppealStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sort,
            @RequestParam(defaultValue = "desc") String direction) {

        Sort sortObj = direction.equalsIgnoreCase("asc")
                ? Sort.by(sort).ascending()
                : Sort.by(sort).descending();

        Page<AppealResponse> resultPage = appealService.listAppealsAdmin(status, PageRequest.of(page, size, sortObj));
        PageResponse<AppealResponse> pageResponse = PageResponse.of(resultPage, resultPage.getContent(), sort, direction);
        return ResponseEntity.ok(ApiResponse.success(pageResponse));
    }

    @PostMapping("/{id}/review")
    public ResponseEntity<ApiResponse<AppealResponse>> startReview(
            @AuthenticationPrincipal User admin,
            @PathVariable UUID id) {
        AppealResponse response = appealService.startReviewAdmin(admin, id);
        return ResponseEntity.ok(ApiResponse.success("Đã tiếp nhận hồ sơ khiếu nại để thẩm định.", response));
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<ApiResponse<AppealResponse>> approveAppeal(
            @AuthenticationPrincipal User admin,
            @PathVariable UUID id,
            @Valid @RequestBody ReviewAppealRequest request,
            HttpServletRequest servletRequest) {
        String ipAddress = servletRequest.getRemoteAddr();
        AppealResponse response = appealService.approveAppealAdmin(admin, id, request, ipAddress);
        return ResponseEntity.ok(ApiResponse.success("Đã chấp thuận khiếu nại và gỡ đình chỉ thành công.", response));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<ApiResponse<AppealResponse>> rejectAppeal(
            @AuthenticationPrincipal User admin,
            @PathVariable UUID id,
            @Valid @RequestBody ReviewAppealRequest request,
            HttpServletRequest servletRequest) {
        String ipAddress = servletRequest.getRemoteAddr();
        AppealResponse response = appealService.rejectAppealAdmin(admin, id, request, ipAddress);
        return ResponseEntity.ok(ApiResponse.success("Đã từ chối khiếu nại.", response));
    }
}
