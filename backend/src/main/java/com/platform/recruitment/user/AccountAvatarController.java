package com.platform.recruitment.user;

import com.platform.recruitment.common.ApiResponse;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/account/avatar")
@RequiredArgsConstructor
public class AccountAvatarController {
    private final AccountAvatarService avatars;

    public record Avatar(UUID avatarId) {}

    @GetMapping
    public ApiResponse<AccountAvatarService.Identity> current(@AuthenticationPrincipal User user) {
        return ApiResponse.success(avatars.identity(user));
    }

    @PutMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<Avatar> upload(@AuthenticationPrincipal User user, @RequestParam("file") MultipartFile file) {
        return ApiResponse.success(new Avatar(avatars.replace(user, file)));
    }

    @DeleteMapping
    public ApiResponse<Avatar> remove(@AuthenticationPrincipal User user) {
        avatars.remove(user);
        return ApiResponse.success(new Avatar(null));
    }

    @GetMapping("/{avatarId}")
    public ResponseEntity<byte[]> image(@AuthenticationPrincipal User user, @PathVariable UUID avatarId) {
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_JPEG)
                .header(HttpHeaders.CACHE_CONTROL, "private, no-store")
                .header("X-Content-Type-Options", "nosniff")
                .body(avatars.read(user, avatarId));
    }
}
