package com.platform.recruitment.auth;

import com.platform.recruitment.user.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.time.Instant;

@Entity
@Table(name = "user_oauth_accounts")
@IdClass(OAuthAccount.Key.class)
@Getter @Setter @NoArgsConstructor
public class OAuthAccount {
    @Id @Column(name = "provider", nullable = false, length = 16) private String provider;
    @Id @Column(name = "provider_subject", nullable = false, length = 255) private String providerSubject;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "user_id", nullable = false) private User user;
    @Column(name = "provider_email", length = 255) private String providerEmail;
    @Column(name = "provider_login", length = 255) private String providerLogin;
    @Column(name = "created_at", nullable = false) private Instant createdAt = Instant.now();

    @Getter @NoArgsConstructor
    public static class Key implements Serializable {
        private String provider;
        private String providerSubject;
        public Key(String provider, String providerSubject) { this.provider = provider; this.providerSubject = providerSubject; }
        @Override public boolean equals(Object other) { return other instanceof Key k && provider.equals(k.provider) && providerSubject.equals(k.providerSubject); }
        @Override public int hashCode() { return 31 * provider.hashCode() + providerSubject.hashCode(); }
    }
}
