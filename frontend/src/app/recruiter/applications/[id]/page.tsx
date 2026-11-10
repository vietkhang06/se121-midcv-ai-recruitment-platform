"use client";

import { CVSnapshotPreview } from "@/components/cv/CVSnapshotPreview";
import { EmptyState } from "@/components/common/EmptyState";
import { GitHubAssessmentCard } from "@/components/recruiter/GitHubAssessmentCard";
import { ScoreBreakdownCard } from "@/components/recruiter/ScoreBreakdownCard";
import {
  fetchApplicationAuditLogs,
  fetchApplicationById,
  fetchMatchInspection,
  updateApplicationStatus,
} from "@/lib/api";
import { Application, ApplicationAuditLogItem, ApplicationStatus, MatchInspectionData } from "@/types";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarCheck,
  CheckCircle2,
  Download,
  FileText,
  GitBranch,
  History,
  LockKeyhole,
  Mail,
  Phone,
  Share2,
  ShieldCheck,
  Sparkles,
  ThumbsDown,
  UserRoundCheck,
  X,
} from "lucide-react";
import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";

const statusLabels: Record<ApplicationStatus, string> = {
  SUBMITTED: "CV ứng tuyển mới",
  REVIEWED: "Đã xem",
  MATCHED: "Đã đối sánh",
  UNDER_REVIEW: "Đang xem xét",
  SHORTLISTED: "Phù hợp hồ sơ",
  INTERVIEWING: "Đang phỏng vấn",
  HIRED: "Đã tuyển",
  REJECTED: "Từ chối",
};

const statusStyle: Record<ApplicationStatus, string> = {
  SUBMITTED: "bg-blue-100 text-blue-700",
  REVIEWED: "bg-slate-100 text-slate-700",
  MATCHED: "bg-cyan-100 text-cyan-700",
  UNDER_REVIEW: "bg-amber-100 text-amber-700",
  SHORTLISTED: "bg-emerald-100 text-emerald-700",
  INTERVIEWING: "bg-violet-100 text-violet-700",
  HIRED: "bg-green-100 text-green-800",
  REJECTED: "bg-rose-100 text-rose-700",
};

const matchLabels = {
  PHU_HOP: ["Phù hợp", "bg-emerald-100 text-emerald-800"],
  CAN_NHAC: ["Cân nhắc", "bg-amber-100 text-amber-800"],
  KHONG_PHU_HOP: ["Không phù hợp", "bg-rose-100 text-rose-800"],
  CHUA_KHA_DUNG: ["Chưa khả dụng", "bg-slate-100 text-slate-600"],
} as const;

