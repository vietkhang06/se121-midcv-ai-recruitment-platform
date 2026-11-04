"use client";
import { useEffect, useState } from "react";
import { Bookmark } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { inbox, failure } from "@/lib/inbox";
export function SaveJobButton({ jobId }: { jobId: string }) {
  const { user } = useAuth();
  const { locale } = useLanguage();
  const vi = locale === "vi";
  const [saved, setSaved] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    if (user?.role === "CANDIDATE")
      inbox<boolean>(`/jobs/${jobId}/saved`)
        .then((v) => {
          if (active) {
            setSaved(v);
            setReady(true);
          }
        })
        .catch((e) => {
          if (active) setError(failure(e));
        });
    return () => {
      active = false;
    };
  }, [jobId, user?.role]);
  if (user?.role !== "CANDIDATE") return null;
  async function toggle() {
    if (busy) return;
    setBusy(true);
    try {
      await inbox(`/jobs/${jobId}/saved`, "PUT", { saved: !saved });
      setSaved(!saved);
      setError("");
    } catch (e) {
      setError(failure(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <button
        className="flex items-center gap-2 px-4 py-2 border-2 border-[var(--border)]"
        disabled={!ready || busy}
        onClick={() => void toggle()}
      >
        <Bookmark size={16} fill={saved ? "currentColor" : "none"} />
        {saved
          ? vi
            ? "Đã lưu việc làm"
            : "Job saved"
          : vi
            ? "Lưu việc làm"
            : "Save job"}
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
