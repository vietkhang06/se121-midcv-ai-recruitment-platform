package com.platform.recruitment.communication;

import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.ErrorCode;
import com.platform.recruitment.user.Role;
import com.platform.recruitment.user.User;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class InboxService {
  private final JdbcTemplate db;
  private final PasswordEncoder passwords;

  @Value("${MIDCV_INBOX_EMAIL_ENABLED:false}")
  private boolean emailEnabled;

  @Value("${MIDCV_INBOX_EMAIL_FROM:}")
  private String emailFrom = "";

  @Value("${spring.mail.host:}")
  private String mailHost = "";

  public InboxService(JdbcTemplate db, PasswordEncoder passwords) {
    this.db = db;
    this.passwords = passwords;
  }

  public record Settings(
      boolean application_alerts,
      boolean message_alerts,
      boolean profile_alerts,
      boolean job_alerts,
      boolean email_alerts,
      String job_keyword,
      String job_location) {}

  private static CustomException invalid(String m) {
    return new CustomException(ErrorCode.VALIDATION_ERROR, m);
  }

  private static CustomException denied() {
    return new CustomException(
        ErrorCode.RESOURCE_NOT_FOUND, "Không tìm thấy dữ liệu hoặc bạn không có quyền truy cập.");
  }

  private void actor(User u) {
    if (u == null || u.getId() == null || u.isSuspended() || u.isDeactivated())
      throw new CustomException(
          ErrorCode.ACCESS_DENIED, "Tài khoản hiện không được phép thực hiện thao tác này.");
  }

  private void candidate(User u) {
    actor(u);
    if (u.getRole() != Role.CANDIDATE)
      throw new CustomException(ErrorCode.ACCESS_DENIED, "Chức năng dành cho ứng viên.");
  }

  private String text(String s, int max) {
    if (s == null || s.isBlank() || s.strip().length() > max || s.indexOf('\0') >= 0)
      throw invalid("Nội dung không hợp lệ; tối đa " + max + " ký tự.");
    return s.strip();
  }

  private String optional(String s, int max) {
    return s == null || s.isBlank() ? "" : text(s, max);
  }

  private int offset(int page) {
    if (page < 0 || page > 10000) throw invalid("Trang không hợp lệ.");
    return page * 30;
  }

  private UUID id(Object v) {
    return v instanceof UUID u ? u : UUID.fromString(v.toString());
  }

  private List<Map<String, Object>> rows(String sql, Object... args) {
    var out = db.queryForList(sql, args);
    for (var row : out)
      row.replaceAll((k, v) -> v instanceof Timestamp t ? t.toInstant().toString() : v);
    return out;
  }

  public boolean emailAvailable() {
    return emailEnabled && !emailFrom.isBlank() && !mailHost.isBlank();
  }

  public Map<String, Object> account(User u) {
    actor(u);
    var a =
        rows(
                "SELECT"
                    + " u.id,u.email,u.email_verified,u.role,u.account_plan,COALESCE(cp.full_name,rp.full_name,u.email)"
                    + " full_name FROM users u LEFT JOIN candidate_profiles cp ON cp.user_id=u.id"
                    + " LEFT JOIN recruiter_profiles rp ON rp.user_id=u.id WHERE u.id=?",
                u.getId())
            .getFirst();
    a.put("email_available", emailAvailable());
    return a;
  }

  public Settings settings(User u) {
    actor(u);
    return db
        .query(
            "SELECT * FROM inbox_preferences WHERE user_id=?",
            (r, n) ->
                new Settings(
                    r.getBoolean("application_alerts"),
                    r.getBoolean("message_alerts"),
                    r.getBoolean("profile_alerts"),
                    r.getBoolean("job_alerts"),
                    r.getBoolean("email_alerts"),
                    r.getString("job_keyword"),
                    r.getString("job_location")),
            u.getId())
        .stream()
        .findFirst()
        .orElse(new Settings(true, true, true, false, false, "", ""));
  }

  public Settings saveSettings(User u, Settings p) {
    actor(u);
    if (p == null) throw invalid("Thiếu cài đặt.");
    if (p.email_alerts() && !emailAvailable()) throw invalid("Máy chủ chưa bật gửi email SMTP.");
    String keyword = optional(p.job_keyword(), 120), location = optional(p.job_location(), 120);
    db.queryForObject("SELECT id FROM users WHERE id=? FOR NO KEY UPDATE", UUID.class, u.getId());
    int n =
        db.update(
            "UPDATE inbox_preferences SET"
                + " application_alerts=?,message_alerts=?,profile_alerts=?,job_alerts=?,email_alerts=?,job_keyword=?,job_location=?"
                + " WHERE user_id=?",
            p.application_alerts(),
            p.message_alerts(),
            p.profile_alerts(),
            p.job_alerts(),
            p.email_alerts(),
            keyword,
            location,
            u.getId());
    if (n == 0)
      db.update(
          "INSERT INTO"
              + " inbox_preferences(user_id,application_alerts,message_alerts,profile_alerts,job_alerts,email_alerts,job_keyword,job_location)"
              + " VALUES(?,?,?,?,?,?,?,?)",
          u.getId(),
          p.application_alerts(),
          p.message_alerts(),
          p.profile_alerts(),
          p.job_alerts(),
          p.email_alerts(),
          keyword,
          location);
    return settings(u);
  }

  public List<Map<String, Object>> notices(User u, int page) {
    actor(u);
    return rows(
        "SELECT * FROM inbox_notifications WHERE user_id=? ORDER BY created_at DESC,id DESC LIMIT"
            + " 30 OFFSET ?",
        u.getId(),
        offset(page));
  }

  public void readNotice(User u, UUID n) {
    actor(u);
    if (db.update(
            "UPDATE inbox_notifications SET read_at=COALESCE(read_at,CURRENT_TIMESTAMP) WHERE id=?"
                + " AND user_id=?",
            n,
            u.getId())
        == 0) throw denied();
  }

  public void readAll(User u) {
    actor(u);
    db.update(
        "UPDATE inbox_notifications SET read_at=CURRENT_TIMESTAMP WHERE user_id=? AND read_at IS"
            + " NULL",
        u.getId());
  }

  public Map<String, Long> unread(User u) {
    actor(u);
    return Map.of(
        "notifications",
        db.queryForObject(
            "SELECT COUNT(*) FROM inbox_notifications WHERE user_id=? AND read_at IS NULL",
            Long.class,
            u.getId()),
        "messages",
        db.queryForObject(
            "SELECT COUNT(*) FROM inbox_messages m JOIN inbox_conversations c ON"
                + " c.id=m.conversation_id JOIN applications a ON a.id=c.application_id JOIN jobs j"
                + " ON j.id=a.job_id JOIN recruiter_profiles rp ON rp.user_id=c.recruiter_user_id"
                + " AND rp.company_id=j.company_id WHERE (c.candidate_user_id=? OR"
                + " c.recruiter_user_id=?) AND m.sender_id<>? AND m.read_at IS NULL",
            Long.class,
            u.getId(),
            u.getId(),
            u.getId()));
  }

  private void notice(UUID user, String kind, String title, String body, String href) {
    String flag =
        switch (kind) {
          case "MESSAGE", "CONNECTION" -> "message_alerts";
          case "PROFILE_VIEW" -> "profile_alerts";
          case "JOB_ALERT" -> "job_alerts";
          default -> "application_alerts";
        };
    var enabled =
        db.query(
            "SELECT " + flag + " FROM inbox_preferences WHERE user_id=?",
            (r, n) -> r.getBoolean(1),
            user);
    if (!enabled.isEmpty() && !enabled.getFirst()) return;
    UUID n = UUID.randomUUID();
    int inserted =
        db.update(
            "INSERT INTO inbox_notifications(id,user_id,kind,title,body,href) VALUES(?,?,?,?,?,?)"
                + " ON CONFLICT DO NOTHING",
            n,
            user,
            kind,
            title,
            body,
            href);
    if (inserted == 0) return;
    if (emailAvailable()
        && db
            .query(
                "SELECT email_alerts FROM inbox_preferences WHERE user_id=?",
                (r, i) -> r.getBoolean(1),
                user)
            .stream()
            .findFirst()
            .orElse(false))
      db.update(
          "INSERT INTO inbox_email_outbox(id,notification_id) VALUES(?,?)", UUID.randomUUID(), n);
  }

  public void applicationEvent(
      com.platform.recruitment.application.Application a, boolean changed) {
    UUID user = a.getCandidate().getUser().getId();
    if (changed) {
      notice(
          user,
          "APPLICATION_STATUS",
          "Cập nhật đơn ứng tuyển",
          a.getJob().getTitle() + ": " + a.getStatus().name(),
          "/candidate/applications");
      return;
    }
    for (UUID hr :
        db.query(
            "SELECT user_id FROM recruiter_profiles WHERE company_id=?",
            (r, n) -> r.getObject(1, UUID.class),
            a.getJob().getCompany().getId()))
      notice(
          hr,
          "APPLICATION",
          "Đơn ứng tuyển mới",
          a.getCandidate().getFullName() + " — " + a.getJob().getTitle(),
          "/recruiter/pipeline");
    notice(
        user,
        "APPLICATION",
        "Đã gửi đơn ứng tuyển",
        a.getJob().getTitle(),
        "/candidate/applications");
  }

  public void publishedJob(com.platform.recruitment.job.Job j) {
    for (UUID u :
        db.query(
            "SELECT p.user_id FROM inbox_preferences p JOIN users u ON u.id=p.user_id WHERE"
                + " p.job_alerts=TRUE AND u.role='CANDIDATE' AND u.is_active=TRUE AND"
                + " POSITION(LOWER(p.job_keyword) IN LOWER(?))>0 AND POSITION(LOWER(p.job_location)"
                + " IN LOWER(?))>0",
            (r, n) -> r.getObject(1, UUID.class),
            j.getTitle(),
            j.getLocation() == null ? "" : j.getLocation()))
      notice(u, "JOB_ALERT", "Việc làm mới theo tiêu chí", j.getTitle(), "/jobs/" + j.getId());
  }

  private Map<String, Object> member(User u, UUID c, boolean lock) {
    actor(u);
    var list =
        db.queryForList(
            "SELECT c.* FROM inbox_conversations c JOIN applications a ON a.id=c.application_id"
                + " JOIN jobs j ON j.id=a.job_id JOIN recruiter_profiles rp ON"
                + " rp.user_id=c.recruiter_user_id AND rp.company_id=j.company_id WHERE c.id=? AND"
                + " (c.candidate_user_id=? OR c.recruiter_user_id=?)"
                + (lock ? " FOR UPDATE OF c" : ""),
            c,
            u.getId(),
            u.getId());
    if (list.isEmpty()) throw denied();
    return list.getFirst();
  }

  public List<Map<String, Object>> contacts(User u, int page) {
    actor(u);
    if (u.getRole() != Role.HR) return List.of();
    return rows(
        "SELECT a.id,cp.full_name name,j.title FROM applications a JOIN candidate_profiles cp ON"
            + " cp.id=a.candidate_id JOIN jobs j ON j.id=a.job_id JOIN recruiter_profiles rp ON"
            + " rp.company_id=j.company_id WHERE rp.user_id=? ORDER BY a.created_at DESC LIMIT 30"
            + " OFFSET ?",
        u.getId(),
        offset(page));
  }

  public UUID start(User u, UUID app) {
    actor(u);
    if (u.getRole() != Role.HR)
      throw new CustomException(
          ErrorCode.ACCESS_DENIED, "Nhà tuyển dụng khởi tạo từ đơn ứng tuyển.");
    var a =
        db.queryForList(
            "SELECT cp.user_id FROM applications a JOIN candidate_profiles cp ON"
                + " cp.id=a.candidate_id JOIN jobs j ON j.id=a.job_id JOIN companies co ON"
                + " co.id=j.company_id AND co.operational_status='ACTIVE' JOIN recruiter_profiles"
                + " rp ON rp.company_id=j.company_id WHERE a.id=? AND rp.user_id=? FOR UPDATE OF a",
            app,
            u.getId());
    if (a.isEmpty()) throw denied();
    var old =
        db.query(
            "SELECT id FROM inbox_conversations WHERE application_id=? AND recruiter_user_id=?",
            (r, n) -> r.getObject(1, UUID.class),
            app,
            u.getId());
    if (!old.isEmpty()) return old.getFirst();
    UUID c = UUID.randomUUID(), peer = id(a.getFirst().get("user_id"));
    db.update(
        "INSERT INTO inbox_conversations(id,application_id,candidate_user_id,recruiter_user_id)"
            + " VALUES(?,?,?,?)",
        c,
        app,
        peer,
        u.getId());
    notice(
        peer,
        "CONNECTION",
        "Nhà tuyển dụng muốn kết nối",
        "Bạn có lời mời trò chuyện về đơn ứng tuyển.",
        "/candidate/messages?thread=" + c);
    return c;
  }

  public List<Map<String, Object>> threads(User u, int page, UUID only) {
    actor(u);
    return rows(
        """
SELECT c.*,j.title job_title,CASE WHEN c.candidate_user_id=? THEN rp.full_name ELSE cp.full_name END peer_name,
(SELECT COUNT(*) FROM inbox_messages m WHERE m.conversation_id=c.id AND m.sender_id<>? AND m.read_at IS NULL) unread,
(SELECT m.body FROM inbox_messages m WHERE m.conversation_id=c.id ORDER BY m.created_at DESC,m.id DESC LIMIT 1) last_message
FROM inbox_conversations c JOIN applications a ON a.id=c.application_id JOIN jobs j ON j.id=a.job_id
JOIN recruiter_profiles rp ON rp.user_id=c.recruiter_user_id AND rp.company_id=j.company_id JOIN candidate_profiles cp ON cp.id=a.candidate_id
WHERE (c.candidate_user_id=? OR c.recruiter_user_id=?) AND (CAST(? AS UUID) IS NULL OR c.id=?) ORDER BY c.updated_at DESC,c.id DESC LIMIT 30 OFFSET ?
""",
        u.getId(),
        u.getId(),
        u.getId(),
        u.getId(),
        only,
        only,
        offset(page));
  }

  public Map<String, Object> thread(User u, UUID c) {
    member(u, c, false);
    return threads(u, 0, c).getFirst();
  }

  public Map<String, Object> messages(User u, UUID c, UUID before) {
    member(u, c, false);
    List<Map<String, Object>> list;
    if (before == null)
      list =
          rows(
              "SELECT * FROM inbox_messages WHERE conversation_id=? ORDER BY created_at DESC,id"
                  + " DESC LIMIT 51",
              c);
    else {
      var cursor =
          db.queryForList(
              "SELECT created_at FROM inbox_messages WHERE id=? AND conversation_id=?", before, c);
      if (cursor.isEmpty()) throw denied();
      Object t = cursor.getFirst().get("created_at");
      list =
          rows(
              "SELECT * FROM inbox_messages WHERE conversation_id=? AND (created_at<? OR"
                  + " (created_at=? AND id<?)) ORDER BY created_at DESC,id DESC LIMIT 51",
              c,
              t,
              t,
              before);
    }
    var out = new LinkedHashMap<String, Object>();
    out.put("nextBefore", list.size() > 50 ? list.get(49).get("id") : null);
    var items = new ArrayList<>(list.subList(0, Math.min(50, list.size())));
    Collections.reverse(items);
    out.put("items", items);
    return out;
  }

  public Map<String, Object> send(User u, UUID c, UUID nonce, String body) {
    var room = member(u, c, true);
    String safe = text(body, 4000);
    if (nonce == null) throw invalid("Thiếu mã tin nhắn.");
    var previous =
        rows(
            "SELECT * FROM inbox_messages WHERE conversation_id=? AND sender_id=? AND client_id=?",
            c,
            u.getId(),
            nonce);
    if (!previous.isEmpty()) {
      if (!safe.equals(previous.getFirst().get("body")))
        throw new CustomException(ErrorCode.CONCURRENT_MODIFICATION,
            "Mã gửi lại đã được dùng cho nội dung khác.");
      return previous.getFirst();
    }
    if (room.get("blocked_by") != null)
      throw new CustomException(ErrorCode.ACCESS_DENIED, "Cuộc trò chuyện đã bị chặn.");
    UUID peer =
        u.getId().equals(room.get("candidate_user_id"))
            ? id(room.get("recruiter_user_id"))
            : id(room.get("candidate_user_id"));
    if (db.queryForObject(
            "SELECT COUNT(*) FROM users WHERE id=? AND is_active=TRUE", Long.class, peer)
        == 0) throw invalid("Người nhận không khả dụng.");
    if (db.queryForObject(
            "SELECT COUNT(*) FROM applications a JOIN jobs j ON j.id=a.job_id JOIN companies co ON"
                + " co.id=j.company_id WHERE a.id=? AND co.operational_status='ACTIVE'",
            Long.class,
            room.get("application_id"))
        == 0) throw invalid("Doanh nghiệp không khả dụng.");
    // User lock serializes sends across different conversations for the per-user rate limit.
    db.queryForObject("SELECT id FROM users WHERE id=? FOR NO KEY UPDATE", UUID.class, u.getId());
    if (db.queryForObject(
            "SELECT COUNT(*) FROM inbox_messages WHERE sender_id=? AND created_at>?",
            Long.class,
            u.getId(),
            Timestamp.from(Instant.now().minusSeconds(60)))
        >= 30)
      throw new CustomException(
          ErrorCode.RATE_LIMIT_EXCEEDED, "Bạn gửi quá nhanh. Vui lòng chờ một phút.");
    UUID m = UUID.randomUUID();
    db.update(
        "INSERT INTO inbox_messages(id,conversation_id,sender_id,client_id,body) VALUES(?,?,?,?,?)",
        m,
        c,
        u.getId(),
        nonce,
        safe);
    db.update(
        "UPDATE inbox_conversations SET updated_at=CURRENT_TIMESTAMP,accepted=CASE WHEN"
            + " candidate_user_id=? THEN TRUE ELSE accepted END WHERE id=?",
        u.getId(),
        c);
    notice(
        peer,
        "MESSAGE",
        "Tin nhắn mới",
        "Bạn có tin nhắn tuyển dụng mới.",
        (u.getRole() == Role.HR ? "/candidate" : "/recruiter") + "/messages?thread=" + c);
    return rows("SELECT * FROM inbox_messages WHERE id=?", m).getFirst();
  }

  public void readThread(User u, UUID c, UUID through) {
    member(u, c, false);
    var r =
        db.queryForList(
            "SELECT created_at FROM inbox_messages WHERE id=? AND conversation_id=?", through, c);
    if (r.isEmpty()) throw denied();
    Object t = r.getFirst().get("created_at");
    db.update(
        "UPDATE inbox_messages SET read_at=COALESCE(read_at,CURRENT_TIMESTAMP) WHERE"
            + " conversation_id=? AND sender_id<>? AND (created_at<? OR (created_at=? AND id<=?))",
        c,
        u.getId(),
        t,
        t,
        through);
  }

  public void action(User u, UUID c, String action) {
    var r = member(u, c, true);
    switch (action) {
      case "accept" -> {
        if (!u.getId().equals(r.get("candidate_user_id"))) throw denied();
        db.update("UPDATE inbox_conversations SET accepted=TRUE WHERE id=?", c);
      }
      case "block" -> {
        if (r.get("blocked_by") != null && !u.getId().equals(r.get("blocked_by"))) throw denied();
        db.update("UPDATE inbox_conversations SET blocked_by=? WHERE id=?", u.getId(), c);
      }
      case "unblock" -> {
        if (!u.getId().equals(r.get("blocked_by"))) throw denied();
        db.update("UPDATE inbox_conversations SET blocked_by=NULL WHERE id=?", c);
      }
      default -> throw invalid("Thao tác không hợp lệ.");
    }
  }

  public boolean saved(User u, UUID job) {
    candidate(u);
    return db.queryForObject(
            "SELECT COUNT(*) FROM candidate_saved_jobs WHERE user_id=? AND job_id=?",
            Long.class,
            u.getId(),
            job)
        > 0;
  }

  public void saveJob(User u, UUID job, boolean save) {
    candidate(u);
    if (!save) {
      db.update("DELETE FROM candidate_saved_jobs WHERE user_id=? AND job_id=?", u.getId(), job);
      return;
    }
    if (db.queryForObject(
            "SELECT COUNT(*) FROM jobs WHERE id=? AND status='PUBLISHED'", Long.class, job)
        == 0) throw denied();
    db.update(
        "INSERT INTO candidate_saved_jobs(user_id,job_id) VALUES(?,?) ON CONFLICT DO NOTHING",
        u.getId(),
        job);
  }

  private String like(String s) {
    return "%"
        + s.toLowerCase(Locale.ROOT).replace("!", "!!").replace("%", "!%").replace("_", "!_")
        + "%";
  }

  public List<Map<String, Object>> jobs(User u, boolean saved, int page) {
    candidate(u);
    var p = settings(u);
    if (saved)
      return rows(
          "SELECT j.id,j.title,j.location,j.status,co.name company_name,TRUE saved FROM"
              + " candidate_saved_jobs s JOIN jobs j ON j.id=s.job_id JOIN companies co ON"
              + " co.id=j.company_id WHERE s.user_id=? ORDER BY s.created_at DESC,j.id DESC LIMIT"
              + " 30 OFFSET ?",
          u.getId(),
          offset(page));
    return rows(
        "SELECT j.id,j.title,j.location,j.status,co.name company_name,EXISTS(SELECT 1 FROM"
            + " candidate_saved_jobs s WHERE s.job_id=j.id AND s.user_id=?) saved FROM jobs j JOIN"
            + " companies co ON co.id=j.company_id WHERE j.status='PUBLISHED' AND"
            + " co.operational_status='ACTIVE' AND LOWER(j.title) LIKE ? ESCAPE '!' AND"
            + " LOWER(COALESCE(j.location,'')) LIKE ? ESCAPE '!' ORDER BY j.created_at DESC,j.id"
            + " DESC LIMIT 30 OFFSET ?",
        u.getId(),
        like(p.job_keyword()),
        like(p.job_location()),
        offset(page));
  }

  public List<Map<String, Object>> letters(User u, int page) {
    candidate(u);
    return rows(
        "SELECT id,title,body,updated_at FROM candidate_cover_letters WHERE user_id=? ORDER BY"
            + " updated_at DESC,id DESC LIMIT 30 OFFSET ?",
        u.getId(),
        offset(page));
  }

  public Map<String, Object> letter(User u, UUID letter, String title, String body) {
    candidate(u);
    String t = text(title, 160), b = text(body, 12000);
    if (letter == null) {
      letter = UUID.randomUUID();
      db.update(
          "INSERT INTO candidate_cover_letters(id,user_id,title,body) VALUES(?,?,?,?)",
          letter,
          u.getId(),
          t,
          b);
    } else if (db.update(
            "UPDATE candidate_cover_letters SET title=?,body=?,updated_at=CURRENT_TIMESTAMP WHERE"
                + " id=? AND user_id=?",
            t,
            b,
            letter,
            u.getId())
        == 0) throw denied();
    return rows("SELECT id,title,body,updated_at FROM candidate_cover_letters WHERE id=?", letter)
        .getFirst();
  }

  public void deleteLetter(User u, UUID letter) {
    candidate(u);
    if (db.update("DELETE FROM candidate_cover_letters WHERE id=? AND user_id=?", letter, u.getId())
        == 0) throw denied();
  }

  public void view(com.platform.recruitment.application.Application a, User hr) {
    db.queryForObject("SELECT id FROM applications WHERE id=? FOR UPDATE", UUID.class, a.getId());
    int n =
        db.update(
            "UPDATE candidate_profile_views SET viewed_at=CURRENT_TIMESTAMP WHERE application_id=?"
                + " AND recruiter_user_id=?",
            a.getId(),
            hr.getId());
    if (n == 0) {
      db.update(
          "INSERT INTO"
              + " candidate_profile_views(id,candidate_user_id,recruiter_user_id,application_id)"
              + " VALUES(?,?,?,?)",
          UUID.randomUUID(),
          a.getCandidate().getUser().getId(),
          hr.getId(),
          a.getId());
      notice(
          a.getCandidate().getUser().getId(),
          "PROFILE_VIEW",
          "Hồ sơ được xem",
          "Nhà tuyển dụng đã mở hồ sơ ứng tuyển của bạn.",
          "/candidate/account?tab=views");
    }
  }

  public List<Map<String, Object>> views(User u, int page) {
    candidate(u);
    return rows(
        "SELECT v.id,v.viewed_at,rp.full_name recruiter_name,co.name company_name FROM"
            + " candidate_profile_views v JOIN recruiter_profiles rp ON"
            + " rp.user_id=v.recruiter_user_id JOIN applications a ON a.id=v.application_id JOIN"
            + " jobs j ON j.id=a.job_id JOIN companies co ON co.id=j.company_id WHERE"
            + " v.candidate_user_id=? ORDER BY v.viewed_at DESC LIMIT 30 OFFSET ?",
        u.getId(),
        offset(page));
  }

  public Map<String, Boolean> upgrade(User u, boolean create) {
    actor(u);
    if (u.getRole() == Role.ADMIN) throw invalid("Không áp dụng cho quản trị viên.");
    db.queryForObject("SELECT id FROM users WHERE id=? FOR NO KEY UPDATE", UUID.class, u.getId());
    if (create && "PRO".equals(account(u).get("account_plan")))
      throw invalid("Tài khoản đã dùng PRO.");
    if (create) {
      int n =
          db.update(
              "INSERT INTO account_upgrade_requests(id,user_id) VALUES(?,?) ON CONFLICT DO NOTHING",
              UUID.randomUUID(),
              u.getId());
      if (n > 0)
        for (UUID admin :
            db.query(
                "SELECT id FROM users WHERE role='ADMIN' AND is_active=TRUE",
                (r, i) -> r.getObject(1, UUID.class)))
          notice(admin, "PLAN_REQUEST", "Yêu cầu nâng cấp tài khoản", u.getEmail(), "/admin/users");
    }
    return Map.of(
        "requested",
        db.queryForObject(
                "SELECT COUNT(*) FROM account_upgrade_requests WHERE user_id=?",
                Long.class,
                u.getId())
            > 0);
  }

  public void password(User u, String current, String next) {
    actor(u);
    if (next == null
        || next.length() < 8
        || next.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72)
      throw invalid("Mật khẩu mới cần ít nhất 8 ký tự và tối đa 72 byte UTF-8.");
    String old =
        db.queryForObject(
            "SELECT password_hash FROM users WHERE id=? FOR UPDATE", String.class, u.getId());
    if (current == null || !passwords.matches(current, old))
      throw invalid("Mật khẩu hiện tại không đúng.");
    if (passwords.matches(next, old)) throw invalid("Mật khẩu mới phải khác mật khẩu hiện tại.");
    db.update(
        "UPDATE users SET"
            + " password_hash=?,auth_invalid_before=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP"
            + " WHERE id=?",
        passwords.encode(next),
        u.getId());
    db.update("UPDATE auth_sessions SET revoked_at=now() WHERE user_id=? AND revoked_at IS NULL",u.getId());
  }
}
