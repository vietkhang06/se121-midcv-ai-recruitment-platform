package com.platform.recruitment.user;

import com.platform.recruitment.common.ApiResponse;
import com.platform.recruitment.common.UnauthorizedAccessException;
import com.platform.recruitment.user.dto.DeactivateAccountRequest;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/account")
@RequiredArgsConstructor
public class AccountController {

    private final AccountService accountService;

    @PostMapping("/deactivate")
    public ResponseEntity<ApiResponse<Void>> deactivateAccount(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody DeactivateAccountRequest request,
            HttpServletRequest servletRequest) {
        if (currentUser == null) {
            throw new UnauthorizedAccessException("Vui lòng đăng nhập để tiếp tục.");
        }
        accountService.selfDeactivate(currentUser, request, servletRequest.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.success("Vô hiệu hóa tài khoản thành công. Phiên đăng nhập đã kết thúc.", null));
    }
}
