"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Send } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import {
  inbox,
  changed,
  failure,
  type Thread,
  type Message,
  type Contact,
} from "@/lib/inbox";
export function MessagesWorkspace() {
  const { user } = useAuth();
  const { locale } = useLanguage();
  const vi = locale === "vi";
  const search = useSearchParams();
  const param = search.get("thread") || "";
  const [previous, setPrevious] = useState(param);
  const [selected, setSelected] = useState(param);
  if (previous !== param) {
    setPrevious(param);
    setSelected(param);
  }
  const [threads, setThreads] = useState<Thread[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [page, setPage] = useState(0);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactPage, setContactPage] = useState(0);
  const [contact, setContact] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const recruiter = user?.role === "RECRUITER";
  const refresh = useCallback(async () => {
    setThreads(await inbox("/conversations?page=" + page));
  }, [page]);
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        if (document.visibilityState === "visible") {
          const rows = await inbox<Thread[]>("/conversations?page=" + page);
          if (active) {
            setThreads(rows);
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
      if (active) timer = setTimeout(poll, 5000);
    }
    void poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [page]);
  useEffect(() => {
    if (!recruiter) return;
    let active = true;
    inbox<Contact[]>("/contacts?page=" + contactPage)
      .then((rows) => {
        if (active) setContacts(rows);
      })
      .catch((e) => {
        if (active) setError(failure(e));
      });
    return () => {
      active = false;
    };
  }, [recruiter, contactPage]);
  async function start() {
    if (!contact || creating) return;
    setCreating(true);
    try {
      const r = await inbox<{ id: string }>("/conversations", "POST", {
        applicationId: contact,
      });
      setSelected(r.id);
      setPage(0);
      await refresh();
    } catch (e) {
      setError(failure(e));
    } finally {
      setCreating(false);
    }
  }
  return (
    <main className="inbox-workspace">
      <h1>{vi ? "Tin nhắn" : "Messages"}</h1>
      {error && (
        <p role="alert" className="inbox-error">
          {error}
        </p>
      )}
      <div className="inbox-chat-grid">
        <aside
          className={`inbox-box inbox-threads ${selected ? "thread-open" : ""}`}
        >
          {recruiter && (
            <div className="inbox-stack">
              <label htmlFor="chat-contact">
                {vi ? "Liên hệ từ đơn ứng tuyển" : "Contact an applicant"}
              </label>
              <select
                id="chat-contact"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
              >
                <option value="">
                  {vi ? "Chọn ứng viên" : "Select applicant"}
                </option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.title}
                  </option>
                ))}
              </select>
              <div className="inbox-row">
                <button
                  disabled={!contactPage}
                  onClick={() => setContactPage((p) => p - 1)}
                >
                  ←
                </button>
                <span>{contactPage + 1}</span>
                <button
                  disabled={contacts.length < 30}
                  onClick={() => setContactPage((p) => p + 1)}
                >
                  →
                </button>
              </div>
              <button
                disabled={!contact || creating}
                onClick={() => void start()}
              >
                {vi ? "Mở trò chuyện" : "Start conversation"}
              </button>
            </div>
          )}
          {!loaded && <p role="status">{vi ? "Đang tải…" : "Loading…"}</p>}
          {loaded && !threads.length && (
            <p>{vi ? "Chưa có cuộc trò chuyện." : "No conversations yet."}</p>
          )}
          {threads.map((t) => (
            <button
              key={t.id}
              aria-pressed={selected === t.id}
              className={`inbox-thread ${selected === t.id ? "selected" : ""}`}
              onClick={() => setSelected(t.id)}
            >
              <strong>
                {t.peer_name}
                {t.unread > 0 && (
                  <span className="inbox-count">{t.unread}</span>
                )}
              </strong>
              <span>{t.job_title}</span>
              <small>
                {t.last_message ||
                  (vi ? "Lời mời kết nối" : "Connection invitation")}
              </small>
            </button>
          ))}
          <div className="inbox-row">
            <button disabled={!page} onClick={() => setPage((p) => p - 1)}>
              ←
            </button>
            <span>{page + 1}</span>
            <button
              disabled={threads.length < 30}
              onClick={() => setPage((p) => p + 1)}
            >
              →
            </button>
          </div>
        </aside>
        {selected ? (
          <ChatThread
            key={selected}
            id={selected}
            initialDraft={drafts[selected] || ""}
            saveDraft={(text) =>
              setDrafts((old) => ({ ...old, [selected]: text }))
            }
            onClose={() => setSelected("")}
            onChange={() => void refresh().catch((e) => setError(failure(e)))}
          />
        ) : (
          <section className="inbox-box inbox-empty">
            {vi ? "Chọn một cuộc trò chuyện." : "Select a conversation."}
          </section>
        )}
      </div>
    </main>
  );
}
function ChatThread({
  id,
  initialDraft,
  saveDraft,
  onClose,
  onChange,
}: {
  id: string;
  initialDraft: string;
  saveDraft: (s: string) => void;
  onClose: () => void;
  onChange: () => void;
}) {
  const { user } = useAuth();
  const { locale } = useLanguage();
  const vi = locale === "vi";
  const [thread, setThread] = useState<Thread | null>(null);
  const [items, setItems] = useState<Message[]>([]);
  const [before, setBefore] = useState<string | null>(null);
  const [body, setBody] = useState(initialDraft);
  const [loaded, setLoaded] = useState(false);
  const [sending, setSending] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [olderBusy, setOlderBusy] = useState(false);
  const [error, setError] = useState("");
  const log = useRef<HTMLDivElement>(null);
  const alive = useRef(true);
  const first = useRef(true);
  const read = useRef("");
  const retry = useRef<{ body: string; id: string } | null>(null);
  useEffect(() => {
    let active = true;
    alive.current = true;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        if (document.visibilityState === "visible") {
          const t = await inbox<Thread>("/conversations/" + id);
          const p = await inbox<{
            items: Message[];
            nextBefore: string | null;
          }>(`/conversations/${id}/messages`);
          if (!active) return;
          const bottom =
            !log.current ||
            log.current.scrollHeight -
              log.current.scrollTop -
              log.current.clientHeight <
              90;
          setThread(t);
          setItems((old) => merge(old, p.items));
          if (first.current) {
            setBefore(p.nextBefore);
            first.current = false;
          }
          setLoaded(true);
          setError("");
          if (bottom)
            requestAnimationFrame(() => {
              if (log.current) log.current.scrollTop = log.current.scrollHeight;
            });
          const end = p.items.at(-1);
          if (end && end.id !== read.current && bottom && document.hasFocus()) {
            await inbox(`/conversations/${id}/read`, "POST", {
              through: end.id,
            });
            read.current = end.id;
            changed();
          }
        }
      } catch (e) {
        if (active) {
          setError(failure(e));
          setLoaded(true);
        }
      }
      if (active) timer = setTimeout(poll, 3000);
    }
    void poll();
    return () => {
      active = false;
      alive.current = false;
      clearTimeout(timer);
    };
  }, [id]);
  async function send() {
    const content = body.trim();
    if (!content || sending) return;
    if (retry.current?.body !== content)
      retry.current = { body: content, id: crypto.randomUUID() };
    setSending(true);
    setError("");
    try {
      const m = await inbox<Message>(`/conversations/${id}/messages`, "POST", {
        clientId: retry.current.id,
        body: content,
      });
      if (!alive.current) return;
      setItems((old) => merge(old, [m]));
      setBody("");
      saveDraft("");
      retry.current = null;
      onChange();
      changed();
      requestAnimationFrame(() => {
        if (log.current) log.current.scrollTop = log.current.scrollHeight;
      });
    } catch (e) {
      if (alive.current) setError(failure(e));
    } finally {
      if (alive.current) setSending(false);
    }
  }
  async function older() {
    if (!before || olderBusy) return;
    setOlderBusy(true);
    try {
      const p = await inbox<{ items: Message[]; nextBefore: string | null }>(
        `/conversations/${id}/messages?before=${before}`,
      );
      if (alive.current) {
        setItems((old) => merge(old, p.items));
        setBefore(p.nextBefore);
      }
    } catch (e) {
      setError(failure(e));
    } finally {
      setOlderBusy(false);
    }
  }
  async function action(value: string) {
    if (actionBusy) return;
    setActionBusy(true);
    try {
      await inbox(`/conversations/${id}/action`, "POST", { action: value });
      setThread(await inbox("/conversations/" + id));
      onChange();
    } catch (e) {
      setError(failure(e));
    } finally {
      setActionBusy(false);
    }
  }
  return (
    <section className="inbox-box inbox-chat">
      <div className="inbox-row">
        <button className="inbox-mobile-back" onClick={onClose}>
          {vi ? "← Cuộc trò chuyện" : "← Conversations"}
        </button>
        <div>
          <strong>
            {thread?.peer_name || (vi ? "Cuộc trò chuyện" : "Conversation")}
          </strong>
          <small className="inbox-block">{thread?.job_title}</small>
        </div>
        <div className="inbox-row">
          {thread && !thread.accepted && user?.role === "CANDIDATE" && (
            <button disabled={actionBusy} onClick={() => void action("accept")}>
              {vi ? "Chấp nhận kết nối" : "Accept"}
            </button>
          )}
          {thread && (!thread.blocked_by || thread.blocked_by === user?.id) && (
            <button
              disabled={actionBusy}
              onClick={() =>
                void action(thread.blocked_by ? "unblock" : "block")
              }
            >
              {thread.blocked_by
                ? vi
                  ? "Bỏ chặn"
                  : "Unblock"
                : vi
                  ? "Chặn"
                  : "Block"}
            </button>
          )}
        </div>
      </div>
      {error && (
        <p role="alert" className="inbox-error">
          {error}
        </p>
      )}
      <div
        ref={log}
        className="inbox-log"
        role="log"
        aria-label={vi ? "Nội dung trò chuyện" : "Conversation messages"}
        aria-live="polite"
        aria-relevant="additions text"
      >
        {before && (
          <button disabled={olderBusy} onClick={() => void older()}>
            {vi ? "Tin nhắn trước" : "Older messages"}
          </button>
        )}
        {!loaded && <p role="status">{vi ? "Đang tải…" : "Loading…"}</p>}
        {loaded && !error && !items.length && (
          <p>{vi ? "Chưa có tin nhắn." : "No messages yet."}</p>
        )}
        {items.map((m) => (
          <article
            className={`inbox-message ${m.sender_id === user?.id ? "own" : ""}`}
            key={m.id}
          >
            <p>{m.body}</p>
            <small>
              {new Date(m.created_at).toLocaleString(vi ? "vi-VN" : "en-GB")}
              {m.sender_id === user?.id && (
                <span>
                  {" "}
                  ·{" "}
                  {m.read_at
                    ? vi
                      ? "Đã đọc"
                      : "Read"
                    : vi
                      ? "Đã gửi"
                      : "Sent"}
                </span>
              )}
            </small>
          </article>
        ))}
      </div>
      {thread?.blocked_by ? (
        <p>{vi ? "Cuộc trò chuyện đã bị chặn." : "Conversation blocked."}</p>
      ) : (
        <form
          className="inbox-composer"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <label htmlFor="chat-body" className="sr-only">
            {vi ? "Tin nhắn" : "Message"}
          </label>
          <textarea
            id="chat-body"
            maxLength={4000}
            rows={3}
            value={body}
            disabled={sending || !thread}
            onChange={(e) => {
              setBody(e.target.value);
              saveDraft(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                void send();
              }
            }}
          />
          <button disabled={sending || !body.trim() || !thread}>
            <Send size={16} />
            {sending ? "…" : vi ? "Gửi" : "Send"}
          </button>
        </form>
      )}
    </section>
  );
}
function merge(old: Message[], newer: Message[]) {
  const map = new Map(old.map((m) => [m.id, m]));
  newer.forEach((m) => map.set(m.id, m));
  const stamp = (s: string) =>
    s.replace(
      /(?:\.(\d+))?Z$/,
      (_all, p: string | undefined) => "." + (p || "").padEnd(9, "0") + "Z",
    );
  return [...map.values()].sort(
    (a, b) =>
      stamp(a.created_at).localeCompare(stamp(b.created_at)) ||
      a.id.localeCompare(b.id),
  );
}
