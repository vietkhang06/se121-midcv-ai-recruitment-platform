package com.platform.recruitment.auth;

import com.platform.recruitment.common.GlobalExceptionHandler;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.hamcrest.Matchers.containsString;

class BrowserRefreshHttpContractTest {
    @Test void browserRefreshReadsCookieRotatesAndOmitsSecretFromJson() throws Exception {
        var sessions = mock(AuthSessionService.class);
        var cookies = new BrowserSessionCookies("http://localhost:3000", false);
        var mvc = MockMvcBuilders.standaloneSetup(new SessionController(sessions,
                mock(PasswordResetService.class), mock(JwtTokenProvider.class), cookies))
                .setControllerAdvice(cookies, new GlobalExceptionHandler()).build();
        when(sessions.refresh("old-cookie")).thenReturn(JwtResponse.builder()
                .accessToken("new-access").refreshToken("new-cookie").build());
        mvc.perform(post("/api/v1/auth/refresh").header("Origin", "http://localhost:3000")
                .header(BrowserSessionCookies.HEADER, "cookie")
                .cookie(new Cookie(BrowserSessionCookies.COOKIE, "old-cookie")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.accessToken").value("new-access"))
                .andExpect(jsonPath("$.data.refreshToken").doesNotExist())
                .andExpect(header().string("Set-Cookie", containsString("midcv_refresh=new-cookie")))
                .andExpect(header().string("Set-Cookie", containsString("HttpOnly")));
        verify(sessions).refresh("old-cookie");
    }

    @Test void hostileOriginCannotRotateEvenWithAValidCookie() throws Exception {
        var sessions = mock(AuthSessionService.class);
        var cookies = new BrowserSessionCookies("http://localhost:3000", false);
        var mvc = MockMvcBuilders.standaloneSetup(new SessionController(sessions,
                mock(PasswordResetService.class), mock(JwtTokenProvider.class), cookies))
                .setControllerAdvice(cookies, new GlobalExceptionHandler()).build();
        mvc.perform(post("/api/v1/auth/refresh").header("Origin", "https://attacker.example")
                .header(BrowserSessionCookies.HEADER, "cookie")
                .cookie(new Cookie(BrowserSessionCookies.COOKIE, "old-cookie")))
                .andExpect(status().isForbidden());
        verifyNoInteractions(sessions);
    }
}
