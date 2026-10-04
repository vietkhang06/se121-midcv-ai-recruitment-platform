package com.platform.recruitment.admin.dto;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobModerationRequest {
    private String reason;
}
