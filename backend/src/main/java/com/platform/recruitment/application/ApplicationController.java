package com.platform.recruitment.application;

import com.platform.recruitment.common.ApiResponse;
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
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class ApplicationController {

    private final ApplicationService applicationService;

    @PostMapping("/candidate/applications")
    public ResponseEntity<ApiResponse<ApplicationResponse>> submitApplication(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody SubmitApplicationRequest request) {
        ApplicationResponse response = applicationService.submitApplication(currentUser, request);
        return new ResponseEntity<>(ApiResponse.success("Application submitted successfully", response), HttpStatus.CREATED);
    }

    @GetMapping("/candidate/applications")
    public ResponseEntity<ApiResponse<com.platform.recruitment.common.PageResponse<ApplicationResponse>>> getMyApplications(
            @AuthenticationPrincipal User currentUser,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sort,
            @RequestParam(defaultValue = "desc") String direction) {
        com.platform.recruitment.common.PageResponse<ApplicationResponse> response =
                applicationService.getCandidateApplications(currentUser, page, size, sort, direction);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/recruiter/jobs/{jobId}/applications")
    public ResponseEntity<ApiResponse<com.platform.recruitment.common.PageResponse<ApplicationResponse>>> getJobApplications(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID jobId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sort,
            @RequestParam(defaultValue = "desc") String direction) {
        com.platform.recruitment.common.PageResponse<ApplicationResponse> response =
                applicationService.getApplicationsForJob(currentUser, jobId, page, size, sort, direction);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/recruiter/jobs/{jobId}/applications/ranked")
    public ResponseEntity<ApiResponse<com.platform.recruitment.common.PageResponse<ApplicationResponse>>> getRankedJobApplications(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID jobId,
            @RequestParam(required = false) java.math.BigDecimal minScore,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sort,
            @RequestParam(defaultValue = "desc") String direction) {
        com.platform.recruitment.common.PageResponse<ApplicationResponse> response =
                applicationService.getRankedApplicationsForJob(currentUser, jobId, minScore, page, size, sort, direction);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/recruiter/applications/{applicationId}")
    public ResponseEntity<ApiResponse<ApplicationResponse>> getApplicationById(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID applicationId) {
        ApplicationResponse response = applicationService.getApplicationById(currentUser, applicationId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PutMapping("/recruiter/applications/{applicationId}/status")
    public ResponseEntity<ApiResponse<ApplicationResponse>> updateApplicationStatus(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID applicationId,
            @Valid @RequestBody UpdateApplicationStatusRequest request) {
        ApplicationResponse response = applicationService.updateApplicationStatus(currentUser, applicationId, request);
        return ResponseEntity.ok(ApiResponse.success("Application status updated successfully", response));
    }

    @GetMapping("/recruiter/applications/{applicationId}/audit-logs")
    public ResponseEntity<ApiResponse<com.platform.recruitment.common.PageResponse<ApplicationAuditLogResponse>>> getApplicationAuditLogs(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID applicationId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sort,
            @RequestParam(defaultValue = "desc") String direction) {
        com.platform.recruitment.common.PageResponse<ApplicationAuditLogResponse> response =
                applicationService.getApplicationAuditLogs(currentUser, applicationId, page, size, sort, direction);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
