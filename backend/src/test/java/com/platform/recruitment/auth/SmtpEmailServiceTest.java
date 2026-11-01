package com.platform.recruitment.auth;
import com.platform.recruitment.email.SmtpEmailService;
import org.junit.jupiter.api.Test;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;
import org.mockito.ArgumentCaptor;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class SmtpEmailServiceTest {
    @Test void verificationAndPasswordResetActuallyDispatchThroughMailSender() {
        JavaMailSender sender=mock(JavaMailSender.class); SmtpEmailService service=new SmtpEmailService(sender);
        ReflectionTestUtils.setField(service,"frontend","https://midcv.example.invalid"); ReflectionTestUtils.setField(service,"from","noreply@example.invalid");
        service.sendVerificationEmail("person@example.invalid","verification-fixture"); service.sendPasswordResetEmail("person@example.invalid","reset-fixture");
        ArgumentCaptor<SimpleMailMessage> messages=ArgumentCaptor.forClass(SimpleMailMessage.class); verify(sender,times(2)).send(messages.capture());
        assertTrue(messages.getAllValues().get(0).getText().contains("/verify-email?token=verification-fixture"));
        assertTrue(messages.getAllValues().get(1).getText().contains("/reset-password?token=reset-fixture"));
        assertNull(service.getLastSentTokenForDev("person@example.invalid"));
    }
}
