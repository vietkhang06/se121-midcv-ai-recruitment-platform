package com.platform.recruitment;

import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.ErrorCode;
import com.platform.recruitment.common.ResourceNotFoundException;
import com.platform.recruitment.suspension.SuspensionRecordRepository;
import com.platform.recruitment.suspension.SuspensionStatus;
import com.platform.recruitment.suspension.SuspensionTargetType;
import com.platform.recruitment.user.AccountService;
import com.platform.recruitment.user.AccountStatus;
import com.platform.recruitment.user.Role;
import com.platform.recruitment.user.User;
import com.platform.recruitment.user.UserRepository;
import com.platform.recruitment.user.dto.DeactivateAccountRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AccountLifecycleIntegrationTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private com.platform.recruitment.admin.service.AdminAuditLogService adminAuditLogService;

    @Mock
    private SuspensionRecordRepository suspensionRecordRepository;

    private AccountService accountService;

    private User candidateUser;
    private User adminUser;

    @BeforeEach
    void setUp() {
        accountService = new AccountService(
                userRepository,
                passwordEncoder,
                adminAuditLogService,
                suspensionRecordRepository
        );

        candidateUser = User.builder()
                .email("candidate@example.com")
                .passwordHash("$2a$10$hashedCandidatePassword")
                .role(Role.CANDIDATE)
                .accountStatus(AccountStatus.ACTIVE)
                .isActive(true)
                .build();
        candidateUser.setId(UUID.randomUUID());

        adminUser = User.builder()
                .email("admin@platform.com")
                .passwordHash("$2a$10$hashedAdminPassword")
                .role(Role.ADMIN)
                .accountStatus(AccountStatus.ACTIVE)
                .isActive(true)
                .build();
        adminUser.setId(UUID.randomUUID());
    }

    @Test
    @DisplayName("Self-deactivation succeeds with correct password, setting DEACTIVATED and isActive=false")
    void testSelfDeactivate_Success() {
        DeactivateAccountRequest request = new DeactivateAccountRequest();
        request.setPassword("correctPassword123");
        request.setReason("Không còn nhu cầu tìm việc");

        when(userRepository.findById(candidateUser.getId())).thenReturn(Optional.of(candidateUser));
        when(passwordEncoder.matches("correctPassword123", candidateUser.getPasswordHash())).thenReturn(true);
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        accountService.selfDeactivate(candidateUser, request, "127.0.0.1");

        assertThat(candidateUser.getAccountStatus()).isEqualTo(AccountStatus.DEACTIVATED);
        assertThat(candidateUser.getIsActive()).isFalse();
        assertThat(candidateUser.isDeactivated()).isTrue();
        verify(userRepository, times(1)).save(candidateUser);
    }

    @Test
    @DisplayName("Self-deactivation fails if confirmation password does not match")
    void testSelfDeactivate_WrongPassword_ThrowsException() {
        DeactivateAccountRequest request = new DeactivateAccountRequest();
        request.setPassword("wrongPassword");

        when(userRepository.findById(candidateUser.getId())).thenReturn(Optional.of(candidateUser));
        when(passwordEncoder.matches("wrongPassword", candidateUser.getPasswordHash())).thenReturn(false);

        assertThatThrownBy(() -> accountService.selfDeactivate(candidateUser, request, "127.0.0.1"))
                .isInstanceOf(CustomException.class)
                .satisfies(ex -> {
                    CustomException ce = (CustomException) ex;
                    assertThat(ce.getErrorCode()).isEqualTo(ErrorCode.AUTHENTICATION_FAILED);
                });

        assertThat(candidateUser.getAccountStatus()).isEqualTo(AccountStatus.ACTIVE);
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Self-deactivation is blocked for the last remaining active Admin")
    void testSelfDeactivate_LastAdmin_Blocked() {
        DeactivateAccountRequest request = new DeactivateAccountRequest();
        request.setPassword("adminSecret");

        when(userRepository.findById(adminUser.getId())).thenReturn(Optional.of(adminUser));
        when(passwordEncoder.matches("adminSecret", adminUser.getPasswordHash())).thenReturn(true);
        when(userRepository.countByRoleAndIsActive(Role.ADMIN, true)).thenReturn(1L);

        assertThatThrownBy(() -> accountService.selfDeactivate(adminUser, request, "127.0.0.1"))
                .isInstanceOf(CustomException.class)
                .satisfies(ex -> {
                    CustomException ce = (CustomException) ex;
                    assertThat(ce.getErrorCode()).isEqualTo(ErrorCode.ACCESS_DENIED);
                });

        assertThat(adminUser.getAccountStatus()).isEqualTo(AccountStatus.ACTIVE);
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Admin restores deactivated account back to ACTIVE")
    void testRestoreAccount_Success() {
        candidateUser.setAccountStatus(AccountStatus.DEACTIVATED);

        when(userRepository.findById(candidateUser.getId())).thenReturn(Optional.of(candidateUser));
        when(suspensionRecordRepository.existsByTargetTypeAndTargetIdAndStatus(
                SuspensionTargetType.USER, candidateUser.getId(), SuspensionStatus.ACTIVE))
                .thenReturn(false);

        accountService.restoreAccount(adminUser, candidateUser.getId(), "Người dùng gửi yêu cầu mở khóa tài khoản", "127.0.0.1");

        assertThat(candidateUser.getAccountStatus()).isEqualTo(AccountStatus.ACTIVE);
        assertThat(candidateUser.getIsActive()).isTrue();
        verify(userRepository, times(1)).save(candidateUser);
    }

    @Test
    @DisplayName("Admin restore is blocked if account has an active suspension")
    void testRestoreAccount_BlockedIfActiveSuspensionExists() {
        candidateUser.setAccountStatus(AccountStatus.DEACTIVATED);

        when(userRepository.findById(candidateUser.getId())).thenReturn(Optional.of(candidateUser));
        when(suspensionRecordRepository.existsByTargetTypeAndTargetIdAndStatus(
                SuspensionTargetType.USER, candidateUser.getId(), SuspensionStatus.ACTIVE))
                .thenReturn(true);

        assertThatThrownBy(() -> accountService.restoreAccount(adminUser, candidateUser.getId(), "Mở lại", "127.0.0.1"))
                .isInstanceOf(CustomException.class)
                .satisfies(ex -> {
                    CustomException ce = (CustomException) ex;
                    assertThat(ce.getErrorCode()).isEqualTo(ErrorCode.ACCOUNT_SUSPENDED);
                });

        assertThat(candidateUser.getAccountStatus()).isEqualTo(AccountStatus.DEACTIVATED);
        verify(userRepository, never()).save(any());
    }
}
