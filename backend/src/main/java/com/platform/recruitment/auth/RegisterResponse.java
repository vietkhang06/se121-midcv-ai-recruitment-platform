package com.platform.recruitment.auth;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RegisterResponse {
    private String message;
    private String email;
    private boolean emailVerified;
    private String devVerificationToken;
}
