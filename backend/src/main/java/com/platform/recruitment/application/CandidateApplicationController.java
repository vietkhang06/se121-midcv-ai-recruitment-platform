package com.platform.recruitment.application;

import com.platform.recruitment.ai.AiWorkerClient;
import com.platform.recruitment.common.ApiResponse;
import com.platform.recruitment.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/candidate/applications/{applicationId}")
@RequiredArgsConstructor
public class CandidateApplicationController {
    private final CandidateApplicationService service;
    private final AiWorkerClient worker;

    @GetMapping
    public ResponseEntity<ApiResponse<CandidateApplicationService.Detail>> detail(
            @AuthenticationPrincipal User user, @PathVariable UUID applicationId) {
        return privateResponse(service.detail(user, applicationId));
    }

    @GetMapping("/history")
    public ResponseEntity<ApiResponse<CandidateApplicationService.History>> history(
            @AuthenticationPrincipal User user, @PathVariable UUID applicationId,
            @RequestParam(defaultValue = "0") int page) {
        return privateResponse(service.history(user, applicationId, page));
    }

    @GetMapping("/skill-gap")
    public ResponseEntity<ApiResponse<Map<String, Object>>> skillGap(
            @AuthenticationPrincipal User user, @PathVariable UUID applicationId,
            @RequestParam(defaultValue = "vi") String locale) {
        var input = new java.util.HashMap<>(service.skillGapRequest(user, applicationId));
        input.put("locale", "en".equals(locale) ? "en" : "vi");
        return privateResponse(worker.skillGap(input));
    }

    private static <T> ResponseEntity<ApiResponse<T>> privateResponse(T data) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(ApiResponse.success(data));
    }
}
