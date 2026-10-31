package com.platform.recruitment.email;

public interface EmailService {
    void sendVerificationEmail(String recipientEmail, String verificationToken);
    default void sendPasswordResetEmail(String recipientEmail, String token) { throw new UnsupportedOperationException("Password reset email is unavailable"); }
    String getLastSentTokenForDev(String recipientEmail);
}
