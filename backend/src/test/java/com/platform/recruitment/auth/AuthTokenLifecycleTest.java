package com.platform.recruitment.auth;

import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.document.Documents;
import com.platform.recruitment.user.*;
import org.junit.jupiter.api.*;
import org.springframework.jdbc.core.JdbcTemplate;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class AuthTokenLifecycleTest {
    static final String SECRET="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    JwtTokenProvider tokens; JdbcTemplate db; UserRepository users; AuthSessionService sessions; User user; UUID sid;
    @BeforeEach void setup() {
        tokens=new JwtTokenProvider(SECRET,15000,60000); db=mock(JdbcTemplate.class); users=mock(UserRepository.class);
        sessions=new AuthSessionService(db,tokens,users);
        user=User.builder().email("test@example.invalid").role(Role.CANDIDATE).emailVerified(true).build();
        user.setId(UUID.randomUUID()); sid=UUID.randomUUID();
    }
    Map<String,Object> row(String refresh) {
        Map<String,Object> r=new HashMap<>(); r.put("user_id",user.getId()); r.put("refresh_hash",Documents.shaHex(refresh));
        r.put("expires_at",Timestamp.from(Instant.now().plusSeconds(60))); return r;
    }
    @Test void accessAndRefreshHaveDistinctPurposesAndUniqueIds() {
        String access=tokens.generateAccessToken(user.getId(),user.getEmail(),user.getRole(),sid);
        String refresh=tokens.generateRefreshToken(user.getId(),sid);
        assertTrue(tokens.isAccessToken(access)); assertFalse(tokens.isAccessToken(refresh));
        assertTrue(tokens.isRefreshToken(refresh)); assertFalse(tokens.isRefreshToken(access));
        assertEquals(sid,tokens.getSessionId(access)); assertNotEquals(refresh,tokens.generateRefreshToken(user.getId(),sid));
    }
    @Test void expiredAndTamperedTokensCannotAuthenticate() {
        JwtTokenProvider expired=new JwtTokenProvider(SECRET,-1000,-1000);
        assertFalse(tokens.isAccessToken(expired.generateAccessToken(user.getId(),user.getEmail(),user.getRole(),sid)));
        assertFalse(tokens.isRefreshToken(expired.generateRefreshToken(user.getId(),sid)));
        assertFalse(tokens.isAccessToken("invalid.signature.token"));
    }
    @Test void refreshRejectsAccessTokenBeforeDatabaseAccess() {
        assertThrows(CustomException.class,()->sessions.refresh(tokens.generateAccessToken(user.getId(),user.getEmail(),user.getRole(),sid)));
        verifyNoInteractions(db,users);
    }
    @Test void refreshRotatesAndReturnsConfiguredExpiry() {
        String refresh=tokens.generateRefreshToken(user.getId(),sid);
        when(db.queryForList(anyString(),eq(sid))).thenReturn(List.of(row(refresh)));
        when(users.findById(user.getId())).thenReturn(Optional.of(user));
        JwtResponse result=sessions.refresh(refresh);
        assertNotEquals(refresh,result.getRefreshToken()); assertEquals(15L,result.getExpiresIn());
        assertTrue(tokens.isAccessToken(result.getAccessToken()));
        verify(db).update(startsWith("UPDATE auth_sessions SET refresh_hash="),eq(Documents.shaHex(result.getRefreshToken())),eq(sid));
    }
    @Test void replayRevokesSessionBeforeReturningFailure() {
        String old=tokens.generateRefreshToken(user.getId(),sid); Map<String,Object> row=row(old); row.put("refresh_hash",Documents.shaHex("newer-token"));
        when(db.queryForList(anyString(),eq(sid))).thenReturn(List.of(row));
        assertThrows(CustomException.class,()->sessions.refresh(old));
        verify(db).update("UPDATE auth_sessions SET revoked_at=now() WHERE id=?",sid);
        verifyNoInteractions(users);
    }
    @Test void revokedAndExpiredSessionsCannotRefresh() {
        String refresh=tokens.generateRefreshToken(user.getId(),sid); Map<String,Object> r=row(refresh); r.put("revoked_at",Timestamp.from(Instant.now()));
        when(db.queryForList(anyString(),eq(sid))).thenReturn(List.of(r)); assertThrows(CustomException.class,()->sessions.refresh(refresh));
        r.remove("revoked_at"); r.put("expires_at",Timestamp.from(Instant.now().minusSeconds(1))); assertThrows(CustomException.class,()->sessions.refresh(refresh));
    }
    @Test void passwordInvalidationBlocksRefresh() {
        String refresh=tokens.generateRefreshToken(user.getId(),sid);
        when(db.queryForList(anyString(),eq(sid))).thenReturn(List.of(row(refresh)));
        user.setAuthInvalidBefore(Instant.now().plusSeconds(1)); when(users.findById(user.getId())).thenReturn(Optional.of(user));
        assertThrows(CustomException.class,()->sessions.refresh(refresh));
        verify(db).update("UPDATE auth_sessions SET revoked_at=now() WHERE id=?",sid);
    }
}
