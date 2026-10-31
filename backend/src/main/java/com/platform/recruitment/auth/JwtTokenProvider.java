package com.platform.recruitment.auth;

import com.platform.recruitment.user.Role;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

@Slf4j
@Component
public class JwtTokenProvider {

    private final SecretKey key;
    private final long accessTokenExpirationMs;
    private final long refreshTokenExpirationMs;

    public JwtTokenProvider(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.expiration-ms:3600000}") long accessTokenExpirationMs,
            @Value("${jwt.refresh-expiration-ms:604800000}") long refreshTokenExpirationMs) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessTokenExpirationMs = accessTokenExpirationMs;
        this.refreshTokenExpirationMs = refreshTokenExpirationMs;
    }

    public long getAccessTokenExpirationSeconds() { return accessTokenExpirationMs / 1000; }
    public long getRefreshTokenExpirationMs() { return refreshTokenExpirationMs; }

    public String generateAccessToken(UUID userId, String email, Role role) {
        return generateAccessToken(userId, email, role, null);
    }

    public String generateAccessToken(UUID userId, String email, Role role, UUID sessionId) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + accessTokenExpirationMs);

        return Jwts.builder()
                .subject(userId.toString())
                .claim("token_type", "ACCESS")
                .claim("sid", sessionId == null ? null : sessionId.toString())
                .id(UUID.randomUUID().toString())
                .claim("email", email)
                .claim("role", role.name())
                .claim("iat_ms",now.getTime())
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(key)
                .compact();
    }

    public String generateRefreshToken(UUID userId) {
        return generateRefreshToken(userId, null);
    }

    public String generateRefreshToken(UUID userId, UUID sessionId) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + refreshTokenExpirationMs);

        return Jwts.builder()
                .subject(userId.toString())
                .claim("token_type", "REFRESH")
                .claim("sid", sessionId == null ? null : sessionId.toString())
                .id(UUID.randomUUID().toString())
                .claim("iat_ms",now.getTime())
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(key)
                .compact();
    }

    public UUID getUserIdFromToken(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
        return UUID.fromString(claims.getSubject());
    }

    public String getRoleFromToken(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
        return claims.get("role", String.class);
    }

    public long getIssuedAtMillis(String token) {
        Claims c=Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
        Number n=c.get("iat_ms",Number.class);return n!=null?n.longValue():c.getIssuedAt()==null?0:c.getIssuedAt().getTime();
    }
    public UUID getSessionId(String token) {
        String value = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload().get("sid", String.class);
        return value == null ? null : UUID.fromString(value);
    }

    public boolean isAccessToken(String token) { return hasType(token, "ACCESS"); }
    public boolean isRefreshToken(String token) { return hasType(token, "REFRESH"); }
    private boolean hasType(String token, String type) {
        try { return type.equals(Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload().get("token_type", String.class)); }
        catch (JwtException | IllegalArgumentException e) { return false; }
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parser().verifyWith(key).build().parseSignedClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException ex) {
            log.error("Invalid JWT token: {}", ex.getMessage());
        }
        return false;
    }
}
