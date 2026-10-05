package com.platform.recruitment.suspension;

import com.platform.recruitment.common.ApiResponse;
import com.platform.recruitment.common.UnauthorizedAccessException;
import com.platform.recruitment.company.RecruiterProfile;
import com.platform.recruitment.company.RecruiterProfileRepository;
import com.platform.recruitment.suspension.dto.SuspensionNoticeResponse;
import com.platform.recruitment.user.Role;
import com.platform.recruitment.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Optional;

@RestController
@RequestMapping("/api/v1/suspensions")
@RequiredArgsConstructor
public class SuspensionNoticeController {

    private final SuspensionService suspensionService;
    private final SuspensionAppealRepository appealRepository;
    private final RecruiterProfileRepository recruiterProfileRepository;

    @GetMapping("/my-active")
    public ResponseEntity<ApiResponse<SuspensionNoticeResponse>> getMyActiveSuspension(
            @AuthenticationPrincipal User currentUser) {
        if (currentUser == null) {
            throw new UnauthorizedAccessException("Vui lòng đăng nhập để tiếp tục.");
        }

        SuspensionRecord activeRecord = null;
        String companyName = null;
        boolean hasActiveAppeal = false;

        // 1. Check direct user suspension
        if (currentUser.isSuspended()) {
            activeRecord = suspensionService.getActiveSuspension(SuspensionTargetType.USER, currentUser.getId()).orElse(null);
            if (activeRecord != null) {
                hasActiveAppeal = appealRepository.existsByTargetTypeAndTargetIdAndStatusIn(
                        SuspensionTargetType.USER,
                        currentUser.getId(),
                        java.util.List.of(AppealStatus.SUBMITTED, AppealStatus.UNDER_REVIEW)
                );
            }
        }

        // 2. If user not directly suspended, check if HR company is suspended
        if (activeRecord == null && currentUser.getRole() == Role.HR) {
            Optional<RecruiterProfile> profileOpt = recruiterProfileRepository.findByUserId(currentUser.getId());
            if (profileOpt.isPresent() && profileOpt.get().getCompany() != null) {
                var company = profileOpt.get().getCompany();
                if (company.isSuspended()) {
                    activeRecord = suspensionService.getActiveSuspension(SuspensionTargetType.COMPANY, company.getId()).orElse(null);
                    companyName = company.getName();
                    if (activeRecord != null) {
                        hasActiveAppeal = appealRepository.existsByTargetTypeAndTargetIdAndStatusIn(
                                SuspensionTargetType.COMPANY,
                                company.getId(),
                                java.util.List.of(AppealStatus.SUBMITTED, AppealStatus.UNDER_REVIEW)
                        );
                    }
                }
            }
        }

        if (activeRecord == null) {
            return ResponseEntity.ok(ApiResponse.success("Không có lệnh đình chỉ hiệu lực", null));
        }

        return ResponseEntity.ok(ApiResponse.success(
                "Thông tin đình chỉ",
                SuspensionNoticeResponse.fromEntity(activeRecord, hasActiveAppeal, companyName)
        ));
    }
}
