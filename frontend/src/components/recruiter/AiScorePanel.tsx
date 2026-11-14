"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, ChevronUp, CircleAlert, LockKeyhole, Sparkles } from "lucide-react";
import { fetchMatchInspection } from "@/lib/api";
import { Application, MatchInspectionData } from "@/types";

const classifications = {
  PHU_HOP: { label: "Phù hợp", style: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  CAN_NHAC: { label: "Cân nhắc", style: "bg-amber-100 text-amber-800 border-amber-200" },
  KHONG_PHU_HOP: { label: "Không phù hợp", style: "bg-rose-100 text-rose-800 border-rose-200" },
  CHUA_KHA_DUNG: { label: "Chưa khả dụng", style: "bg-slate-100 text-slate-600 border-slate-200" },
} as const;

export function AiScorePanel({ application }: { application: Application }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inspection, setInspection] = useState<MatchInspectionData | null>(null);
  const [error, setError] = useState("");
  const classification = classifications[application.matchClassification as keyof typeof classifications] || classifications.CHUA_KHA_DUNG;
  const aiScoringAvailable = application.aiAnalysisConsent !== false && application.matchStatus !== "CONSENT_NOT_GIVEN";
  const score = application.matchScore;
  const proDetailAvailable = application.proDetailAvailable ?? score != null;

  const toggle = async () => {
    if (!proDetailAvailable || !aiScoringAvailable) return;
    setOpen((value) => !value);
    if (inspection || open) return;
    setLoading(true);
    setError("");
    try {
      const detail = await fetchMatchInspection(application.id);
      if (!detail) throw new Error("Kết quả phân tích chưa sẵn sàng.");
      setInspection(detail);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không tải được phân tích chi tiết.");
    } finally {
      setLoading(false);
    }
  };

  if (!aiScoringAvailable) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/40">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
          <CircleAlert size={15} /> Chấm điểm CV: Chưa khả dụng
        </div>
        <p className="mt-1.5 text-[11px] leading-5 text-slate-500">Ứng viên chưa đồng ý phân tích AI cho đơn này.</p>
      </div>
    );
  }

  if (score == null && !application.matchClassification) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
        <div className="flex items-center gap-2 font-bold"><Sparkles size={15} /> Đang xử lý đối sánh</div>
        <p className="mt-1.5 text-[11px]">Kết quả sẽ xuất hiện sau khi pipeline AI hoàn tất.</p>
      </div>
    );
  }

  if (score == null) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${classification.style}`}>{classification.label}</span>
          <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">Beta</span>
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)]"><LockKeyhole size={13} /> Bản thường chỉ hiển thị phân loại tổng quan.</p>
        <Link href="/recruiter/services" className="mt-2 inline-block text-[11px] font-bold text-emerald-700 underline">Nâng cấp Pro để xem điểm chi tiết</Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 dark:border-emerald-900 dark:bg-emerald-950/20">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl font-black text-emerald-700 dark:text-emerald-300">{score.toFixed(2)}%</span>
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${classification.style}`}>{classification.label}</span>
          <span className="rounded-full bg-violet-100 px-2 py-1 text-[10px] font-bold text-violet-700">{application.developmentProAccess ? 'Dev access' : application.recruiterPlan === 'PRO' ? 'Pro' : 'Enabled'}</span>
        </div>
        <button type="button" onClick={() => void toggle()} className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 underline">
          {open ? "Thu gọn" : "Xem chi tiết"} {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/80"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.max(0, Math.min(100, score))}%` }} /></div>

      {open && (
        <div className="mt-3 border-t border-emerald-200 pt-3">
          {loading && <p className="text-[11px] text-emerald-800">Đang tải điểm thành phần thật…</p>}
          {error && <p role="alert" className="text-[11px] text-rose-700">{error}</p>}
          {inspection && inspection.detailAccess !== false && (
            <>
              <div className="grid grid-cols-2 gap-2 xl:grid-cols-3">
                {(inspection.matchFactors || []).slice(0, 6).map((factor) => (
                  <div key={factor.factorName} className="rounded-lg border border-emerald-100 bg-white p-2 dark:bg-slate-900">
                    <p className="truncate text-[10px] text-slate-500">{factor.factorName}</p>
                    <p className="mt-1 text-sm font-black text-emerald-700">{factor.score == null ? "N/A" : `${Number(factor.score).toFixed(0)}%`}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 line-clamp-3 text-[11px] leading-5 text-slate-600 dark:text-slate-300">{inspection.humanReadableExplanation}</p>
              <Link href={`/recruiter/applications/${application.id}`} className="mt-2 inline-block text-[11px] font-bold text-emerald-700 underline">Mở toàn bộ minh chứng</Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
