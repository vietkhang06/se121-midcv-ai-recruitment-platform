package com.platform.recruitment.admin.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateTaxonomySkillRequest {
    @NotBlank(message = "Tên kỹ năng chuẩn không được để trống")
    private String canonicalName;

    @NotBlank(message = "Danh mục kỹ năng không được để trống")
    private String category;

    private String description;

    private List<String> aliases;
}
