package com.platform.recruitment.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.platform.recruitment.candidate.CandidateProfile;
import com.platform.recruitment.candidate.CandidateProfileRepository;
import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.ErrorCode;
import com.platform.recruitment.user.Role;
import com.platform.recruitment.user.User;
import com.platform.recruitment.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriUtils;

import java.math.BigInteger;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.MessageDigest;
import java.security.Signature;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.RSAPublicKeySpec;
import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
public class OAuthService {
    private final OAuthAccountRepository accounts;
    private final OAuthLoginStateRepository states;
    private final OAuthLoginTicketRepository tickets;
    private final OAuthPendingRegistrationRepository pendingRegistrations;
    private final UserRepository users;
    private final CandidateProfileRepository profiles;
    private final AuthService authService;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
    private final ObjectMapper mapper;

    @Value("${app.oauth.google.client-id:}") private String googleClientId;
    @Value("${app.oauth.google.client-secret:}") private String googleClientSecret;
    @Value("${app.oauth.github.client-id:}") private String githubClientId;
    @Value("${app.oauth.github.client-secret:}") private String githubClientSecret;
    @Value("${app.public-base-url:http://localhost:8080}") private String backendBaseUrl;
    @Value("${app.frontend-url:http://localhost:3000}") private String frontendUrl;

    private volatile HttpClient http;
    private static final Base64.Encoder B64URL = Base64.getUrlEncoder().withoutPadding();

    @Transactional
    public String authorizationUrl(String provider, String requestedReturnTo, User linkUser) {
        provider = providerName(provider);
        if (provider.equals("google") && (blank(googleClientId) || blank(googleClientSecret)) || provider.equals("github") && (blank(githubClientId) || blank(githubClientSecret))) {
            throw failure("provider_not_configured", "Đăng nhập qua nhà cung cấp này chưa được cấu hình.");
        }
        String state = randomToken(32), verifier = randomToken(48), nonce = randomToken(32);
        OAuthLoginState row = new OAuthLoginState();
        row.setStateHash(sha256(state)); row.setProvider(provider); row.setCodeVerifier(verifier); row.setNonce(nonce);
        String returnTo = linkUser == null ? validateReturnTo(requestedReturnTo) : (linkUser.getRole() == Role.HR ? "/recruiter/profile" : "/candidate/profile");
        row.setReturnTo(returnTo); row.setLinkUser(linkUser); row.setExpiresAt(Instant.now().plusSeconds(600));
        states.save(row);

        String callback = callback(provider);
        String challenge = B64URL.encodeToString(sha256Bytes(verifier));
        Map<String, String> params = new LinkedHashMap<>();
        params.put("client_id", provider.equals("google") ? googleClientId : githubClientId);
        params.put("redirect_uri", callback); params.put("response_type", "code"); params.put("state", state);
        params.put("code_challenge", challenge); params.put("code_challenge_method", "S256");
        if (provider.equals("google")) {
            params.put("scope", "openid email profile"); params.put("nonce", nonce); params.put("prompt", "select_account");
        } else {
            params.put("scope", "read:user user:email");
        }
        String query = params.entrySet().stream().map(e -> enc(e.getKey()) + "=" + enc(e.getValue())).reduce((a,b) -> a + "&" + b).orElse("");
        return (provider.equals("google") ? "https://accounts.google.com/o/oauth2/v2/auth" : "https://github.com/login/oauth/authorize") + "?" + query;
    }

