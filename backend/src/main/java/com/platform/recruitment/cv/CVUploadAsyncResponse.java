package com.platform.recruitment.cv;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CVUploadAsyncResponse {
    private UUID cvId;
    private UUID versionId;
    private UUID jobId;
    private String status;
    private String stage;
    private int progress;

    @JsonProperty("id")
    public UUID getId() {
        return cvId;
    }
}
