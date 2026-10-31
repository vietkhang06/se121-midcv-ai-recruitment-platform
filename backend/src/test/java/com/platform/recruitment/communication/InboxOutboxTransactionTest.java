package com.platform.recruitment.communication;

import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.support.DefaultListableBeanFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.*;
import org.springframework.mail.*;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.support.TransactionTemplate;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/** Real H2 transactions and outbox SQL; SMTP delivery is a test double, not live SMTP acceptance. */
class InboxOutboxTransactionTest {
    JdbcTemplate db; TransactionTemplate tx; InboxEmailDispatcher dispatcher; JavaMailSender mail;
    UUID user=UUID.randomUUID(); UUID notice=UUID.randomUUID(); UUID outbox=UUID.randomUUID();
    @BeforeEach void setup() {
        var ds=new DriverManagerDataSource("jdbc:h2:mem:"+UUID.randomUUID()+";MODE=PostgreSQL;DB_CLOSE_DELAY=-1;NON_KEYWORDS=USER", "sa", "");
        db=new JdbcTemplate(ds);var tm=new DataSourceTransactionManager(ds);tx=new TransactionTemplate(tm);
        db.execute("CREATE TABLE users(id UUID PRIMARY KEY,email VARCHAR(200),is_active BOOLEAN)");
        db.execute("CREATE TABLE inbox_preferences(user_id UUID PRIMARY KEY,email_alerts BOOLEAN)");
        db.execute("CREATE TABLE inbox_notifications(id UUID PRIMARY KEY,user_id UUID,title VARCHAR(200),body VARCHAR(1000),href VARCHAR(300))");
        db.execute("CREATE TABLE inbox_email_outbox(id UUID PRIMARY KEY,notification_id UUID,attempts INT DEFAULT 0,sent_at TIMESTAMP,next_attempt_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
        db.update("INSERT INTO users VALUES(?, ?, TRUE)",user,"recipient@example.invalid");
        db.update("INSERT INTO inbox_preferences VALUES(?, TRUE)",user);
        mail=mock(JavaMailSender.class);var beans=new DefaultListableBeanFactory();beans.registerSingleton("mail",mail);
        dispatcher=new InboxEmailDispatcher(db,tm,beans.getBeanProvider(JavaMailSender.class));
        ReflectionTestUtils.setField(dispatcher,"enabled",true);ReflectionTestUtils.setField(dispatcher,"from","no-reply@example.invalid");ReflectionTestUtils.setField(dispatcher,"origin","https://midcv.example.invalid");
    }
    void enqueue() {
        db.update("INSERT INTO inbox_notifications VALUES(?,?,?,?,?)",notice,user,"Tin nhắn mới","Bạn có tin nhắn tuyển dụng mới.","/candidate/messages");
        db.update("INSERT INTO inbox_email_outbox(id,notification_id) VALUES(?,?)",outbox,notice);
    }
    @Test void dispatcherCannotSeeUncommittedOutboxThenDeliversAfterCommit() {
        var executor=Executors.newSingleThreadExecutor();
        try {
            tx.execute(status->{enqueue();try {executor.submit(dispatcher::deliver).get(5,TimeUnit.SECONDS);}catch(Exception ex){throw new RuntimeException(ex);}verifyNoInteractions(mail);return null;});
            dispatcher.deliver();verify(mail,times(1)).send(any(SimpleMailMessage.class));
            assertEquals(1,db.queryForObject("SELECT COUNT(*) FROM inbox_email_outbox WHERE sent_at IS NOT NULL",Integer.class));
        } finally {executor.shutdownNow();}
    }
    @Test void rollbackDoesNotSendOrLeaveOutbox() {
        tx.execute(status->{enqueue();status.setRollbackOnly();return null;});dispatcher.deliver();verifyNoInteractions(mail);
        assertEquals(0,db.queryForObject("SELECT COUNT(*) FROM inbox_email_outbox",Integer.class));
    }
    @Test void smtpFailureIsRetriedWithBackoffAndStopsAfterSuccess() {
        tx.execute(status->{enqueue();return null;});doThrow(new MailSendException("fixture SMTP unavailable")).doNothing().when(mail).send(any(SimpleMailMessage.class));
        dispatcher.deliver();assertEquals(1,db.queryForObject("SELECT attempts FROM inbox_email_outbox",Integer.class));
        assertEquals(0,db.queryForObject("SELECT COUNT(*) FROM inbox_email_outbox WHERE sent_at IS NOT NULL",Integer.class));
        dispatcher.deliver();verify(mail,times(1)).send(any(SimpleMailMessage.class));
        db.update("UPDATE inbox_email_outbox SET next_attempt_at=DATEADD('SECOND',-1,CURRENT_TIMESTAMP)");dispatcher.deliver();dispatcher.deliver();
        verify(mail,times(2)).send(any(SimpleMailMessage.class));assertEquals(2,db.queryForObject("SELECT attempts FROM inbox_email_outbox",Integer.class));
        assertEquals(1,db.queryForObject("SELECT COUNT(*) FROM inbox_email_outbox WHERE sent_at IS NOT NULL",Integer.class));
    }
    @Test void optingOutBeforeDispatchPreventsSending() {
        tx.execute(status->{enqueue();return null;});db.update("UPDATE inbox_preferences SET email_alerts=FALSE");dispatcher.deliver();verifyNoInteractions(mail);
    }
    @Test void suspendedRecipientIsNotSentMail() {
        tx.execute(status->{enqueue();return null;});db.update("UPDATE users SET is_active=FALSE");dispatcher.deliver();verifyNoInteractions(mail);
    }
}
