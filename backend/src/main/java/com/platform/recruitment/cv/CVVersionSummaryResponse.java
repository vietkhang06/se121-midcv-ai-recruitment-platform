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
public class CVVersionSummaryResponse {

    @JsonProperty("version_id")
    private UUID versionId;

    @JsonProperty("version_number")
    private Integer versionNumber;

    private String title;

    private String status;

    @JsonProperty("confirmed_at")
    private ZonedDateTime confirmedAt;

    @JsonProperty("created_at")
    private ZonedDateTime createdAt;
}
