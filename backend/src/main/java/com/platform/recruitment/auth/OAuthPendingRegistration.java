package com.platform.recruitment.auth;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.Instant;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity @Table(name = "oauth_pending_registrations") @Getter @Setter @NoArgsConstructor
public class OAuthPendingRegistration {
    @Id
    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(name = "ticket_hash", length = 64, nullable = false)
    private String ticketHash;
    @Column(nullable = false, length = 16) private String provider;
    @Column(name = "provider_subject", nullable = false, length = 255) private String providerSubject;
    @Column(name = "provider_login", length = 255) private String providerLogin;
    @Column(name = "display_name", length = 255) private String displayName;
    @Column(name = "expires_at", nullable = false) private Instant expiresAt;
    @Column(name = "consumed_at") private Instant consumedAt;
    @Column(name = "created_at", nullable = false) private Instant createdAt = Instant.now();
}
