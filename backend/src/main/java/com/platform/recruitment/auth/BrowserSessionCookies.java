package com.platform.recruitment.auth;

import com.platform.recruitment.common.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.MethodParameter;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.server.*;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

/** Browser transport is opt-in; existing non-browser token clients retain their contract. */
@RestControllerAdvice
public class BrowserSessionCookies implements ResponseBodyAdvice<Object> {
    public static final String HEADER = "X-MidCV-Session";
    public static final String COOKIE = "midcv_refresh";
    private final Set<String> origins;
    private final boolean secure;
    public BrowserSessionCookies(
            @Value("${app.security.cors.allowed-origins:http://localhost:3000,http://127.0.0.1:3000}") String origins,
            @Value("${app.security.refresh-cookie-secure:false}") boolean secure) {
        this.origins = Arrays.stream(origins.split(",")).map(String::trim).collect(Collectors.toUnmodifiableSet());
        this.secure = secure;
    }
    public static boolean requested(HttpServletRequest request) {
        return "cookie".equals(request.getHeader(HEADER));
    }
    public void verifyOrigin(HttpServletRequest request) {
        String origin = request.getHeader("Origin");
        if (!requested(request) || origin == null || !origins.contains(origin) || "null".equals(origin)) {
            throw new com.platform.recruitment.common.CustomException(com.platform.recruitment.common.ErrorCode.ACCESS_DENIED, "Browser session origin is not allowed");
        }
    }
    public String read(HttpServletRequest request) {
        verifyOrigin(request);
        if (request.getCookies() != null) for (var cookie : request.getCookies()) {
            if (COOKIE.equals(cookie.getName())) return cookie.getValue();
        }
        throw new com.platform.recruitment.common.CustomException(com.platform.recruitment.common.ErrorCode.AUTHENTICATION_FAILED, "Refresh session is missing");
    }
    private String cookie(String token, boolean requestSecure, boolean clear) {
        var builder = ResponseCookie.from(COOKIE, token).httpOnly(true).secure(secure || requestSecure)
                .sameSite("Strict").path("/api/v1/auth");
        // Session cookie; server auth_sessions.expires_at remains authoritative.
        if (clear) builder.maxAge(0);
        return builder.build().toString();
    }
    @Override public boolean supports(MethodParameter type, Class<? extends HttpMessageConverter<?>> converter) { return true; }
    @Override public Object beforeBodyWrite(Object body, MethodParameter type, MediaType media,
            Class<? extends HttpMessageConverter<?>> converter, ServerHttpRequest request, ServerHttpResponse response) {
        if (!(request instanceof ServletServerHttpRequest servlet) || !requested(servlet.getServletRequest())) return body;
        var http = servlet.getServletRequest();
        if (body instanceof ApiResponse<?> envelope && envelope.isSuccess()) {
            if (envelope.getData() instanceof JwtResponse jwt && jwt.getRefreshToken() != null) {
                verifyOrigin(http);
                response.getHeaders().add(HttpHeaders.SET_COOKIE, cookie(jwt.getRefreshToken(), http.isSecure(), false));
                response.getHeaders().setCacheControl("no-store");
                jwt.setRefreshToken(null);
            } else if (http.getRequestURI().endsWith("/api/v1/auth/logout")) {
                verifyOrigin(http);
                response.getHeaders().add(HttpHeaders.SET_COOKIE, cookie("", http.isSecure(), true));
            }
        }
        return body;
    }
}
