package com.platform.recruitment.auth;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.*;
import jakarta.servlet.http.Cookie;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class OAuthBrowserBindingTest {
    @Test void startSetsHttpOnlySameSiteStateCookie() {
        OAuthService service=mock(OAuthService.class);
        when(service.authorizationUrl("google",null,null)).thenReturn("https://accounts.google.com/o/oauth2/v2/auth?state=state-fixture");
        var response=new OAuthController(service).start("google",null,new MockHttpServletRequest());
        String cookie=response.getHeaders().getFirst("Set-Cookie");
        assertNotNull(cookie); assertTrue(cookie.contains("midcv_oauth_google=state-fixture"));
        assertTrue(cookie.contains("HttpOnly"));assertTrue(cookie.contains("SameSite=Lax"));
        assertEquals(302,response.getStatusCode().value());
    }
    @Test void callbackFromAnotherBrowserCannotRedeemState() throws Exception {
        OAuthService service=mock(OAuthService.class);when(service.errorRedirect("invalid_state")).thenReturn("http://localhost:3000/login?oauth_error=invalid_state");
        var request=new MockHttpServletRequest();request.setCookies(new Cookie("midcv_oauth_google","another-browser"));
        var response=new MockHttpServletResponse();new OAuthController(service).callback("google","victim-state","code",null,request,response);
        assertTrue(response.getRedirectedUrl().contains("invalid_state"));
        verify(service,never()).callback(any(),any(),any(),any());
    }
    @Test void cancelledCallbackStillRequiresMatchingBrowserState() throws Exception {
        OAuthService service=mock(OAuthService.class);when(service.errorRedirect("invalid_state")).thenReturn("http://localhost:3000/login?oauth_error=invalid_state");
        var response=new MockHttpServletResponse();new OAuthController(service).callback("github","foreign-state",null,"access_denied",new MockHttpServletRequest(),response);
        assertTrue(response.getRedirectedUrl().contains("invalid_state"));verify(service,never()).callback(any(),any(),any(),any());
    }
}
