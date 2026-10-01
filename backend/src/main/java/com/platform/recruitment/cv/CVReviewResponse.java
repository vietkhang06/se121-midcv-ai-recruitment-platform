package com.platform.recruitment.cv;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CVReviewResponse {

    private UUID cvId;
    private UUID versionId;
    private String title;
    private String fileName;
    private String fileType;
    private Integer fileSize;
    private String status;
    private String extractionMethod;
    private String rawText;
    private Map<String, Object> structured;
    private List<Map<String, Object>> evidences;
    private List<Map<String, Object>> unverifiedFacts;
    private List<String> warnings;
    private List<Map<String, Object>> pages;
    private ZonedDateTime createdAt;
}
