package com.platform.recruitment.auth;

import com.platform.recruitment.common.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @GetMapping("/check-email")
    public ResponseEntity<ApiResponse<EmailCheckResponse>> checkEmail(@RequestParam String email) {
        EmailCheckResponse response = authService.checkEmail(email);
        return ResponseEntity.ok(ApiResponse.success("Email status checked", response));
    }

    @PostMapping("/register/candidate")
    public ResponseEntity<ApiResponse<RegisterResponse>> registerCandidate(@Valid @RequestBody RegisterCandidateRequest request) {
        RegisterResponse response = authService.registerCandidate(request);
        return new ResponseEntity<>(ApiResponse.success("Candidate registered. Please verify your email.", response), HttpStatus.CREATED);
    }

    @PostMapping("/register/recruiter")
    public ResponseEntity<ApiResponse<RegisterResponse>> registerRecruiter(@Valid @RequestBody RegisterRecruiterRequest request) {
        RegisterResponse response = authService.registerRecruiter(request);
        return new ResponseEntity<>(ApiResponse.success("Recruiter registered. Please verify your email.", response), HttpStatus.CREATED);
    }

    @PostMapping("/verify-email")
    public ResponseEntity<ApiResponse<String>> verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
        String message = authService.verifyEmail(request.getToken());
        return ResponseEntity.ok(ApiResponse.success(message, message));
    }

    @PostMapping("/resend-verification")
    public ResponseEntity<ApiResponse<String>> resendVerification(@Valid @RequestBody ResendVerificationRequest request) {
        String message = authService.resendVerification(request.getEmail());
        return ResponseEntity.ok(ApiResponse.success(message, message));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<JwtResponse>> login(@Valid @RequestBody LoginRequest request) {
        JwtResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success("Login successful", response));
    }
}
