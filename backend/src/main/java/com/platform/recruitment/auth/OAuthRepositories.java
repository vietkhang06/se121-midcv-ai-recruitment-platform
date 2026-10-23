package com.platform.recruitment.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.Instant;
import java.util.Optional;

interface OAuthAccountRepository extends JpaRepository<OAuthAccount, OAuthAccount.Key> {
    Optional<OAuthAccount> findByProviderAndProviderSubject(String provider, String subject);
    Optional<OAuthAccount> findByProviderAndUserId(String provider, java.util.UUID userId);
    boolean existsByProviderAndUserId(String provider, java.util.UUID userId);
}
interface OAuthLoginStateRepository extends JpaRepository<OAuthLoginState, String> {
    @Modifying @Query("update OAuthLoginState s set s.consumedAt = :now where s.stateHash = :hash and s.provider = :provider and s.consumedAt is null and s.expiresAt > :now")
    int consume(@Param("hash") String hash, @Param("provider") String provider, @Param("now") Instant now);
}
interface OAuthLoginTicketRepository extends JpaRepository<OAuthLoginTicket, String> {
    @Modifying @Query("update OAuthLoginTicket t set t.redeemedAt = :now where t.ticketHash = :hash and t.redeemedAt is null and t.expiresAt > :now")
    int redeem(@Param("hash") String hash, @Param("now") Instant now);
    @Query("select t from OAuthLoginTicket t join fetch t.user where t.ticketHash = :hash") Optional<OAuthLoginTicket> findWithUser(@Param("hash") String hash);
}
interface OAuthPendingRegistrationRepository extends JpaRepository<OAuthPendingRegistration, String> {
    @Modifying @Query("update OAuthPendingRegistration p set p.consumedAt = :now where p.ticketHash = :hash and p.consumedAt is null and p.expiresAt > :now")
    int consume(@Param("hash") String hash, @Param("now") Instant now);
}
