package com.platform.recruitment.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.platform.recruitment.candidate.CandidateProfileRepository;
import com.platform.recruitment.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.security.interfaces.RSAPublicKey;
import java.time.Instant;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class OidcIdentityValidationTest {
    private final ObjectMapper mapper = new ObjectMapper();
    private final Base64.Encoder b64 = Base64.getUrlEncoder().withoutPadding();
    private OAuthService service;
    private KeyPair key;
    private Map<String,Object> claims;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setup() throws Exception {
        var states = mock(OAuthLoginStateRepository.class);
        service = new OAuthService(mock(OAuthAccountRepository.class), states,
                mock(OAuthLoginTicketRepository.class), mock(OAuthPendingRegistrationRepository.class),
                mock(UserRepository.class), mock(CandidateProfileRepository.class), mock(AuthService.class),
                mock(PasswordEncoder.class), mapper, new OAuthStateConsumer(states));
        var generator = KeyPairGenerator.getInstance("RSA"); generator.initialize(2048);
        key = generator.generateKeyPair();
        RSAPublicKey pub = (RSAPublicKey) key.getPublic();
        var client = mock(HttpClient.class);
        HttpResponse<String> response = mock(HttpResponse.class);
        when(response.statusCode()).thenReturn(200);
        when(response.uri()).thenReturn(java.net.URI.create("https://www.linkedin.com/oauth/openid/jwks"));
        when(response.headers()).thenReturn(HttpHeaders.of(
                Map.of("Content-Type", List.of("application/json")), (name, value) -> true));
        when(response.body()).thenReturn(mapper.writeValueAsString(Map.of("keys", List.of(Map.of(
                "kid", "test-key", "kty", "RSA", "alg", "RS256",
                "n", b64.encodeToString(pub.getModulus().toByteArray()),
                "e", b64.encodeToString(pub.getPublicExponent().toByteArray()))))));
        when(client.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class))).thenReturn(response);
        ReflectionTestUtils.setField(service, "http", client);
        claims = new HashMap<>(Map.of("sub", "member-123", "iss", "https://www.linkedin.com",
                "aud", "client-id", "nonce", "expected-nonce", "exp", Instant.now().plusSeconds(300).getEpochSecond()));
    }

    private String signed() throws Exception {
        String input = b64.encodeToString(mapper.writeValueAsBytes(Map.of("alg", "RS256", "kid", "test-key")))
                + "." + b64.encodeToString(mapper.writeValueAsBytes(claims));
        Signature signer = Signature.getInstance("SHA256withRSA"); signer.initSign(key.getPrivate());
        signer.update(input.getBytes(StandardCharsets.US_ASCII));
        return input + "." + b64.encodeToString(signer.sign());
    }
    private Object validate(String token) {
        return ReflectionTestUtils.invokeMethod(service, "verifyOidcIdToken", token, "expected-nonce", "client-id",
                "https://www.linkedin.com/oauth/openid/jwks", Set.of("https://www.linkedin.com"));
    }
    @Test void validSignedIdentityAccepted() throws Exception { assertNotNull(validate(signed())); }
    @Test void wrongAudienceRejected() throws Exception {
        claims.put("aud", "other-client"); String token = signed();
        assertThrows(OAuthFlowException.class, () -> validate(token));
    }
    @Test void wrongNonceRejected() throws Exception {
        claims.put("nonce", "another-browser"); String token = signed();
        assertThrows(OAuthFlowException.class, () -> validate(token));
    }
    @Test void expiredIdentityRejected() throws Exception {
        claims.put("exp", Instant.now().minusSeconds(1).getEpochSecond()); String token = signed();
        assertThrows(OAuthFlowException.class, () -> validate(token));
    }
    @Test void tamperedSignatureRejected() throws Exception {
        String token = signed(); String[] parts = token.split("\\.");
        byte[] signature = Base64.getUrlDecoder().decode(parts[2]); signature[0] ^= 1;
        String tampered = parts[0] + "." + parts[1] + "." + b64.encodeToString(signature);
        assertThrows(OAuthFlowException.class, () -> validate(tampered));
    }
    @Test void multipleAudiencesRequireAuthorizedParty() throws Exception {
        claims.put("aud", List.of("client-id", "other-client")); String token = signed();
        assertThrows(OAuthFlowException.class, () -> validate(token));
        claims.put("azp", "client-id"); assertNotNull(validate(signed()));
    }
}
