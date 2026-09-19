package com.platform.recruitment.midcv;

import com.platform.recruitment.user.User;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
public class AuthService {
  public record Actor(UUID id, String email, String role) {}

  public static Actor require() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
      throw new ApiFailure(401, "UNAUTHENTICATED", "Vui lòng đăng nhập để tiếp tục.");
    }
    if (auth.getPrincipal() instanceof User user) {
      return new Actor(user.getId(), user.getEmail(), user.getRole() != null ? user.getRole().name() : "CANDIDATE");
    }
    throw new ApiFailure(401, "UNAUTHENTICATED", "Vui lòng đăng nhập để tiếp tục.");
  }

  public static Actor requireRole(String role) {
    Actor a = require();
    if (!role.equalsIgnoreCase(a.role())) {
      throw new ApiFailure(403, "FORBIDDEN", "Vai trò tài khoản không được phép thực hiện thao tác này.");
    }
    return a;
  }

  public static UUID currentId() {
    try {
      return require().id();
    } catch (ApiFailure e) {
      return null;
    }
  }
}
