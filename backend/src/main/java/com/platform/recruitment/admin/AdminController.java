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
@RequestMapping("/api/admin/ai-settings")
public class AdminController {
  private final AiClient aiClient;
  private final Events events;

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
    String masked = "";
    if (!key.isEmpty()) {
      masked = key.length() > 8 ? key.substring(0, 3) + "..." + key.substring(key.length() - 4) : "***";
    }
    Map<String, Object> res = new LinkedHashMap<>();
    res.put("provider", s.provider());
    res.put("ollamaUrl", s.ollamaUrl());
    res.put("ollamaModel", s.ollamaModel());
    res.put("cloudBaseUrl", s.cloudBaseUrl());
    res.put("cloudApiKeyMasked", masked);
    res.put("hasCloudApiKey", !key.isEmpty());
    res.put("cloudModel", s.cloudModel());
    res.put("embeddingModel", s.embeddingModel());
    return res;
  }

  @PutMapping
  public Map<String, Object> updateSettings(@RequestBody Map<String, Object> body) {
    User actor = requireAdmin();
    String provider = Objects.toString(body.get("provider"), "LOCAL_OLLAMA").trim().toUpperCase(Locale.ROOT);
    if (!Set.of("LOCAL_OLLAMA", "CLOUD_OPENAI_COMPATIBLE").contains(provider)) {
      throw new CustomException(ErrorCode.VALIDATION_ERROR, "Nhà cung cấp AI chỉ nhận LOCAL_OLLAMA hoặc CLOUD_OPENAI_COMPATIBLE.");
    }

    String ollamaUrl = Objects.toString(body.get("ollamaUrl"), "http://localhost:11434").trim();
    String ollamaModel = Objects.toString(body.get("ollamaModel"), "dna5rm/granite4.2:3b-8k").trim();
    String cloudBaseUrl = Objects.toString(body.get("cloudBaseUrl"), "https://api.openai.com/v1").trim();
    String newKey = Objects.toString(body.get("cloudApiKey"), "").trim();
    String cloudModel = Objects.toString(body.get("cloudModel"), "gpt-4o-mini").trim();

    if (newKey.contains("...") || newKey.equals("***")) {
      newKey = "";
    }

    if ("CLOUD_OPENAI_COMPATIBLE".equals(provider)) {
      AiClient.SystemAiSettings curr = aiClient.getSettings();
      if (newKey.isEmpty() && (curr.cloudApiKey() == null || curr.cloudApiKey().trim().isEmpty())) {
        throw new CustomException(ErrorCode.VALIDATION_ERROR, "Cần nhập API Key khi chuyển sang Cloud AI.");
      }
    }

    aiClient.updateSettings(provider, ollamaUrl, ollamaModel, cloudBaseUrl, newKey, cloudModel);

    events.emit(
        null,
        actor.getId(),
        "INFO",
        "ADMIN",
        "AI_SETTINGS_UPDATED",
        "Admin đã cập nhật chế độ AI sang " + provider,
        null);

    return getSettings();
  }

  @PostMapping("/test")
  public Map<String, Object> testSettings(@RequestBody Map<String, Object> body) {
    requireAdmin();
    String provider = Objects.toString(body.get("provider"), "LOCAL_OLLAMA").trim().toUpperCase(Locale.ROOT);
    String ollamaUrl = Objects.toString(body.get("ollamaUrl"), "http://localhost:11434").trim();
    String ollamaModel = Objects.toString(body.get("ollamaModel"), "dna5rm/granite4.2:3b-8k").trim();
    String cloudBaseUrl = Objects.toString(body.get("cloudBaseUrl"), "https://api.openai.com/v1").trim();
    String inputKey = Objects.toString(body.get("cloudApiKey"), "").trim();
    String cloudModel = Objects.toString(body.get("cloudModel"), "gpt-4o-mini").trim();

    AiClient.SystemAiSettings curr = aiClient.getSettings();
    String apiKey = (!inputKey.isEmpty() && !inputKey.contains("...") && !inputKey.equals("***"))
        ? inputKey
        : curr.cloudApiKey();

    AiClient.SystemAiSettings testSettings =
        new AiClient.SystemAiSettings(
            provider,
            ollamaUrl,
            ollamaModel,
            cloudBaseUrl,
            apiKey,
            cloudModel,
            "LOCAL_OLLAMA",
            "bge-m3");

    return aiClient.testConnection(testSettings);
  }
}
