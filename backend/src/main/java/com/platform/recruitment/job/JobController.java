package com.platform.recruitment.job;

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
public class JobController {

    private final JobService jobService;

    @GetMapping("/jobs")
    public ResponseEntity<ApiResponse<com.platform.recruitment.common.PageResponse<JobResponse>>> getPublishedJobs(
            @RequestParam(required = false) String industry,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sort,
            @RequestParam(defaultValue = "desc") String direction) {
        com.platform.recruitment.common.PageResponse<JobResponse> response =
                jobService.getPublishedJobs(industry, page, size, sort, direction);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/jobs/{id}")
    public ResponseEntity<ApiResponse<JobResponse>> getJobById(@PathVariable UUID id) {
        JobResponse response = jobService.getJobById(id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/recruiter/jobs")
    public ResponseEntity<ApiResponse<com.platform.recruitment.common.PageResponse<JobResponse>>> getRecruiterJobs(
            @AuthenticationPrincipal User currentUser,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sort,
            @RequestParam(defaultValue = "desc") String direction) {
        com.platform.recruitment.common.PageResponse<JobResponse> response =
                jobService.getRecruiterJobs(currentUser, page, size, sort, direction);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/jobs/draft")
    public ResponseEntity<ApiResponse<JobResponse>> createDraftJob(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody CreateJobRequest request) {
        JobResponse response = jobService.createDraftJob(currentUser, request);
        return new ResponseEntity<>(ApiResponse.success("Draft job created successfully", response), HttpStatus.CREATED);
    }

    @PostMapping("/jobs/{id}/publish")
    public ResponseEntity<ApiResponse<JobResponse>> publishJob(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID id) {
        JobResponse response = jobService.publishJob(currentUser, id);
        return ResponseEntity.ok(ApiResponse.success("Job published successfully", response));
    }

    @PostMapping("/jobs/{id}/close")
    public ResponseEntity<ApiResponse<JobResponse>> closeJob(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID id) {
        JobResponse response = jobService.closeJob(currentUser, id);
        return ResponseEntity.ok(ApiResponse.success("Job closed successfully", response));
    }

    @PutMapping("/jobs/{id}")
    public ResponseEntity<ApiResponse<JobResponse>> updateJob(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID id,
            @Valid @RequestBody CreateJobRequest request) {
        JobResponse response = jobService.updateJob(currentUser, id, request);
        return ResponseEntity.ok(ApiResponse.success("Job updated successfully", response));
    }
}
