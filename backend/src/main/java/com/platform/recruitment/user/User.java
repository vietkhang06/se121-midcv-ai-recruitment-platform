package com.platform.recruitment.user;

import com.platform.recruitment.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "users")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User extends BaseEntity {

    @Column(name = "email", nullable = false, unique = true)
    private String email;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    private Role role;

    @Builder.Default
    @Column(name = "is_active")
    private Boolean isActive = true;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(name = "account_status", nullable = false)
    private AccountStatus accountStatus = AccountStatus.ACTIVE;

    @Builder.Default
    @Column(name = "email_verified", nullable = false)
    private Boolean emailVerified = false;

    public void setAccountStatus(AccountStatus status) {
        this.accountStatus = status;
        this.isActive = (status == AccountStatus.ACTIVE);
    }

    public void setIsActive(Boolean active) {
        this.isActive = active;
        if (Boolean.FALSE.equals(active)) {
            if (this.accountStatus == AccountStatus.ACTIVE) {
                this.accountStatus = AccountStatus.DEACTIVATED;
            }
        } else if (Boolean.TRUE.equals(active)) {
            if (this.accountStatus != AccountStatus.SUSPENDED) {
                this.accountStatus = AccountStatus.ACTIVE;
            }
        }
    }

    public boolean isSuspended() {
        return this.accountStatus == AccountStatus.SUSPENDED;
    }

    public boolean isDeactivated() {
        return this.accountStatus == AccountStatus.DEACTIVATED;
    }

    public void suspend() {
        this.accountStatus = AccountStatus.SUSPENDED;
        this.isActive = false;
    }

    public void reactivate() {
        this.accountStatus = AccountStatus.ACTIVE;
        this.isActive = true;
    }

    public void deactivate() {
        this.accountStatus = AccountStatus.DEACTIVATED;
        this.isActive = false;
    }

    @PrePersist
    @PreUpdate
    public void syncAccountStatusAndIsActive() {
        if (this.accountStatus == null) {
            this.accountStatus = Boolean.FALSE.equals(this.isActive) ? AccountStatus.DEACTIVATED : AccountStatus.ACTIVE;
        }
        this.isActive = (this.accountStatus == AccountStatus.ACTIVE);
    }
}
