package com.platform.recruitment.ai;

import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestClient;
import org.springframework.http.client.JdkClientHttpRequestFactory;

import java.net.SocketTimeoutException;
import java.net.http.HttpClient;
import java.net.http.HttpTimeoutException;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Component
// The worker POST operations have no server-enforced idempotency key. They use
// finite connect/read timeouts and deliberately do not auto-retry to avoid
// duplicate extraction/LLM work after an ambiguous timeout.
public class AiWorkerClient {

    private static final int DEFAULT_CONNECT_TIMEOUT_MS = 3_000;
    private static final int DEFAULT_RESPONSE_TIMEOUT_MS = 120_000;

    private final RestClient restClient;

    @Autowired
    public AiWorkerClient(
            @Value("${app.ai-worker.url:http://localhost:8000/internal/ai}") String aiWorkerUrl,
            @Value("${app.ai-worker.connect-timeout-ms:3000}") int connectTimeoutMs,
            @Value("${app.ai-worker.response-timeout-ms:120000}") int responseTimeoutMs) {
        if (connectTimeoutMs <= 0 || responseTimeoutMs <= 0) {
            throw new IllegalArgumentException("AI Worker timeouts must be positive");
        }
        HttpClient httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofMillis(connectTimeoutMs))
                .build();
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
        requestFactory.setReadTimeout(Duration.ofMillis(responseTimeoutMs));
        this.restClient = RestClient.builder()
                .baseUrl(aiWorkerUrl)
                .requestFactory(requestFactory)
                .build();
    }

    /** Retained for the existing explicit live-worker diagnostic. */
    public AiWorkerClient(String aiWorkerUrl) {
        this(aiWorkerUrl, DEFAULT_CONNECT_TIMEOUT_MS, DEFAULT_RESPONSE_TIMEOUT_MS);
    }

    AiWorkerClient(RestClient restClient) {
        this.restClient = restClient;
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
            throw workerFailure("/extract-jd", correlationId, ex);
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
            CustomException failure = workerFailure("/analyze-github", correlationId, ex);
            Map<String, Object> fallback = new HashMap<>();
            fallback.put("status", "UNAVAILABLE");
            fallback.put("activity_signal", "LIMITED_OBSERVABLE_ACTIVITY");
            fallback.put("error_code", failure.getErrorCode().name());
            fallback.put("correlation_id", correlationId);
            fallback.put("summary_notes", "GitHub analysis is temporarily unavailable.");
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
            throw workerFailure("/extract-cv", correlationId, ex);
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
            throw workerFailure("/extract-document", correlationId, ex);
        }
    }

    public Map<String, Object> structureCv(String rawText, UUID documentVersionId, String correlationId) {
        String cid = correlationId != null ? correlationId : UUID.randomUUID().toString();
        Map<String, Object> body = new HashMap<>();
        body.put("rawText", rawText);
        if (documentVersionId != null) {
            body.put("documentVersionId", documentVersionId.toString());
        }
        body.put("correlationId", cid);

        try {
            return restClient.post()
                    .uri("/structure-cv")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(Map.class);
        } catch (Exception ex) {
            throw workerFailure("/structure-cv", cid, ex);
        }
    }

    public Map<String, Object> checkHealth() {
        String correlationId = UUID.randomUUID().toString();
        try {
            return restClient.get()
                    .uri("/health")
                    .retrieve()
                    .body(Map.class);
        } catch (Exception ex) {
            throw workerFailure("/health", correlationId, ex);
        }
    }

    private CustomException workerFailure(String operation, String correlationId, Exception ex) {
        Integer status = ex instanceof RestClientResponseException response
                ? response.getStatusCode().value()
                : null;
        boolean transientFailure = ex instanceof ResourceAccessException
                || hasCause(ex, SocketTimeoutException.class)
                || hasCause(ex, HttpTimeoutException.class)
                || (status != null && (status == 429 || status >= 500));
        ErrorCode errorCode = transientFailure
                ? ErrorCode.SERVICE_UNAVAILABLE
                : ErrorCode.CV_PROCESSING_FAILED;

        log.error("AI Worker request failed [operation={}, correlation_id={}, status={}, exception_type={}]",
                operation, correlationId, status, ex.getClass().getSimpleName());
        String statusText = status == null ? "no HTTP response" : "HTTP " + status;
        return new CustomException(errorCode,
                "AI Worker " + operation + " failed (" + statusText + ", correlation_id=" + correlationId + ")");
    }

    private boolean hasCause(Throwable failure, Class<? extends Throwable> causeType) {
        for (Throwable current = failure; current != null; current = current.getCause()) {
            if (causeType.isInstance(current)) {
                return true;
            }
        }
        return false;
    }
}
