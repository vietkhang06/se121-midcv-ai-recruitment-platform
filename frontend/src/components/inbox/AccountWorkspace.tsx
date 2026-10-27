"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { fetchCVQuota } from "@/lib/api";
import type { CVQuota } from "@/types";
import {
  inbox,
  failure,
  type Account,
  type Settings,
  type JobItem,
  type Letter,
  type ProfileView,
} from "@/lib/inbox";
const defaults: Settings = {
  application_alerts: true,
  message_alerts: true,
  profile_alerts: true,
  job_alerts: false,
  email_alerts: false,
  job_keyword: "",
  job_location: "",
};
export function AccountWorkspace() {
  const { user } = useAuth();
  const { locale } = useLanguage();
  const vi = locale === "vi";
  const search = useSearchParams();
  const base =
    user?.role === "CANDIDATE"
      ? "/candidate"
      : user?.role === "RECRUITER"
        ? "/recruiter"
        : "/admin";
  const candidate = user?.role === "CANDIDATE";
  const tabs = candidate
    ? [
        ["saved", "Việc làm đã lưu", "Saved jobs"],
        ["jobs", "Việc làm theo tiêu chí", "Jobs by preferences"],
        ["letters", "Cover letter", "Cover letters"],
        ["views", "Lượt xem hồ sơ", "Profile views"],
        ["preferences", "Cài đặt", "Settings"],
        ["security", "Bảo mật", "Security"],
        ["plan", "Gói tài khoản", "Account plan"],
      ]
    : [
        ["preferences", "Cài đặt", "Settings"],
        ["security", "Bảo mật", "Security"],
        ...(user?.role === "ADMIN"
          ? []
          : [["plan", "Gói tài khoản", "Account plan"]]),
      ];
  const requested = search.get("tab");
  const tab = tabs.some((t) => t[0] === requested) ? requested! : "preferences";
  return (
    <main className="inbox-workspace">
      <h1>{vi ? "Tài khoản của tôi" : "My account"}</h1>
      <nav className="inbox-tabs">
        {tabs.map((t) => (
          <Link
            key={t[0]}
            href={base + "/account?tab=" + t[0]}
            aria-current={tab === t[0] ? "page" : undefined}
          >
            {t[vi ? 1 : 2]}
          </Link>
        ))}
      </nav>
      <AccountSection
        key={`${user?.id}:${tab}`}
        tab={tab}
        candidate={candidate}
      />
    </main>
  );
}
function AccountSection({
  tab,
  candidate,
}: {
  tab: string;
  candidate: boolean;
}) {
  const { user, logout } = useAuth();
  const { locale } = useLanguage();
  const vi = locale === "vi";
  const [account, setAccount] = useState<Account | null>(null);
  const [prefs, setPrefs] = useState<Settings>(defaults);
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [letters, setLetters] = useState<Letter[]>([]);
  const [views, setViews] = useState<ProfileView[]>([]);
  const [quota, setQuota] = useState<CVQuota | null>(null);
  const [requested, setRequested] = useState(false);
  const [page, setPage] = useState(0);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [editor, setEditor] = useState<{
    id?: string;
    title: string;
    body: string;
  }>({ title: "", body: "" });
  const [password, setPassword] = useState({
    current: "",
    next: "",
    confirm: "",
  });
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const a = await inbox<Account>("/account");
        if (!active) return;
        setAccount(a);
        if (tab === "preferences") {
          const p = await inbox<Settings>("/preferences");
          if (active) setPrefs(p);
        }
        if (tab === "saved" || tab === "jobs") {
          const j = await inbox<JobItem[]>(
            `/jobs?saved=${tab === "saved"}&page=${page}`,
          );
          if (active) setJobs(j);
        }
        if (tab === "letters") {
          const l = await inbox<Letter[]>("/letters?page=" + page);
          if (active) setLetters(l);
        }
        if (tab === "views") {
          const v = await inbox<ProfileView[]>("/profile-views?page=" + page);
          if (active) setViews(v);
        }
        if (tab === "plan") {
          const r = await inbox<{ requested: boolean }>("/upgrade-request");
          if (active) setRequested(r.requested);
          if (candidate) {
            const q = await fetchCVQuota();
            if (active) setQuota(q);
          }
        }
        if (active) setLoaded(true);
      } catch (e) {
        if (active) {
          setError(failure(e));
          setLoaded(true);
        }
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [tab, candidate, page]);
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(vi ? "Đã lưu." : "Saved.");
    } catch (e) {
      setError(failure(e));
    } finally {
      setBusy(false);
    }
  }
  const profile =
    user?.role === "ADMIN"
      ? "/admin/users"
      : candidate
        ? "/candidate/profile"
        : "/recruiter/profile";
  const flag = (
    key: keyof Pick<
      Settings,
      | "application_alerts"
      | "message_alerts"
      | "profile_alerts"
      | "job_alerts"
      | "email_alerts"
    >,
    label: string,
    disabled = false,
  ) => (
    <label className="inbox-check" key={key}>
      <input
        type="checkbox"
        checked={prefs[key]}
        disabled={busy || disabled}
        onChange={(e) => setPrefs({ ...prefs, [key]: e.target.checked })}
      />
      {label}
    </label>
  );
  const total =
    tab === "letters"
      ? letters.length
      : tab === "views"
        ? views.length
        : jobs.length;
  function download() {
    const url = URL.createObjectURL(
      new Blob([editor.title + "\r\n\r\n" + editor.body], {
        type: "text/plain;charset=utf-8",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "cover-letter.txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section className="inbox-box inbox-stack">
      {error && (
        <p className="inbox-error" role="alert">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {!loaded && <p role="status">{vi ? "Đang tải…" : "Loading…"}</p>}
      {loaded && tab === "preferences" && (
        <form
          className="inbox-stack"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              await inbox("/preferences", "PUT", prefs);
            });
          }}
        >
          {candidate && (
            <>
              <label htmlFor="job-keyword">
                {vi ? "Từ khóa việc làm" : "Job keyword"}
              </label>
              <input
                id="job-keyword"
                maxLength={120}
                value={prefs.job_keyword}
                disabled={busy}
                onChange={(e) =>
                  setPrefs({ ...prefs, job_keyword: e.target.value })
                }
              />
              <label htmlFor="job-location">
                {vi ? "Địa điểm" : "Location"}
              </label>
              <input
                id="job-location"
                maxLength={120}
                value={prefs.job_location}
                disabled={busy}
                onChange={(e) =>
                  setPrefs({ ...prefs, job_location: e.target.value })
                }
              />
              {flag(
                "job_alerts",
                vi
                  ? "Thông báo việc làm mới theo tiêu chí đã lưu"
                  : "Notify me about new jobs matching my preferences",
              )}
            </>
          )}
          {flag(
            "application_alerts",
            vi ? "Thông báo ứng tuyển" : "Application notifications",
          )}
          {flag(
            "message_alerts",
            vi
              ? "Thông báo tin nhắn & kết nối"
              : "Message & connection notifications",
          )}
          {flag(
            "profile_alerts",
            vi ? "Thông báo lượt xem hồ sơ" : "Profile view notifications",
          )}
          {flag(
            "email_alerts",
            vi
              ? "Nhận bản sao thông báo qua email"
              : "Receive notifications by email",
            !account?.email_available,
          )}
          {!account?.email_available && (
            <p>
              {vi
                ? "Máy chủ chưa bật gửi email thông báo."
                : "Notification email delivery is not configured on this server."}
            </p>
          )}
          <button disabled={busy} type="submit">
            {busy ? "…" : vi ? "Lưu cài đặt" : "Save settings"}
          </button>
        </form>
      )}
      {loaded && (tab === "saved" || tab === "jobs") && (
        <>
          {!jobs.length && (
            <p>
              {vi
                ? "Chưa có việc làm trong danh sách."
                : "No jobs in this list."}
            </p>
          )}
          {jobs.map((j) => (
            <article className="inbox-list-row" key={j.id}>
              <div>
                <Link href={"/jobs/" + j.id}>
                  <strong>{j.title}</strong>
                </Link>
                <span>
                  {j.company_name} · {j.location || "—"}
                </span>
                <small>{j.status}</small>
              </div>
              <button
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await inbox(`/jobs/${j.id}/saved`, "PUT", {
                      saved: !j.saved,
                    });
                    setJobs((old) =>
                      tab === "saved"
                        ? old.filter((x) => x.id !== j.id)
                        : old.map((x) =>
                            x.id === j.id ? { ...x, saved: !x.saved } : x,
                          ),
                    );
                  })
                }
              >
                {j.saved
                  ? vi
                    ? "Bỏ lưu"
                    : "Unsave"
                  : vi
                    ? "Lưu việc làm"
                    : "Save job"}
              </button>
            </article>
          ))}
        </>
      )}
      {loaded && tab === "letters" && (
        <div className="inbox-letter-grid">
          <div className="inbox-stack">
            <button
              disabled={busy}
              onClick={() => setEditor({ title: "", body: "" })}
            >
              {vi ? "Tạo cover letter" : "New cover letter"}
            </button>
            {letters.map((l) => (
              <article key={l.id} className="inbox-list-row">
                <button
                  disabled={busy}
                  onClick={() =>
                    setEditor({ id: l.id, title: l.title, body: l.body })
                  }
                >
                  {l.title}
                </button>
                <button
                  disabled={busy}
                  onClick={() => {
                    if (
                      window.confirm(
                        vi
                          ? "Xóa cover letter này?"
                          : "Delete this cover letter?",
                      )
                    )
                      void run(async () => {
                        await inbox("/letters/" + l.id, "DELETE");
                        setLetters((old) => old.filter((x) => x.id !== l.id));
                        if (editor.id === l.id)
                          setEditor({ title: "", body: "" });
                      });
                  }}
                >
                  {vi ? "Xóa" : "Delete"}
                </button>
              </article>
            ))}
          </div>
          <form
            className="inbox-stack"
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                const l = await inbox<Letter>(
                  editor.id ? "/letters/" + editor.id : "/letters",
                  editor.id ? "PUT" : "POST",
                  { title: editor.title, body: editor.body },
                );
                setLetters((old) =>
                  [l, ...old.filter((x) => x.id !== l.id)].slice(0, 30),
                );
                setEditor({ id: l.id, title: l.title, body: l.body });
              });
            }}
          >
            <label htmlFor="letter-title">{vi ? "Tiêu đề" : "Title"}</label>
            <input
              id="letter-title"
              required
              maxLength={160}
              value={editor.title}
              disabled={busy}
              onChange={(e) => setEditor({ ...editor, title: e.target.value })}
            />
            <label htmlFor="letter-body">{vi ? "Nội dung" : "Content"}</label>
            <textarea
              id="letter-body"
              required
              maxLength={12000}
              rows={15}
              value={editor.body}
              disabled={busy}
              onChange={(e) => setEditor({ ...editor, body: e.target.value })}
            />
            <div className="inbox-row">
              <button
                disabled={busy || !editor.title.trim() || !editor.body.trim()}
              >
                {vi ? "Lưu" : "Save"}
              </button>
              <button
                type="button"
                onClick={download}
                disabled={!editor.body.trim()}
              >
                {vi ? "Tải .txt" : "Download .txt"}
              </button>
            </div>
          </form>
        </div>
      )}
      {loaded && tab === "views" && (
        <>
          {!views.length && (
            <p>
              {vi
                ? "Chưa ghi nhận lượt xem hồ sơ."
                : "No profile views recorded."}
            </p>
          )}
          {views.map((v) => (
            <article key={v.id} className="inbox-list-row">
              <div>
                <strong>{v.recruiter_name}</strong>
                <span>{v.company_name}</span>
                <time>
                  {new Date(v.viewed_at).toLocaleString(vi ? "vi-VN" : "en-GB")}
                </time>
              </div>
            </article>
          ))}
        </>
      )}
      {loaded && tab === "security" && (
        <>
          <strong>{account?.full_name}</strong>
          <p>{account?.email}</p>
          <p>
            {account?.email_verified
              ? vi
                ? "Email đã xác thực"
                : "Email verified"
              : vi
                ? "Email chưa xác thực"
                : "Email not verified"}
          </p>
          <Link href={profile}>
            {vi ? "Chỉnh sửa thông tin cá nhân" : "Edit personal details"}
          </Link>
          <form
            className="inbox-stack"
            onSubmit={(e) => {
              e.preventDefault();
              if (password.next !== password.confirm) {
                setError(
                  vi
                    ? "Mật khẩu xác nhận không khớp."
                    : "Passwords do not match.",
                );
                return;
              }
              void run(async () => {
                await inbox("/password", "PUT", {
                  currentPassword: password.current,
                  newPassword: password.next,
                });
                logout();
              });
            }}
          >
            <label htmlFor="current-password">
              {vi ? "Mật khẩu hiện tại" : "Current password"}
            </label>
            <input
              id="current-password"
              type="password"
              required
              autoComplete="current-password"
              value={password.current}
              onChange={(e) =>
                setPassword({ ...password, current: e.target.value })
              }
            />
            <label htmlFor="new-password">
              {vi ? "Mật khẩu mới" : "New password"}
            </label>
            <input
              id="new-password"
              type="password"
              required
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
              value={password.next}
              onChange={(e) =>
                setPassword({ ...password, next: e.target.value })
              }
            />
            <label htmlFor="confirm-password">
              {vi ? "Xác nhận mật khẩu mới" : "Confirm new password"}
            </label>
            <input
              id="confirm-password"
              type="password"
              required
              autoComplete="new-password"
              value={password.confirm}
              onChange={(e) =>
                setPassword({ ...password, confirm: e.target.value })
              }
            />
            <button disabled={busy}>
              {vi ? "Đổi mật khẩu & đăng xuất" : "Change password & sign out"}
            </button>
          </form>
        </>
      )}
      {loaded && tab === "plan" && (
        <>
          <h2>{account?.account_plan}</h2>
          {quota && (
            <p>
              {vi ? "CV đã dùng / giới hạn" : "CVs used / limit"}:{" "}
              {quota.currentCount} / {quota.maxLimit}
            </p>
          )}
          <p>
            {vi
              ? "Nâng cấp do quản trị viên xử lý. Hệ thống chưa cung cấp thanh toán trực tuyến."
              : "Upgrades are handled by an administrator. Online payments are not available."}
          </p>
          {account?.account_plan !== "PRO" && (
            <button
              disabled={busy || requested}
              onClick={() =>
                void run(async () => {
                  await inbox("/upgrade-request", "POST");
                  setRequested(true);
                })
              }
            >
              {requested
                ? vi
                  ? "Đã gửi yêu cầu nâng cấp"
                  : "Upgrade requested"
                : vi
                  ? "Yêu cầu nâng cấp"
                  : "Request upgrade"}
            </button>
          )}
        </>
      )}
      {loaded && ["saved", "jobs", "letters", "views"].includes(tab) && (
        <div className="inbox-row">
          <button
            disabled={page === 0 || busy}
            onClick={() => setPage((p) => p - 1)}
          >
            ←
          </button>
          <span>
            {vi ? "Trang" : "Page"} {page + 1}
          </span>
          <button
            disabled={total < 30 || busy}
            onClick={() => setPage((p) => p + 1)}
          >
            →
          </button>
        </div>
      )}
    </section>
  );
}
