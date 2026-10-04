package com.platform.recruitment.company;

import com.platform.recruitment.common.ApiResponse;
import com.platform.recruitment.company.dto.CompanyResponse;
import com.platform.recruitment.user.User;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class CompanyController {

    private final CompanyService companyService;

    @GetMapping("/recruiter/company")
    public ResponseEntity<ApiResponse<CompanyResponse>> getMyCompany(@AuthenticationPrincipal User currentUser) {
        CompanyResponse response = companyService.getMyCompany(currentUser);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PutMapping("/recruiter/company")
    public ResponseEntity<ApiResponse<CompanyResponse>> updateMyCompany(
            @AuthenticationPrincipal User currentUser,
            @RequestBody Company updateData) {
        CompanyResponse response = companyService.updateMyCompany(currentUser, updateData);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật thông tin doanh nghiệp thành công", response));
    }

    @PostMapping("/recruiter/company/submit-verification")
    public ResponseEntity<ApiResponse<CompanyResponse>> submitVerification(
            @AuthenticationPrincipal User currentUser,
            HttpServletRequest request) {
        CompanyResponse response = companyService.submitVerification(currentUser, request.getRemoteAddr());
        return ResponseEntity.ok(ApiResponse.success("Yêu cầu thẩm định doanh nghiệp đã được gửi đến ban quản trị", response));
    }
}