export default function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [application, setApplication] = useState<Application | null>(null);
  const [inspection, setInspection] = useState<MatchInspectionData | null>(null);
  const [auditLogs, setAuditLogs] = useState<ApplicationAuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [decision, setDecision] = useState<ApplicationStatus | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const app = await fetchApplicationById(id);
      if (!app) throw new Error("Không tìm thấy hồ sơ ứng tuyển.");
      const [logs, detail] = await Promise.all([
        fetchApplicationAuditLogs(id),
        app.aiScoringAvailable && app.proDetailAvailable
          ? fetchMatchInspection(id).catch(() => null)
          : Promise.resolve(null),
      ]);
      setApplication(app);
      setAuditLogs(logs);
      setInspection(detail);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không tải được hồ sơ ứng tuyển.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  const saveDecision = async () => {
    if (!application || !decision) return;
    setSaving(true);
    try {
      const updated = await updateApplicationStatus(application.id, decision, note, application.status);
      setApplication(updated);
      setAuditLogs(await fetchApplicationAuditLogs(application.id));
      setDecision(null);
      setNote("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không lưu được quyết định.");
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex min-h-[70vh] items-center justify-center"><EmptyState type="LOADING" title="Đang tải hồ sơ ứng tuyển…" description="Đang lấy snapshot CV, trạng thái và quyền xem kết quả AI." /></div>;
  if (error && !application) return <main className="mx-auto max-w-4xl p-8"><EmptyState type="ERROR" title="Không thể mở hồ sơ" description={error} primaryCtaText="Thử lại" onPrimaryCtaClick={load} /></main>;
  if (!application) return null;

  const match = matchLabels[application.matchClassification || "CHUA_KHA_DUNG"];
  const actions: Array<[ApplicationStatus, string, typeof CheckCircle2, string]> = [
    ["SHORTLISTED", "Phù hợp", CheckCircle2, "text-emerald-700 border-emerald-200"],
    ["INTERVIEWING", "Mời phỏng vấn", CalendarCheck, "text-violet-700 border-violet-200"],
    ["HIRED", "Tuyển dụng", UserRoundCheck, "text-green-700 border-green-200"],
    ["REJECTED", "Từ chối", ThumbsDown, "text-rose-700 border-rose-200"],
  ];

  return (
    <main className="mx-auto max-w-[1450px] space-y-5 p-4 pb-16 md:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/recruiter/candidates" className="inline-flex items-center gap-2 text-xs font-bold text-[var(--text-secondary)] hover:text-emerald-700"><ArrowLeft size={15} /> Quay lại quản lý CV</Link>
        <div className="flex gap-2">
          <button type="button" onClick={async () => { await navigator.clipboard.writeText(window.location.href); }} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-bold"><Share2 size={15} /> Chia sẻ</button>
          <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white"><Download size={15} /> In / lưu PDF</button>
        </div>
      </div>

      {error && <div role="alert" className="flex justify-between rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"><span>{error}</span><button type="button" onClick={() => setError("")}><X size={15} /></button></div>}

      <header className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-emerald-300 bg-emerald-50 text-lg font-black text-emerald-700">{(application.candidateName || "?").slice(0, 1).toUpperCase()}</div>
            <div><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-black">{application.candidateName || "Ứng viên"}</h1><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusStyle[application.status]}`}>{statusLabels[application.status]}</span></div><p className="mt-1 text-sm text-[var(--text-secondary)]">{application.candidateHeadline || "Chưa cập nhật chức danh"}</p><p className="mt-2 flex flex-wrap gap-4 text-xs text-[var(--text-secondary)]"><span className="inline-flex items-center gap-1"><Mail size={13} /> {application.candidateEmail || "Chưa có email"}</span><span className="inline-flex items-center gap-1"><Phone size={13} /> {application.candidatePhone || "Chưa có SĐT"}</span></p></div>
          </div>
          <div className="text-right"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Ứng tuyển vào</p><Link href={`/recruiter/jobs/${application.job.id}`} className="mt-1 block font-bold text-emerald-700 hover:underline">{application.job.title}</Link><p className="mt-1 text-xs text-[var(--text-secondary)]">Ngày nộp: {application.appliedDate || "—"}</p></div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--border)] pt-4">{actions.map(([status, label, Icon, style]) => <button key={status} type="button" onClick={() => setDecision(status)} className={`inline-flex items-center gap-1.5 rounded-xl border bg-white px-3 py-2 text-xs font-bold dark:bg-slate-900 ${style}`}><Icon size={14} /> {label}</button>)}</div>
      </header>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.65fr)_380px]">
        <section className="min-w-0 rounded-2xl border border-[var(--border)] bg-white p-5 text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-4"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-emerald-700">CV đã chốt khi ứng tuyển</p><h2 className="mt-1 text-lg font-black">{application.snapshot?.cvTitle || application.appliedCvTitle}</h2></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">Snapshot bất biến · v{application.appliedCvVersion || "—"}</span></div>
          <CVSnapshotPreview json={application.snapshot?.structuredJsonSnapshot} fallback={application.snapshot?.rawTextSnapshot} />
        </section>

        <aside className="sticky top-20 space-y-4">
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
            <div className="flex items-center gap-2"><ShieldCheck size={18} className="text-emerald-600" /><h2 className="font-black">Đánh giá độ phù hợp CV</h2></div>
            {!application.aiScoringAvailable ? <div className="mt-4 rounded-xl bg-slate-100 p-4"><p className="font-bold text-slate-700">Chưa khả dụng</p><p className="mt-2 text-xs leading-5 text-slate-600">{application.aiScoringReason || "Hồ sơ chưa đủ điều kiện chấm điểm AI."}</p></div> : application.proDetailAvailable ? <div className="mt-4"><div className="flex items-end gap-3"><span className="text-4xl font-black text-emerald-700">{application.matchScore == null ? "—" : `${application.matchScore.toFixed(0)}%`}</span><span className={`mb-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${match[1]}`}>{match[0]}</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-emerald-500" style={{ width: `${Math.max(0, Math.min(100, application.matchScore || 0))}%` }} /></div><p className="mt-3 text-xs leading-5 text-[var(--text-secondary)]">Điểm hỗ trợ HR sàng lọc, không thay thế quyết định tuyển dụng.</p></div> : <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950"><div className="flex items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${match[1]}`}>{match[0]}</span><span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-bold text-blue-700">Beta</span></div><p className="mt-3 flex items-center gap-1.5 text-xs"><LockKeyhole size={14} /> Tài khoản thường chỉ xem phân loại tổng quan.</p><Link href="/recruiter/services" className="mt-2 inline-block text-xs font-bold text-emerald-700 underline">Nâng cấp Pro để mở chi tiết</Link></div>}
          </section>

          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"><h2 className="flex items-center gap-2 font-black"><BriefcaseBusiness size={18} className="text-emerald-600" /> Thông tin ứng tuyển</h2><dl className="mt-4 space-y-3 text-xs"><div><dt className="text-[var(--text-secondary)]">CV sử dụng</dt><dd className="mt-1 font-bold">{application.appliedCvTitle}</dd></div><div><dt className="text-[var(--text-secondary)]">Quyền phân tích AI</dt><dd className="mt-1 font-bold">{application.aiAnalysisConsent ? "Ứng viên đã đồng ý" : "Ứng viên không đồng ý"}</dd></div><div><dt className="text-[var(--text-secondary)]">Gói hiển thị HR</dt><dd className="mt-1 font-bold">{application.proDetailAvailable ? "HR Pro" : "HR Thường"}</dd></div>{application.githubUrl && <div><dt className="text-[var(--text-secondary)]">GitHub</dt><dd className="mt-1"><a href={application.githubUrl.startsWith("http") ? application.githubUrl : `https://${application.githubUrl}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold text-emerald-700 underline"><GitBranch size={13} /> Mở hồ sơ công khai</a></dd></div>}</dl></section>

          {application.coverLetter && <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"><h2 className="flex items-center gap-2 font-black"><FileText size={17} className="text-emerald-600" /> Thư giới thiệu</h2><p className="mt-3 whitespace-pre-wrap text-xs leading-6 text-[var(--text-secondary)]">{application.coverLetter}</p></section>}
        </aside>
      </div>

      {application.aiScoringAvailable && application.proDetailAvailable && inspection && inspection.detailAccess !== false && (
        <section className="space-y-5 rounded-2xl border border-emerald-200 bg-emerald-50/30 p-5 dark:border-emerald-900 dark:bg-emerald-950/10">
          <div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-emerald-700"><Sparkles size={16} /> Phân tích AI dành cho HR Pro</p><h2 className="mt-2 text-xl font-black">Điểm thành phần, nhận xét và minh chứng</h2><p className="mt-1 text-xs text-[var(--text-secondary)]">Dữ liệu được lấy từ kết quả matching đã lưu, không tạo nội dung giả trên giao diện.</p></div>
          <ScoreBreakdownCard data={inspection} />
          {inspection.githubAssessment && <GitHubAssessmentCard assessment={inspection.githubAssessment} />}
          <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5"><h3 className="font-black">Nhận xét tổng hợp</h3><p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{inspection.humanReadableExplanation}</p></section>
          {!!inspection.evidences?.length && <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5"><h3 className="font-black">Minh chứng đối sánh</h3><div className="mt-4 grid gap-3 md:grid-cols-2">{inspection.evidences.map((evidence, index) => <article key={evidence.id || `${evidence.sourceType}-${index}`} className="rounded-xl border border-[var(--border)] p-3"><div className="flex justify-between gap-2"><span className="text-[10px] font-bold uppercase text-emerald-700">{evidence.sourceType} · {evidence.section}</span><span className="text-[10px] text-slate-400">{evidence.matchStatus}</span></div><p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">{evidence.snippet}</p></article>)}</div></section>}
        </section>
      )}

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"><h2 className="flex items-center gap-2 font-black"><History size={18} className="text-emerald-600" /> Lịch sử xử lý hồ sơ</h2>{auditLogs.length ? <div className="mt-4 space-y-3">{auditLogs.map((log) => <article key={log.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-[var(--border)] p-3 text-xs"><div><p><b>{statusLabels[log.previousStatus]}</b> → <b className="text-emerald-700">{statusLabels[log.newStatus]}</b></p>{log.decisionNote && <p className="mt-1 text-[var(--text-secondary)]">{log.decisionNote}</p>}</div><time className="text-[var(--text-secondary)]">{new Date(log.createdAt).toLocaleString("vi-VN")}</time></article>)}</div> : <p className="mt-4 text-xs text-[var(--text-secondary)]">Chưa có lần chuyển trạng thái nào.</p>}</section>

      {decision && <div role="dialog" aria-modal="true" className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4"><form onSubmit={(event) => { event.preventDefault(); void saveDecision(); }} className="w-full max-w-lg rounded-2xl bg-white p-6 text-slate-900 shadow-2xl"><div className="flex items-center justify-between"><h2 className="text-lg font-black">Chuyển sang “{statusLabels[decision]}”</h2><button type="button" onClick={() => setDecision(null)}><X size={18} /></button></div><label className="mt-5 block text-sm font-semibold">Ghi chú quyết định<textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} maxLength={5000} className="mt-1.5 w-full rounded-xl border p-3 font-normal" placeholder="Nhận xét nội bộ, lý do hoặc bước tiếp theo…" /></label><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setDecision(null)} className="rounded-xl border px-4 py-2 text-sm font-bold">Hủy</button><button type="submit" disabled={saving} className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{saving ? "Đang lưu…" : "Lưu quyết định"}</button></div></form></div>}
    </main>
  );
}
