package com.platform.recruitment.email;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@ConditionalOnProperty(name = "app.email-mode", havingValue = "SMTP")
public class SmtpEmailService implements EmailService {

    @Override
    public void sendVerificationEmail(String recipientEmail, String verificationToken) {
        // Production SMTP email dispatch skeleton
        log.info("[SMTP EMAIL SERVICE] Dispatching verification email to {} via SMTP server.", recipientEmail);
    }

    @Override
    public String getLastSentTokenForDev(String recipientEmail) {
        return null;
    }
}
