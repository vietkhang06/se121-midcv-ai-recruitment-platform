package com.platform.recruitment.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.platform.recruitment.candidate.CandidateProfileRepository;
import com.platform.recruitment.user.UserRepository;
import com.platform.recruitment.user.User;
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
    private OAuthAccountRepository accounts;
    private OAuthService service;
    @BeforeEach void setup() {
        states = mock(OAuthLoginStateRepository.class);
        accounts = mock(OAuthAccountRepository.class);
        service = new OAuthService(accounts, states, mock(OAuthLoginTicketRepository.class), mock(OAuthPendingRegistrationRepository.class), mock(UserRepository.class), mock(CandidateProfileRepository.class), mock(AuthService.class), mock(PasswordEncoder.class), new ObjectMapper(), new OAuthStateConsumer(states));
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
        assertEquals("unsupported_provider", assertThrows(OAuthFlowException.class, () -> service.authorizationUrl("unsupported", null, null)).getReason());
    }

    @Test void linkedinRequiresConfigurationAndUsesOidcNonce() {
        assertEquals("provider_not_configured", assertThrows(OAuthFlowException.class,
                () -> service.authorizationUrl("linkedin", null, null)).getReason());
        ReflectionTestUtils.setField(service, "linkedinClientId", "linkedin-test-client");
        ReflectionTestUtils.setField(service, "linkedinClientSecret", "linkedin-test-secret");
        URI uri = URI.create(service.authorizationUrl("linkedin", null, null));
        assertEquals("www.linkedin.com", uri.getHost());
        assertEquals("/oauth/v2/authorization", uri.getPath());
        String query = URLDecoder.decode(uri.getRawQuery(), StandardCharsets.UTF_8);
        assertTrue(query.contains("scope=openid profile email"));
        assertTrue(query.contains("nonce="));
        assertTrue(query.contains("/linkedin/callback"));
        assertFalse(query.contains("linkedin-test-secret"));
    }

    @Test void githubOwnershipIsBoundToTheLinkedUserAndExactProviderLogin() {
        var ownerId = java.util.UUID.randomUUID();
        var attackerId = java.util.UUID.randomUUID();
        var owner = new User(); owner.setId(ownerId);
        var account = new OAuthAccount();
        account.setProvider("github"); account.setProviderSubject("provider-subject");
        account.setProviderLogin("real-owner"); account.setUser(owner);
        when(accounts.findByProviderAndUserId("github", ownerId)).thenReturn(java.util.Optional.of(account));
        when(accounts.findByProviderAndUserId("github", attackerId)).thenReturn(java.util.Optional.empty());

        assertTrue(service.isGithubOwned(ownerId, "REAL-OWNER"));
        assertFalse(service.isGithubOwned(ownerId, "different-owner"));
        assertFalse(service.isGithubOwned(attackerId, "real-owner"));
    }
}
