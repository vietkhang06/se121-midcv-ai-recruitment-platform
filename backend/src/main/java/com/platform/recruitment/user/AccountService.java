package com.platform.recruitment.user;

import com.platform.recruitment.admin.service.AdminAuditLogService;
import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.ErrorCode;
import com.platform.recruitment.common.ResourceNotFoundException;
import com.platform.recruitment.user.dto.DeactivateAccountRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AccountService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AdminAuditLogService adminAuditLogService;
    private final com.platform.recruitment.suspension.SuspensionRecordRepository suspensionRecordRepository;

    @Transactional
    public void selfDeactivate(User currentUser, DeactivateAccountRequest request, String ipAddress) {
        User user = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUser.getId()));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new CustomException(ErrorCode.AUTHENTICATION_FAILED, "Mật khẩu xác nhận không chính xác.");
        }

        if (user.getRole() == Role.ADMIN) {
            long activeAdmins = userRepository.countByRoleAndIsActive(Role.ADMIN, true);
            if (activeAdmins <= 1 && user.getAccountStatus() == AccountStatus.ACTIVE) {
                throw new CustomException(ErrorCode.ACCESS_DENIED, "Không thể tự vô hiệu hóa tài khoản quản trị viên duy nhất còn lại.");
            }
        }

        user.setAccountStatus(AccountStatus.DEACTIVATED);
        userRepository.save(user);

        adminAuditLogService.log(
                user,
                "USER_SELF_DEACTIVATED",
                "USER",
                user.getId(),
                "ACTIVE",
                "DEACTIVATED",
                request.getReason() != null ? request.getReason().trim() : "Người dùng tự vô hiệu hóa tài khoản",
                ipAddress,
                null
        );

        log.info("User {} self-deactivated their account.", user.getId());
    }

    @Transactional
    public void restoreAccount(User adminUser, UUID targetUserId, String resolutionNote, String ipAddress) {
        User targetUser = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", targetUserId));

        if (suspensionRecordRepository.existsByTargetTypeAndTargetIdAndStatus(
                com.platform.recruitment.suspension.SuspensionTargetType.USER,
                targetUserId,
                com.platform.recruitment.suspension.SuspensionStatus.ACTIVE)) {
            throw new CustomException(ErrorCode.ACCOUNT_SUSPENDED,
                    "Tài khoản đang có lệnh đình chỉ hiệu lực, không thể khôi phục tự do.");
        }

        AccountStatus prev = targetUser.getAccountStatus();
        targetUser.setAccountStatus(AccountStatus.ACTIVE);
        userRepository.save(targetUser);

        adminAuditLogService.log(
                adminUser,
                "USER_RESTORED_BY_ADMIN",
                "USER",
                targetUserId,
                prev != null ? prev.name() : "DEACTIVATED",
                "ACTIVE",
                resolutionNote != null ? resolutionNote.trim() : "Quản trị viên khôi phục tài khoản",
                ipAddress,
                null
        );

        log.info("Admin {} restored account for user {}.", adminUser.getId(), targetUserId);
    }
}
