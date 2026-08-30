package com.platform.recruitment.ai;

import com.platform.recruitment.common.ApiResponse;
import com.platform.recruitment.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/processing")
@RequiredArgsConstructor
public class AiProcessingController {

    private final ProcessingLifecycleService processingLifecycleService;

    @PostMapping("/jobs/{jobId}")
    public ResponseEntity<ApiResponse<String>> triggerJdProcessing(@PathVariable UUID jobId) {
        processingLifecycleService.processJobDescription(jobId);
        return ResponseEntity.ok(ApiResponse.success("Job Description parsing lifecycle completed", "COMPLETED"));
    }

    @PostMapping("/cvs/{cvId}")
    public ResponseEntity<ApiResponse<String>> triggerCvProcessing(@PathVariable UUID cvId) {
        processingLifecycleService.processCvDocument(cvId);
        return ResponseEntity.ok(ApiResponse.success("CV Document parsing lifecycle completed", "COMPLETED"));
    }

    @PostMapping("/candidate/github")
    public ResponseEntity<ApiResponse<String>> triggerGithubProcessing(@AuthenticationPrincipal User currentUser) {
        processingLifecycleService.processCandidateGithub(currentUser.getId());
        return ResponseEntity.ok(ApiResponse.success("Candidate GitHub analysis completed", "COMPLETED"));
    }
}
