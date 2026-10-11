package com.platform.recruitment.ai;

import com.platform.recruitment.candidate.CandidateProfile;
import com.platform.recruitment.candidate.CandidateProfileRepository;
import com.platform.recruitment.common.ApiResponse;
import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.ErrorCode;
import com.platform.recruitment.common.ResourceNotFoundException;
import com.platform.recruitment.user.User;
import com.platform.recruitment.worker.JobQueue;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/processing")
@RequiredArgsConstructor
public class AiProcessingController {

    private final ProcessingLifecycleService processingLifecycleService;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private JobQueue jobQueue;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private CandidateProfileRepository candidateProfileRepository;

    @PostMapping("/jobs/{jobId}")
    public ResponseEntity<ApiResponse<String>> triggerJdProcessing(@PathVariable UUID jobId) {
        processingLifecycleService.processJobDescription(jobId);
        return ResponseEntity.ok(ApiResponse.success("Job Description parsing lifecycle completed", "COMPLETED"));
    }

    /**
     * @deprecated Candidate CV processing is automatically handled via /api/v1/candidate/cvs/upload
     * and PipelineWorker in-process. This legacy endpoint is kept only for API compatibility.
     */
    @Deprecated
    @PostMapping("/cvs/{cvId}")
    public ResponseEntity<ApiResponse<String>> triggerCvProcessing(@PathVariable UUID cvId) {
        processingLifecycleService.processCvDocument(cvId);
        return ResponseEntity.ok(ApiResponse.success("CV Document parsing lifecycle completed", "COMPLETED"));
    }

    @PostMapping("/candidate/github")
    public ResponseEntity<ApiResponse<Map<String, Object>>> triggerGithubProcessing(@AuthenticationPrincipal User currentUser) {
        if (jobQueue != null && candidateProfileRepository != null) {
            CandidateProfile profile = candidateProfileRepository.findByUserId(currentUser.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("CandidateProfile", "userId", currentUser.getId()));

            if (profile.getGithubUrl() == null || profile.getGithubUrl().isBlank()) {
                throw new CustomException(ErrorCode.VALIDATION_ERROR, "Ứng viên chưa cấu hình URL GitHub.");
            }

            UUID jobId = jobQueue.enqueue(currentUser.getId(), "GITHUB_ANALYSIS", profile.getId());
            return ResponseEntity.ok(ApiResponse.success(
                    "Yêu cầu phân tích GitHub đã được đưa vào hàng đợi xử lý nền",
                    Map.of("jobId", jobId.toString(), "status", "QUEUED")
            ));
        }

        // Fallback for tests or environments where JobQueue is not wired
        processingLifecycleService.processCandidateGithub(currentUser.getId());
        return ResponseEntity.ok(ApiResponse.success(
                "Candidate GitHub analysis completed",
                Map.of("status", "COMPLETED")
        ));
    }
}
