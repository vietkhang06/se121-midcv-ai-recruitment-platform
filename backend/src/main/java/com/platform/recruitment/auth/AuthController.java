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

    @PostMapping("/register/candidate")
    public ResponseEntity<ApiResponse<JwtResponse>> registerCandidate(@Valid @RequestBody RegisterCandidateRequest request) {
        JwtResponse response = authService.registerCandidate(request);
        return new ResponseEntity<>(ApiResponse.success("Candidate registered successfully", response), HttpStatus.CREATED);
    }

    @PostMapping("/register/recruiter")
    public ResponseEntity<ApiResponse<JwtResponse>> registerRecruiter(@Valid @RequestBody RegisterRecruiterRequest request) {
        JwtResponse response = authService.registerRecruiter(request);
        return new ResponseEntity<>(ApiResponse.success("Recruiter registered successfully", response), HttpStatus.CREATED);
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<JwtResponse>> login(@Valid @RequestBody LoginRequest request) {
        JwtResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success("Login successful", response));
    }
}
