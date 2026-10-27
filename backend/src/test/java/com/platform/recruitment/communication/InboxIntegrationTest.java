package com.platform.recruitment.communication;

import static org.junit.jupiter.api.Assertions.*;

import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.user.*;
import java.util.*;
import java.util.function.Supplier;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.transaction.support.TransactionTemplate;

/** Real JDBC/SQL. The explicit disposable URL gate prevents accidental tests on application DBs. */
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@EnabledIfEnvironmentVariable(
    named = "MIDCV_INBOX_TEST_URL",
    matches = "jdbc:postgresql://(?:localhost|127\\.0\\.0\\.1):[0-9]+/midcv_inbox_test(?:\\?.*)?")
class InboxIntegrationTest {
  JdbcTemplate db;
  InboxService s;
  TransactionTemplate tx;
  User candidate, other, hr, foreignHr;
  UUID company, otherCompany, cp, app, job;
  BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(4);

  <T> T call(Supplier<T> f) {
    return tx.execute(t -> f.get());
  }

  UUID uuid(Object o) {
    return o instanceof UUID u ? u : UUID.fromString(o.toString());
  }

  User user(Role role) {
    User u =
        User.builder()
            .email(UUID.randomUUID() + "@example.invalid")
            .role(role)
            .isActive(true)
            .emailVerified(true)
            .passwordHash(encoder.encode("ValidPass123!"))
            .build();
    u.setId(UUID.randomUUID());
    db.update(
        "INSERT INTO users(id,email,password_hash,role,email_verified,account_status)"
            + " VALUES(?,?,?,?,TRUE,'ACTIVE')",
        u.getId(),
        u.getEmail(),
        u.getPasswordHash(),
        role.name());
    return u;
  }

  @BeforeAll
  void setup() {
    var ds =
        new DriverManagerDataSource(
            System.getenv("MIDCV_INBOX_TEST_URL"),
            Optional.ofNullable(System.getenv("MIDCV_INBOX_TEST_USER")).orElse("postgres"),
            Optional.ofNullable(System.getenv("MIDCV_INBOX_TEST_PASSWORD")).orElse(""));
    Flyway.configure()
        .configuration(Map.of("flyway.postgresql.transactional.lock", "false"))
        .dataSource(ds)
        .load()
        .migrate();
    db = new JdbcTemplate(ds);
    tx = new TransactionTemplate(new DataSourceTransactionManager(ds));
    s = new InboxService(db, encoder);
    candidate = user(Role.CANDIDATE);
    other = user(Role.CANDIDATE);
    hr = user(Role.HR);
    foreignHr = user(Role.HR);
    company = UUID.randomUUID();
    otherCompany = UUID.randomUUID();
    cp = UUID.randomUUID();
    job = UUID.randomUUID();
    app = UUID.randomUUID();
    for (UUID c : List.of(company, otherCompany))
      db.update(
          "INSERT INTO companies(id,name,verification_status,operational_status)"
              + " VALUES(?,?,'VERIFIED','ACTIVE')",
          c,
          "Disposable inbox company " + c);
    db.update(
        "INSERT INTO recruiter_profiles(id,user_id,company_id,full_name) VALUES(?,?,?,?)",
        UUID.randomUUID(),
        hr.getId(),
        company,
        "Nhà tuyển dụng");
    db.update(
        "INSERT INTO recruiter_profiles(id,user_id,company_id,full_name) VALUES(?,?,?,?)",
        UUID.randomUUID(),
        foreignHr.getId(),
        otherCompany,
        "Other company");
    db.update(
        "INSERT INTO candidate_profiles(id,user_id,full_name) VALUES(?,?,?)",
        cp,
        candidate.getId(),
        "Ứng viên tiếng Việt");
    db.update(
        "INSERT INTO jobs(id,company_id,title,industry,seniority,description,status,location)"
            + " VALUES(?,?,'Java Backend','TECHNOLOGY','JUNIOR','Integration"
            + " fixture','PUBLISHED','Hồ Chí Minh')",
        job,
        company);
    db.update(
        "INSERT INTO applications(id,job_id,candidate_id,status) VALUES(?,?,?,'SUBMITTED')",
        app,
        job,
        cp);
  }

