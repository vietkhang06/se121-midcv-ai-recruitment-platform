package com.platform.recruitment.email;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

class MockEmailServiceTest {

    @Test
    void developmentVerificationTokenIsStoredButNeverWrittenToLogs() {
        Logger logger = (Logger) LoggerFactory.getLogger(MockEmailService.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        String token = java.util.UUID.randomUUID().toString();
        try {
            MockEmailService service = new MockEmailService();
            service.sendVerificationEmail("demo@example.test", token);

            assertEquals(token, service.getLastSentTokenForDev("demo@example.test"));
            assertFalse(appender.list.stream()
                    .map(ILoggingEvent::getFormattedMessage)
                    .anyMatch(message -> message.contains(token)));
        } finally {
            logger.detachAppender(appender);
            appender.stop();
        }
    }
}
