package com.platform.recruitment.cv;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

import java.time.ZonedDateTime;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CVEvidenceAttachmentResponse {

    @JsonProperty("attachment_id")
    private UUID attachmentId;

    @JsonProperty("cv_id")
    private UUID cvId;

    @JsonProperty("item_type")
    private String itemType;

    @JsonProperty("item_id")
    private String itemId;

    @JsonProperty("file_name")
    private String fileName;

    @JsonProperty("file_size")
    private Integer fileSize;

    @JsonProperty("file_type")
    private String fileType;

    private String status;

    @JsonProperty("preview_url")
    private String previewUrl;

    @JsonProperty("created_at")
    private ZonedDateTime createdAt;
}
