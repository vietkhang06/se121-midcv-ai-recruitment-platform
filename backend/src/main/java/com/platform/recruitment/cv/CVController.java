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

    @PostMapping
    public ResponseEntity<ApiResponse<CVResponse>> createCV(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody CreateCVRequest request) {
        CVResponse response = cvService.createCV(currentUser, request);
        return new ResponseEntity<>(ApiResponse.success("CV created successfully", response), HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<CVResponse>>> getMyCVs(@AuthenticationPrincipal User currentUser) {
        List<CVResponse> response = cvService.getCandidateCVs(currentUser);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping(value = "/upload", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<CVResponse>> uploadCV(
            @AuthenticationPrincipal User currentUser,
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file,
            @RequestParam(value = "title", required = false) String title,
            @RequestParam(value = "targetIndustry", required = false) String targetIndustry,
            @RequestParam(value = "isDefault", required = false, defaultValue = "false") Boolean isDefault) {
        CVResponse response = cvService.uploadCV(currentUser, file, title, targetIndustry, isDefault);
        return new ResponseEntity<>(ApiResponse.success("CV uploaded successfully", response), HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CVResponse>> getCVById(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID id) {
        CVResponse response = cvService.getCVById(currentUser, id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteCV(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID id) {
        cvService.deleteCV(currentUser, id);
        return ResponseEntity.ok(ApiResponse.success("CV deleted successfully", null));
    }
}
