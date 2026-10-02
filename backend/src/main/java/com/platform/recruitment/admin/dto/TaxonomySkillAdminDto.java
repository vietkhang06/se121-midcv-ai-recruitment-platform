package com.platform.recruitment.admin.dto;

import lombok.*;

import java.util.List;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaxonomySkillAdminDto {
    private UUID id;
    private String canonicalName;
    private String normalizedName;
    private String category;
    private String description;
    private String source;
    private Boolean active;
    private List<String> aliases;
}
