package com.platform.recruitment.ai;

import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Component
public class AiWorkerClient {

    private final RestClient restClient;

    public AiWorkerClient(@Value("${app.ai-worker.url:http://localhost:8000/internal/ai}") String aiWorkerUrl) {
        this.restClient = RestClient.builder()
                .baseUrl(aiWorkerUrl)
                .build();
    }

    public Map<String, Object> extractJd(UUID jobId, String title, String industry, String rawDescription) {
        String correlationId = UUID.randomUUID().toString();
        Map<String, Object> body = Map.of(
                "job_id", jobId.toString(),
                "title", title,
                "industry", industry,
                "raw_description", rawDescription,
                "correlation_id", correlationId
        );

        try {
            return restClient.post()
                    .uri("/extract-jd")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(Map.class);
        } catch (Exception ex) {
            log.error("Failed to call AI Worker /extract-jd: {}", ex.getMessage());
            throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR, "AI Worker extract-jd failed: " + ex.getMessage());
        }
    }

    public Map<String, Object> analyzeGithub(UUID candidateId, String githubUrl) {
        String correlationId = UUID.randomUUID().toString();
        Map<String, Object> body = Map.of(
                "candidate_id", candidateId.toString(),
                "github_url", githubUrl,
                "correlation_id", correlationId
        );

        try {
            return restClient.post()
                    .uri("/analyze-github")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(Map.class);
        } catch (Exception ex) {
            log.warn("GitHub Analysis call failed ({}), returning fallback UNAVAILABLE", ex.getMessage());
            Map<String, Object> fallback = new HashMap<>();
            fallback.put("status", "UNAVAILABLE");
            fallback.put("activity_signal", "LIMITED_OBSERVABLE_ACTIVITY");
            fallback.put("summary_notes", "GitHub API call failed or timed out.");
            return fallback;
        }
    }

    public Map<String, Object> extractCv(UUID cvId, UUID versionId, byte[] fileBytes, String fileType, String rawText) {
        String correlationId = UUID.randomUUID().toString();
        Map<String, Object> body = new HashMap<>();
        body.put("cv_id", cvId != null ? cvId.toString() : UUID.randomUUID().toString());
        body.put("cv_version_id", versionId != null ? versionId.toString() : UUID.randomUUID().toString());
        if (fileBytes != null && fileBytes.length > 0) {
            body.put("file_base64", java.util.Base64.getEncoder().encodeToString(fileBytes));
        }
        if (fileType != null) {
            body.put("file_type", fileType);
        }
        if (rawText != null && !rawText.isBlank()) {
            body.put("raw_text", rawText);
        }
        body.put("correlation_id", correlationId);

        try {
            return restClient.post()
                    .uri("/extract-cv")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(Map.class);
        } catch (Exception ex) {
            log.error("Failed to call AI Worker /extract-cv: {}", ex.getMessage());
            throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR, "AI Worker extract-cv failed: " + ex.getMessage());
        }
    }

    public Map<String, Object> extractDocument(byte[] fileBytes, String fileName, String fileType, String rawText) {
        String correlationId = UUID.randomUUID().toString();
        Map<String, Object> body = new HashMap<>();
        if (fileBytes != null && fileBytes.length > 0) {
            body.put("file_base64", java.util.Base64.getEncoder().encodeToString(fileBytes));
        }
        if (fileName != null) {
            body.put("file_name", fileName);
        }
        if (fileType != null) {
            body.put("file_type", fileType);
        }
        if (rawText != null && !rawText.isBlank()) {
            body.put("raw_text", rawText);
        }
        body.put("correlation_id", correlationId);

        try {
            return restClient.post()
                    .uri("/extract-document")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(Map.class);
        } catch (Exception ex) {
            log.error("Failed to call AI Worker /extract-document: {}", ex.getMessage());
            throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR, "AI Worker extract-document failed: " + ex.getMessage());
        }
    }
}
