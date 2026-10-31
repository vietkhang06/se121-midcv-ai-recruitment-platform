package com.platform.recruitment.auth;

import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.ErrorCode;
import com.platform.recruitment.document.Documents;
import com.platform.recruitment.user.User;
import com.platform.recruitment.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
public class AuthSessionService {
    private final JdbcTemplate db;
    private final JwtTokenProvider tokens;
    private final UserRepository users;

    @Transactional
    public JwtResponse create(User user) {
        UUID sid = UUID.randomUUID();
        String refresh = tokens.generateRefreshToken(user.getId(), sid);
        db.update("INSERT INTO auth_sessions(id,user_id,refresh_hash,expires_at) VALUES (?,?,?,?)",
                sid, user.getId(), Documents.shaHex(refresh), Timestamp.from(Instant.now().plusMillis(tokens.getRefreshTokenExpirationMs())));
        return response(user, sid, refresh);
    }

    // A detected replay must commit revocation even though the request returns 401.
    @Transactional(noRollbackFor = CustomException.class)
    public JwtResponse refresh(String refresh) {
        if (!tokens.isRefreshToken(refresh)) throw invalid();
        UUID sid = tokens.getSessionId(refresh);
        if (sid == null) throw invalid();
        List<Map<String,Object>> rows = db.queryForList("SELECT * FROM auth_sessions WHERE id=? FOR UPDATE", sid);
        if (rows.isEmpty()) throw invalid();
        Map<String,Object> row = rows.get(0);
        if (row.get("revoked_at") != null || !((Timestamp)row.get("expires_at")).toInstant().isAfter(Instant.now())) throw invalid();
        if (!Objects.equals(row.get("user_id"), tokens.getUserIdFromToken(refresh))) throw invalid();
        if (!Objects.equals(row.get("refresh_hash"), Documents.shaHex(refresh))) {
            db.update("UPDATE auth_sessions SET revoked_at=now() WHERE id=?", sid);
            throw invalid();
        }
        User user = users.findById((UUID)row.get("user_id")).orElseThrow(AuthSessionService::invalid);
        if (user.isDeactivated() || user.isSuspended() || !Boolean.TRUE.equals(user.getEmailVerified())
                || user.getAuthInvalidBefore() != null && tokens.getIssuedAtMillis(refresh) <= user.getAuthInvalidBefore().toEpochMilli()) {
            db.update("UPDATE auth_sessions SET revoked_at=now() WHERE id=?", sid);
            throw invalid();
        }
        String rotated = tokens.generateRefreshToken(user.getId(), sid);
        db.update("UPDATE auth_sessions SET refresh_hash=?,last_used_at=now() WHERE id=?", Documents.shaHex(rotated), sid);
        return response(user, sid, rotated);
    }

    public boolean active(UUID sid, UUID userId) {
        return Boolean.TRUE.equals(db.queryForObject("SELECT EXISTS(SELECT 1 FROM auth_sessions WHERE id=? AND user_id=? AND revoked_at IS NULL AND expires_at>now())", Boolean.class, sid, userId));
    }

    public List<Map<String,Object>> list(UUID userId, UUID current) {
        return db.queryForList("SELECT id,created_at,last_used_at,expires_at FROM auth_sessions WHERE user_id=? AND revoked_at IS NULL AND expires_at>now() ORDER BY created_at DESC", userId)
                .stream().map(row -> { row.put("current", Objects.equals(current, row.get("id"))); return row; }).toList();
    }

    public void revoke(UUID userId, UUID sid) {
        db.update("UPDATE auth_sessions SET revoked_at=now() WHERE id=? AND user_id=? AND revoked_at IS NULL", sid, userId);
    }

    private JwtResponse response(User user, UUID sid, String refresh) {
        return JwtResponse.builder().accessToken(tokens.generateAccessToken(user.getId(),user.getEmail(),user.getRole(),sid))
                .refreshToken(refresh).tokenType("Bearer").expiresIn(tokens.getAccessTokenExpirationSeconds())
                .userId(user.getId()).email(user.getEmail()).role(user.getRole()).build();
    }
    private static CustomException invalid() { return new CustomException(ErrorCode.AUTHENTICATION_FAILED, "Phiên đăng nhập đã hết hạn, bị thu hồi hoặc token không hợp lệ."); }
}
