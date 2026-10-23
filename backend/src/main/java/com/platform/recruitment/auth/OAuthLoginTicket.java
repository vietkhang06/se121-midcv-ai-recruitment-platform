package com.platform.recruitment.auth;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import com.platform.recruitment.user.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.Instant;

@Entity @Table(name = "oauth_login_tickets") @Getter @Setter @NoArgsConstructor
public class OAuthLoginTicket {
    @Id @JdbcTypeCode(SqlTypes.CHAR) @Column(name = "ticket_hash", length = 64, nullable = false) private String ticketHash;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "user_id", nullable = false) private User user;
    @Column(name = "expires_at", nullable = false) private Instant expiresAt;
    @Column(name = "redeemed_at") private Instant redeemedAt;
    @Column(name = "created_at", nullable = false) private Instant createdAt = Instant.now();
}
