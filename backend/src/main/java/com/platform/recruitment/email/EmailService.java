package com.platform.recruitment.email;

public interface EmailService {
    void sendVerificationEmail(String recipientEmail, String verificationToken);
    String getLastSentTokenForDev(String recipientEmail);
}
