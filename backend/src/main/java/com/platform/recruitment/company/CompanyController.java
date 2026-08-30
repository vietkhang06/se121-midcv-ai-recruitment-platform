package com.platform.recruitment.company;

import com.platform.recruitment.common.ApiResponse;
import com.platform.recruitment.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class CompanyController {

    private final CompanyService companyService;

    @GetMapping("/recruiter/company")
    public ResponseEntity<ApiResponse<Company>> getMyCompany(@AuthenticationPrincipal User currentUser) {
        Company company = companyService.getMyCompany(currentUser);
        return ResponseEntity.ok(ApiResponse.success(company));
    }

    @PutMapping("/admin/companies/{id}/verification")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Company>> updateVerificationStatus(
            @PathVariable UUID id,
            @RequestParam CompanyVerification status) {
        Company company = companyService.updateVerificationStatus(id, status);
        return ResponseEntity.ok(ApiResponse.success("Company verification status updated successfully", company));
    }
}
