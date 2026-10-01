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
    public ResponseEntity<ApiResponse<List<ApplicationResponse>>> getMyApplications(
            @AuthenticationPrincipal User currentUser) {
        List<ApplicationResponse> response = applicationService.getCandidateApplications(currentUser);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/recruiter/jobs/{jobId}/applications")
    public ResponseEntity<ApiResponse<List<ApplicationResponse>>> getJobApplications(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID jobId) {
        List<ApplicationResponse> response = applicationService.getApplicationsForJob(currentUser, jobId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/recruiter/jobs/{jobId}/applications/ranked")
    public ResponseEntity<ApiResponse<List<ApplicationResponse>>> getRankedJobApplications(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID jobId,
            @RequestParam(required = false) java.math.BigDecimal minScore) {
        List<ApplicationResponse> response = applicationService.getRankedApplicationsForJob(currentUser, jobId, minScore);
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
    public ResponseEntity<ApiResponse<List<ApplicationAuditLogResponse>>> getApplicationAuditLogs(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID applicationId) {
        List<ApplicationAuditLogResponse> response = applicationService.getApplicationAuditLogs(currentUser, applicationId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