    @Transactional
    public CallbackResult callback(String providerValue, String stateValue, String code, String providerError) {
        String provider = providerName(providerValue);
        if (!blank(providerError)) throw failure("cancelled", "Đăng nhập đã bị hủy hoặc nhà cung cấp từ chối yêu cầu.");
        if (blank(stateValue) || blank(code)) throw failure("invalid_callback", "Phản hồi đăng nhập không hợp lệ. Vui lòng thử lại.");
        String hash = sha256(stateValue); Instant now = Instant.now();
        OAuthLoginState row = states.findById(hash).orElseThrow(() -> failure("invalid_state", "Phiên đăng nhập không hợp lệ hoặc đã hết hạn."));
        if (states.consume(hash, provider, now) != 1) throw failure("invalid_state", "Phiên đăng nhập đã hết hạn hoặc đã được sử dụng.");
        Identity identity = provider.equals("google") ? googleIdentity(code, row) : githubIdentity(code, row);
        Optional<OAuthAccount> linked = accounts.findByProviderAndProviderSubject(provider, identity.subject());
        if (row.getLinkUser() != null) {
            if (linked.isPresent() && !linked.get().getUser().getId().equals(row.getLinkUser().getId())) throw failure("account_conflict", "Tài khoản nhà cung cấp này đã được liên kết với tài khoản MidCV khác.");
            if (linked.isEmpty()) { OAuthAccount account = new OAuthAccount(); account.setProvider(provider); account.setProviderSubject(identity.subject()); account.setProviderEmail(identity.email()); account.setProviderLogin(identity.login()); account.setUser(row.getLinkUser()); accounts.save(account); }
            return new CallbackResult(row.getReturnTo(), null, true, false, provider);
        }
        User user;
        if (linked.isPresent()) {
            user = linked.get().getUser();
            if (user.isDeactivated() || user.isSuspended()) throw failure("account_disabled", "Tài khoản MidCV hiện không thể đăng nhập.");
            if (!Boolean.TRUE.equals(user.getEmailVerified())) throw failure("email_unverified", "Hãy xác minh email đã đăng ký rồi quay lại đăng nhập.");
        } else {
            if (blank(identity.email())) {
                String pendingTicket = randomToken(32);
                OAuthPendingRegistration pending = new OAuthPendingRegistration(); pending.setTicketHash(sha256(pendingTicket)); pending.setProvider(provider); pending.setProviderSubject(identity.subject()); pending.setProviderLogin(identity.login()); pending.setDisplayName(nonBlank(identity.name(), identity.login())); pending.setExpiresAt(now.plusSeconds(600)); pendingRegistrations.save(pending);
                return new CallbackResult("/candidate", pendingTicket, false, true, provider);
            }
            String email = identity.email().trim().toLowerCase(Locale.ROOT);
            if (users.existsByEmail(email)) throw failure("account_conflict", "Email này đã có tài khoản MidCV. Hãy đăng nhập bằng phương thức hiện có rồi liên kết nhà cung cấp trong hồ sơ tài khoản.");
            user = User.builder().email(email).passwordHash(passwordEncoder.encode(UUID.randomUUID().toString())).role(Role.CANDIDATE).isActive(true).emailVerified(identity.emailVerified()).build();
            user = users.saveAndFlush(user);
            profiles.save(CandidateProfile.builder().user(user).fullName(nonBlank(identity.name(), identity.login(), email)).build());
            OAuthAccount account = new OAuthAccount(); account.setProvider(provider); account.setProviderSubject(identity.subject()); account.setProviderEmail(email); account.setProviderLogin(identity.login()); account.setUser(user); accounts.save(account);
        }
        String ticket = randomToken(32);
        OAuthLoginTicket loginTicket = new OAuthLoginTicket(); loginTicket.setTicketHash(sha256(ticket)); loginTicket.setUser(user); loginTicket.setExpiresAt(now.plusSeconds(60)); tickets.save(loginTicket);
        return new CallbackResult(row.getReturnTo(), ticket, false, false, provider);
    }

