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
}
