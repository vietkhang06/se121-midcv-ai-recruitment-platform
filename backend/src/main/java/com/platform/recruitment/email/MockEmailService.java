package com.platform.recruitment.email;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@ConditionalOnProperty(name = "app.email-mode", havingValue = "MOCK", matchIfMissing = true)
public class MockEmailService implements EmailService {

    private final Map<String, String> devTokenStore = new ConcurrentHashMap<>();

    @Override
    public void sendVerificationEmail(String recipientEmail, String verificationToken) {
        devTokenStore.put(recipientEmail, verificationToken);
        String verificationUrl = "http://localhost:3000/verify-email?token=" + verificationToken;
        log.info("[MOCK EMAIL SERVICE] Verification email sent to: {} | Verification URL: {}", recipientEmail, verificationUrl);
    }

    @Override
    public String getLastSentTokenForDev(String recipientEmail) {
        return devTokenStore.get(recipientEmail);
    }
}
