package com.platform.recruitment.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ResendVerificationRequest {
    @NotBlank(message = "Email must not be blank")
    @Email(message = "Invalid email syntax")
    private String email;
}
