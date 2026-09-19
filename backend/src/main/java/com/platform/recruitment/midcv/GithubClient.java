package com.platform.recruitment.midcv;

import com.fasterxml.jackson.databind.*;
import java.net.*;
import java.net.http.*;
import java.time.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class GithubClient {
  private final Db db;
  private final String token;
  private final HttpClient client =
      HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

  public GithubClient(
      @Qualifier("midcvDb") Db db,
      @Value("${midcv.github-token:}") String token) {
    this.db = db;
    this.token = token == null ? "" : token.trim();
  }

  public JsonNode fetch(String username) {
    if (!username.matches("[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?"))
      throw ApiFailure.bad("GITHUB_USERNAME_INVALID", "Tên GitHub không hợp lệ.");
    String cacheKey = username.toLowerCase(Locale.ROOT);
    var cached =
        db.optional(
            "SELECT payload FROM github_cache WHERE username=? AND expires_at>now()", cacheKey);
    if (cached.isPresent()) return db.tree(cached.get().get("payload"));
    JsonNode user = get("/users/" + encode(username));
    JsonNode repos =
        get("/users/" + encode(username) + "/repos?per_page=100&sort=updated&type=owner");
    JsonNode activity;
    String activityError = null;
    try {
      activity = get("/users/" + encode(username) + "/events/public?per_page=100");
    } catch (ApiFailure e) {
      activity = db.mapper.createArrayNode();
      activityError = e.code;
    }
    if (!repos.isArray() || !activity.isArray())
      throw new ApiFailure(502, "GITHUB_INVALID_RESPONSE", "GitHub trả về dữ liệu không hợp lệ.");
    List<Map<String, Object>> repositoryList = new ArrayList<>();
    int languageRequests = 0;
    boolean languagePartial = false;
    for (JsonNode r : repos) {
      if (r.path("private").asBoolean(true)) continue;
      Object languages = Map.of();
      String languageError = null;
      if (!r.path("fork").asBoolean() && languageRequests < 10) {
        languageRequests++;
        try {
          languages =
              get(
                  "/repos/"
                      + encode(username)
                      + "/"
                      + encode(r.path("name").asText())
                      + "/languages");
        } catch (ApiFailure e) {
          languageError = e.code;
          languagePartial = true;
        }
      }
      repositoryList.add(
          Db.map(
              "name",
              r.path("name").asText(),
              "url",
              r.path("html_url").asText(),
              "description",
              r.path("description").asText(""),
              "language",
              r.path("language").asText(null),
              "languages",
              languages,
              "language_error",
              languageError,
              "topics",
              r.path("topics"),
              "fork",
              r.path("fork").asBoolean(),
              "archived",
              r.path("archived").asBoolean(),
              "stars",
              r.path("stargazers_count").asInt(),
              "forks",
              r.path("forks_count").asInt(),
              "updated_at",
              r.path("updated_at").asText(),
              "pushed_at",
              r.path("pushed_at").asText()));
    }
    List<Map<String, Object>> activities = new ArrayList<>();
    for (JsonNode e : activity)
      activities.add(
          Db.map(
              "type",
              e.path("type").asText(),
              "repo",
              e.path("repo").path("name").asText(),
              "created_at",
              e.path("created_at").asText()));
    JsonNode payload =
        db.tree(
            Db.map(
                "status",
                "AVAILABLE",
                "username",
                user.path("login").asText(),
                "url",
                user.path("html_url").asText(),
                "public_repos",
                user.path("public_repos").asInt(),
                "repos",
                repositoryList,
                "activity",
                activities,
                "latest_public_activity",
                activities.isEmpty() ? null : activities.get(0).get("created_at"),
                "activity_error",
                activityError,
                "language_partial",
                languagePartial,
                "language_repos_requested",
                languageRequests,
                "truncated",
                user.path("public_repos").asInt() > repositoryList.size(),
                "fetched_at",
                Instant.now().toString(),
                "scope",
                "public only; latest 100 repositories/events; language breakdown for up to 10"
                    + " original repos"));
    db.update(
        "INSERT INTO github_cache(username,payload,expires_at) VALUES (?,?::jsonb,now()+interval '6"
            + " hours') ON CONFLICT(username) DO UPDATE SET"
        + " payload=EXCLUDED.payload,expires_at=EXCLUDED.expires_at,fetched_at=now()",
        cacheKey,
        payload.toString());
    return payload;
  }

  private String encode(String s) {
    return URLEncoder.encode(s, java.nio.charset.StandardCharsets.UTF_8).replace("+", "%20");
  }

  private JsonNode get(String path) {
    try {
      var builder =
          HttpRequest.newBuilder(URI.create("https://api.github.com" + path))
              .timeout(Duration.ofSeconds(12))
              .header("Accept", "application/vnd.github+json")
              .header("User-Agent", "midCV-DoAn1")
              .header("X-GitHub-Api-Version", "2022-11-28");
      if (token != null && !token.isBlank()) builder.header("Authorization", "Bearer " + token);
      var r = client.send(builder.GET().build(), HttpResponse.BodyHandlers.ofString());
      if (r.statusCode() == 404)
        throw new ApiFailure(
            404, "GITHUB_NOT_FOUND", "Không tìm thấy tài khoản hoặc repo công khai.");
      if (r.statusCode() == 403 || r.statusCode() == 429)
        throw new ApiFailure(
            429,
            "GITHUB_RATE_LIMIT",
            "GitHub giới hạn lượt gọi hoặc từ chối truy cập. Điểm JD–CV vẫn được giữ.");
      if (r.statusCode() != 200)
        throw new ApiFailure(
            502, "GITHUB_HTTP_" + r.statusCode(), "GitHub trả HTTP " + r.statusCode() + ".");
      if (r.body().length() > 4_000_000)
        throw new ApiFailure(502, "GITHUB_RESPONSE_TOO_LARGE", "Dữ liệu GitHub vượt giới hạn.");
      return db.parse(r.body());
    } catch (ApiFailure e) {
      throw e;
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      throw new ApiFailure(503, "WORKER_INTERRUPTED", "Worker bị ngắt khi đọc GitHub.");
    } catch (Exception e) {
      throw new ApiFailure(
          503,
          "GITHUB_UNAVAILABLE",
          "Chưa kết nối được GitHub. Kết quả dùng dữ liệu JD–CV hiện có.");
    }
  }
}
