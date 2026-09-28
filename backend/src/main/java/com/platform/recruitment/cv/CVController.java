package com.platform.recruitment.cv;

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
@RequestMapping("/api/v1/candidate/cvs")
@RequiredArgsConstructor
public class CVController {

    private final CVService cvService;

    @PostMapping(consumes = org.springframework.http.MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ApiResponse<CVResponse>> createCV(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody CreateCVRequest request) {
        CVResponse response = cvService.createCV(currentUser, request);
        return new ResponseEntity<>(ApiResponse.success("CV created successfully", response), HttpStatus.CREATED);
    }

    @PostMapping(consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<CVUploadAsyncResponse>> uploadCVMultipart(
            @AuthenticationPrincipal User currentUser,
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file,
            @RequestParam(value = "title", required = false) String title,
            @RequestParam(value = "targetIndustry", required = false) String targetIndustry,
            @RequestParam(value = "isDefault", required = false, defaultValue = "false") Boolean isDefault) {
        CVUploadAsyncResponse response = cvService.uploadCVAsync(currentUser, file, title, targetIndustry, isDefault);
        return new ResponseEntity<>(ApiResponse.success("CV upload accepted for asynchronous processing", response), HttpStatus.ACCEPTED);
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<CVResponse>>> getMyCVs(@AuthenticationPrincipal User currentUser) {
        List<CVResponse> response = cvService.getCandidateCVs(currentUser);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping(value = "/upload", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<CVUploadAsyncResponse>> uploadCV(
            @AuthenticationPrincipal User currentUser,
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file,
            @RequestParam(value = "title", required = false) String title,
            @RequestParam(value = "targetIndustry", required = false) String targetIndustry,
            @RequestParam(value = "isDefault", required = false, defaultValue = "false") Boolean isDefault) {
        CVUploadAsyncResponse response = cvService.uploadCVAsync(currentUser, file, title, targetIndustry, isDefault);
        return new ResponseEntity<>(ApiResponse.success("CV upload accepted for asynchronous processing", response), HttpStatus.ACCEPTED);
    }

    @GetMapping("/{id}/processing-status")
    public ResponseEntity<ApiResponse<CVProcessingStatusResponse>> getProcessingStatus(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID id) {
        CVProcessingStatusResponse response = cvService.getProcessingStatus(currentUser, id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CVResponse>> getCVById(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID id) {
        CVResponse response = cvService.getCVById(currentUser, id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/{id}/review")
    public ResponseEntity<ApiResponse<CVReviewResponse>> getCVReview(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID id) {
        CVReviewResponse response = cvService.getCVReview(currentUser, id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/{id}/download/{format}")
    public ResponseEntity<byte[]> downloadCV(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID id,
            @PathVariable String format) {
        DownloadResult result = cvService.downloadCV(currentUser, id, format);
        return ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + result.filename() + "\"")
                .contentType(org.springframework.http.MediaType.parseMediaType(result.contentType()))
                .body(result.data());
    }

    @PostMapping("/{id}/retry")
    public ResponseEntity<ApiResponse<CVReviewResponse>> retryCV(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID id) {
        CVReviewResponse response = cvService.retryCVExtraction(currentUser, id);
        return ResponseEntity.ok(ApiResponse.success("CV extraction re-triggered successfully", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteCV(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID id) {
        cvService.deleteCV(currentUser, id);
        return ResponseEntity.ok(ApiResponse.success("CV deleted successfully", null));
    }

    @GetMapping("/{id}/draft")
    public ResponseEntity<ApiResponse<CVDraftResponse>> getCVDraft(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID id) {
        CVDraftResponse response = cvService.getCVDraft(currentUser, id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PutMapping("/{id}/draft")
    public ResponseEntity<ApiResponse<CVDraftResponse>> updateCVDraft(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID id,
            @RequestBody UpdateCVDraftRequest request) {
        CVDraftResponse response = cvService.updateCVDraft(currentUser, id, request);
        return ResponseEntity.ok(ApiResponse.success("CV draft updated successfully", response));
    }

    @PostMapping("/{id}/confirm")
    public ResponseEntity<ApiResponse<CVConfirmResponse>> confirmCV(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID id) {
        CVConfirmResponse response = cvService.confirmCV(currentUser, id);
        return ResponseEntity.ok(ApiResponse.success("CV profile confirmed successfully", response));
    }

    @GetMapping("/{id}/versions")
    public ResponseEntity<ApiResponse<List<CVVersionSummaryResponse>>> getCVVersions(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID id) {
        List<CVVersionSummaryResponse> response = cvService.getCVVersions(currentUser, id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
