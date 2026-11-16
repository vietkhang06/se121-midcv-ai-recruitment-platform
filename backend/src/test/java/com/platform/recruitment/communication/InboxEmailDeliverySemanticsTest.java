package com.platform.recruitment.communication;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.SimpleTransactionStatus;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class InboxEmailDeliverySemanticsTest {
    @Test
    @SuppressWarnings("unchecked")
    void smtpSuccessThenDatabaseFailureRollsBackAndRetryCarriesSameNotificationId() {
        JdbcTemplate db = mock(JdbcTemplate.class);
        PlatformTransactionManager tm = mock(PlatformTransactionManager.class);
        ObjectProvider<JavaMailSender> provider = mock(ObjectProvider.class);
        JavaMailSender sender = mock(JavaMailSender.class);
        when(provider.getIfAvailable()).thenReturn(sender);
        when(provider.getObject()).thenReturn(sender);
        when(tm.getTransaction(any(TransactionDefinition.class))).thenAnswer(i -> new SimpleTransactionStatus());
        UUID notificationId = UUID.randomUUID();
        Map<String,Object> row = Map.of("id", UUID.randomUUID(), "notification_id", notificationId,
                "attempts", 0, "title", "Test notification", "body", "Body", "href", "/inbox", "email", "recipient@example.test");
        when(db.queryForList(anyString())).thenReturn(List.of(row), List.of(row), List.of());
        when(db.update(contains("sent_at=CURRENT_TIMESTAMP"), eq(1), eq(row.get("id"))))
                .thenThrow(new DataAccessResourceFailureException("simulated persistence failure after SMTP"))
                .thenReturn(1);
        InboxEmailDispatcher dispatcher = new InboxEmailDispatcher(db, tm, provider);
        ReflectionTestUtils.setField(dispatcher, "enabled", true);
        ReflectionTestUtils.setField(dispatcher, "from", "noreply@example.test");
        ReflectionTestUtils.setField(dispatcher, "origin", "http://localhost:3000");
        assertThrows(DataAccessResourceFailureException.class, dispatcher::deliver);
        verify(tm).rollback(any());
        dispatcher.deliver();
        var messages = org.mockito.ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(sender, times(2)).send(messages.capture());
        assertEquals(messages.getAllValues().get(0).getText(), messages.getAllValues().get(1).getText());
        assertTrue(messages.getValue().getText().contains(notificationId.toString()));
    }
}
