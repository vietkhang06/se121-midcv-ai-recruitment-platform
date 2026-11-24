"use client";

import { AccountAvatar } from '@/components/account/AccountAvatar';
import { useLanguage } from '@/context/LanguageContext';
import { statusLabel } from '@/lib/statusLabels';
import { useAuth } from "@/context/AuthContext";
import { fetchJobApplications, fetchRecruiterJobs, updateApplicationStatus } from "@/lib/api";
import { productRequest } from "@/lib/productApi";
import { APPLICATION_TRANSITIONS } from "@/lib/applicationWorkflow";
import { compareMatchScores } from "@/lib/matchPresentation";
import { Application, ApplicationStatus, Job } from "@/types";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  CheckCircle2,
  CirclePause,
  Download,
  FileSearch,
  Filter,
  Inbox,
  ListFilter,
  Megaphone,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  UsersRound,
  X,
} from "lucide-react";
import { AiScorePanel } from "@/components/recruiter/AiScorePanel";

type Campaign = {
  id: string;
  name: string;
  notes: string;
  status: "ACTIVE" | "PAUSED" | "ARCHIVED";
  job_ids: string[];
  job_count: number;
  application_count: number;
};

type Limits = {
  level: number;
  publishedJobs: number;
  cvViews: number;
  jobLimit: number;
  cvViewLimit: number;
  recruiterPlan: "STANDARD" | "PRO";
  developmentProAccess?: boolean;
  proUntil?: string;
};

const statusStyle: Record<ApplicationStatus, string> = {
  SUBMITTED: "bg-blue-50 text-blue-700 border-blue-200",
  REVIEWED: "bg-slate-100 text-slate-700 border-slate-200",
  MATCHED: "bg-cyan-50 text-cyan-700 border-cyan-200",
  UNKNOWN: "bg-amber-50 text-amber-700 border-amber-200",
  SHORTLISTED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  INTERVIEWING: "bg-violet-50 text-violet-700 border-violet-200",
  HIRED: "bg-green-100 text-green-800 border-green-200",
  REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
};

