package com.platform.recruitment.user.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeactivateAccountRequest {

    @NotBlank(message = "Mật khẩu xác nhận không được để trống")
    private String password;

    private String reason;
}