    @Transactional
    public void completeGithubRegistration(String rawTicket, String emailValue) {
        if (blank(rawTicket) || blank(emailValue)) throw failure("completion_invalid", "Nhập email hợp lệ để hoàn tất đăng ký.");
        String hash = sha256(rawTicket); Instant now = Instant.now();
        OAuthPendingRegistration pending = pendingRegistrations.findById(hash).orElseThrow(() -> failure("completion_expired", "Yêu cầu đăng ký đã hết hạn. Hãy thử đăng nhập GitHub lại."));
        if (pendingRegistrations.consume(hash, now) != 1) throw failure("completion_expired", "Yêu cầu đăng ký đã hết hạn hoặc đã được dùng.");
        String email = emailValue.trim().toLowerCase(Locale.ROOT);
        if (users.existsByEmail(email)) throw failure("account_conflict", "Email này đã có tài khoản MidCV. Hãy đăng nhập bằng tài khoản hiện có và liên kết GitHub trong hồ sơ.");
        RegisterCandidateRequest request = new RegisterCandidateRequest(); request.setEmail(email); request.setFullName(nonBlank(pending.getDisplayName(), pending.getProviderLogin())); request.setPassword(randomToken(48));
        authService.registerCandidate(request);
        User user = users.findByEmail(email).orElseThrow(() -> failure("provider_error", "Không thể tạo tài khoản. Vui lòng thử lại."));
        OAuthAccount account = new OAuthAccount(); account.setProvider(pending.getProvider()); account.setProviderSubject(pending.getProviderSubject()); account.setProviderLogin(pending.getProviderLogin()); account.setUser(user); accounts.save(account);
    }

    @Transactional
    public JwtResponse redeem(String rawTicket) {
        if (blank(rawTicket)) throw failure("invalid_ticket", "Vé đăng nhập không hợp lệ hoặc đã hết hạn.");
        String hash = sha256(rawTicket); Instant now = Instant.now();
        OAuthLoginTicket ticket = tickets.findWithUser(hash).orElseThrow(() -> failure("invalid_ticket", "Vé đăng nhập không hợp lệ hoặc đã hết hạn."));
        if (tickets.redeem(hash, now) != 1) throw failure("invalid_ticket", "Vé đăng nhập đã hết hạn hoặc đã được sử dụng.");
        return authService.buildJwtResponse(ticket.getUser());
    }

    private Identity googleIdentity(String code, OAuthLoginState state) {
        JsonNode token = postForm("https://oauth2.googleapis.com/token", Map.of("code", code, "client_id", googleClientId, "client_secret", googleClientSecret, "redirect_uri", callback("google"), "grant_type", "authorization_code", "code_verifier", state.getCodeVerifier()));
        String idToken = token.path("id_token").asText("");
        JsonNode claims = verifyGoogleIdToken(idToken, state.getNonce());
        if (!claims.path("email_verified").asBoolean(false)) throw failure("email_unverified", "Google không xác nhận email này. Hãy chọn tài khoản Google có email đã xác minh.");
        return new Identity(claims.path("sub").asText(), claims.path("email").asText(), true, claims.path("name").asText(), "");
    }

    private Identity githubIdentity(String code, OAuthLoginState state) {
        JsonNode token = postForm("https://github.com/login/oauth/access_token", Map.of("code", code, "client_id", githubClientId, "client_secret", githubClientSecret, "redirect_uri", callback("github"), "code_verifier", state.getCodeVerifier()), true);
        String accessToken = token.path("access_token").asText("");
        if (accessToken.isBlank()) throw failure("provider_error", "GitHub không hoàn tất xác thực. Vui lòng thử lại.");
        JsonNode user = getJson("https://api.github.com/user", accessToken);
        String email = "";
        JsonNode emails = getJson("https://api.github.com/user/emails", accessToken);
        if (emails.isArray()) for (JsonNode item : emails) if (item.path("primary").asBoolean() && item.path("verified").asBoolean()) { email = item.path("email").asText(""); break; }
        String subject = user.path("id").asText("");
        if (subject.isBlank()) throw failure("provider_error", "GitHub không trả về định danh hợp lệ.");
        return new Identity(subject, email, !email.isBlank(), user.path("name").asText(""), user.path("login").asText(""));
    }