function dateLabel(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("vi-VN");
}
function CandidateRow({
  application,
  selected,
  onSelect,
  onStatus,
  changing,
}: {
  application: Application;
  selected: boolean;
  onSelect: (checked: boolean) => void;
  onStatus: (status: ApplicationStatus) => void;
  changing: boolean;
}) {
  const { locale } = useLanguage();
  return (
    <article className="grid gap-4 border-t border-[var(--border)] p-4 transition hover:bg-emerald-50/20 lg:grid-cols-[28px_minmax(210px,.9fr)_minmax(200px,.9fr)_minmax(280px,1.25fr)_190px] lg:p-5">
      <input type="checkbox" aria-label={`Chọn ${application.candidateName || application.id}`} checked={selected} onChange={(event) => onSelect(event.target.checked)} className="mt-1 h-4 w-4 accent-emerald-600" />
      <div className="flex min-w-0 gap-3">
        <AccountAvatar name={application.candidateName} avatarId={application.candidateAvatarId} className="size-11 text-sm" />
        <div className="min-w-0">
          <Link href={`/recruiter/applications/${application.id}`} className="truncate font-bold text-[var(--heading)] hover:text-emerald-700">
            {application.candidateName || "Ứng viên"}
          </Link>
          <p className="mt-1 truncate text-xs text-[var(--text-secondary)]">{application.candidateHeadline || "Chưa cập nhật chức danh"}</p>
          <p className="mt-1 truncate text-[11px] text-[var(--text-secondary)]">{application.candidateEmail || "Chưa có email"}</p>
          <p className="mt-2 text-[10px] text-slate-500">Ứng tuyển {dateLabel(application.appliedDate)}</p>
        </div>
      </div>

      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Tin tuyển dụng</p>
        <Link href={`/recruiter/jobs/${application.job.id}`} className="mt-1 block line-clamp-2 text-sm font-bold text-emerald-700 hover:underline">
          {application.job.title}
        </Link>
        <p className="mt-2 text-xs text-[var(--text-secondary)]">CV: {application.appliedCvTitle}</p>
        <p className="mt-1 text-[10px] text-slate-500">Phiên bản {application.appliedCvVersion || "—"}</p>
      </div>

      <AiScorePanel application={application} />

      <div className="space-y-3">
        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusStyle[application.status]}`}>
          {statusLabel(application.status, locale)}
        </span>
        <select aria-label={`Cập nhật trạng thái ${application.candidateName || "ứng viên"}`} value={application.status} disabled={changing} onChange={(event) => onStatus(event.target.value as ApplicationStatus)} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-xs disabled:opacity-50">
          {[application.status, ...APPLICATION_TRANSITIONS[application.status].filter(status => application.status !== "REJECTED" && status !== "UNKNOWN")].map(value => <option key={value} value={value}>{statusLabel(value, locale)}</option>)}
        </select>
        <Link href={`/recruiter/applications/${application.id}`} className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 dark:bg-slate-900">
          Xem hồ sơ <ArrowUpRight size={14} />
        </Link>
      </div>
    </article>
  );
}

export function RecruitmentWorkspace({ mode = "overview" }: { mode?: "overview" | "cvs" | "campaigns" }) {
  const { user } = useAuth();
  const { locale } = useLanguage();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [apps, setApps] = useState<Application[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [limits, setLimits] = useState<Limits | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [jobFilter, setJobFilter] = useState("");
  const [campaignFilter, setCampaignFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState("");
  const [sort, setSort] = useState("newest");
  const [editing, setEditing] = useState<Partial<Campaign> | null>(null);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [changing, setChanging] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [jobRows, campaignRows, entitlements] = await Promise.all([
        fetchRecruiterJobs(),
        productRequest<Campaign[]>("/recruiter/campaigns"),
        productRequest<Limits>("/recruiter/product/entitlements"),
      ]);
      const applications = await Promise.all(jobRows.map((job) => fetchJobApplications(job.id)));
      setJobs(jobRows);
      setApps(applications.flat());
      setCampaigns(campaignRows);
      setLimits(entitlements);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không tải được dữ liệu tuyển dụng.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  const rows = useMemo(() => apps
    .filter((application) => {
      const campaign = campaigns.find((item) => item.id === campaignFilter);
      const text = `${application.candidateName || ""} ${application.candidateEmail || ""} ${application.job.title}`.toLocaleLowerCase("vi");
      return text.includes(query.toLocaleLowerCase("vi"))
        && (!jobFilter || application.job.id === jobFilter)
        && (!campaign || campaign.job_ids.includes(application.job.id))
        && (!statusFilter || application.status === statusFilter)
        && (!availabilityFilter || (availabilityFilter === "AVAILABLE"
          ? application.aiAnalysisConsent !== false && application.matchStatus !== "CONSENT_NOT_GIVEN"
          : application.aiAnalysisConsent === false || application.matchStatus === "CONSENT_NOT_GIVEN"));
    })
    .sort((a, b) => sort === "score"
      ? compareMatchScores(a, b)
      : b.appliedDate.localeCompare(a.appliedDate)),
  [apps, campaigns, campaignFilter, query, jobFilter, statusFilter, availabilityFilter, sort]);

  const changeStatus = async (application: Application, status: ApplicationStatus) => {
    if (status === application.status) return;
    setChanging(application.id);
    setError("");
    try {
      await updateApplicationStatus(application.id, status, "Cập nhật từ màn hình quản lý CV", application.status);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không cập nhật được trạng thái.");
    } finally {
      setChanging("");
    }
  };

  const submitCampaign = async () => {
    if (!editing?.name?.trim()) return setError("Nhập tên chiến dịch.");
    setSaving(true);
    setError("");
    try {
      await productRequest(`/recruiter/campaigns${editing.id ? `/${editing.id}` : ""}`, {
        name: editing.name.trim(), notes: editing.notes || "", status: editing.status || "ACTIVE", jobIds: editing.job_ids || [],
      }, editing.id ? "PUT" : "POST");
      setEditing(null);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không lưu được chiến dịch.");
    } finally { setSaving(false); }
  };

  const removeCampaign = async (campaign: Campaign) => {
    if (!window.confirm(`Xóa chiến dịch “${campaign.name}”? Tin tuyển dụng và hồ sơ vẫn được giữ.`)) return;
    try {
      await productRequest(`/recruiter/campaigns/${campaign.id}`, undefined, "DELETE");
      if (campaignFilter === campaign.id) setCampaignFilter("");
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Không xóa được chiến dịch."); }
  };

  const exportRows = () => {
    const quote = (value: unknown) => `"${String(value ?? "").replace(/^[=+@-]/, "'$&").replace(/"/g, '""')}"`;
    const exported = rows.filter((application) => !selected.length || selected.includes(application.id));
    const data = [["Ứng viên", "Email", "Tin tuyển dụng", "Trạng thái", "Phân loại AI", "Ngày ứng tuyển"], ...exported.map((application) => [
      application.candidateName, application.candidateEmail, application.job.title, statusLabel(application.status, locale), application.matchClassification || "CHUA_KHA_DUNG", application.appliedDate,
    ])];
    const url = URL.createObjectURL(new Blob(["\uFEFF" + data.map((line) => line.map(quote).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "midcv-ho-so-ung-vien.csv"; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const statCards = [
    ["Tổng lượng CV ứng tuyển", apps.length, UsersRound, "text-blue-700 bg-blue-50"],
    ["CV ứng tuyển mới", apps.filter((app) => app.status === "SUBMITTED").length, Inbox, "text-cyan-700 bg-cyan-50"],
    ["CV phù hợp", apps.filter((app) => app.matchClassification === "PHU_HOP").length, CheckCircle2, "text-emerald-700 bg-emerald-50"],
    ["CV chưa khả dụng AI", apps.filter((app) => app.aiAnalysisConsent === false || app.matchStatus === "CONSENT_NOT_GIVEN").length, CirclePause, "text-amber-700 bg-amber-50"],
    ["Chiến dịch đang mở", campaigns.filter((campaign) => campaign.status === "ACTIVE").length, Megaphone, "text-violet-700 bg-violet-50"],
  ] as const;

  if (loading) return <main className="flex min-h-[70vh] items-center justify-center"><div className="text-center"><RefreshCw className="mx-auto animate-spin text-emerald-600" /><p className="mt-3 text-sm text-[var(--text-secondary)]">Đang tải dữ liệu HR thật…</p></div></main>;

  return (
    <main className="mx-auto max-w-[1540px] space-y-5 p-4 md:p-6 xl:p-7">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-700">midCV Nhà tuyển dụng</p>
          <h1 className="mt-2 text-2xl font-black text-[var(--heading)] md:text-3xl">
            {mode === "campaigns" ? "Chiến dịch tuyển dụng" : mode === "cvs" ? "Quản lý CV ứng viên" : `Chào ${user?.fullName || "Nhà tuyển dụng"}`}
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            {mode === "overview" ? "Theo dõi toàn bộ hoạt động tuyển dụng bằng dữ liệu trực tiếp từ hệ thống." : mode === "campaigns" ? "Tổ chức tin tuyển dụng thành chiến dịch và theo dõi hồ sơ theo từng mục tiêu." : "Tìm kiếm, lọc, đánh giá và xử lý hồ sơ ứng tuyển trên một màn hình."}
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void load()} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5" aria-label="Tải lại"><RefreshCw size={17} /></button>
          <Link href="/recruiter/jobs/new" className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800"><Plus size={17} /> Đăng tin tuyển dụng</Link>
        </div>
      </header>

      {error && <div role="alert" className="flex items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><span>{error}</span><button type="button" onClick={() => setError("")}><X size={16} /></button></div>}

      {mode === "overview" && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {statCards.map(([label, value, Icon, color]) => <section key={label} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm"><div className={`inline-flex rounded-xl p-2 ${color}`}><Icon size={18} /></div><p className="mt-4 text-2xl font-black">{value}</p><p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{label}</p></section>)}
          </div>

          <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-cyan-50 p-5 text-slate-800 dark:border-emerald-900 dark:from-emerald-950/40 dark:via-slate-900 dark:to-cyan-950/30 dark:text-slate-100">
            <div className="flex items-start gap-3"><span className="rounded-xl bg-emerald-600 p-2.5 text-white"><Sparkles size={20} /></span><div><h2 className="font-black">Quản lý CV ứng viên tập trung</h2><p className="mt-1 text-xs text-slate-600 dark:text-slate-300">AI chỉ phân tích khi ứng viên đồng ý và tin đáp ứng chính sách vị trí, gói đăng tin.</p></div></div>
            <Link href="/recruiter/candidates" className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white">Mở quản lý CV <ArrowRight size={15} /></Link>
          </section>

          <div className="grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
            <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
              <div className="flex items-center justify-between"><h2 className="font-black">Tình hình tuyển dụng</h2><Link href="/recruiter/analytics" className="text-xs font-bold text-emerald-700 underline">Xem báo cáo</Link></div>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[["Tin đang đăng", jobs.filter((job) => job.status === "PUBLISHED").length], ["Đang xem xét", apps.filter((app) => app.status === "REVIEWED").length], ["Phỏng vấn", apps.filter((app) => app.status === "INTERVIEWING").length], ["Đã tuyển", apps.filter((app) => app.status === "HIRED").length]].map(([label, value]) => <div key={label} className="rounded-xl bg-[var(--surface-secondary)] p-4"><p className="text-xl font-black text-emerald-700">{value}</p><p className="mt-1 text-[11px] text-[var(--text-secondary)]">{label}</p></div>)}
              </div>
              {limits && <div className="mt-5 rounded-xl border border-[var(--border)] p-4 text-xs"><div className="flex flex-wrap justify-between gap-2"><span>Doanh nghiệp cấp {limits.level} · {limits.publishedJobs}/{limits.jobLimit < 0 ? "∞" : limits.jobLimit} tin · {limits.cvViews}/{limits.cvViewLimit < 0 ? "∞" : limits.cvViewLimit} lượt CV</span><span className="font-black text-emerald-700">HR {limits.developmentProAccess ? "Standard (thử nghiệm Pro)" : limits.recruiterPlan === "PRO" ? "Pro" : "Thường"}</span></div></div>}
            </section>
            <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"><h2 className="font-black">Thao tác nhanh</h2><div className="mt-4 space-y-2">{[["/recruiter/jobs/new", "Tạo tin tuyển dụng", BriefcaseBusiness], ["/recruiter/campaigns", "Tạo chiến dịch", Megaphone], ["/recruiter/candidates", "Lọc CV ứng viên", FileSearch], ["/recruiter/services", "Quản lý dịch vụ", Sparkles]].map(([href, label, Icon]) => <Link key={href as string} href={href as string} className="flex items-center justify-between rounded-xl border border-[var(--border)] px-3 py-3 text-sm font-semibold hover:border-emerald-400"><span className="flex items-center gap-2"><Icon size={17} className="text-emerald-600" />{label as string}</span><ArrowRight size={15} /></Link>)}</div></section>
          </div>

          <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm"><div className="flex items-center justify-between p-5"><h2 className="font-black">CV ứng tuyển gần đây</h2><Link href="/recruiter/candidates" className="text-xs font-bold text-emerald-700 underline">Xem tất cả</Link></div>{apps.length ? apps.slice().sort((a, b) => b.appliedDate.localeCompare(a.appliedDate)).slice(0, 5).map((application) => <CandidateRow key={application.id} application={application} selected={false} onSelect={() => undefined} onStatus={(status) => void changeStatus(application, status)} changing={changing === application.id} />) : <p className="border-t border-[var(--border)] p-10 text-center text-sm text-[var(--text-secondary)]">Chưa có CV ứng tuyển.</p>}</section>
        </>
      )}

      {mode === "campaigns" && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[["Tổng chiến dịch", campaigns.length], ["Đang hoạt động", campaigns.filter((item) => item.status === "ACTIVE").length], ["Tin đã gắn", campaigns.reduce((sum, item) => sum + Number(item.job_count), 0)], ["Hồ sơ trong chiến dịch", campaigns.reduce((sum, item) => sum + Number(item.application_count), 0)]].map(([label, value]) => <section key={label} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"><p className="text-2xl font-black text-emerald-700">{value}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">{label}</p></section>)}</div>
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-black">Danh sách chiến dịch</h2><p className="mt-1 text-xs text-[var(--text-secondary)]">Mỗi chiến dịch dùng dữ liệu tin và hồ sơ thật của doanh nghiệp.</p></div><button type="button" onClick={() => setEditing({ name: "", notes: "", status: "ACTIVE", job_ids: [] })} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white">+ Tạo chiến dịch</button></div>
            {!campaigns.length && <p className="py-12 text-center text-sm text-[var(--text-secondary)]">Chưa có chiến dịch tuyển dụng.</p>}
            <div className="mt-5 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{campaigns.map((campaign) => <article key={campaign.id} className={`rounded-2xl border p-5 ${campaignFilter === campaign.id ? "border-emerald-500 ring-2 ring-emerald-100" : "border-[var(--border)]"}`}><div className="flex items-center justify-between"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${campaign.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : campaign.status === "PAUSED" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{statusLabel(campaign.status, locale)}</span><Megaphone size={18} className="text-emerald-600" /></div><h3 className="mt-3 font-black">{campaign.name}</h3><p className="mt-2 line-clamp-2 min-h-10 text-xs leading-5 text-[var(--text-secondary)]">{campaign.notes || "Không có ghi chú."}</p><div className="mt-4 flex gap-4 text-xs"><span><b>{campaign.job_count}</b> tin</span><span><b>{campaign.application_count}</b> hồ sơ</span></div><div className="mt-4 flex flex-wrap gap-3 text-xs font-bold"><button type="button" onClick={() => setCampaignFilter(campaignFilter === campaign.id ? "" : campaign.id)} className="text-emerald-700 underline">{campaignFilter === campaign.id ? "Bỏ chọn" : "Xem ứng viên"}</button><button type="button" onClick={() => setEditing(campaign)} className="underline">Chỉnh sửa</button><button type="button" onClick={() => void removeCampaign(campaign)} className="text-rose-700 underline">Xóa</button></div></article>)}</div>
          </section>
          {campaignFilter && <CandidateList rows={rows} jobs={jobs} campaigns={campaigns} query={query} setQuery={setQuery} jobFilter={jobFilter} setJobFilter={setJobFilter} campaignFilter={campaignFilter} setCampaignFilter={setCampaignFilter} statusFilter={statusFilter} setStatusFilter={setStatusFilter} availabilityFilter={availabilityFilter} setAvailabilityFilter={setAvailabilityFilter} sort={sort} setSort={setSort} selected={selected} setSelected={setSelected} changing={changing} changeStatus={changeStatus} exportRows={exportRows} />}
        </>
      )}

      {mode === "cvs" && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">{statCards.map(([label, value, Icon, color]) => <section key={label} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"><div className={`inline-flex rounded-xl p-2 ${color}`}><Icon size={17} /></div><p className="mt-3 text-2xl font-black">{value}</p><p className="mt-1 text-[11px] text-[var(--text-secondary)]">{label}</p></section>)}</div>
          <CandidateList rows={rows} jobs={jobs} campaigns={campaigns} query={query} setQuery={setQuery} jobFilter={jobFilter} setJobFilter={setJobFilter} campaignFilter={campaignFilter} setCampaignFilter={setCampaignFilter} statusFilter={statusFilter} setStatusFilter={setStatusFilter} availabilityFilter={availabilityFilter} setAvailabilityFilter={setAvailabilityFilter} sort={sort} setSort={setSort} selected={selected} setSelected={setSelected} changing={changing} changeStatus={changeStatus} exportRows={exportRows} />
        </>
      )}

      {editing && <CampaignDialog editing={editing} setEditing={setEditing} jobs={jobs} saving={saving} submit={submitCampaign} />}
    </main>
  );
}

