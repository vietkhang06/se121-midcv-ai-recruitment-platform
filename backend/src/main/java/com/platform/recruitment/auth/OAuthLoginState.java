package com.platform.recruitment.auth;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import com.platform.recruitment.user.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.Instant;
import java.util.UUID;

@Entity @Table(name = "oauth_login_states") @Getter @Setter @NoArgsConstructor
public class OAuthLoginState {
    @Id
    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(name = "state_hash", length = 64)
    private String stateHash;
    @Column(nullable = false, length = 16) private String provider;
    @Column(name = "code_verifier", nullable = false, length = 128) private String codeVerifier;
    @Column(nullable = false, length = 128) private String nonce;
    @Column(name = "return_to", nullable = false, length = 512) private String returnTo = "/candidate";
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "link_user_id") private User linkUser;
    @Column(name = "expires_at", nullable = false) private Instant expiresAt;
    @Column(name = "consumed_at") private Instant consumedAt;
    @Column(name = "created_at", nullable = false) private Instant createdAt = Instant.now();
}
