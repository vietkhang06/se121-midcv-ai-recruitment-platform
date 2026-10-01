package com.platform.recruitment.cv;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

import java.util.List;
import java.util.Map;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateCVDraftRequest {

    private String title;

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

    @JsonProperty("structured_json")
    private Map<String, Object> structuredJson;
}