  @BeforeEach
  void reset() {
    db.update("DELETE FROM inbox_conversations WHERE application_id=?", app);
    db.update(
        "DELETE FROM inbox_notifications WHERE user_id IN (?,?)", candidate.getId(), hr.getId());
    db.update("DELETE FROM inbox_preferences WHERE user_id=?", candidate.getId());
    db.update(
        "UPDATE users SET password_hash=?,auth_invalid_before=NULL WHERE id=?",
        encoder.encode("ValidPass123!"),
        candidate.getId());
  }

  @AfterAll
  void cleanup() {
    if (db == null || candidate == null) return;
    for (User u : List.of(candidate, other, hr, foreignHr))
      db.update("DELETE FROM users WHERE id=?", u.getId());
    for (UUID c : List.of(company, otherCompany)) db.update("DELETE FROM companies WHERE id=?", c);
  }

  @Test
  void chatPersistsReadReceiptsAndIdempotentRetry() {
    UUID c = call(() -> s.start(hr, app));
    assertEquals(c, call(() -> s.start(hr, app)));
    UUID nonce = UUID.randomUUID();
    var m = call(() -> s.send(hr, c, nonce, "Xin chào tiếng Việt <script>"));
    assertEquals(
        m.get("id"), call(() -> s.send(hr, c, nonce, "Xin chào tiếng Việt <script>")).get("id"));
    assertEquals(1, ((List<?>) call(() -> s.messages(candidate, c, null)).get("items")).size());
    call(
        () -> {
          s.readThread(candidate, c, uuid(m.get("id")));
          return true;
        });
    assertEquals(0, call(() -> s.unread(candidate)).get("messages"));
    call(() -> s.send(candidate, c, UUID.randomUUID(), "Tôi đã nhận."));
    assertEquals(true, call(() -> s.thread(hr, c)).get("accepted"));
  }

  @Test
  void outsidersCompanyChangesAndBlockingAreEnforced() {
    UUID c = call(() -> s.start(hr, app));
    assertThrows(CustomException.class, () -> call(() -> s.start(foreignHr, app)));
    assertThrows(CustomException.class, () -> call(() -> s.messages(other, c, null)));
    call(
        () -> {
          s.action(candidate, c, "block");
          return true;
        });
    assertThrows(
        CustomException.class, () -> call(() -> s.send(hr, c, UUID.randomUUID(), "blocked")));
    assertThrows(
        CustomException.class,
        () ->
            call(
                () -> {
                  s.action(hr, c, "unblock");
                  return true;
                }));
    call(
        () -> {
          s.action(candidate, c, "unblock");
          return true;
        });
    call(() -> s.send(hr, c, UUID.randomUUID(), "allowed"));
    db.update(
        "UPDATE recruiter_profiles SET company_id=? WHERE user_id=?", otherCompany, hr.getId());
    assertThrows(CustomException.class, () -> call(() -> s.messages(hr, c, null)));
    db.update("UPDATE recruiter_profiles SET company_id=? WHERE user_id=?", company, hr.getId());
  }

  @Test
  void notificationPreferencesAndOwnership() {
    UUID c = call(() -> s.start(hr, app));
    var n = call(() -> s.notices(candidate, 0)).getFirst();
    assertThrows(
        CustomException.class,
        () ->
            call(
                () -> {
                  s.readNotice(other, uuid(n.get("id")));
                  return true;
                }));
    call(
        () -> {
          s.readAll(candidate);
          return true;
        });
    assertEquals(0, call(() -> s.unread(candidate)).get("notifications"));
    var p = new InboxService.Settings(true, false, true, false, false, "Java", "Hồ Chí Minh");
    assertEquals(p, call(() -> s.saveSettings(candidate, p)));
    long old =
        db.queryForObject(
            "SELECT COUNT(*) FROM inbox_notifications WHERE user_id=?",
            Long.class,
            candidate.getId());
    call(() -> s.send(hr, c, UUID.randomUUID(), "No notice, still stored"));
    assertEquals(
        old,
        db.queryForObject(
            "SELECT COUNT(*) FROM inbox_notifications WHERE user_id=?",
            Long.class,
            candidate.getId()));
    assertThrows(
        CustomException.class,
        () ->
            call(
                () ->
                    s.saveSettings(
                        candidate,
                        new InboxService.Settings(true, true, true, false, true, "", ""))));
  }