    private JsonNode verifyGoogleIdToken(String token, String expectedNonce) {
        try {
            String[] parts = token.split("\\."); if (parts.length != 3) throw new IllegalArgumentException();
            JsonNode header = mapper.readTree(Base64.getUrlDecoder().decode(parts[0]));
            JsonNode claims = mapper.readTree(Base64.getUrlDecoder().decode(parts[1]));
            if (!"RS256".equals(header.path("alg").asText())) throw new IllegalArgumentException();
            JsonNode keys = getJson("https://www.googleapis.com/oauth2/v3/certs", null).path("keys");
            JsonNode jwk = null; for (JsonNode candidate : keys) if (candidate.path("kid").asText().equals(header.path("kid").asText())) { jwk = candidate; break; }
            if (jwk == null) throw new IllegalArgumentException();
            BigInteger modulus = new BigInteger(1, Base64.getUrlDecoder().decode(jwk.path("n").asText()));
            BigInteger exponent = new BigInteger(1, Base64.getUrlDecoder().decode(jwk.path("e").asText()));
            RSAPublicKey key = (RSAPublicKey) KeyFactory.getInstance("RSA").generatePublic(new RSAPublicKeySpec(modulus, exponent));
            Signature verifier = Signature.getInstance("SHA256withRSA"); verifier.initVerify(key); verifier.update((parts[0] + "." + parts[1]).getBytes(StandardCharsets.US_ASCII));
            if (!verifier.verify(Base64.getUrlDecoder().decode(parts[2]))) throw new IllegalArgumentException();
            String issuer = claims.path("iss").asText();
            boolean audienceMatches = claims.path("aud").isTextual() ? googleClientId.equals(claims.path("aud").asText()) : iterableContains(claims.path("aud"), googleClientId);
            if (!(issuer.equals("https://accounts.google.com") || issuer.equals("accounts.google.com")) || !audienceMatches || claims.path("exp").asLong(0) <= Instant.now().getEpochSecond() || !expectedNonce.equals(claims.path("nonce").asText())) throw new IllegalArgumentException();
            return claims;
        } catch (Exception e) { throw failure("invalid_identity", "Google không thể xác minh phản hồi đăng nhập. Vui lòng thử lại."); }
    }

