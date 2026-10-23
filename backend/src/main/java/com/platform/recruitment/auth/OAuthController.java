package com.platform.recruitment.auth;

import com.platform.recruitment.common.ApiResponse;
import com.platform.recruitment.user.User;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Email;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/auth/oauth")
@RequiredArgsConstructor
public class OAuthController {
    private final OAuthService oauthService;

    @GetMapping("/{provider}/start")
    public ResponseEntity<Void> start(@PathVariable String provider, @RequestParam(required = false) String next) {
        return ResponseEntity.status(302).header("Location", oauthService.authorizationUrl(provider, next, null)).build();
    }

    @PostMapping("/{provider}/link")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Map<String, String>>> link(@AuthenticationPrincipal User user, @PathVariable String provider) {
        String url = oauthService.authorizationUrl(provider, "/candidate/profile", user);
        return ResponseEntity.ok(ApiResponse.success("Tiếp tục xác nhận liên kết với nhà cung cấp.", Map.of("authorizationUrl", url)));
    }

    @GetMapping("/github/connection")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Map<String, Object>>> githubConnection(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(ApiResponse.success("Trạng thái liên kết GitHub.", oauthService.githubConnection(user.getId())));
    }

    @GetMapping("/{provider}/callback")
    public void callback(@PathVariable String provider,
                         @RequestParam(required = false) String state,
                         @RequestParam(required = false) String code,
                         @RequestParam(required = false) String error,
                         jakarta.servlet.http.HttpServletResponse response) throws IOException {
        try { response.sendRedirect(oauthService.redirectFor(oauthService.callback(provider, state, code, error))); }
        catch (OAuthFlowException ex) { response.sendRedirect(oauthService.errorRedirect(ex.getReason())); }
        catch (Exception ex) { response.sendRedirect(oauthService.errorRedirect("provider_error")); }
    }

    @PostMapping("/exchange")
    public ResponseEntity<ApiResponse<JwtResponse>> exchange(@Valid @RequestBody TicketRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Đăng nhập thành công.", oauthService.redeem(request.ticket())));
    }

    @PostMapping("/complete")
    public ResponseEntity<ApiResponse<Map<String, String>>> complete(@Valid @RequestBody CompletionRequest request) {
        oauthService.completeGithubRegistration(request.ticket(), request.email());
        return ResponseEntity.ok(ApiResponse.success("Đăng ký đã tạo. Hãy xác minh email từ hộp thư trước khi đăng nhập.", Map.of("email", request.email(), "status", "EMAIL_VERIFICATION_REQUIRED")));
    }

    @ExceptionHandler(OAuthFlowException.class)
    public ResponseEntity<ApiResponse<Void>> handleOAuthFlowError(OAuthFlowException exception) {
        return ResponseEntity.badRequest().body(ApiResponse.error(com.platform.recruitment.common.ErrorCode.VALIDATION_ERROR, exception.getMessage(), null));
    }

    public record TicketRequest(@NotBlank String ticket) {}
    public record CompletionRequest(@NotBlank String ticket, @NotBlank @Email String email) {}
}