  @Test
  void savedJobsLettersAndValidation() {
    call(
        () -> {
          s.saveJob(candidate, job, true);
          s.saveJob(candidate, job, true);
          return true;
        });
    assertEquals(1, call(() -> s.jobs(candidate, true, 0)).size());
    call(
        () -> {
          s.saveJob(candidate, job, false);
          return true;
        });
    assertFalse(call(() -> s.saved(candidate, job)));
    var l = call(() -> s.letter(candidate, null, "Thư ứng tuyển", "Nội dung thực được lưu."));
    assertEquals(l.get("body"), s.letters(candidate, 0).getFirst().get("body"));
    assertThrows(
        CustomException.class, () -> call(() -> s.letter(other, uuid(l.get("id")), "X", "Y")));
    assertThrows(
        CustomException.class,
        () ->
            call(
                () -> {
                  s.deleteLetter(other, uuid(l.get("id")));
                  return true;
                }));
    call(
        () -> {
          s.deleteLetter(candidate, uuid(l.get("id")));
          return true;
        });
    assertTrue(call(() -> s.letters(candidate, 0)).isEmpty());
    assertThrows(CustomException.class, () -> call(() -> s.jobs(hr, true, 0)));
  }

  @Test
  void cursorPagingAndSendLimits() {
    UUID c = call(() -> s.start(hr, app));
    for (int i = 0; i < 55; i++) {
      final int n = i;
      call(() -> s.send(hr, c, UUID.randomUUID(), "Message " + n));
      db.update(
          "UPDATE inbox_messages SET created_at=created_at-INTERVAL '2 minutes' WHERE"
              + " conversation_id=?",
          c);
    }
    var p = call(() -> s.messages(candidate, c, null));
    assertEquals(50, ((List<?>) p.get("items")).size());
    assertNotNull(p.get("nextBefore"));
    assertFalse(
        ((List<?>) call(() -> s.messages(candidate, c, uuid(p.get("nextBefore")))).get("items"))
            .isEmpty());
    assertThrows(CustomException.class, () -> call(() -> s.send(hr, c, UUID.randomUUID(), " ")));
    assertThrows(
        CustomException.class,
        () -> call(() -> s.send(hr, c, UUID.randomUUID(), "x".repeat(4001))));
  }

  @Test
  void jobAlertsAreOptInCriteriaBasedAndNotDuplicated() {
    call(
        () ->
            s.saveSettings(
                candidate,
                new InboxService.Settings(true, true, true, true, false, "Java", "Hồ Chí Minh")));
    var j =
        com.platform.recruitment.job.Job.builder()
            .title("Backend Java")
            .location("Hồ Chí Minh")
            .build();
    j.setId(job);
    call(
        () -> {
          s.publishedJob(j);
          s.publishedJob(j);
          return true;
        });
    assertEquals(
        1,
        call(() -> s.notices(candidate, 0)).stream()
            .filter(n -> "JOB_ALERT".equals(n.get("kind")))
            .count());
    assertTrue(call(() -> s.notices(other, 0)).isEmpty());
  }

  @Test
  void passwordChecksCurrentAndInvalidatesSessions() {
    assertThrows(
        CustomException.class,
        () ->
            call(
                () -> {
                  s.password(candidate, "incorrect", "NewPass123!");
                  return true;
                }));
    call(
        () -> {
          s.password(candidate, "ValidPass123!", "NewPass123!");
          return true;
        });
    assertTrue(
        encoder.matches(
            "NewPass123!",
            db.queryForObject(
                "SELECT password_hash FROM users WHERE id=?", String.class, candidate.getId())));
    assertNotNull(
        db.queryForObject(
            "SELECT auth_invalid_before FROM users WHERE id=?",
            java.sql.Timestamp.class,
            candidate.getId()));
  }

