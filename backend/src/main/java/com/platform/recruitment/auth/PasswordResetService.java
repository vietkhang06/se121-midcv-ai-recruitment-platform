package com.platform.recruitment.auth;

import com.platform.recruitment.common.*;
import com.platform.recruitment.document.Documents;
import com.platform.recruitment.email.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.*;
import java.security.SecureRandom;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class PasswordResetService {
    private final JdbcTemplate db;
    private final PasswordEncoder passwords;
    private final EmailService email;

    @Transactional
    public void request(String address) {
        List<Map<String,Object>> users = db.queryForList("SELECT id,email FROM users WHERE lower(email)=lower(?) AND is_active=true FOR UPDATE", address.trim());
        if (users.isEmpty()) return;
        UUID user = (UUID) users.get(0).get("id");
        Boolean recent = db.queryForObject("SELECT EXISTS(SELECT 1 FROM password_reset_tokens WHERE user_id=? AND created_at>now()-interval '60 seconds')", Boolean.class, user);
        if (Boolean.TRUE.equals(recent)) return;
        byte[] bytes = new byte[32]; new SecureRandom().nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        db.update("UPDATE password_reset_tokens SET used_at=now() WHERE user_id=? AND used_at IS NULL", user);
        db.update("INSERT INTO password_reset_tokens(token_hash,user_id,expires_at) VALUES (?,?,?)", Documents.shaHex(token), user, Timestamp.from(Instant.now().plusSeconds(1800)));
        String recipient = (String)users.get(0).get("email");
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit() {
                try { email.sendPasswordResetEmail(recipient, token); }
                catch (Exception ex) { log.error("Password reset email delivery failed for userId={}", user, ex); }
            }
        });
    }

    @Transactional
    public void reset(String token, String password) {
        if (password.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72) throw new CustomException(ErrorCode.VALIDATION_ERROR,"Mật khẩu không được vượt quá 72 byte UTF-8.");
        db.queryForList("SELECT id FROM users WHERE id=(SELECT user_id FROM password_reset_tokens WHERE token_hash=?) FOR UPDATE", Documents.shaHex(token));
        List<Map<String,Object>> rows = db.queryForList("SELECT * FROM password_reset_tokens WHERE token_hash=? FOR UPDATE", Documents.shaHex(token));
        if (rows.isEmpty()) throw invalid();
        Map<String,Object> row = rows.get(0);
        if (row.get("used_at") != null || !((Timestamp)row.get("expires_at")).toInstant().isAfter(Instant.now())) throw invalid();
        UUID user = (UUID)row.get("user_id");
        db.update("UPDATE users SET password_hash=?,auth_invalid_before=now(),updated_at=now() WHERE id=?", passwords.encode(password),user);
        db.update("UPDATE password_reset_tokens SET used_at=now() WHERE user_id=? AND used_at IS NULL",user);
        db.update("UPDATE auth_sessions SET revoked_at=now() WHERE user_id=? AND revoked_at IS NULL",user);
    }
    private static CustomException invalid() { return new CustomException(ErrorCode.TOKEN_INVALID,"Liên kết đặt lại mật khẩu không hợp lệ, đã dùng hoặc hết hạn."); }
}
