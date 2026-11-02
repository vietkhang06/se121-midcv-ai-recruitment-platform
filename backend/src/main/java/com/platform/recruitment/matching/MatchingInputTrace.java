package com.platform.recruitment.matching;

import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.*;
import com.platform.recruitment.cv.CVVersion;
import com.platform.recruitment.job.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;

/** Input lineage lives beside the saved policy, without changing scoring or old records. */
public final class MatchingInputTrace {
    private static final ObjectMapper JSON = new ObjectMapper();
    private MatchingInputTrace() {}
    public static String hash(String text) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8))); }
        catch (java.security.NoSuchAlgorithmException ex) { throw new IllegalStateException(ex); }
    }
    public static String snapshot(String policy, CVVersion cv, String scoringText, Job job, List<JobRequirement> requirements) {
        try {
            ObjectNode root = policy == null ? JSON.createObjectNode() : (ObjectNode) JSON.readTree(policy);
            ObjectNode input = root.putObject("input_context");
            input.put("cv_version_id", cv.getId().toString());
            input.put("cv_text_sha256", hash(scoringText));
            input.put("job_title", job.getTitle());
            input.put("jd_sha256", hash(Objects.toString(job.getDescription(), "")));
            ArrayNode reqs = input.putArray("requirements");
            for (JobRequirement req : requirements) {
                ObjectNode row = reqs.addObject();
                if (req.getId() != null) row.put("id", req.getId().toString());
                row.put("skill", req.getSkillName()); row.put("type", req.getRequirementType().name());
            }
            return JSON.writeValueAsString(root);
        } catch (java.io.IOException ex) { throw new IllegalStateException("Cannot save matching input trace", ex); }
    }
    public static String withSemanticTrace(String snapshot, String method, String model) {
        try {
            ObjectNode root = (ObjectNode) JSON.readTree(snapshot);
            ObjectNode input = (ObjectNode) root.path("input_context");
            input.put("semantic_method", method);
            if (model != null) { input.put("semantic_model", model); input.put("semantic_dimension", 1024); }
            return JSON.writeValueAsString(root);
        } catch (java.io.IOException ex) { throw new IllegalStateException(ex); }
    }
    public static JsonNode context(String snapshot) {
        try { return snapshot == null ? JSON.createObjectNode() : JSON.readTree(snapshot).path("input_context"); }
        catch (java.io.IOException ex) { return JSON.createObjectNode(); }
    }
    public static List<JobRequirement> requirements(JsonNode context) {
        List<JobRequirement> result = new ArrayList<>();
        for (JsonNode row : context.path("requirements")) {
            JobRequirement req = JobRequirement.builder().skillName(row.path("skill").asText())
                    .requirementType(RequirementType.valueOf(row.path("type").asText())).build();
            if (row.hasNonNull("id")) req.setId(UUID.fromString(row.get("id").asText()));
            result.add(req);
        }
        return result;
    }
    public static boolean isQuote(String snippet, String source) {
        return snippet != null && !snippet.isBlank() && source.contains(snippet);
    }
}
