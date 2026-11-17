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

    @GetMapping("/recruiter/applications/{applicationId}/cv-pages")
    public ResponseEntity<ApiResponse<List<java.util.Map<String,Object>>>> getApplicationCvPages(
            @AuthenticationPrincipal User currentUser, @PathVariable UUID applicationId) {
        return ResponseEntity.ok(ApiResponse.success(applicationService.getApplicationSourcePages(currentUser, applicationId)));
    }

    @GetMapping("/recruiter/applications/{applicationId}/cv-pages/{pageOrder}")
    public ResponseEntity<byte[]> getApplicationCvPage(@AuthenticationPrincipal User currentUser,
            @PathVariable UUID applicationId, @PathVariable int pageOrder) {
        var result = applicationService.getApplicationSourcePage(currentUser, applicationId, pageOrder);
        return ResponseEntity.ok().header(org.springframework.http.HttpHeaders.CACHE_CONTROL, "private, no-store")
                .header("X-Content-Type-Options", "nosniff")
                .contentType(org.springframework.http.MediaType.parseMediaType(result.contentType())).body(result.data());
    }

    @PostMapping("/candidate/applications")
    public ResponseEntity<ApiResponse<ApplicationResponse>> submitApplication(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody SubmitApplicationRequest request) {
        ApplicationResponse response = applicationService.submitApplication(currentUser, request);
        return new ResponseEntity<>(ApiResponse.success("Application submitted successfully", response), HttpStatus.CREATED);
    }

    @PostMapping("/candidate/applications/match-preview")
    public ResponseEntity<ApiResponse<com.platform.recruitment.matching.MatchScoreResponse>> previewApplication(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody SubmitApplicationRequest request) {
        return ResponseEntity.ok(ApiResponse.success(applicationService.previewApplication(currentUser, request)));
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
