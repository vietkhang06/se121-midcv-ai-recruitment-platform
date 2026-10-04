package com.platform.recruitment.suspension;

import com.platform.recruitment.common.ApiResponse;
import com.platform.recruitment.suspension.dto.AppealResponse;
import com.platform.recruitment.suspension.dto.CreateAppealRequest;
import com.platform.recruitment.user.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/recruiter/appeals")
@RequiredArgsConstructor
public class RecruiterAppealController {

    private final SuspensionAppealService appealService;

    @PostMapping
    public ResponseEntity<ApiResponse<AppealResponse>> submitAppeal(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody CreateAppealRequest request) {
        AppealResponse response = appealService.submitAppeal(currentUser, request);
        return new ResponseEntity<>(
                ApiResponse.success("Khiếu nại đình chỉ đã được gửi thành công.", response),
                HttpStatus.CREATED
        );
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<AppealResponse>>> getMyAppeals(
            @AuthenticationPrincipal User currentUser) {
        List<AppealResponse> responses = appealService.getMyAppeals(currentUser);
        return ResponseEntity.ok(ApiResponse.success(responses));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<AppealResponse>> getAppealDetail(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID id) {
        AppealResponse response = appealService.getAppealById(currentUser, id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<AppealResponse>> cancelAppeal(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID id) {
        AppealResponse response = appealService.cancelAppeal(currentUser, id);
        return ResponseEntity.ok(ApiResponse.success("Khiếu nại đã được hủy.", response));
    }
}
