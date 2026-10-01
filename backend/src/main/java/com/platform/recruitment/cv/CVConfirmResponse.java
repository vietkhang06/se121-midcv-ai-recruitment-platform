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
public class CVConfirmResponse {

    @JsonProperty("cv_id")
    private UUID cvId;

    @JsonProperty("profile_id")
    private UUID profileId;

    private String status;

    @JsonProperty("confirmed_at")
    private ZonedDateTime confirmedAt;
}
