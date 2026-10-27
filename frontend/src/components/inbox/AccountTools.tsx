"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Bell,
  MessageSquare,
  UserRound,
  ChevronDown,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { LogoutConfirmModal } from "@/components/auth/LogoutConfirmModal";
import {
  inbox,
  changed,
  failure,
  noticeTitle,
  noticeBody,
  type Notice,
  type Account,
} from "@/lib/inbox";
export function AccountTools() {
  const { user, logout } = useAuth();
  const { locale } = useLanguage();
  const vi = locale === "vi";
  const [panel, setPanel] = useState<"account" | "notifications" | null>(null);
  const [data, setData] = useState<Account | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [count, setCount] = useState({ notifications: 0, messages: 0 });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [exit, setExit] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const base =
    user?.role === "CANDIDATE"
      ? "/candidate"
      : user?.role === "RECRUITER"
        ? "/recruiter"
        : "/admin";
  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      setCount(await inbox("/unread"));
    } catch {
      /* Panel reports network errors; do not invent updated counts. */
    }
  }, [user]);
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      if (document.visibilityState === "visible") await refresh();
      if (active) timer = setTimeout(poll, 15000);
    }
    void poll();
    const update = () => void refresh();
    window.addEventListener("midcv:inbox", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      active = false;
      clearTimeout(timer);
      window.removeEventListener("midcv:inbox", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [refresh]);
  useEffect(() => {
    if (!panel) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPanel(null);
        opener.current?.focus();
      }
    };
    const outside = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setPanel(null);
    };
    document.addEventListener("keydown", key);
    document.addEventListener("pointerdown", outside);
    return () => {
      document.removeEventListener("keydown", key);
      document.removeEventListener("pointerdown", outside);
    };
  }, [panel]);
  async function load(next: "account" | "notifications") {
    setLoading(true);
    setError("");
    try {
      if (next === "account") setData(await inbox("/account"));
      else setNotices(await inbox("/notifications"));
    } catch (e) {
      setError(failure(e));
    } finally {
      setLoading(false);
    }
  }
  function open(next: "account" | "notifications", button: HTMLButtonElement) {
    opener.current = button;
    if (panel === next) {
      setPanel(null);
      return;
    }
    setPanel(next);
    void load(next);
  }
  async function readAll() {
    try {
      await inbox("/notifications/read-all", "POST");
      setNotices((n) =>
        n.map((x) => ({ ...x, read_at: new Date().toISOString() })),
      );
      changed();
    } catch (e) {
      setError(failure(e));
    }
  }
  async function follow(n: Notice) {
    try {
      await inbox(`/notifications/${n.id}/read`, "POST");
      changed();
      setPanel(null);
      window.location.assign(
        n.href.startsWith("/") && !n.href.startsWith("//")
          ? n.href
          : base + "/notifications",
      );
    } catch (e) {
      setError(failure(e));
    }
  }
  if (!user) return null;
  const badge = (n: number) =>
    n > 0 ? <span className="inbox-badge">{n > 99 ? "99+" : n}</span> : null;
  const link = (href: string, label: string) => (
    <Link
      className="inbox-menu-link"
      href={href}
      onClick={() => setPanel(null)}
    >
      {label}
    </Link>
  );
  return (
    <div className="inbox-tools" ref={root}>
      <button
        className="inbox-icon"
        aria-label={
          vi
            ? `Thông báo, ${count.notifications} chưa đọc`
            : `Notifications, ${count.notifications} unread`
        }
        aria-expanded={panel === "notifications"}
        onClick={(e) => open("notifications", e.currentTarget)}
      >
        <Bell size={18} />
        {badge(count.notifications)}
      </button>
      {user.role !== "ADMIN" && (
        <Link
          className="inbox-icon"
          href={base + "/messages"}
          aria-label={
            vi
              ? `Tin nhắn, ${count.messages} chưa đọc`
              : `Messages, ${count.messages} unread`
          }
        >
          <MessageSquare size={18} />
          {badge(count.messages)}
        </Link>
      )}
      <button
        className="inbox-icon"
        aria-label={vi ? "Menu tài khoản" : "Account menu"}
        aria-expanded={panel === "account"}
        onClick={(e) => open("account", e.currentTarget)}
      >
        <UserRound size={18} />
        <ChevronDown size={12} />
      </button>
      {panel && (
        <section
          className="inbox-popover"
          aria-label={
            panel === "account"
              ? vi
                ? "Tài khoản"
                : "Account"
              : vi
                ? "Thông báo"
                : "Notifications"
          }
        >
          {loading && <p role="status">{vi ? "Đang tải…" : "Loading…"}</p>}
          {error && (
            <div role="alert">
              <p>{error}</p>
              <button onClick={() => void load(panel)}>
                {vi ? "Thử lại" : "Retry"}
              </button>
            </div>
          )}
          {panel === "notifications" ? (
            <>
              <div className="inbox-row">
                <strong>{vi ? "Thông báo" : "Notifications"}</strong>
                <button onClick={() => void readAll()}>
                  {vi ? "Đọc tất cả" : "Read all"}
                </button>
              </div>
              {!loading && !error && !notices.length && (
                <p>{vi ? "Chưa có thông báo." : "No notifications yet."}</p>
              )}
              {notices.map((n) => (
                <button
                  key={n.id}
                  className={`inbox-notice ${n.read_at ? "" : "unread"}`}
                  onClick={() => void follow(n)}
                >
                  <strong>{noticeTitle(n, vi)}</strong>
                  <span>{noticeBody(n, vi)}</span>
                  <small>
                    {new Date(n.created_at).toLocaleString(
                      vi ? "vi-VN" : "en-GB",
                    )}
                  </small>
                </button>
              ))}
              {link(
                base + "/notifications",
                vi ? "Xem tất cả" : "All notifications",
              )}
            </>
          ) : (
            <>
              <div className="inbox-identity">
                <UserRound size={36} />
                <div>
                  <strong>{data?.full_name || user.fullName}</strong>
                  <span>
                    {(data?.email_verified ?? user.emailVerified)
                      ? vi
                        ? "Email đã xác thực"
                        : "Email verified"
                      : vi
                        ? "Email chưa xác thực"
                        : "Email not verified"}
                  </span>
                  <small>ID {data?.id || user.id}</small>
                  <span>{data?.email || user.email}</span>
                </div>
              </div>
              {user.role === "CANDIDATE" ? (
                <>
                  <details open>
                    <summary>{vi ? "Quản lý tìm việc" : "Job search"}</summary>
                    {link(
                      "/candidate/account?tab=saved",
                      vi ? "Việc làm đã lưu" : "Saved jobs",
                    )}
                    {link(
                      "/candidate/applications",
                      vi ? "Việc làm đã ứng tuyển" : "Applications",
                    )}
                    {link(
                      "/candidate/account?tab=jobs",
                      vi
                        ? "Việc làm theo tiêu chí của bạn"
                        : "Jobs by your preferences",
                    )}
                    {link(
                      "/candidate/account?tab=preferences",
                      vi ? "Cài đặt gợi ý việc làm" : "Job preferences",
                    )}
                  </details>
                  <details open>
                    <summary>
                      {vi ? "Quản lý CV & Cover letter" : "CVs & cover letters"}
                    </summary>
                    {link("/candidate/cvs", vi ? "CV của tôi" : "My CVs")}
                    {link(
                      "/candidate/account?tab=letters",
                      vi ? "Cover letter của tôi" : "My cover letters",
                    )}
                    {link(
                      "/candidate/messages",
                      vi
                        ? "Nhà tuyển dụng muốn kết nối"
                        : "Recruiter connections",
                    )}
                    {link(
                      "/candidate/account?tab=views",
                      vi ? "Nhà tuyển dụng xem hồ sơ" : "Profile views",
                    )}
                  </details>
                </>
              ) : (
                <details open>
                  <summary>{vi ? "Quản lý công việc" : "Workspace"}</summary>
                  {link(
                    base + (user.role === "ADMIN" ? "/users" : "/jobs"),
                    vi ? "Quản lý" : "Manage",
                  )}
                  {user.role === "RECRUITER" &&
                    link(
                      "/recruiter/messages",
                      vi ? "Tin nhắn ứng viên" : "Candidate messages",
                    )}
                </details>
              )}
              <details open>
                <summary>
                  {vi ? "Cài đặt email & thông báo" : "Email & notifications"}
                </summary>
                {link(
                  base + "/account?tab=preferences",
                  vi
                    ? "Cài đặt thông báo & nhận email"
                    : "Notification & email settings",
                )}
              </details>
              <details>
                <summary>
                  {vi ? "Cá nhân & Bảo mật" : "Personal & security"}
                </summary>
                {link(
                  user.role === "ADMIN" ? "/admin/users" : base + "/profile",
                  vi ? "Thông tin cá nhân" : "Personal details",
                )}
                {link(
                  base + "/account?tab=security",
                  vi ? "Tài khoản & bảo mật" : "Account & security",
                )}
              </details>
              {user.role !== "ADMIN" && (
                <details>
                  <summary>
                    {vi ? "Nâng cấp tài khoản" : "Account upgrade"}
                  </summary>
                  {link(
                    base + "/account?tab=plan",
                    vi
                      ? "Gói hiện tại & yêu cầu nâng cấp"
                      : "Current plan & upgrade request",
                  )}
                </details>
              )}
              <button
                className="inbox-menu-link"
                onClick={() => {
                  setPanel(null);
                  setExit(true);
                }}
              >
                <LogOut size={16} />
                {vi ? "Đăng xuất" : "Sign out"}
              </button>
            </>
          )}
        </section>
      )}
      <LogoutConfirmModal
        isOpen={exit}
        onClose={() => setExit(false)}
        onConfirm={logout}
      />
    </div>
  );
}