function CandidateList(props: {
  rows: Application[]; jobs: Job[]; campaigns: Campaign[]; query: string; setQuery: (value: string) => void;
  jobFilter: string; setJobFilter: (value: string) => void; campaignFilter: string; setCampaignFilter: (value: string) => void;
  statusFilter: string; setStatusFilter: (value: string) => void; availabilityFilter: string; setAvailabilityFilter: (value: string) => void;
  sort: string; setSort: (value: string) => void; selected: string[]; setSelected: (value: string[]) => void; changing: string;
  changeStatus: (application: Application, status: ApplicationStatus) => Promise<void>; exportRows: () => void;
}) {
  const { locale } = useLanguage();
  const { rows, jobs, campaigns, query, setQuery, jobFilter, setJobFilter, campaignFilter, setCampaignFilter, statusFilter, setStatusFilter, availabilityFilter, setAvailabilityFilter, sort, setSort, selected, setSelected, changing, changeStatus, exportRows } = props;
  return <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] p-5"><div><h2 className="flex items-center gap-2 font-black"><FileSearch size={20} className="text-emerald-600" /> CV ứng tuyển <span className="rounded-full bg-emerald-100 px-2 py-1 text-[11px] text-emerald-800">{rows.length}</span></h2><p className="mt-1 text-xs text-[var(--text-secondary)]">Kết quả thay đổi theo bộ lọc và dữ liệu hiện có.</p></div><button type="button" onClick={exportRows} disabled={!rows.length} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 px-3.5 py-2 text-xs font-bold text-emerald-700 disabled:opacity-40"><Download size={15} /> Xuất danh sách {selected.length ? `(${selected.length})` : ""}</button></div>
    <div className="grid gap-3 border-b border-[var(--border)] bg-[var(--surface-secondary)]/50 p-4 md:grid-cols-2 xl:grid-cols-[1.3fr_repeat(5,minmax(130px,.6fr))]">
      <label className="relative"><Search size={16} className="absolute left-3 top-3 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tên, email, vị trí ứng tuyển…" className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2.5 pl-9 pr-3 text-xs" /></label>
      <select aria-label="Lọc tin tuyển dụng" value={jobFilter} onChange={(event) => setJobFilter(event.target.value)} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-xs"><option value="">Tất cả tin</option>{jobs.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}</select>
      <select aria-label="Lọc chiến dịch" value={campaignFilter} onChange={(event) => setCampaignFilter(event.target.value)} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-xs"><option value="">Tất cả chiến dịch</option>{campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}</select>
      <select aria-label="Lọc trạng thái" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-xs"><option value="">Tất cả trạng thái</option>{Object.keys(statusStyle).map(value => <option key={value} value={value}>{statusLabel(value, locale)}</option>)}</select>
      <select aria-label="Lọc khả dụng AI" value={availabilityFilter} onChange={(event) => setAvailabilityFilter(event.target.value)} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-xs"><option value="">Mọi trạng thái AI</option><option value="AVAILABLE">AI khả dụng</option><option value="UNAVAILABLE">Chưa khả dụng</option></select>
      <select aria-label="Sắp xếp CV" value={sort} onChange={(event) => setSort(event.target.value)} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-xs"><option value="newest">Mới nhất</option><option value="score">Điểm phù hợp</option></select>
      <button type="button" onClick={() => { setQuery(""); setJobFilter(""); setCampaignFilter(""); setStatusFilter(""); setAvailabilityFilter(""); }} className="inline-flex items-center justify-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-semibold"><Filter size={14} /> Xóa lọc</button>
    </div>
    {!rows.length ? <div className="p-12 text-center"><ListFilter className="mx-auto text-slate-300" /><p className="mt-3 text-sm font-bold">Không có hồ sơ phù hợp</p><p className="mt-1 text-xs text-[var(--text-secondary)]">Thử thay đổi bộ lọc hoặc chờ hồ sơ mới.</p></div> : <><div className="flex items-center gap-2 border-b border-[var(--border)] px-5 py-3 text-xs"><input type="checkbox" checked={rows.length > 0 && rows.every((row) => selected.includes(row.id))} onChange={(event) => setSelected(event.target.checked ? rows.map((row) => row.id) : [])} className="accent-emerald-600" /><span>Chọn tất cả kết quả đang hiển thị</span></div>{rows.map((application) => <CandidateRow key={application.id} application={application} selected={selected.includes(application.id)} onSelect={(checked) => setSelected(checked ? [...selected, application.id] : selected.filter((id) => id !== application.id))} onStatus={(status) => void changeStatus(application, status)} changing={changing === application.id} />)}</>}
  </section>;
}

