package com.platform.recruitment.auth;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmailCheckResponse {
    private String email;
    private boolean exists;
    private String status; // "AVAILABLE" or "ALREADY_EXISTS"
}
