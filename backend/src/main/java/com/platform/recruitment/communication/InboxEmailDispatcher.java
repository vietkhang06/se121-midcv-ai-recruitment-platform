package com.platform.recruitment.communication;

import java.sql.Timestamp;
import java.time.Instant;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@Component
public class InboxEmailDispatcher {
  private final JdbcTemplate db;
  private final TransactionTemplate tx;
  private final ObjectProvider<JavaMailSender> mail;

  @Value("${MIDCV_INBOX_EMAIL_ENABLED:false}")
  private boolean enabled;

  @Value("${MIDCV_INBOX_EMAIL_FROM:}")
  private String from = "";

  @Value("${FRONTEND_PUBLIC_URL:http://localhost:3000}")
  private String origin;

  public InboxEmailDispatcher(
      JdbcTemplate db, PlatformTransactionManager tm, ObjectProvider<JavaMailSender> mail) {
    this.db = db;
    this.tx = new TransactionTemplate(tm);
    this.mail = mail;
  }

  @Scheduled(fixedDelayString = "${midcv.inbox.email-interval-ms:30000}")
  public void deliver() {
    if (!enabled || from.isBlank() || mail.getIfAvailable() == null) return;
    for (int i = 0; i < 10; i++) {
      Boolean worked =
          tx.execute(
              status -> {
                var rows =
                    db.queryForList(
                        "SELECT o.id,o.attempts,n.title,n.body,n.href,u.email FROM"
                            + " inbox_email_outbox o JOIN inbox_notifications n ON"
                            + " n.id=o.notification_id JOIN users u ON u.id=n.user_id JOIN"
                            + " inbox_preferences p ON p.user_id=u.id AND p.email_alerts=TRUE WHERE"
                            + " o.sent_at IS NULL AND o.attempts<5 AND"
                            + " o.next_attempt_at<=CURRENT_TIMESTAMP AND u.is_active=TRUE ORDER BY"
                            + " o.next_attempt_at LIMIT 1 FOR UPDATE OF o SKIP LOCKED");
                if (rows.isEmpty()) return false;
                var r = rows.getFirst();
                int attempts = ((Number) r.get("attempts")).intValue() + 1;
                try {
                  var m = new SimpleMailMessage();
                  m.setFrom(from);
                  m.setTo((String) r.get("email"));
                  m.setSubject("MidCV — " + r.get("title"));
                  m.setText(r.get("body") + "\n\n" + origin.replaceAll("/$", "") + r.get("href"));
                  mail.getObject().send(m);
                  db.update(
                      "UPDATE inbox_email_outbox SET sent_at=CURRENT_TIMESTAMP,attempts=? WHERE"
                          + " id=?",
                      attempts,
                      r.get("id"));
                } catch (org.springframework.mail.MailException e) {
                  db.update(
                      "UPDATE inbox_email_outbox SET attempts=?,next_attempt_at=? WHERE id=?",
                      attempts,
                      Timestamp.from(Instant.now().plusSeconds(attempts * 60L)),
                      r.get("id"));
                }
                return true;
              });
      if (!Boolean.TRUE.equals(worked)) break;
    }
  }
}
