package com.platform.recruitment.suspension.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateAppealRequest {

    @NotBlank(message = "Tiêu đề khiếu nại không được để trống")
    @Size(max = 255, message = "Tiêu đề khiếu nại tối đa 255 ký tự")
    private String subject;

    @NotBlank(message = "Nội dung khiếu nại không được để trống")
    private String content;

    private UUID evidenceAttachmentId;
}
