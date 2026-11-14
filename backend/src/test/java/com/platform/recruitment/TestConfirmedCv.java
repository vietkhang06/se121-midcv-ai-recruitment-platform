package com.platform.recruitment;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.platform.recruitment.application.Application;
import com.platform.recruitment.cv.CV;
import com.platform.recruitment.cv.CVVersion;
import java.time.ZonedDateTime;
import java.util.Map;
import java.util.UUID;

/** Creates the immutable, candidate-confirmed CV input required by production matching. */
final class TestConfirmedCv {
    private static final ObjectMapper JSON = new ObjectMapper();

    private TestConfirmedCv() {}

    static CVVersion attach(Application application, CV cv) {
        if (application == null || cv == null || cv.getCandidate() == null) {
            throw new IllegalArgumentException("Application and candidate-owned CV are required");
        }
        if (application.getCandidate() == null
                || !cv.getCandidate().getId().equals(application.getCandidate().getId())) {
            throw new IllegalArgumentException("The fixture CV must belong to the application candidate");
        }
        String professionalText = cv.getRawText() == null ? "" : cv.getRawText().strip();
        CVVersion version = CVVersion.builder()
                .cv(cv)
                .versionNumber(1)
                .title(cv.getTitle() == null ? "Confirmed test CV" : cv.getTitle())
                .rawTextContent(professionalText)
                .structuredJsonContent(structured(professionalText))
                .status("CONFIRMED")
                .confirmedAt(ZonedDateTime.now())
                .build();
        version.setId(UUID.randomUUID());
        cv.setStatus("CONFIRMED");
        application.setAppliedCv(cv);
        application.setAppliedCvVersion(version);
        return version;
    }

    private static String structured(String professionalText) {
        try {
            return JSON.writeValueAsString(Map.of("summary", professionalText));
        } catch (JsonProcessingException impossible) {
            throw new IllegalStateException("Unable to build confirmed CV fixture", impossible);
        }
    }
}
