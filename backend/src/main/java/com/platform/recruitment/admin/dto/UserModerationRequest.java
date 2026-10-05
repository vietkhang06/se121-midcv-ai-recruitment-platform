package com.platform.recruitment.admin.dto;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserModerationRequest {
    private String reason;
}
