package com.platform.recruitment.email;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.email-mode", havingValue = "SMTP")
public class SmtpEmailService implements EmailService {
    private final JavaMailSender sender;
    @Value("${app.frontend-url:http://localhost:3000}") private String frontend;
    @Value("${app.mail-from:noreply@midcv.local}") private String from;

    @Override public void sendVerificationEmail(String recipient, String token) {
        send(recipient,"MidCV - Xác minh email", "Xác minh email trong 24 giờ: ", "/verify-email", token);
    }
    @Override public void sendPasswordResetEmail(String recipient, String token) {
        send(recipient,"MidCV - Đặt lại mật khẩu", "Đặt lại mật khẩu trong 30 phút. Nếu không yêu cầu, hãy bỏ qua thư này: ", "/reset-password", token);
    }
    private void send(String recipient,String subject,String text,String path,String token) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from); message.setTo(recipient); message.setSubject(subject);
        message.setText(text + frontend.replaceAll("/+$", "") + path + "?token=" + java.net.URLEncoder.encode(token,java.nio.charset.StandardCharsets.UTF_8));
        sender.send(message);
    }
    @Override public String getLastSentTokenForDev(String recipient) { return null; }
}
