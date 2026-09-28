package com.platform.recruitment.cv;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CVDraftResponse {

    @JsonProperty("cv_id")
    private UUID cvId;

    @JsonProperty("profile_id")
    private UUID profileId;

    @JsonProperty("version_id")
    private UUID versionId;

    @JsonProperty("version_number")
    private Integer versionNumber;

    private String title;

    private String status;

    @JsonProperty("confirmed_at")
    private ZonedDateTime confirmedAt;

    @JsonProperty("personal_info")
    private Map<String, Object> personalInfo;

    private Map<String, Object> summary;

    private List<Map<String, Object>> skills;

    @JsonProperty("work_experience")
    private List<Map<String, Object>> workExperience;

    private List<Map<String, Object>> projects;

    private List<Map<String, Object>> education;

    private List<Map<String, Object>> certifications;

    private List<Map<String, Object>> languages;

    private Map<String, Object> links;

    @JsonProperty("raw_structured")
    private Map<String, Object> rawStructured;

    @JsonProperty("created_at")
    private ZonedDateTime createdAt;

    @JsonProperty("updated_at")
    private ZonedDateTime updatedAt;
}
