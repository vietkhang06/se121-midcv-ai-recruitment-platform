package com.platform.recruitment.cv;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CvProcessingEvent {
    private String eventId;
    private UUID jobId;
    private String step;
    private String code;
    private String level;
    private int progress;
    private String message;
    private Long durationMs;
    private Instant timestamp;
}
