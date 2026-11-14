package com.platform.recruitment;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.platform.recruitment.application.Application;
import com.platform.recruitment.cv.CV;
import com.platform.recruitment.cv.CVVersion;

import java.time.ZonedDateTime;
import java.util.Map;
import java.util.UUID;

/** Synthetic candidate-reviewed structured CV input for matching unit tests. */
final class ConfirmedCvFixture {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private ConfirmedCvFixture() {}

    static CVVersion version(CV cv, String reviewedSummary) {
        if (reviewedSummary == null || reviewedSummary.isBlank()) {
            throw new IllegalArgumentException("A reviewed professional summary is required for matching fixtures");
        }
        String structuredContent;
        try {
            structuredContent = MAPPER.writeValueAsString(Map.of(
                    "summary", Map.of("value", reviewedSummary, "source", "USER_CONFIRMED")));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Could not serialize the confirmed CV fixture", e);
        }
        CVVersion version = CVVersion.builder()
                .cv(cv)
                .versionNumber(1)
                .title(cv.getTitle() == null ? "Reviewed CV" : cv.getTitle())
                .structuredJsonContent(structuredContent)
                .status("CONFIRMED")
                .confirmedAt(ZonedDateTime.now())
                .build();
        version.setId(UUID.randomUUID());
        return version;
    }

    static void attach(Application application, CV cv, String reviewedSummary) {
        CVVersion version = version(cv, reviewedSummary);
        application.setAppliedCv(cv);
        application.setAppliedCvVersion(version);
    }
}
