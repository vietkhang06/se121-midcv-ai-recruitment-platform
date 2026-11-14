package com.platform.recruitment.application;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/** Contact details from the immutable CV snapshot selected for this application. */
final class AppliedCvIdentity {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    final String fullName;
    final String email;
    final String phone;
    final String headline;
    final String githubUrl;

    private AppliedCvIdentity(String fullName, String email, String phone, String headline, String githubUrl) {
        this.fullName = fullName;
        this.email = email;
        this.phone = phone;
        this.headline = headline;
        this.githubUrl = githubUrl;
    }

    static AppliedCvIdentity fromSnapshot(ApplicationCVSnapshot snapshot) {
        if (snapshot == null || snapshot.getStructuredJsonSnapshot() == null) return empty();
        try {
            JsonNode root = MAPPER.readTree(snapshot.getStructuredJsonSnapshot());
            JsonNode info = root.path("personal_info");
            if (info.isMissingNode()) info = root.path("personalInfo");
            return new AppliedCvIdentity(
                    field(info, "fullName", "full_name"), field(info, "email"), field(info, "phone"),
                    field(info, "headline"), field(info, "githubUrl", "github_url"));
        } catch (Exception ignored) {
            return empty();
        }
    }

    private static String field(JsonNode info, String... keys) {
        for (String key : keys) {
            JsonNode value = info.path(key);
            if (value.isObject()) value = value.path("value");
            if (value.isTextual() && !value.asText().isBlank()) return value.asText().trim();
        }
        return null;
    }

    private static AppliedCvIdentity empty() {
        return new AppliedCvIdentity(null, null, null, null, null);
    }
}
