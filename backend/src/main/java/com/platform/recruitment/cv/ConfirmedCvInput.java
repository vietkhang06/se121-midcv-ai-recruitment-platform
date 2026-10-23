package com.platform.recruitment.cv;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.ErrorCode;
import java.util.Set;
import java.util.UUID;

/** Builds scoring text from reviewed fields only; provenance/raw extraction and personal PII are excluded. */
public final class ConfirmedCvInput {
    private ConfirmedCvInput() {}

    public static void requireConfirmed(CVVersion version, UUID candidateId) {
        if (version == null || !"CONFIRMED".equalsIgnoreCase(version.getStatus())
                || version.getCv() == null || version.getCv().getCandidate() == null
                || !version.getCv().getCandidate().getId().equals(candidateId)) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR,
                    "A CONFIRMED CV version owned by the candidate is required; DRAFT or other states cannot be matched");
        }
        if (text(version).isBlank()) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR, "Confirmed CV has no professional content");
        }
    }

    public static String text(CVVersion version) {
        if (version == null || version.getStructuredJsonContent() == null) return "";
        try {
            JsonNode root = new ObjectMapper().readTree(version.getStructuredJsonContent());
            if (!root.isObject()) return "";
            StringBuilder out = new StringBuilder();
            for (String section : new String[]{"summary", "skills", "work_experience", "experience", "experiences",
                    "projects", "education", "educations", "certifications", "languages"}) {
                append(root.path(section), out);
            }
            return out.toString().strip();
        } catch (Exception e) {
            throw new CustomException(ErrorCode.VALIDATION_ERROR, "CV structured JSON is invalid");
        }
    }

    private static final Set<String> IGNORED = Set.of("id", "origin", "source", "evidence", "raw_structured",
            "warnings", "attachment", "attachment_id", "attachmentId", "url", "verificationStatus", "status");

    private static void append(JsonNode node, StringBuilder out) {
        if (node.isNull() || node.isMissingNode()) return;
        if (node.isObject()) {
            if (node.has("value")) { append(node.get("value"), out); return; }
            node.fields().forEachRemaining(e -> { if (!IGNORED.contains(e.getKey())) append(e.getValue(), out); });
        } else if (node.isArray()) {
            node.forEach(n -> append(n, out));
        } else if (node.isTextual() || node.isNumber()) {
            String text = node.asText().replaceAll("<[^>]*>", " ").strip();
            if (!text.isBlank()) out.append(text).append('\n');
        }
    }
}