  @Test
  void upgradeFromV27AndFreshReachV28() {
    String schema = "inbox_upgrade_" + UUID.randomUUID().toString().replace("-", "");
    Flyway.configure()
        .configuration(Map.of("flyway.postgresql.transactional.lock", "false"))
        .dataSource(db.getDataSource())
        .schemas(schema)
        .defaultSchema(schema)
        .target("27")
        .load()
        .migrate();
    var f =
        Flyway.configure()
            .configuration(Map.of("flyway.postgresql.transactional.lock", "false"))
            .dataSource(db.getDataSource())
            .schemas(schema)
            .defaultSchema(schema)
            .load();
    assertEquals(1, f.migrate().migrationsExecuted);
    assertEquals("28", f.info().current().getVersion().toString());
  }

  @Test
  void smtpOutboxUsesActualSocketAfterCommit() throws Exception {
    try (var server = new java.net.ServerSocket(0, 1, java.net.InetAddress.getLoopbackAddress())) {
      var received = new java.util.concurrent.CompletableFuture<String>();
      Thread worker =
          Thread.ofPlatform()
              .start(
                  () -> {
                    try (var socket = server.accept()) {
                      socket.setSoTimeout(10000);
                      var in =
                          new java.io.BufferedReader(
                              new java.io.InputStreamReader(
                                  socket.getInputStream(),
                                  java.nio.charset.StandardCharsets.UTF_8));
                      var out =
                          new java.io.PrintWriter(
                              socket.getOutputStream(),
                              true,
                              java.nio.charset.StandardCharsets.UTF_8);
                      out.print("220 localhost ESMTP\r\n");
                      out.flush();
                      String line;
                      boolean data = false;
                      var body = new StringBuilder();
                      while ((line = in.readLine()) != null) {
                        if (data) {
                          if (line.equals(".")) {
                            received.complete(body.toString());
                            data = false;
                            out.print("250 OK\r\n");
                          } else body.append(line).append('\n');
                        } else if (line.equals("DATA")) {
                          data = true;
                          out.print("354 dot\r\n");
                        } else if (line.equals("QUIT")) {
                          out.print("221 bye\r\n");
                          out.flush();
                          break;
                        } else out.print("250 localhost\r\n");
                        out.flush();
                      }
                    } catch (Exception e) {
                      received.completeExceptionally(e);
                    }
                  });
      org.springframework.test.util.ReflectionTestUtils.setField(s, "emailEnabled", true);
      org.springframework.test.util.ReflectionTestUtils.setField(
          s, "emailFrom", "test@example.invalid");
      org.springframework.test.util.ReflectionTestUtils.setField(s, "mailHost", "127.0.0.1");
      call(
          () ->
              s.saveSettings(
                  candidate, new InboxService.Settings(true, true, true, false, true, "", "")));
      call(() -> s.start(hr, app));
      assertNull(
          db.queryForObject(
              "SELECT sent_at FROM inbox_email_outbox LIMIT 1", java.sql.Timestamp.class));
      var mail = new org.springframework.mail.javamail.JavaMailSenderImpl();
      mail.setHost("127.0.0.1");
      mail.setPort(server.getLocalPort());
      mail.getJavaMailProperties().setProperty("mail.smtp.timeout", "5000");
      var beans = new org.springframework.beans.factory.support.DefaultListableBeanFactory();
      beans.registerSingleton("mail", mail);
      var dispatcher =
          new InboxEmailDispatcher(
              db,
              tx.getTransactionManager(),
              beans.getBeanProvider(org.springframework.mail.javamail.JavaMailSender.class));
      org.springframework.test.util.ReflectionTestUtils.setField(dispatcher, "enabled", true);
      org.springframework.test.util.ReflectionTestUtils.setField(
          dispatcher, "from", "test@example.invalid");
      org.springframework.test.util.ReflectionTestUtils.setField(
          dispatcher, "origin", "http://localhost:3000");
      dispatcher.deliver();
      assertTrue(
          received.get(10, java.util.concurrent.TimeUnit.SECONDS).contains(candidate.getEmail()));
      assertEquals(
          1,
          db.queryForObject(
              "SELECT COUNT(*) FROM inbox_email_outbox WHERE sent_at IS NOT NULL", Integer.class));
      worker.join(1000);
    } finally {
      org.springframework.test.util.ReflectionTestUtils.setField(s, "emailEnabled", false);
    }
  }
}
