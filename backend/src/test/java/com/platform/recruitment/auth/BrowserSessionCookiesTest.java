package com.platform.recruitment.auth;

import com.platform.recruitment.common.ApiResponse;
import com.platform.recruitment.common.CustomException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.*;
import org.springframework.http.server.*;
import jakarta.servlet.http.Cookie;
import static org.junit.jupiter.api.Assertions.*;

class BrowserSessionCookiesTest {
    private final BrowserSessionCookies cookies = new BrowserSessionCookies("https://midcv.example", true);
    private MockHttpServletRequest request() {
        var request = new MockHttpServletRequest("POST", "/api/v1/auth/refresh");
        request.addHeader(BrowserSessionCookies.HEADER, "cookie");
        request.addHeader("Origin", "https://midcv.example");
        return request;
    }
    @Test void cookieTransportHidesRefreshTokenAndUsesSecureHttpOnlyStrictCookie() {
        var request = request(); var response = new MockHttpServletResponse();
        var serverResponse = new ServletServerHttpResponse(response);
        var jwt = JwtResponse.builder().accessToken("access-test").refreshToken("refresh-test").build();
        cookies.beforeBodyWrite(ApiResponse.success(jwt), null, null, null,
                new ServletServerHttpRequest(request), serverResponse);
        String cookie = serverResponse.getHeaders().getFirst("Set-Cookie");
        assertTrue(cookie.contains("HttpOnly")); assertTrue(cookie.contains("Secure"));
        assertTrue(cookie.contains("SameSite=Strict")); assertTrue(cookie.contains("Path=/api/v1/auth"));
        assertNull(jwt.getRefreshToken()); assertEquals("access-test", jwt.getAccessToken());
        assertEquals("no-store", serverResponse.getHeaders().getCacheControl());
    }
    @Test void originIsRequiredAndCrossOriginIsRejectedEvenWithCookie() {
        var request = request(); request.removeHeader("Origin");
        request.setCookies(new Cookie(BrowserSessionCookies.COOKIE, "refresh-test"));
        assertThrows(CustomException.class, () -> cookies.read(request));
        request.addHeader("Origin", "https://attacker.example");
        assertThrows(CustomException.class, () -> cookies.read(request));
    }
    @Test void trustedBrowserReadsCookieButCannotUseBodyFallbackWhenCookieIsMissing() {
        var request = request(); assertThrows(CustomException.class, () -> cookies.read(request));
        request.setCookies(new Cookie(BrowserSessionCookies.COOKIE, "refresh-test"));
        assertEquals("refresh-test", cookies.read(request));
    }
    @Test void legacyTokenClientsKeepTheirExplicitBodyContract() {
        var request = new MockHttpServletRequest("POST", "/api/v1/auth/login");
        var response = new MockHttpServletResponse();
        var jwt = JwtResponse.builder().refreshToken("cli-refresh").build();
        cookies.beforeBodyWrite(ApiResponse.success(jwt), null, null, null,
                new ServletServerHttpRequest(request), new ServletServerHttpResponse(response));
        assertEquals("cli-refresh", jwt.getRefreshToken()); assertNull(response.getHeader("Set-Cookie"));
    }
}
