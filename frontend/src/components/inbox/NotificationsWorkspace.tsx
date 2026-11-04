"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import {
  inbox,
  changed,
  failure,
  noticeTitle,
  noticeBody,
  type Notice,
} from "@/lib/inbox";
export function NotificationsWorkspace() {
  const { locale } = useLanguage();
  const vi = locale === "vi";
  const [rows, setRows] = useState<Notice[]>([]);
  const [page, setPage] = useState(0);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        if (document.visibilityState === "visible") {
          const r = await inbox<Notice[]>("/notifications?page=" + page);
          if (active) {
            setRows(r);
            setLoaded(true);
            setError("");
          }
        }
      } catch (e) {
        if (active) {
          setError(failure(e));
          setLoaded(true);
        }
      }
      if (active) timer = setTimeout(poll, 15000);
    }
    void poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [page]);
  async function read(id?: string) {
    if (busy) return;
    setBusy(true);
    try {
      await inbox(
        id ? `/notifications/${id}/read` : "/notifications/read-all",
        "POST",
      );
      setRows((old) =>
        old.map((n) =>
          !id || n.id === id ? { ...n, read_at: new Date().toISOString() } : n,
        ),
      );
      changed();
    } catch (e) {
      setError(failure(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="inbox-workspace">
      <div className="inbox-row">
        <h1>{vi ? "Thông báo" : "Notifications"}</h1>
        <button disabled={busy} onClick={() => void read()}>
          {vi ? "Đánh dấu tất cả đã đọc" : "Mark all read"}
        </button>
      </div>
      <section className="inbox-box inbox-stack">
        {error && (
          <p role="alert" className="inbox-error">
            {error}
          </p>
        )}
        {!loaded && <p role="status">{vi ? "Đang tải…" : "Loading…"}</p>}
        {loaded && !error && !rows.length && (
          <p>{vi ? "Chưa có thông báo." : "No notifications yet."}</p>
        )}
        {rows.map((n) => (
          <article
            key={n.id}
            className={`inbox-notice ${n.read_at ? "" : "unread"}`}
          >
            <strong>{noticeTitle(n, vi)}</strong>
            <p>{noticeBody(n, vi)}</p>
            <time>
              {new Date(n.created_at).toLocaleString(vi ? "vi-VN" : "en-GB")}
            </time>
            <div className="inbox-row">
              <Link
                onClick={() => void read(n.id)}
                href={
                  n.href.startsWith("/") && !n.href.startsWith("//")
                    ? n.href
                    : "#"
                }
              >
                {vi ? "Xem chi tiết" : "View details"}
              </Link>
              {!n.read_at && (
                <button disabled={busy} onClick={() => void read(n.id)}>
                  {vi ? "Đã đọc" : "Mark read"}
                </button>
              )}
            </div>
          </article>
        ))}
        <div className="inbox-row">
          <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            ←
          </button>
          <span>{page + 1}</span>
          <button
            disabled={rows.length < 30}
            onClick={() => setPage((p) => p + 1)}
          >
            →
          </button>
        </div>
      </section>
    </main>
  );
}
