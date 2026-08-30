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
@RequestMapping("/api/v1/jobs")
@RequiredArgsConstructor
public class JobController {

    private final JobService jobService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<JobResponse>>> getPublishedJobs(@RequestParam(required = false) String industry) {
        List<JobResponse> response = jobService.getPublishedJobs(industry);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<JobResponse>> getJobById(@PathVariable UUID id) {
        JobResponse response = jobService.getJobById(id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/draft")
    public ResponseEntity<ApiResponse<JobResponse>> createDraftJob(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody CreateJobRequest request) {
        JobResponse response = jobService.createDraftJob(currentUser, request);
        return new ResponseEntity<>(ApiResponse.success("Draft job created successfully", response), HttpStatus.CREATED);
    }

    @PostMapping("/{id}/publish")
    public ResponseEntity<ApiResponse<JobResponse>> publishJob(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID id) {
        JobResponse response = jobService.publishJob(currentUser, id);
        return ResponseEntity.ok(ApiResponse.success("Job published successfully", response));
    }
}
