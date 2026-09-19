package com.platform.recruitment.cv;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.ZonedDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CVResponse {

    private UUID id;
    private UUID candidateId;
    private String title;
    private CVCreationPath creationPath;
    private String targetIndustry;
    private String fileName;
    private String filePath;
    private String fileType;
    private Integer fileSize;
    private String status;
    private String rawText;
    private Boolean isDefault;
    private UUID jobId;
    private UUID documentVersionId;
    private ZonedDateTime createdAt;
}
