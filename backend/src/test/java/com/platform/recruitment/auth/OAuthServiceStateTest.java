package com.platform.recruitment.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.platform.recruitment.candidate.CandidateProfileRepository;
import com.platform.recruitment.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class OAuthServiceStateTest {
    private OAuthLoginStateRepository states;
    private OAuthService service;
    @BeforeEach void setup() {
        states = mock(OAuthLoginStateRepository.class);
        service = new OAuthService(mock(OAuthAccountRepository.class), states, mock(OAuthLoginTicketRepository.class), mock(OAuthPendingRegistrationRepository.class), mock(UserRepository.class), mock(CandidateProfileRepository.class), mock(AuthService.class), mock(PasswordEncoder.class), new ObjectMapper());
        ReflectionTestUtils.setField(service, "googleClientId", "test-client");
        ReflectionTestUtils.setField(service, "googleClientSecret", "server-only-secret");
        ReflectionTestUtils.setField(service, "backendBaseUrl", "http://localhost:8080");
        ReflectionTestUtils.setField(service, "frontendUrl", "http://localhost:3000");
    }

    @Test void authorizationRequestStoresHashedStateAndPkceAndRejectsOpenRedirect() throws Exception {
        when(states.save(any())).thenAnswer(call -> call.getArgument(0));
        URI uri = URI.create(service.authorizationUrl("google", "https://attacker.example/steal", null));
        var query = java.util.Arrays.stream(uri.getRawQuery().split("&")).map(s -> s.split("=", 2)).collect(java.util.stream.Collectors.toMap(a -> a[0], a -> URLDecoder.decode(a[1], StandardCharsets.UTF_8)));
        var captor = org.mockito.ArgumentCaptor.forClass(OAuthLoginState.class);
        verify(states).save(captor.capture());
        OAuthLoginState saved = captor.getValue();
        assertEquals("/candidate", saved.getReturnTo());
        assertNotEquals(query.get("state"), saved.getStateHash());
        assertEquals("S256", query.get("code_challenge_method"));
        String challenge = java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(MessageDigest.getInstance("SHA-256").digest(saved.getCodeVerifier().getBytes(StandardCharsets.UTF_8)));
        assertEquals(challenge, query.get("code_challenge"));
        assertEquals("openid email profile", query.get("scope"));
        assertTrue(query.get("redirect_uri").endsWith("/api/v1/auth/oauth/google/callback"));
        assertEquals(64, saved.getStateHash().length());
    }

    @Test void expiredOrReplayedStateIsRejectedBeforeTokenExchange() throws Exception {
        String rawState = "replayed-state";
        String hash = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(rawState.getBytes(StandardCharsets.UTF_8)));
        OAuthLoginState state = new OAuthLoginState(); state.setProvider("github"); state.setCodeVerifier("verifier"); state.setNonce("nonce");
        when(states.findById(hash)).thenReturn(java.util.Optional.of(state));
        when(states.consume(eq(hash), eq("github"), any())).thenReturn(0);
        OAuthFlowException error = assertThrows(OAuthFlowException.class, () -> service.callback("github", rawState, "code", null));
        assertEquals("invalid_state", error.getReason());
    }

    @Test void onlySupportedProvidersCanStart() {
        assertEquals("unsupported_provider", assertThrows(OAuthFlowException.class, () -> service.authorizationUrl("linkedin", null, null)).getReason());
    }
}