function CampaignDialog({ editing, setEditing, jobs, saving, submit }: { editing: Partial<Campaign>; setEditing: (value: Partial<Campaign> | null) => void; jobs: Job[]; saving: boolean; submit: () => Promise<void> }) {
  const { locale } = useLanguage();
  return <div role="dialog" aria-modal="true" aria-label="Chiến dịch tuyển dụng" className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4"><form onSubmit={(event) => { event.preventDefault(); void submit(); }} className="max-h-[88vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white p-6 text-slate-900 shadow-2xl"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Chiến dịch tuyển dụng</p><h2 className="mt-1 text-xl font-black">{editing.id ? "Chỉnh sửa chiến dịch" : "Tạo chiến dịch mới"}</h2></div><button type="button" onClick={() => setEditing(null)} className="rounded-xl border p-2"><X size={18} /></button></div><div className="mt-6 space-y-4"><label className="block text-sm font-semibold">Tên chiến dịch<input required maxLength={180} value={editing.name || ""} onChange={(event) => setEditing({ ...editing, name: event.target.value })} className="mt-1.5 w-full rounded-xl border p-3 font-normal" placeholder="Ví dụ: Tuyển Backend quý IV" /></label><label className="block text-sm font-semibold">Mục tiêu / ghi chú<textarea maxLength={5000} value={editing.notes || ""} onChange={(event) => setEditing({ ...editing, notes: event.target.value })} rows={3} className="mt-1.5 w-full rounded-xl border p-3 font-normal" /></label><label className="block text-sm font-semibold">Trạng thái<select value={editing.status || "ACTIVE"} onChange={(event) => setEditing({ ...editing, status: event.target.value as Campaign["status"] })} className="mt-1.5 w-full rounded-xl border p-3 font-normal"><option value="ACTIVE">{statusLabel("ACTIVE", locale)}</option><option value="PAUSED">{statusLabel("PAUSED", locale)}</option><option value="ARCHIVED">{statusLabel("ARCHIVED", locale)}</option></select></label><fieldset className="space-y-2 rounded-xl border p-4"><legend className="px-2 text-sm font-bold">Tin tuyển dụng trong chiến dịch</legend>{jobs.map((job) => <label key={job.id} className="flex items-start gap-2 rounded-lg p-2 text-sm hover:bg-slate-50"><input type="checkbox" checked={editing.job_ids?.includes(job.id) || false} onChange={(event) => setEditing({ ...editing, job_ids: event.target.checked ? [...(editing.job_ids || []), job.id] : (editing.job_ids || []).filter((id) => id !== job.id) })} className="mt-0.5 accent-emerald-600" /><span>{job.title}<small className="ml-2 text-slate-500">{statusLabel(job.status, locale)}</small></span></label>)}{!jobs.length && <p className="text-sm text-slate-500">Hãy tạo tin tuyển dụng trước.</p>}</fieldset></div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setEditing(null)} className="rounded-xl border px-4 py-2.5 text-sm font-bold">Hủy</button><button type="submit" disabled={saving} className="rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? "Đang lưu…" : "Lưu chiến dịch"}</button></div></form></div>;
}