    private JsonNode postForm(String url, Map<String, String> form) { return postForm(url, form, false); }
    private JsonNode postForm(String url, Map<String, String> form, boolean github) {
        try {
            String body = form.entrySet().stream().map(e -> enc(e.getKey()) + "=" + enc(e.getValue())).reduce((a,b) -> a + "&" + b).orElse("");
            HttpRequest.Builder request = HttpRequest.newBuilder(URI.create(url)).timeout(java.time.Duration.ofSeconds(12)).header("Accept", github ? "application/vnd.github+json" : "application/json").header("Content-Type", "application/x-www-form-urlencoded").POST(HttpRequest.BodyPublishers.ofString(body));
            return parseResponse(httpClient().send(request.build(), HttpResponse.BodyHandlers.ofString()));
        } catch (Exception e) { throw failure("provider_unavailable", "Không thể kết nối nhà cung cấp đăng nhập. Vui lòng thử lại sau."); }
    }
    private JsonNode getJson(String url, String bearer) {
        try {
            HttpRequest.Builder request = HttpRequest.newBuilder(URI.create(url)).timeout(java.time.Duration.ofSeconds(12)).header("Accept", "application/json");
            if (bearer != null) request.header("Authorization", "Bearer " + bearer);
            return parseResponse(httpClient().send(request.GET().build(), HttpResponse.BodyHandlers.ofString()));
        } catch (Exception e) { throw failure("provider_unavailable", "Không thể xác minh tài khoản với nhà cung cấp. Vui lòng thử lại sau."); }
    }
    private JsonNode parseResponse(HttpResponse<String> response) throws Exception { if (response.statusCode() < 200 || response.statusCode() >= 300) throw new IllegalStateException(); return mapper.readTree(response.body()); }
    private HttpClient httpClient() { HttpClient current = http; if (current == null) synchronized (this) { current = http; if (current == null) http = current = HttpClient.newBuilder().followRedirects(HttpClient.Redirect.NEVER).build(); } return current; }
    private static boolean iterableContains(JsonNode array, String value) { if (array.isArray()) for (JsonNode item : array) if (item.asText().equals(value)) return true; return false; }
    private static String providerName(String value) { if ("google".equalsIgnoreCase(value) || "github".equalsIgnoreCase(value)) return value.toLowerCase(Locale.ROOT); throw failure("unsupported_provider", "Nhà cung cấp đăng nhập không được hỗ trợ."); }
    private String callback(String provider) { return backendBaseUrl.replaceAll("/+$", "") + "/api/v1/auth/oauth/" + provider + "/callback"; }
    private String validateReturnTo(String path) { if (blank(path)) return "/candidate"; try { URI uri = URI.create(path); if (!path.startsWith("/") || path.startsWith("//") || path.contains("\\") || uri.isAbsolute() || uri.getHost() != null || path.chars().anyMatch(Character::isISOControl)) return "/candidate"; return uri.toString(); } catch (Exception e) { return "/candidate"; } }
    private String frontendRedirect(String returnTo, String ticket, boolean linked, boolean completionRequired, String provider) { String origin = frontendUrl.replaceAll("/+$", ""); String path = linked ? returnTo : (completionRequired ? "/oauth/complete" : "/oauth/callback"); String query = linked ? (path.contains("?") ? "&" : "?") + "linked=1&provider=" + enc(provider) : "?ticket=" + enc(ticket) + "&next=" + enc(returnTo); return origin + path + query; }
    public String redirectFor(CallbackResult result) { return frontendRedirect(result.returnTo(), result.ticket(), result.linked(), result.completionRequired(), result.provider()); }
    private static String randomToken(int bytes) { byte[] data = new byte[bytes]; new java.security.SecureRandom().nextBytes(data); return B64URL.encodeToString(data); }
    private static String sha256(String value) { return HexFormat.of().formatHex(sha256Bytes(value)); }
    private static byte[] sha256Bytes(String value) { return sha256Bytes(value.getBytes(StandardCharsets.UTF_8)); }
    private static byte[] sha256Bytes(byte[] value) { try { return MessageDigest.getInstance("SHA-256").digest(value); } catch (Exception e) { throw new IllegalStateException(e); } }
    private static String enc(String value) { return URLEncoder.encode(value, StandardCharsets.UTF_8); }
    private static boolean blank(String value) { return value == null || value.isBlank(); }
    private static String nonBlank(String... values) { for (String value : values) if (!blank(value)) return value; return "Ứng viên"; }
    private static OAuthFlowException failure(String code, String message) { return new OAuthFlowException(code, message); }
    public String errorRedirect(String reason) { Set<String> allowed = Set.of("cancelled", "invalid_callback", "invalid_state", "provider_not_configured", "provider_error", "provider_unavailable", "invalid_identity", "email_unverified", "email_required", "account_conflict", "account_disabled", "unsupported_provider", "invalid_ticket", "completion_invalid", "completion_expired"); return frontendUrl.replaceAll("/+$", "") + "/login?oauth_error=" + (allowed.contains(reason) ? reason : "provider_error"); }
    public boolean isGithubOwned(UUID userId, String username) { if (blank(username)) return false; return accounts.findByProviderAndUserId("github", userId).map(a -> a.getProviderLogin() != null && a.getProviderLogin().equalsIgnoreCase(username)).orElse(false); }
    public Map<String, Object> githubConnection(UUID userId) {
        Optional<OAuthAccount> linked = accounts.findByProviderAndUserId("github", userId);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("connected", linked.isPresent());
        result.put("login", linked.map(OAuthAccount::getProviderLogin).orElse(null));
        result.put("ownershipVerified", linked.isPresent());
        result.put("scanScope", "PUBLIC_PROFILE_ONLY");
        return result;
    }
    public record CallbackResult(String returnTo, String ticket, boolean linked, boolean completionRequired, String provider) {}
    private record Identity(String subject, String email, boolean emailVerified, String name, String login) {}
}
