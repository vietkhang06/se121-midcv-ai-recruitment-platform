package com.platform.recruitment;

import com.platform.recruitment.suspension.*;
import com.platform.recruitment.user.AccountStatus;
import com.platform.recruitment.user.Role;
import com.platform.recruitment.user.User;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class AccountAndSuspensionDomainTest {

    @Test
    @DisplayName("User status synchronization and lifecycle state transitions")
    void testUserStatusSynchronization() {
        User user = User.builder()
                .email("test@example.com")
                .passwordHash("hashed")
                .role(Role.HR)
                .accountStatus(AccountStatus.ACTIVE)
                .build();

        user.syncAccountStatusAndIsActive();
        assertThat(user.getAccountStatus()).isEqualTo(AccountStatus.ACTIVE);
        assertThat(user.getIsActive()).isTrue();
        assertThat(user.isSuspended()).isFalse();

        // Suspend
        user.suspend();
        assertThat(user.getAccountStatus()).isEqualTo(AccountStatus.SUSPENDED);
        assertThat(user.getIsActive()).isFalse();
        assertThat(user.isSuspended()).isTrue();

        // Reactivate
        user.reactivate();
        assertThat(user.getAccountStatus()).isEqualTo(AccountStatus.ACTIVE);
        assertThat(user.getIsActive()).isTrue();
        assertThat(user.isSuspended()).isFalse();

        // Deactivate
        user.deactivate();
        assertThat(user.getAccountStatus()).isEqualTo(AccountStatus.DEACTIVATED);
        assertThat(user.getIsActive()).isFalse();
        assertThat(user.isDeactivated()).isTrue();
    }

    @Test
    @DisplayName("SuspensionRecord and SuspensionAppeal entities instantiation")
    void testSuspensionEntities() {
        User user = User.builder()
                .email("recruiter@example.com")
                .role(Role.HR)
                .accountStatus(AccountStatus.SUSPENDED)
                .build();

        User admin = User.builder()
                .email("admin@example.com")
                .role(Role.ADMIN)
                .accountStatus(AccountStatus.ACTIVE)
                .build();

        UUID companyId = UUID.randomUUID();

        SuspensionRecord record = SuspensionRecord.builder()
                .targetType(SuspensionTargetType.COMPANY)
                .targetId(companyId)
                .reasonCode("POLICY_VIOLATION")
                .reasonText("Spamming fake job postings")
                .suspendedBy(admin)
                .status(SuspensionStatus.ACTIVE)
                .build();

        assertThat(record.getTargetType()).isEqualTo(SuspensionTargetType.COMPANY);
        assertThat(record.getStatus()).isEqualTo(SuspensionStatus.ACTIVE);
        assertThat(record.getSuspendedBy().getEmail()).isEqualTo("admin@example.com");

        SuspensionAppeal appeal = SuspensionAppeal.builder()
                .appellantUser(user)
                .suspension(record)
                .targetType(SuspensionTargetType.COMPANY)
                .targetId(companyId)
                .subject("Khiếu nại khóa doanh nghiệp nhầm lẫn")
                .content("Doanh nghiệp của tôi có giấy phép kinh doanh đầy đủ.")
                .status(AppealStatus.SUBMITTED)
                .build();

        assertThat(appeal.getStatus()).isEqualTo(AppealStatus.SUBMITTED);
        assertThat(appeal.getAppellantUser().getEmail()).isEqualTo("recruiter@example.com");
        assertThat(appeal.getSuspension()).isEqualTo(record);
    }
}
