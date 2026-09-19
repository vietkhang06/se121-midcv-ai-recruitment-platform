package com.platform.recruitment.midcv;

import com.platform.recruitment.ai.AiClient;
import com.platform.recruitment.event.Events;
import java.util.*;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/ai-settings")
public class AdminController {
  private final Db db;
  private final AiClient aiClient;
  private final Events events;

  public AdminController(
      @Qualifier("midcvDb") Db db,
      AiClient aiClient,
      Events events) {
    this.db = db;
    this.aiClient = aiClient;
    this.events = events;
  }

  private AuthService.Actor requireAdmin() {
    AuthService.Actor a = AuthService.require();
    if (!"ADMIN".equalsIgnoreCase(a.role()) && !"HR".equalsIgnoreCase(a.role())) {
      throw new ApiFailure(403, "FORBIDDEN", "Chỉ quản trị viên mới có quyền cấu hình AI hệ thống.");
    }
    return a;
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
    return Db.map(
        "provider", s.provider(),
        "ollamaUrl", s.ollamaUrl(),
        "ollamaModel", s.ollamaModel(),
        "cloudBaseUrl", s.cloudBaseUrl(),
        "cloudApiKeyMasked", masked,
        "hasCloudApiKey", !key.isEmpty(),
        "cloudModel", s.cloudModel(),
        "embeddingModel", s.embeddingModel());
  }

  @PutMapping
  public Map<String, Object> updateSettings(@RequestBody Map<String, Object> body) {
    AuthService.Actor actor = requireAdmin();
    String provider = Objects.toString(body.get("provider"), "LOCAL_OLLAMA").trim().toUpperCase(Locale.ROOT);
    if (!Set.of("LOCAL_OLLAMA", "CLOUD_OPENAI_COMPATIBLE").contains(provider)) {
      throw ApiFailure.bad("INVALID_PROVIDER", "Nhà cung cấp AI chỉ nhận LOCAL_OLLAMA hoặc CLOUD_OPENAI_COMPATIBLE.");
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
        throw ApiFailure.bad("KEY_REQUIRED", "Cần nhập API Key khi chuyển sang Cloud AI.");
      }
    }

    if (!newKey.isEmpty()) {
      db.update(
          "UPDATE system_ai_settings SET provider=?, ollama_url=?, ollama_model=?, cloud_base_url=?, cloud_api_key=?, cloud_model=?, updated_at=now() WHERE id='current'",
          provider, ollamaUrl, ollamaModel, cloudBaseUrl, newKey, cloudModel);
    } else {
      db.update(
          "UPDATE system_ai_settings SET provider=?, ollama_url=?, ollama_model=?, cloud_base_url=?, cloud_model=?, updated_at=now() WHERE id='current'",
          provider, ollamaUrl, ollamaModel, cloudBaseUrl, cloudModel);
    }

    aiClient.invalidateSettingsCache();
    events.emit(
        null,
        actor.id(),
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
