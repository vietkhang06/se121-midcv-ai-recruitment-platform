package com.platform.recruitment.candidate;

import com.platform.recruitment.common.ApiResponse;
import com.platform.recruitment.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/candidate/profile")
@RequiredArgsConstructor
public class CandidateController {

    private final CandidateService candidateService;

    @GetMapping
    public ResponseEntity<ApiResponse<CandidateProfile>> getMyProfile(@AuthenticationPrincipal User currentUser) {
        CandidateProfile profile = candidateService.getMyProfile(currentUser);
        return ResponseEntity.ok(ApiResponse.success(profile));
    }

    @PutMapping
    public ResponseEntity<ApiResponse<CandidateProfile>> updateProfile(
            @AuthenticationPrincipal User currentUser,
            @RequestBody CandidateProfile updateData) {
        CandidateProfile profile = candidateService.updateProfile(currentUser, updateData);
        return ResponseEntity.ok(ApiResponse.success("Profile updated successfully", profile));
    }
}
