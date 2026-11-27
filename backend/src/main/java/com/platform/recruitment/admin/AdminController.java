package com.platform.recruitment.admin;

import com.platform.recruitment.ai.AiClient;
import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.ErrorCode;
import com.platform.recruitment.event.Events;
import com.platform.recruitment.user.Role;
import com.platform.recruitment.user.User;
import java.util.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/ai-settings")
public class AdminController {
  private final AiClient aiClient;
  private final Events events;
  @org.springframework.beans.factory.annotation.Autowired
  private com.platform.recruitment.ai.AiWorkerClient worker;
  @org.springframework.beans.factory.annotation.Autowired
  private com.platform.recruitment.admin.service.AdminAuditLogService audit;

  @GetMapping("/runtime")
  public Map<String, Object> runtime() {
    requireAdmin();
    Map<String, Object> result = new LinkedHashMap<>();
    result.put("backend", getSettings());
    result.put("lastBackendCall", aiClient.lastModelTrace());
    try {
      result.put("worker", worker.runtimeConfiguration());
    } catch (RuntimeException unavailable) {
      result.put("worker", Map.of("status", "UNAVAILABLE", "configurationSource", "WORKER_ENVIRONMENT"));
    }
    return result;
  }

  public AdminController(
      AiClient aiClient,
      Events events) {
    this.aiClient = aiClient;
    this.events = events;
  }

  private User requireAdmin() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth == null || !auth.isAuthenticated() || !(auth.getPrincipal() instanceof User user)) {
      throw new CustomException(ErrorCode.AUTHENTICATION_FAILED, "Vui lòng đăng nhập để tiếp tục.");
    }
    if (user.getRole() != Role.ADMIN) {
      throw new CustomException(ErrorCode.ACCESS_DENIED, "Chỉ quản trị viên mới có quyền cấu hình AI hệ thống.");
    }
    return user;
  }

  @GetMapping
  public Map<String, Object> getSettings() {
    requireAdmin();
    AiClient.SystemAiSettings s = aiClient.getSettings();
    String key = s.cloudApiKey() != null ? s.cloudApiKey().trim() : "";
    String masked = key.isEmpty() ? "" : "***";
    Map<String, Object> res = new LinkedHashMap<>();
    res.put("configurationScope", "BACKEND_SCREENING");
    res.put("workerConfigurationSource", "WORKER_ENVIRONMENT");
    res.put("provider", s.provider());
    res.put("cloudBaseUrl", s.cloudBaseUrl());
    res.put("cloudApiKeyMasked", masked);
    res.put("hasCloudApiKey", !key.isEmpty());
    res.put("cloudModel", s.cloudModel());
    res.put("embeddingModel", s.embeddingModel());
    return res;
  }

  @PutMapping
  @org.springframework.transaction.annotation.Transactional
  public Map<String, Object> updateSettings(@RequestBody Map<String, Object> body) {
    User actor = requireAdmin();
    AiClient.SystemAiSettings previous = aiClient.getSettings();
    AiClient.SystemAiSettings settings = requestSettings(body, previous);
    aiClient.updateSettings(settings.cloudBaseUrl(), settings.cloudApiKey(), settings.cloudModel());
    audit.log(actor, "AI_SETTINGS_UPDATED", "AI_SETTINGS", null,
        previous.provider() + ":" + previous.cloudModel(),
        settings.provider() + ":" + settings.cloudModel(),
        "Cập nhật cấu hình AI backend", null, Events.requestId());

    events.emit(
        null,
        actor.getId(),
        "INFO",
        "ADMIN",
        "AI_SETTINGS_UPDATED",
        "Admin đã cập nhật LLM Provider",
        null);

    return getSettings();
  }

  @PostMapping("/test")
  public Map<String, Object> testSettings(@RequestBody Map<String, Object> body) {
    requireAdmin();
    return aiClient.testConnection(requestSettings(body, aiClient.getSettings()));
  }

  private AiClient.SystemAiSettings requestSettings(Map<String, Object> body, AiClient.SystemAiSettings current) {
    String provider = Objects.toString(body.get("provider"), AiClient.PROVIDER);
    String baseUrl = Objects.toString(body.get("cloudBaseUrl"), current.cloudBaseUrl()).strip().replaceAll("/+$", "");
    String model = Objects.toString(body.get("cloudModel"), current.cloudModel()).strip();
    String key = Objects.toString(body.get("cloudApiKey"), "").strip();
    try {
      java.net.URI uri = java.net.URI.create(baseUrl);
      if (!AiClient.PROVIDER.equals(provider) || !"https".equalsIgnoreCase(uri.getScheme())
          || uri.getHost() == null || uri.getUserInfo() != null || uri.getQuery() != null
          || uri.getFragment() != null || baseUrl.length() > 255 || model.isBlank() || model.length() > 120) {
        throw new IllegalArgumentException();
      }
    } catch (IllegalArgumentException error) {
      throw new CustomException(ErrorCode.VALIDATION_ERROR, "Cần URL HTTPS và model hợp lệ của LLM Provider.");
    }
    if (key.isBlank()) {
      if (!baseUrl.equals(current.cloudBaseUrl().replaceAll("/+$", ""))) {
        throw new CustomException(ErrorCode.VALIDATION_ERROR, "Nhập API key tương ứng khi đổi URL của LLM Provider.");
      }
      key = current.cloudApiKey();
    }
    if (key == null || key.isBlank() || key.contains("\n") || key.contains("\r")) {
      throw new CustomException(ErrorCode.VALIDATION_ERROR, "Cần API key hợp lệ của LLM Provider.");
    }
    return new AiClient.SystemAiSettings(AiClient.PROVIDER, baseUrl, key, model,
        current.embeddingProvider(), current.embeddingModel());
  }
}
