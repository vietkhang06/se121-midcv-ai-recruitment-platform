package com.platform.recruitment.communication;

import com.platform.recruitment.common.*;
import com.platform.recruitment.user.User;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/inbox")
public class InboxController {
  private final InboxService s;

  public InboxController(InboxService s) {
    this.s = s;
  }

  public record Start(@NotNull UUID applicationId) {}

  public record Send(@NotNull UUID clientId, @NotBlank @Size(max = 4000) String body) {}

  public record Read(@NotNull UUID through) {}

  public record Action(@NotBlank String action) {}

  public record Save(@NotNull Boolean saved) {}

  public record Letter(
      @NotBlank @Size(max = 160) String title, @NotBlank @Size(max = 12000) String body) {}

  public record Password(
      @NotBlank @Size(max = 200) String currentPassword,
      @NotBlank @Size(min = 8, max = 72) String newPassword) {}

  private ApiResponse<Boolean> ok() {
    return ApiResponse.success(true);
  }

  @ExceptionHandler({
    org.springframework.http.converter.HttpMessageNotReadableException.class,
    org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class
  })
  public org.springframework.http.ResponseEntity<ApiResponse<Object>> badInput(Exception e) {
    return org.springframework.http.ResponseEntity.badRequest()
        .body(
            ApiResponse.error(
                ErrorCode.VALIDATION_ERROR, "Dữ liệu gửi lên không đúng định dạng.", null));
  }

  @GetMapping("/account")
  public ApiResponse<?> account(@AuthenticationPrincipal User u) {
    return ApiResponse.success(s.account(u));
  }

  @GetMapping("/preferences")
  public ApiResponse<?> prefs(@AuthenticationPrincipal User u) {
    return ApiResponse.success(s.settings(u));
  }

  @PutMapping("/preferences")
  public ApiResponse<?> prefs(
      @AuthenticationPrincipal User u, @RequestBody InboxService.Settings p) {
    return ApiResponse.success(s.saveSettings(u, p));
  }

  @GetMapping("/unread")
  public ApiResponse<?> unread(@AuthenticationPrincipal User u) {
    return ApiResponse.success(s.unread(u));
  }

  @GetMapping("/notifications")
  public ApiResponse<?> notices(
      @AuthenticationPrincipal User u, @RequestParam(defaultValue = "0") int page) {
    return ApiResponse.success(s.notices(u, page));
  }

  @PostMapping("/notifications/{id}/read")
  public ApiResponse<?> readNotice(@AuthenticationPrincipal User u, @PathVariable UUID id) {
    s.readNotice(u, id);
    return ok();
  }

  @PostMapping("/notifications/read-all")
  public ApiResponse<?> readAll(@AuthenticationPrincipal User u) {
    s.readAll(u);
    return ok();
  }

  @GetMapping("/contacts")
  public ApiResponse<?> contacts(
      @AuthenticationPrincipal User u, @RequestParam(defaultValue = "0") int page) {
    return ApiResponse.success(s.contacts(u, page));
  }

  @GetMapping("/conversations")
  public ApiResponse<?> threads(
      @AuthenticationPrincipal User u, @RequestParam(defaultValue = "0") int page) {
    return ApiResponse.success(s.threads(u, page, null));
  }

  @PostMapping("/conversations")
  public ApiResponse<?> start(@AuthenticationPrincipal User u, @Valid @RequestBody Start p) {
    return ApiResponse.success(Map.of("id", s.start(u, p.applicationId())));
  }

  @GetMapping("/conversations/{id}")
  public ApiResponse<?> thread(@AuthenticationPrincipal User u, @PathVariable UUID id) {
    return ApiResponse.success(s.thread(u, id));
  }

  @GetMapping("/conversations/{id}/messages")
  public ApiResponse<?> messages(
      @AuthenticationPrincipal User u,
      @PathVariable UUID id,
      @RequestParam(required = false) UUID before) {
    return ApiResponse.success(s.messages(u, id, before));
  }

  @PostMapping("/conversations/{id}/messages")
  public ApiResponse<?> send(
      @AuthenticationPrincipal User u, @PathVariable UUID id, @Valid @RequestBody Send p) {
    return ApiResponse.success(s.send(u, id, p.clientId(), p.body()));
  }

  @PostMapping("/conversations/{id}/read")
  public ApiResponse<?> read(
      @AuthenticationPrincipal User u, @PathVariable UUID id, @Valid @RequestBody Read p) {
    s.readThread(u, id, p.through());
    return ok();
  }

  @PostMapping("/conversations/{id}/action")
  public ApiResponse<?> action(
      @AuthenticationPrincipal User u, @PathVariable UUID id, @Valid @RequestBody Action p) {
    s.action(u, id, p.action());
    return ok();
  }

  @GetMapping("/jobs")
  public ApiResponse<?> jobs(
      @AuthenticationPrincipal User u,
      @RequestParam(defaultValue = "false") boolean saved,
      @RequestParam(defaultValue = "0") int page) {
    return ApiResponse.success(s.jobs(u, saved, page));
  }

  @GetMapping("/jobs/{id}/saved")
  public ApiResponse<?> saved(@AuthenticationPrincipal User u, @PathVariable UUID id) {
    return ApiResponse.success(s.saved(u, id));
  }

  @PutMapping("/jobs/{id}/saved")
  public ApiResponse<?> saveJob(
      @AuthenticationPrincipal User u, @PathVariable UUID id, @Valid @RequestBody Save p) {
    s.saveJob(u, id, p.saved());
    return ok();
  }

  @GetMapping("/letters")
  public ApiResponse<?> letters(
      @AuthenticationPrincipal User u, @RequestParam(defaultValue = "0") int page) {
    return ApiResponse.success(s.letters(u, page));
  }

  @PostMapping("/letters")
  public ApiResponse<?> letter(@AuthenticationPrincipal User u, @Valid @RequestBody Letter p) {
    return ApiResponse.success(s.letter(u, null, p.title(), p.body()));
  }

  @PutMapping("/letters/{id}")
  public ApiResponse<?> letter(
      @AuthenticationPrincipal User u, @PathVariable UUID id, @Valid @RequestBody Letter p) {
    return ApiResponse.success(s.letter(u, id, p.title(), p.body()));
  }

  @DeleteMapping("/letters/{id}")
  public ApiResponse<?> delete(@AuthenticationPrincipal User u, @PathVariable UUID id) {
    s.deleteLetter(u, id);
    return ok();
  }

  @GetMapping("/profile-views")
  public ApiResponse<?> views(
      @AuthenticationPrincipal User u, @RequestParam(defaultValue = "0") int page) {
    return ApiResponse.success(s.views(u, page));
  }

  @GetMapping("/upgrade-request")
  public ApiResponse<?> upgrade(@AuthenticationPrincipal User u) {
    return ApiResponse.success(s.upgrade(u, false));
  }

  @PostMapping("/upgrade-request")
  public ApiResponse<?> request(@AuthenticationPrincipal User u) {
    return ApiResponse.success(s.upgrade(u, true));
  }

  @PutMapping("/password")
  public ApiResponse<?> password(@AuthenticationPrincipal User u, @Valid @RequestBody Password p) {
    s.password(u, p.currentPassword(), p.newPassword());
    return ok();
  }
}
