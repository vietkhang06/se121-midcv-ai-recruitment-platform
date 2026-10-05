package com.platform.recruitment.admin.dto;

import com.platform.recruitment.user.Role;
import lombok.*;

import java.time.ZonedDateTime;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserAdminDto {
    private UUID id;
    private String email;
    private Role role;
    private Boolean isActive;
    private com.platform.recruitment.user.AccountStatus accountStatus;
    private Boolean emailVerified;
    private String fullName;
    private String phone;
    private ZonedDateTime createdAt;

    // Specific to Candidate
    private String targetIndustry;
    private String headline;
    private String githubUrl;
    private int cvCount;
    private int applicationCount;

    // Specific to Recruiter
    private UUID companyId;
    private String companyName;
    private String companyVerificationStatus;
    private String companyOperationalStatus;
}
