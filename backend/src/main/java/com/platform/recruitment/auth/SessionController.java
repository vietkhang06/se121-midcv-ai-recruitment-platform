package com.platform.recruitment.auth;

import com.platform.recruitment.common.ApiResponse;
import com.platform.recruitment.user.User;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class SessionController {
    private final AuthSessionService sessions;
    private final PasswordResetService resets;
    private final JwtTokenProvider tokens;
    public record RefreshRequest(@NotBlank String refreshToken) {}
    public record ForgotRequest(@NotBlank @Email String email) {}
    public record ResetRequest(@NotBlank String token, @NotBlank @Size(min=8,max=72) String password) {}

    @PostMapping("/refresh")
    public ApiResponse<JwtResponse> refresh(@Valid @RequestBody RefreshRequest request) { return ApiResponse.success(sessions.refresh(request.refreshToken())); }

    @GetMapping("/sessions") @PreAuthorize("isAuthenticated()")
    public ApiResponse<List<Map<String,Object>>> list(@AuthenticationPrincipal User user, @RequestHeader("Authorization") String authorization) {
        return ApiResponse.success(sessions.list(user.getId(), tokens.getSessionId(authorization.substring(7))));
    }
    @DeleteMapping("/sessions/{id}") @PreAuthorize("isAuthenticated()")
    public ApiResponse<Void> revoke(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        sessions.revoke(user.getId(),id); return ApiResponse.success("Phiên đã được thu hồi.",null);
    }
    @PostMapping("/logout") @PreAuthorize("isAuthenticated()")
    public ApiResponse<Void> logout(@AuthenticationPrincipal User user, @RequestHeader("Authorization") String authorization) {
        sessions.revoke(user.getId(), tokens.getSessionId(authorization.substring(7))); return ApiResponse.success("Đã đăng xuất.",null);
    }
    @PostMapping("/forgot-password")
    public ApiResponse<Void> forgot(@Valid @RequestBody ForgotRequest request) {
        resets.request(request.email()); return ApiResponse.success("Nếu email hợp lệ và đang hoạt động, liên kết đặt lại mật khẩu sẽ được gửi đến hộp thư.", null);
    }
    @PostMapping("/reset-password")
    public ApiResponse<Void> reset(@Valid @RequestBody ResetRequest request) {
        resets.reset(request.token(),request.password()); return ApiResponse.success("Mật khẩu đã được cập nhật. Hãy đăng nhập lại.",null);
    }
}
