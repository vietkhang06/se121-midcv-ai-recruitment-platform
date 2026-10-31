'use client';

import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  ArrowUpRight,
  Award,
  Bookmark,
  Briefcase,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileCheck2,
  FileText,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  UploadCloud,
  UserRound,
  Zap,
  ExternalLink,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import {
  fetchCandidateApplications,
  fetchCandidateCVs,
  fetchCandidateProfile,
  fetchCVQuota,
  fetchJobs,
} from '@/lib/api';
import { Application, CandidateProfile, CV, CVQuota, Industry, Job } from '@/types';
import { translateIndustry, translateWorkMode, formatSalary } from '@/lib/i18n';
import { Reveal } from '@/components/motion';
import { CVUploadModal } from '@/components/cv/CVUploadModal';
import { SaveJobButton } from '@/components/inbox/SaveJobButton';
import { QuickApplyModal } from '@/components/application/QuickApplyModal';

const INDUSTRIES: Industry[] = ['Technology', 'Marketing', 'Design', 'Finance', 'HR', 'Sales'];
const LOCATIONS = ['Toàn quốc', 'Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Remote'];

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
};

function SectionHeading({ eyebrow, title, description, actionLabel, actionHref }: SectionHeadingProps) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-3xl">
        {eyebrow ? (
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--primary)] dark:text-[var(--retro-sky)]">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-xl font-extrabold tracking-tight text-[var(--heading)] dark:text-slate-100 sm:text-2xl">{title}</h2>
        {description ? <p className="mt-1.5 text-sm leading-6 text-slate-600 dark:text-slate-400">{description}</p> : null}
      </div>
      {actionLabel && actionHref ? (
        <Link
          href={actionHref}
          className="inline-flex shrink-0 items-center gap-1.5 text-sm font-bold text-[var(--primary)] transition hover:gap-2.5 hover:text-[var(--primary)] dark:text-[var(--retro-sky)]"
        >
          {actionLabel}<ArrowRight className="h-4 w-4" />
        </Link>
      ) : null}
    </div>
  );
}

function formatDate(value: string | undefined, locale: 'vi' | 'en') {
  if (!value) return locale === 'vi' ? 'Chưa cập nhật ngày' : 'Date unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function applicationStatusLabel(status: string, locale: 'vi' | 'en') {
  const labels: Record<string, { vi: string; en: string }> = {
    SUBMITTED: { vi: 'Đã nộp', en: 'Submitted' },
    APPLIED: { vi: 'Đã ứng tuyển', en: 'Applied' },
    REVIEWED: { vi: 'Đã xem xét', en: 'Reviewed' },
    UNDER_REVIEW: { vi: 'Đang xem xét', en: 'Under review' },
    MATCHED: { vi: 'Đã đối sánh', en: 'Matched' },
    SHORTLISTED: { vi: 'Vào danh sách ngắn', en: 'Shortlisted' },
    INTERVIEWING: { vi: 'Phỏng vấn', en: 'Interviewing' },
    HIRED: { vi: 'Đã tuyển', en: 'Hired' },
    REJECTED: { vi: 'Chưa phù hợp', en: 'Not selected' },
  };
  return labels[status]?.[locale] ?? status;
}

function statusTone(status: string) {
  if (status === 'HIRED' || status === 'SHORTLISTED' || status === 'MATCHED') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300';
  }
  if (status === 'REJECTED') {
    return 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-300';
  }
  return 'border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-900/70 dark:bg-blue-950/40 dark:text-blue-300';
}

interface JobTileProps {
  job: Job;
  locale: 'vi' | 'en';
  onApply: (job: Job) => void;
}

function JobTile({ job, locale, onApply }: JobTileProps) {
  const companyInitial = job.companyName?.trim()?.[0]?.toUpperCase() || 'C';
  const salary = formatSalary(job.salaryMin, job.salaryMax, job.salaryRange, locale, job.salaryNegotiable, job.salaryCurrency);
  const requirements = (job.requirements ?? []).slice(0, 3);

  return (
    <article className="group flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-lg transition duration-300 hover:-translate-y-1 hover:border-[var(--border-soft)] hover:shadow-lg motion-reduce:transform-none motion-reduce:transition-none dark:border-[var(--border)] dark:bg-[var(--surface)] dark:hover:border-[var(--border)]">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-sm font-extrabold text-[var(--primary)] dark:border-[var(--border)] dark:bg-[var(--surface)] dark:text-[var(--retro-sky)]" aria-label={locale === 'vi' ? 'Ký hiệu doanh nghiệp' : 'Company mark'}>
          {companyInitial}
        </div>
        <div className="min-w-0 flex-1">
          <Link href={`/jobs/${job.id}`} className="line-clamp-2 text-sm font-bold leading-5 text-[var(--heading)] transition hover:text-[var(--primary)] group-hover:text-[var(--primary)] dark:text-slate-100 dark:hover:text-[var(--retro-sky)] dark:group-hover:text-[var(--retro-sky)]">
            {job.title}
          </Link>
          <p className="mt-1 truncate text-xs text-slate-600 dark:text-slate-400">{job.companyName || (locale === 'vi' ? 'Chưa cập nhật doanh nghiệp' : 'Company not provided')}</p>
        </div>
        {job.companyVerified ? (
          <span title={locale === 'vi' ? 'Doanh nghiệp đã xác minh' : 'Verified company'} className="shrink-0 rounded-xl bg-emerald-50 p-1.5 text-[var(--success)] dark:bg-emerald-950/40 dark:text-emerald-300">
            <ShieldCheck className="h-4 w-4" />
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {salary ? <span className="rounded-xl bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">{salary}</span> : null}
        <span className="rounded-xl bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600 dark:bg-[var(--surface)] dark:text-slate-300">{translateWorkMode(job.employmentType, locale)}</span>
        <span className="rounded-xl bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">{translateIndustry(job.industry, locale)}</span>
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <MapPin className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{job.location || (locale === 'vi' ? 'Chưa cập nhật địa điểm' : 'Location not provided')}</span>
        <span className="px-0.5 text-slate-300 dark:text-slate-600">·</span>
        <span className="shrink-0">{job.seniority || (locale === 'vi' ? 'Mọi cấp bậc' : 'All levels')}</span>
      </div>

      {requirements.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {requirements.map((requirement) => (
            <span key={requirement.id || requirement.skillName} className="max-w-full truncate rounded-xl border border-slate-200 px-2 py-1 text-[10px] text-slate-600 dark:border-[var(--border)] dark:text-slate-400">
              {requirement.skillName}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-[var(--border)]">
        <span className="truncate text-[10px] text-slate-400">{locale === 'vi' ? 'Đăng' : 'Posted'} {formatDate(job.publishedDate, locale)}</span>
        <div className="flex shrink-0 items-center gap-1.5">
          <SaveJobButton jobId={job.id} />
          <button type="button" onClick={() => onApply(job)} className="rounded-xl bg-[var(--primary)] px-3 py-2 text-[11px] font-bold text-white transition hover:bg-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border)] focus-visible:ring-offset-2 active:scale-[0.98] dark:focus-visible:ring-offset-[var(--heading)]">
            {locale === 'vi' ? 'Ứng tuyển' : 'Apply'}
          </button>
        </div>
      </div>
    </article>
  );
}

export default function CandidateDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { locale } = useLanguage();
  const isVi = locale === 'vi';

  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [quota, setQuota] = useState<CVQuota | null>(null);
  const [cvs, setCvs] = useState<CV[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [sectionErrors, setSectionErrors] = useState({
    profile: null as string | null,
    quota: null as string | null,
    cvs: null as string | null,
    applications: null as string | null,
  });
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [applyJob, setApplyJob] = useState<Job | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const requestDashboardData = useCallback(() => Promise.allSettled([
      fetchCandidateProfile(),
      fetchCVQuota(),
      fetchCandidateCVs(),
      fetchCandidateApplications(),
      fetchJobs(),
  ] as const), []);

  const applyDashboardData = useCallback((results: Awaited<ReturnType<typeof requestDashboardData>>) => {
    const [profileResult, quotaResult, cvsResult, applicationsResult, jobsResult] = results;
    if (profileResult.status === 'fulfilled') setProfile(profileResult.value);
    if (quotaResult.status === 'fulfilled') setQuota(quotaResult.value);
    if (cvsResult.status === 'fulfilled') setCvs(cvsResult.value);
    if (applicationsResult.status === 'fulfilled') setApplications(applicationsResult.value);

    const loadError = isVi ? 'Không thể tải dữ liệu này lúc này.' : 'This information could not be loaded.';
    setSectionErrors({
      profile: profileResult.status === 'rejected' ? loadError : null,
      quota: quotaResult.status === 'rejected' ? loadError : null,
      cvs: cvsResult.status === 'rejected' ? loadError : null,
      applications: applicationsResult.status === 'rejected' ? loadError : null,
    });
    setDashboardError(null);

    if (jobsResult.status === 'fulfilled') {
      setJobs(jobsResult.value.filter((job) => job.status === 'PUBLISHED'));
      setJobsError(null);
    } else {
      setJobsError(isVi ? 'Không thể tải việc làm lúc này. Bạn có thể thử lại hoặc mở trang tìm việc.' : 'Jobs could not be loaded. Retry or open the full job search page.');
    }

    const failureCount = results.filter((result) => result.status === 'rejected').length;
    if (failureCount === results.length) {
      setDashboardError(isVi ? 'Không thể kết nối tới dữ liệu bảng điều khiển. Vui lòng thử lại.' : 'Dashboard data could not be loaded. Please try again.');
    }
    setLoading(false);
  }, [isVi]);

  const retryDashboardData = () => {
    setLoading(true);
    void requestDashboardData().then(applyDashboardData);
  };

  useEffect(() => {
    let isActive = true;
    void requestDashboardData().then((results) => {
      if (isActive) applyDashboardData(results);
    });
    return () => { isActive = false; };
  }, [applyDashboardData, requestDashboardData]);

  const renderSectionError = (message: string | null) => message ? (
    <div role="alert" className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200">
      <span>{message}</span>
      <button type="button" onClick={retryDashboardData} className="font-bold underline">{isVi ? 'Thử tải lại' : 'Retry'}</button>
    </div>
  ) : null;

  const displayName = profile?.fullName || user?.fullName || user?.email?.split('@')[0] || (isVi ? 'Ứng viên' : 'Candidate');
  const completeness = useMemo(() => {
    if (!profile) return 0;
    let score = 0;
    if (profile.fullName?.trim()) score += 15;
    if (profile.email?.trim()) score += 10;
    if (profile.phone?.trim()) score += 10;
    if (profile.location?.trim()) score += 10;
    if ((profile.targetRoles?.length ?? 0) > 0 || profile.primaryIndustry) score += 15;
    if (profile.bio?.trim()) score += 10;
    if (profile.skills?.length) score += 15;
    if (profile.githubUsername?.trim() || profile.githubUrl?.trim()) score += 15;
    return Math.min(100, score);
  }, [profile]);

  const publishedJobs = useMemo(() => {
    const targetIndustries = [profile?.targetIndustry, ...(profile?.targetIndustries ?? [])]
      .filter((industry): industry is Industry => Boolean(industry))
      .map((industry) => industry.toLowerCase());

    return [...jobs].sort((a, b) => {
      const aTarget = targetIndustries.some((industry) => industry === String(a.industry).toLowerCase()) ? 1 : 0;
      const bTarget = targetIndustries.some((industry) => industry === String(b.industry).toLowerCase()) ? 1 : 0;
      if (aTarget !== bTarget) return bTarget - aTarget;
      const aTime = Date.parse(a.publishedDate || '') || 0;
      const bTime = Date.parse(b.publishedDate || '') || 0;
      return bTime - aTime;
    });
  }, [jobs, profile?.targetIndustry, profile?.targetIndustries]);

  const industryStats = useMemo(() => {
    const counts = new Map<string, { industry: Industry; count: number }>();
    for (const job of jobs) {
      const existing = counts.get(job.industry);
      counts.set(job.industry, { industry: job.industry, count: (existing?.count ?? 0) + 1 });
    }
    return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 6);
  }, [jobs]);

  const recentApplications = useMemo(() => [...applications]
    .sort((a, b) => (Date.parse(b.appliedDate || '') || 0) - (Date.parse(a.appliedDate || '') || 0))
    .slice(0, 3), [applications]);

  const recentCVs = useMemo(() => [...cvs]
    .sort((a, b) => (Date.parse(b.updatedAt || '') || 0) - (Date.parse(a.updatedAt || '') || 0))
    .slice(0, 3), [cvs]);

  const quotaPercent = quota && quota.maxLimit > 0 ? Math.min(100, Math.round((quota.currentCount / quota.maxLimit) * 100)) : 0;

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (searchKeyword.trim()) params.set('keyword', searchKeyword.trim());
    if (selectedLocation && selectedLocation !== 'Toàn quốc') params.set('location', selectedLocation);
    if (selectedIndustry) params.set('industry', selectedIndustry);
    const query = params.toString();
    router.push(query ? `/jobs?${query}` : '/jobs');
  };

  const chooseQuickSearch = (term: string) => {
    const params = new URLSearchParams({ keyword: term });
    router.push(`/jobs?${params.toString()}`);
  };


  if (loading) {
    return (
      <div className="min-h-[70vh] bg-[var(--surface)] px-4 py-8 dark:bg-[var(--surface)] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-7">
          <div className="h-[330px] animate-pulse rounded-xl bg-blue-100/70 dark:bg-[var(--surface)]" />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((item) => <div key={item} className="h-28 animate-pulse rounded-xl bg-slate-200 dark:bg-[var(--surface)]" />)}</div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">{[0, 1, 2].map((item) => <div key={item} className="h-56 animate-pulse rounded-xl bg-slate-200 dark:bg-[var(--surface)]" />)}</div>
        </div>
      </div>
    );
  }

  if (dashboardError) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center bg-[var(--surface)] px-4 py-12 dark:bg-[var(--surface)]">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-xl dark:border-[var(--border)] dark:bg-[var(--surface)]">
          <RefreshCw className="mx-auto h-10 w-10 text-[var(--primary)]" />
          <h1 className="mt-4 text-xl font-extrabold text-[var(--heading)] dark:text-white">{isVi ? 'Chưa tải được bảng điều khiển' : 'Dashboard unavailable'}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{dashboardError}</p>
          <button onClick={retryDashboardData} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-bold text-white transition hover:bg-[var(--primary)]">
            <RefreshCw className="h-4 w-4" />{isVi ? 'Thử lại' : 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[var(--surface)] pb-16 text-slate-800 transition-colors dark:bg-[var(--surface)] dark:text-slate-100">
      <main className="mx-auto max-w-[1440px] space-y-12 px-4 py-5 sm:space-y-16 sm:px-6 sm:py-8 lg:px-8">
        {/* HERO: visual structure inspired by the reference; all data remains MidCV-owned. */}
        <Reveal duration={520}>
          <section className="relative isolate overflow-hidden rounded-xl border border-blue-100 bg-gradient-to-br from-[var(--surface-secondary)] via-[var(--surface)] to-[var(--surface-secondary)] shadow-lg dark:border-[var(--border)] dark:from-[var(--surface)] dark:via-[var(--surface)] dark:to-[var(--surface)]">
            <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-xl bg-blue-300/25 opacity-0 dark:bg-blue-500/10" />
            <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 left-[38%] h-72 w-72 rounded-xl bg-emerald-200/30 opacity-0 dark:bg-emerald-500/10" />
            <div className="relative grid items-center gap-8 p-5 sm:p-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)] lg:p-10">
              <div className="space-y-5">
                <div className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white/80 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.15em] text-[var(--primary)] shadow-sm dark:border-[var(--border)] dark:bg-[var(--surface)]/80 dark:text-[var(--retro-sky)]">
                  <Sparkles className="h-3.5 w-3.5" /> midCV · Career workspace
                </div>
                <div className="max-w-3xl space-y-3">
                  <h1 className="text-3xl font-black leading-[1.12] tracking-tight text-[var(--heading)] dark:text-white sm:text-4xl lg:text-[46px]">
                    {isVi ? <>Tìm cơ hội phù hợp.<br /><span className="text-[var(--primary)] dark:text-[var(--retro-sky)]">Tiến xa hơn cùng midCV.</span></> : <>Find your next opportunity.<br /><span className="text-[var(--primary)] dark:text-[var(--retro-sky)]">Move forward with midCV.</span></>}
                  </h1>
                  <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
                    {isVi ? 'Khám phá việc làm đang tuyển, quản lý CV và theo dõi hồ sơ ứng tuyển trong một không gian thống nhất.' : 'Explore published opportunities, manage your CVs, and track applications in one workspace.'}
                  </p>
                </div>

                <form onSubmit={submitSearch} className="grid gap-2 rounded-xl border border-blue-100 bg-white p-2 shadow-lg dark:border-[var(--border)] dark:bg-[var(--surface)] sm:grid-cols-[minmax(0,1fr)_180px] lg:grid-cols-[minmax(0,1fr)_170px_170px_auto] lg:rounded-xl lg:pl-5">
                  <label className="flex min-w-0 items-center gap-3 px-3 py-2 lg:px-0">
                    <Search className="h-5 w-5 shrink-0 text-[var(--primary)] dark:text-[var(--retro-sky)]" />
                    <span className="sr-only">{isVi ? 'Từ khóa' : 'Keywords'}</span>
                    <input value={searchKeyword} onChange={(event) => setSearchKeyword(event.target.value)} placeholder={isVi ? 'Vị trí, kỹ năng hoặc công ty...' : 'Role, skill, or company...'} className="w-full min-w-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white" />
                  </label>
                  <label className="flex items-center gap-2 border-t border-slate-100 px-3 py-2 dark:border-[var(--border)] sm:border-l sm:border-t-0 lg:border-l">
                    <MapPin className="h-4 w-4 shrink-0 text-[var(--primary)] dark:text-[var(--retro-sky)]" />
                    <span className="sr-only">{isVi ? 'Địa điểm' : 'Location'}</span>
                    <select value={selectedLocation} onChange={(event) => setSelectedLocation(event.target.value)} className="w-full min-w-0 bg-transparent text-xs text-slate-700 outline-none dark:text-slate-200">
                      <option value="" className="text-slate-900">{isVi ? 'Mọi địa điểm' : 'Any location'}</option>
                      {LOCATIONS.map((location) => <option key={location} value={location} className="text-slate-900">{location}</option>)}
                    </select>
                  </label>
                  <label className="flex items-center gap-2 border-t border-slate-100 px-3 py-2 dark:border-[var(--border)] sm:border-l sm:border-t-0 lg:border-l">
                    <Briefcase className="h-4 w-4 shrink-0 text-[var(--primary)] dark:text-[var(--retro-sky)]" />
                    <span className="sr-only">{isVi ? 'Ngành nghề' : 'Industry'}</span>
                    <select value={selectedIndustry} onChange={(event) => setSelectedIndustry(event.target.value)} className="w-full min-w-0 bg-transparent text-xs text-slate-700 outline-none dark:text-slate-200">
                      <option value="" className="text-slate-900">{isVi ? 'Mọi ngành nghề' : 'Any industry'}</option>
                      {INDUSTRIES.map((industry) => <option key={industry} value={industry} className="text-slate-900">{translateIndustry(industry, locale)}</option>)}
                    </select>
                  </label>
                  <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-extrabold text-white shadow-md shadow-blue-600/15 transition hover:bg-[var(--primary)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border)] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[var(--heading)] lg:rounded-xl">
                    <Search className="h-4 w-4" />{isVi ? 'Tìm việc' : 'Find jobs'}
                  </button>
                </form>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="mr-1 font-semibold text-slate-600 dark:text-slate-300">{isVi ? 'Tìm nhanh:' : 'Quick search:'}</span>
                  {['Frontend', 'Backend', 'Java', 'Data', 'DevOps'].map((term, index) => (
                    <button key={term} type="button" onClick={() => chooseQuickSearch(term)} style={{ animationDelay: `${index * 55}ms` }} className="animate-chip-in rounded-xl border border-blue-100 bg-white/85 px-3 py-1.5 font-medium text-[var(--primary)] transition hover:border-[var(--border)] hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border)] dark:border-[var(--border)] dark:bg-[var(--surface)]/90 dark:text-blue-200 dark:hover:bg-[var(--surface)] motion-reduce:animate-none">
                      {term}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap gap-3 pt-1">
                  <button type="button" onClick={() => setUploadOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-[var(--heading)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border)] dark:bg-[var(--surface)] dark:text-white motion-reduce:transform-none">
                    <UploadCloud className="h-4 w-4 text-[var(--primary)] dark:text-[var(--retro-sky)]" />{isVi ? 'Tải CV lên' : 'Upload CV'}
                  </button>
                  <Link href="/candidate/cvs/builder" className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50/70 px-4 py-2.5 text-xs font-bold text-[var(--primary)] transition hover:bg-blue-100 dark:border-[var(--border)] dark:bg-[var(--surface)] dark:text-blue-200 dark:hover:bg-[var(--surface)]">
                    <Plus className="h-4 w-4" />{isVi ? 'Tạo CV mới' : 'Build a CV'}
                  </Link>
                </div>
              </div>

              {/* A live-data summary, not a fabricated promotional illustration. */}
              <div className="relative mx-auto w-full max-w-md lg:ml-auto">
                <div className="rounded-xl border border-white/80 bg-white/85 p-5 shadow-lg backdrop-blur-sm dark:border-[var(--border)] dark:bg-[var(--surface)]/90">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-[var(--border)]">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[var(--primary)] dark:bg-[var(--surface)] dark:text-[var(--retro-sky)]"><UserRound className="h-5 w-5" /></div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{isVi ? 'Không gian ứng viên' : 'Candidate workspace'}</p>
                        <p className="mt-0.5 max-w-[200px] truncate text-sm font-extrabold text-[var(--heading)] dark:text-white">{displayName}</p>
                      </div>
                    </div>
                    <span className="rounded-xl bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">{quota?.plan || 'STANDARD'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 py-4">
                    <div className="rounded-xl bg-slate-50 p-3.5 dark:bg-[var(--surface)]">
                      <div className="flex items-center justify-between"><FileText className="h-4 w-4 text-[var(--primary)] dark:text-[var(--retro-sky)]" /><span className="text-[10px] text-slate-400">CV</span></div>
                      <p className="mt-3 text-2xl font-black tracking-tight text-[var(--heading)] dark:text-white">{quota ? `${quota.currentCount}/${quota.maxLimit}` : '—'}</p>
                      <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">{isVi ? 'CV đã lưu / giới hạn' : 'CVs used / limit'}</p>
                      {sectionErrors.quota ? renderSectionError(sectionErrors.quota) : null}
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3.5 dark:bg-[var(--surface)]">
                      <div className="flex items-center justify-between"><Briefcase className="h-4 w-4 text-[var(--success)]" /><span className="text-[10px] text-slate-400">{isVi ? 'Hồ sơ' : 'Apps'}</span></div>
                      <p className="mt-3 text-2xl font-black tracking-tight text-[var(--heading)] dark:text-white">{sectionErrors.applications ? '—' : applications.length}</p>
                      <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">{isVi ? 'Đơn ứng tuyển của bạn' : 'Your applications'}</p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-blue-100 bg-blue-50/75 p-4 dark:border-[var(--border)] dark:bg-[var(--surface)]/75">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-xs font-bold text-[var(--heading)] dark:text-slate-100">{isVi ? 'Mức hoàn thiện hồ sơ' : 'Profile completeness'}</span>
                      <span className="text-sm font-black text-[var(--primary)] dark:text-[var(--retro-sky)]">{sectionErrors.profile ? '—' : `${completeness}%`}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-xl bg-blue-100 dark:bg-[var(--surface)]">
                      <div className="h-full rounded-xl bg-[var(--primary)] transition-[width] duration-700 ease-out motion-reduce:transition-none" style={{ width: `${completeness}%` }} />
                    </div>
                    <Link href="/candidate/profile" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[var(--primary)] hover:underline dark:text-[var(--retro-sky)]">
                      {isVi ? 'Hoàn thiện hồ sơ' : 'Complete profile'}<ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
                <div aria-hidden="true" className="absolute -bottom-3 -right-2 -z-10 h-28 w-28 rounded-xl bg-gradient-to-br from-[var(--primary)]/20 to-[var(--success)]/20 blur-[1px]" />
              </div>
            </div>
          </section>
        </Reveal>

        {/* LIVE METRICS: every number is derived from the candidate APIs. */}
        <Reveal duration={500}>
          <section aria-label={isVi ? 'Tổng quan nhanh' : 'Quick overview'} className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
            <div className="group rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-200 hover:shadow-lg hover:shadow-blue-500/5 dark:border-[var(--border)] dark:bg-[var(--surface)] dark:hover:border-[var(--border)] sm:p-5">
              <div className="flex items-center justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[var(--primary)] dark:bg-[var(--surface)] dark:text-[var(--retro-sky)]"><FileText className="h-5 w-5" /></span><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">CV</span></div>
              <p className="mt-4 text-2xl font-black text-[var(--heading)] dark:text-white">{sectionErrors.cvs ? '—' : cvs.length}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{isVi ? 'CV trong thư viện' : 'CVs in your library'}</p>
              <Link href="/candidate/cvs" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[var(--primary)] dark:text-[var(--retro-sky)]">{isVi ? 'Quản lý CV' : 'Manage CVs'}<ChevronRight className="h-3.5 w-3.5" /></Link>
            </div>
            <div className="group rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-200 hover:shadow-lg hover:shadow-blue-500/5 dark:border-[var(--border)] dark:bg-[var(--surface)] dark:hover:border-[var(--border)] sm:p-5">
              <div className="flex items-center justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-[var(--success)] dark:bg-emerald-950/40 dark:text-emerald-300"><Briefcase className="h-5 w-5" /></span><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{isVi ? 'Ứng tuyển' : 'APPS'}</span></div>
              <p className="mt-4 text-2xl font-black text-[var(--heading)] dark:text-white">{sectionErrors.applications ? '—' : applications.length}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{isVi ? 'Đơn đã gửi' : 'Applications submitted'}</p>
              <Link href="/candidate/applications" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[var(--primary)] dark:text-[var(--retro-sky)]">{isVi ? 'Theo dõi tiến trình' : 'Track progress'}<ChevronRight className="h-3.5 w-3.5" /></Link>
            </div>
            <div className="group rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-200 hover:shadow-lg hover:shadow-blue-500/5 dark:border-[var(--border)] dark:bg-[var(--surface)] dark:hover:border-[var(--border)] sm:p-5">
              <div className="flex items-center justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300"><Target className="h-5 w-5" /></span><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">PROFILE</span></div>
              <p className="mt-4 text-2xl font-black text-[var(--heading)] dark:text-white">{sectionErrors.profile ? '—' : `${completeness}%`}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{isVi ? 'Hoàn thiện hồ sơ' : 'Profile completeness'}</p>
              <Link href="/candidate/profile" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[var(--primary)] dark:text-[var(--retro-sky)]">{isVi ? 'Cập nhật hồ sơ' : 'Update profile'}<ChevronRight className="h-3.5 w-3.5" /></Link>
            </div>
            <div className="group rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-200 hover:shadow-lg hover:shadow-blue-500/5 dark:border-[var(--border)] dark:bg-[var(--surface)] dark:hover:border-[var(--border)] sm:p-5">
              <div className="flex items-center justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-300"><Award className="h-5 w-5" /></span><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">PLAN</span></div>
              <p className="mt-4 text-2xl font-black text-[var(--heading)] dark:text-white">{quota ? `${quota.remainingSlots}` : '—'}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{isVi ? 'Lượt tạo CV còn lại' : 'CV slots remaining'}</p>
              <button type="button" onClick={() => setUploadOpen(true)} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[var(--primary)] dark:text-[var(--retro-sky)]">{isVi ? 'Thêm CV' : 'Add a CV'}<ChevronRight className="h-3.5 w-3.5" /></button>
            </div>
          </section>
        </Reveal>

        {/* INDUSTRIES: categories and counts are derived from published jobs only. */}
        <Reveal duration={520}>
          <section>
            <SectionHeading
              eyebrow={isVi ? 'Khám phá cơ hội' : 'Explore opportunities'}
              title={isVi ? 'Tìm việc theo ngành nghề' : 'Explore jobs by industry'}
              description={isVi ? 'Các danh mục bên dưới được tạo từ tin tuyển dụng đang xuất bản trong hệ thống.' : 'Categories below are derived from published jobs currently available in the platform.'}
              actionLabel={isVi ? 'Xem tất cả việc làm' : 'Browse all jobs'}
              actionHref="/jobs"
            />
            {industryStats.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-[var(--border)] dark:bg-[var(--surface)]">
                <Briefcase className="mx-auto h-8 w-8 text-slate-400" />
                <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">{isVi ? 'Chưa có danh mục việc làm để hiển thị' : 'No job categories to show yet'}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{isVi ? 'Danh mục sẽ xuất hiện khi hệ thống có tin tuyển dụng đã xuất bản.' : 'Categories will appear when published job listings are available.'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
                {industryStats.map(({ industry, count }, index) => {
                  const icons = [Briefcase, Building2, Target, FileCheck2, Sparkles, Zap];
                  const IndustryIcon = icons[index % icons.length];
                  return (
                    <button key={industry} type="button" onClick={() => { router.push(`/jobs?industry=${encodeURIComponent(industry)}`); }} className="group rounded-xl border border-slate-200 bg-white p-4 text-left transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-500/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border)] dark:border-[var(--border)] dark:bg-[var(--surface)] dark:hover:border-[var(--border)] motion-reduce:transform-none motion-reduce:transition-none sm:p-5">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[var(--primary)] transition group-hover:bg-[var(--primary)] group-hover:text-white dark:bg-[var(--surface)] dark:text-[var(--retro-sky)] dark:group-hover:bg-[var(--primary)]"><IndustryIcon className="h-5 w-5" /></span>
                      <span className="mt-4 block text-sm font-extrabold text-[var(--heading)] dark:text-white">{translateIndustry(industry, locale)}</span>
                      <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{count} {isVi ? 'vị trí đang mở' : count === 1 ? 'open position' : 'open positions'}</span>
                      <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[var(--primary)] dark:text-[var(--retro-sky)]">{isVi ? 'Khám phá' : 'Explore'}<ArrowUpRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </Reveal>

        {/* JOB LISTINGS: true API data, with real detail and application flows. */}
        <Reveal duration={520}>
          <section>
            <SectionHeading
              eyebrow={isVi ? 'Tin tuyển dụng' : 'Job listings'}
              title={profile?.targetIndustry || profile?.targetIndustries?.length ? (isVi ? 'Việc làm theo định hướng của bạn' : 'Jobs aligned with your interests') : (isVi ? 'Việc làm mới nhất' : 'Latest opportunities')}
              description={isVi ? 'Ưu tiên ngành nghề dựa trên hồ sơ mục tiêu của bạn, sau đó hiển thị tin mới hơn. Đây không phải điểm đối sánh AI.' : 'Listings are prioritised by your target industry and then by recency. This is not an AI match score.'}
              actionLabel={isVi ? 'Mở bộ lọc nâng cao' : 'Open advanced filters'}
              actionHref="/jobs"
            />
            {jobsError ? (
              <div className="mb-4 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200 sm:flex-row sm:items-center sm:justify-between">
                <span>{jobsError}</span><button type="button" onClick={retryDashboardData} className="inline-flex items-center gap-2 self-start font-bold underline sm:self-auto"><RefreshCw className="h-4 w-4" />{isVi ? 'Thử lại' : 'Retry'}</button>
              </div>
            ) : null}
            {!jobsError && publishedJobs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-[var(--border)] dark:bg-[var(--surface)]">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50 text-[var(--primary)] dark:bg-[var(--surface)] dark:text-[var(--retro-sky)]"><Search className="h-6 w-6" /></div>
                <h3 className="mt-4 text-base font-extrabold text-[var(--heading)] dark:text-white">{isVi ? 'Chưa có việc làm để giới thiệu' : 'No published jobs to show yet'}</h3>
                <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500 dark:text-slate-400">{isVi ? 'Khi nhà tuyển dụng xuất bản tin mới, các vị trí sẽ xuất hiện tại đây. Bạn vẫn có thể cập nhật CV và hồ sơ trong lúc chờ.' : 'New listings will appear here when recruiters publish them. You can keep your CV and profile up to date in the meantime.'}</p>
                <Link href="/jobs" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[var(--primary)]">{isVi ? 'Mở trang việc làm' : 'Open job search'}<ArrowRight className="h-4 w-4" /></Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {publishedJobs.slice(0, 6).map((job) => <JobTile key={job.id} job={job} locale={locale} onApply={setApplyJob} />)}
              </div>
            )}
            {publishedJobs.length > 6 ? <div className="mt-5 text-center"><Link href="/jobs" className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-5 py-3 text-sm font-bold text-[var(--primary)] transition hover:bg-blue-50 dark:border-[var(--border)] dark:bg-[var(--surface)] dark:text-[var(--retro-sky)] dark:hover:bg-[var(--surface)]">{isVi ? `Xem thêm việc làm (${publishedJobs.length - 6}+)` : `View more jobs (${publishedJobs.length - 6}+)`}<ArrowRight className="h-4 w-4" /></Link></div> : null}
          </section>
        </Reveal>

        {/* CAREER CTA: functional upload and CV builder; no invented employer promotions. */}
        <Reveal duration={520}>
          <section className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[var(--retro-deep)] via-[var(--retro-deep)] to-[var(--primary)] p-6 text-white shadow-lg sm:p-9 lg:p-10">
            <div aria-hidden="true" className="absolute -right-14 -top-20 h-72 w-72 rounded-xl border-[36px] border-white/5" />
            <div aria-hidden="true" className="absolute bottom-0 right-[25%] h-24 w-24 rounded-xl bg-[var(--success)]/20 opacity-0" />
            <div className="relative grid items-center gap-7 lg:grid-cols-[minmax(0,1fr)_auto]">
              <div className="max-w-3xl">
                <span className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-blue-100"><Sparkles className="h-3.5 w-3.5" />{isVi ? 'Bắt đầu từ hồ sơ của bạn' : 'Start with your profile'}</span>
                <h2 className="mt-4 text-2xl font-black tracking-tight sm:text-3xl">{isVi ? 'Một CV rõ ràng giúp bạn sẵn sàng cho cơ hội tiếp theo.' : 'A clear CV helps you prepare for your next opportunity.'}</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">{isVi ? 'Tải CV có sẵn để hệ thống trích xuất và rà soát, hoặc tạo CV mới bằng công cụ hiện có của midCV.' : 'Upload an existing CV for extraction and review, or create a new one using the current midCV builder.'}</p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button type="button" onClick={() => setUploadOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-extrabold text-[var(--heading)] transition hover:bg-blue-50 active:scale-[0.98]"><UploadCloud className="h-4 w-4 text-[var(--primary)]" />{isVi ? 'Tải CV từ thiết bị' : 'Upload a CV'}</button>
                  <Link href="/candidate/cvs/builder" className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/15"><Plus className="h-4 w-4" />{isVi ? 'Mở trình tạo CV' : 'Open CV builder'}</Link>
                </div>
              </div>
              <div className="min-w-[220px] rounded-xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
                <div className="flex items-center justify-between gap-4"><span className="text-xs font-semibold text-blue-100">{isVi ? 'Hạn mức CV' : 'CV quota'}</span><FileText className="h-4 w-4 text-blue-100" /></div>
                <p className="mt-3 text-3xl font-black">{quota ? `${quota.currentCount} / ${quota.maxLimit}` : `${cvs.length}`}</p>
                <div className="mt-3 h-2 overflow-hidden rounded-xl bg-white/20"><div className="h-full rounded-xl bg-[var(--success)] transition-[width] duration-700 motion-reduce:transition-none" style={{ width: `${quotaPercent}%` }} /></div>
                <p className="mt-2 text-[11px] text-blue-100">{quota ? (isVi ? `Còn ${quota.remainingSlots} lượt tạo CV` : `${quota.remainingSlots} CV slots remaining`) : (isVi ? 'Chưa lấy được hạn mức từ máy chủ' : 'Quota unavailable')}</p>
                <Link href="/candidate/cvs" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-white underline decoration-white/50 underline-offset-4">{isVi ? 'Xem thư viện CV' : 'View CV library'}<ArrowUpRight className="h-3.5 w-3.5" /></Link>
              </div>
            </div>
          </section>
        </Reveal>

        {/* APPLICATIONS + CV LIBRARY: preserve the current working routes and live data. */}
        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <Reveal duration={500}>
            <section className="h-full rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[var(--border)] dark:bg-[var(--surface)] sm:p-6">
              <SectionHeading eyebrow={isVi ? 'Theo dõi hồ sơ' : 'Application tracking'} title={isVi ? 'Tiến trình ứng tuyển' : 'Application progress'} description={isVi ? 'Trạng thái bên dưới được lấy từ dữ liệu ứng tuyển của bạn.' : 'Statuses below come from your application records.'} actionLabel={isVi ? 'Xem tất cả' : 'View all'} actionHref="/candidate/applications" />
              {sectionErrors.applications ? renderSectionError(sectionErrors.applications) : recentApplications.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center dark:border-[var(--border)]">
                  <Briefcase className="mx-auto h-7 w-7 text-slate-400" />
                  <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">{isVi ? 'Bạn chưa có đơn ứng tuyển' : 'No applications yet'}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{isVi ? 'Mở một vị trí phù hợp và dùng chức năng ứng tuyển để bắt đầu theo dõi.' : 'Open a role and use the application flow to start tracking it.'}</p>
                  <Link href="/jobs" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-xs font-bold text-white hover:bg-[var(--primary)]">{isVi ? 'Khám phá việc làm' : 'Explore jobs'}<ArrowRight className="h-3.5 w-3.5" /></Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentApplications.map((application) => {
                    const job = application.job;
                    return (
                      <div key={application.id} className="rounded-xl border border-slate-100 p-4 transition hover:border-blue-100 dark:border-[var(--border)] dark:hover:border-[var(--border)]">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <Link href={job?.id ? `/jobs/${job.id}` : '/candidate/applications'} className="line-clamp-2 text-sm font-bold text-[var(--heading)] hover:text-[var(--primary)] dark:text-slate-100 dark:hover:text-[var(--retro-sky)]">{job?.title || (isVi ? 'Vị trí ứng tuyển' : 'Applied position')}</Link>
                            <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{job?.companyName || (isVi ? 'Doanh nghiệp' : 'Company')} · {formatDate(application.appliedDate, locale)}</p>
                          </div>
                          <span className={`shrink-0 rounded-xl border px-2.5 py-1 text-[10px] font-bold ${statusTone(application.status)}`}>{applicationStatusLabel(application.status, locale)}</span>
                        </div>
                        {typeof application.matchScore === 'number' ? <div className="mt-3 flex items-center justify-between text-[11px]"><span className="text-slate-500 dark:text-slate-400">{isVi ? 'Điểm đối sánh hiện có' : 'Recorded match score'}</span><span className="font-extrabold text-[var(--primary)] dark:text-[var(--retro-sky)]">{application.matchScore}%</span></div> : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </Reveal>

          <Reveal duration={500} delay={70}>
            <section className="h-full rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[var(--border)] dark:bg-[var(--surface)] sm:p-6">
              <SectionHeading eyebrow={isVi ? 'Tài liệu của bạn' : 'Your documents'} title={isVi ? 'Thư viện CV' : 'CV library'} description={isVi ? 'CV và phiên bản đang được lưu trong tài khoản của bạn.' : 'CVs and versions saved in your account.'} actionLabel={isVi ? 'Mở thư viện' : 'Open library'} actionHref="/candidate/cvs" />
              {sectionErrors.cvs ? renderSectionError(sectionErrors.cvs) : recentCVs.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center dark:border-[var(--border)]">
                  <FileText className="mx-auto h-7 w-7 text-slate-400" />
                  <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">{isVi ? 'Chưa có CV trong thư viện' : 'Your CV library is empty'}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{isVi ? 'Tải lên CV hoặc tạo bản mới; dữ liệu chỉ được hiển thị sau khi máy chủ lưu thành công.' : 'Upload or create a CV. It will appear here after the server saves it successfully.'}</p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2"><button type="button" onClick={() => setUploadOpen(true)} className="rounded-xl bg-[var(--primary)] px-4 py-2.5 text-xs font-bold text-white hover:bg-[var(--primary)]">{isVi ? 'Tải CV lên' : 'Upload CV'}</button><Link href="/candidate/cvs/builder" className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-[var(--primary)] hover:bg-blue-50 dark:border-[var(--border)] dark:text-[var(--retro-sky)] dark:hover:bg-[var(--surface)]">{isVi ? 'Tạo CV mới' : 'Create CV'}</Link></div>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentCVs.map((cv) => (
                    <div key={cv.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3.5 transition hover:border-blue-100 dark:border-[var(--border)] dark:hover:border-[var(--border)]">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[var(--primary)] dark:bg-[var(--surface)] dark:text-[var(--retro-sky)]"><FileText className="h-5 w-5" /></div>
                      <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-[var(--heading)] dark:text-white">{cv.title}</p><p className="mt-1 truncate text-[11px] text-slate-500 dark:text-slate-400">{cv.targetRole || translateIndustry(cv.targetIndustry, locale)} · v{cv.currentVersionNumber}</p><p className="mt-1 text-[10px] text-slate-400">{isVi ? 'Cập nhật' : 'Updated'} {formatDate(cv.updatedAt, locale)}</p></div>
                      {cv.isDefault ? <span className="shrink-0 rounded-xl bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">{isVi ? 'Mặc định' : 'Default'}</span> : null}
                      <Link href={`/candidate/cvs/builder?edit=${encodeURIComponent(cv.id)}`} aria-label={isVi ? `Chỉnh sửa ${cv.title}` : `Edit ${cv.title}`} className="rounded-xl p-2 text-[var(--primary)] transition hover:bg-blue-50 dark:text-[var(--retro-sky)] dark:hover:bg-[var(--surface)]"><ArrowUpRight className="h-4 w-4" /></Link>
                    </div>
                  ))}
                  <button type="button" onClick={() => setUploadOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 px-3.5 py-2.5 text-xs font-bold text-[var(--primary)] transition hover:bg-blue-50 dark:border-[var(--border)] dark:text-[var(--retro-sky)] dark:hover:bg-[var(--surface)]"><Plus className="h-3.5 w-3.5" />{isVi ? 'Thêm CV' : 'Add CV'}</button>
                </div>
              )}
            </section>
          </Reveal>
        </div>

        {/* PROFILE & EVIDENCE: real candidate profile and existing product routes. */}
        <Reveal duration={520}>
          <section className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[var(--border)] dark:bg-[var(--surface)] sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--primary)] dark:text-[var(--retro-sky)]">{isVi ? 'Hồ sơ cá nhân' : 'Candidate profile'}</p><h2 className="mt-1.5 text-lg font-extrabold text-[var(--heading)] dark:text-white">{isVi ? 'Hoàn thiện hồ sơ năng lực' : 'Complete your candidate profile'}</h2><p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{isVi ? 'Tiến độ được tính từ thông tin hiện có, không phải đánh giá AI.' : 'Progress is calculated from available profile fields, not an AI evaluation.'}</p></div>
                <span className="text-2xl font-black text-[var(--primary)] dark:text-[var(--retro-sky)]">{sectionErrors.profile ? '—' : `${completeness}%`}</span>
              </div>
              {renderSectionError(sectionErrors.profile)}
              <div className="mt-4 h-2.5 overflow-hidden rounded-xl bg-slate-100 dark:bg-[var(--surface)]"><div className="h-full rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--success)] transition-[width] duration-700 motion-reduce:transition-none" style={{ width: `${completeness}%` }} /></div>
              <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {[
                  { label: isVi ? 'Họ tên' : 'Full name', complete: Boolean(profile?.fullName?.trim()) },
                  { label: isVi ? 'Email' : 'Email', complete: Boolean(profile?.email?.trim()) },
                  { label: isVi ? 'Số điện thoại' : 'Phone number', complete: Boolean(profile?.phone?.trim()) },
                  { label: isVi ? 'Kỹ năng' : 'Skills', complete: Boolean(profile?.skills?.length) },
                  { label: isVi ? 'Định hướng nghề nghiệp' : 'Career direction', complete: Boolean(profile?.targetIndustry || profile?.targetIndustries?.length || profile?.targetRoles?.length) },
                  { label: 'GitHub', complete: Boolean(profile?.githubUsername || profile?.githubUrl) },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs dark:bg-[var(--surface)]">
                    <CheckCircle2 className={`h-4 w-4 shrink-0 ${item.complete ? 'text-[var(--success)]' : 'text-slate-300 dark:text-slate-600'}`} />
                    <span className={item.complete ? 'text-slate-700 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'}>{item.label}</span>
                  </div>
                ))}
              </div>
              <Link href="/candidate/profile" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2.5 text-xs font-extrabold text-[var(--primary)] transition hover:bg-blue-100 dark:bg-[var(--surface)] dark:text-[var(--retro-sky)] dark:hover:bg-[var(--surface)]">{isVi ? 'Cập nhật hồ sơ' : 'Update profile'}<ArrowRight className="h-3.5 w-3.5" /></Link>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[var(--border)] dark:bg-[var(--surface)] sm:p-6">
              <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-[var(--success)] dark:bg-emerald-950/40 dark:text-emerald-300"><ShieldCheck className="h-5 w-5" /></span><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--success)]">midCV integrity</p><h2 className="mt-1 text-lg font-extrabold text-[var(--heading)] dark:text-white">{isVi ? 'Hồ sơ có căn cứ, minh bạch hơn' : 'Keep your profile evidence-based'}</h2></div></div>
              <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-400">{isVi ? 'midCV tách riêng dữ liệu bạn cung cấp, nội dung trích xuất từ CV và kết quả đối sánh đã có. Khi chưa có đủ dữ liệu, giao diện sẽ báo rõ thay vì hiển thị điểm phù hợp giả định.' : 'midCV separates information you provide, CV-extracted content, and recorded matching results. When evidence is insufficient, the interface says so instead of inventing a match score.'}</p>
              <div className="mt-5 space-y-3">
                <Link href="/candidate/cvs" className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 transition hover:border-blue-100 hover:bg-blue-50/50 dark:border-[var(--border)] dark:hover:border-[var(--border)] dark:hover:bg-[var(--surface)]"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[var(--primary)] dark:bg-[var(--surface)] dark:text-[var(--retro-sky)]"><FileCheck2 className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-xs font-bold text-[var(--heading)] dark:text-white">{isVi ? 'CV và phiên bản' : 'CVs and versions'}</span><span className="mt-0.5 block text-[11px] text-slate-500 dark:text-slate-400">{isVi ? 'Xem tài liệu và trạng thái hiện có' : 'Review your saved documents and status'}</span></span><ChevronRight className="h-4 w-4 text-slate-400" /></Link>
                <Link href="/candidate/applications" className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 transition hover:border-blue-100 hover:bg-blue-50/50 dark:border-[var(--border)] dark:hover:border-[var(--border)] dark:hover:bg-[var(--surface)]"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-[var(--success)] dark:bg-emerald-950/40 dark:text-emerald-300"><TrendingUpIcon /></span><span className="min-w-0 flex-1"><span className="block text-xs font-bold text-[var(--heading)] dark:text-white">{isVi ? 'Lịch sử ứng tuyển' : 'Application history'}</span><span className="mt-0.5 block text-[11px] text-slate-500 dark:text-slate-400">{isVi ? 'Theo dõi trạng thái và điểm đối sánh đã ghi nhận' : 'Track statuses and recorded match scores'}</span></span><ChevronRight className="h-4 w-4 text-slate-400" /></Link>
              </div>
            </div>
          </section>
        </Reveal>

        {/* TOOLKIT: every tile links to an existing route. */}
        <Reveal duration={520}>
          <section>
            <SectionHeading eyebrow={isVi ? 'Công cụ midCV' : 'MidCV tools'} title={isVi ? 'Mọi thứ cần thiết cho hành trình tìm việc' : 'Tools for your job-search journey'} description={isVi ? 'Truy cập nhanh các chức năng đang có trong hệ thống.' : 'Quick access to capabilities currently available in the platform.'} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Link href="/candidate/cvs/builder" className="group flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-5 transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg dark:border-[var(--border)] dark:bg-[var(--surface)] dark:hover:border-[var(--border)] motion-reduce:transform-none motion-reduce:transition-none"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[var(--primary)] group-hover:bg-[var(--primary)] group-hover:text-white dark:bg-[var(--surface)] dark:text-[var(--retro-sky)] dark:group-hover:bg-[var(--primary)]"><Plus className="h-5 w-5" /></span><span><span className="block text-sm font-extrabold text-[var(--heading)] dark:text-white">{isVi ? 'Trình tạo CV' : 'CV builder'}</span><span className="mt-1.5 block text-xs leading-5 text-slate-500 dark:text-slate-400">{isVi ? 'Tạo và chỉnh sửa nội dung CV của bạn.' : 'Create and edit your CV content.'}</span><span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[var(--primary)] dark:text-[var(--retro-sky)]">{isVi ? 'Mở công cụ' : 'Open tool'}<ArrowUpRight className="h-3.5 w-3.5" /></span></span></Link>
              <Link href="/candidate/cvs" className="group flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-5 transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg dark:border-[var(--border)] dark:bg-[var(--surface)] dark:hover:border-[var(--border)] motion-reduce:transform-none motion-reduce:transition-none"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[var(--success)] group-hover:bg-[var(--success)] group-hover:text-white dark:bg-emerald-950/40 dark:text-emerald-300 dark:group-hover:bg-[var(--surface)]"><FileText className="h-5 w-5" /></span><span><span className="block text-sm font-extrabold text-[var(--heading)] dark:text-white">{isVi ? 'Quản lý CV' : 'CV management'}</span><span className="mt-1.5 block text-xs leading-5 text-slate-500 dark:text-slate-400">{isVi ? 'Quản lý thư viện, phiên bản và CV mặc định.' : 'Manage your library, versions, and default CV.'}</span><span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[var(--primary)] dark:text-[var(--retro-sky)]">{isVi ? 'Mở thư viện' : 'Open library'}<ArrowUpRight className="h-3.5 w-3.5" /></span></span></Link>
              <Link href="/candidate/applications" className="group flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-5 transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg dark:border-[var(--border)] dark:bg-[var(--surface)] dark:hover:border-[var(--border)] motion-reduce:transform-none motion-reduce:transition-none"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 group-hover:bg-amber-500 group-hover:text-white dark:bg-amber-950/40 dark:text-amber-300 dark:group-hover:bg-amber-600"><Clock3 className="h-5 w-5" /></span><span><span className="block text-sm font-extrabold text-[var(--heading)] dark:text-white">{isVi ? 'Theo dõi ứng tuyển' : 'Application tracking'}</span><span className="mt-1.5 block text-xs leading-5 text-slate-500 dark:text-slate-400">{isVi ? 'Xem trạng thái của các đơn đã gửi.' : 'Review the status of applications you submitted.'}</span><span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[var(--primary)] dark:text-[var(--retro-sky)]">{isVi ? 'Xem tiến trình' : 'View progress'}<ArrowUpRight className="h-3.5 w-3.5" /></span></span></Link>
              <Link href="/candidate/profile" className="group flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-5 transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg dark:border-[var(--border)] dark:bg-[var(--surface)] dark:hover:border-[var(--border)] motion-reduce:transform-none motion-reduce:transition-none"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white dark:bg-purple-950/40 dark:text-purple-300"><UserRound className="h-5 w-5" /></span><span><span className="block text-sm font-extrabold text-[var(--heading)] dark:text-white">{isVi ? 'Hồ sơ năng lực' : 'Candidate profile'}</span><span className="mt-1.5 block text-xs leading-5 text-slate-500 dark:text-slate-400">{isVi ? 'Cập nhật thông tin, kỹ năng và liên kết GitHub.' : 'Update your details, skills, and GitHub link.'}</span><span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[var(--primary)] dark:text-[var(--retro-sky)]">{isVi ? 'Chỉnh sửa hồ sơ' : 'Edit profile'}<ArrowUpRight className="h-3.5 w-3.5" /></span></span></Link>
            </div>
          </section>
        </Reveal>

        {/* Support CTA uses an existing help route, not a placeholder form. */}
        <Reveal duration={500}>
          <section className="flex flex-col gap-5 rounded-xl border border-blue-100 bg-gradient-to-r from-white via-blue-50/70 to-emerald-50/50 p-5 dark:border-[var(--border)] dark:from-[var(--surface)] dark:via-[var(--surface)] dark:to-[var(--surface)] sm:flex-row sm:items-center sm:justify-between sm:p-7">
            <div className="flex items-start gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-[var(--primary)] shadow-sm dark:bg-[var(--surface)] dark:text-[var(--retro-sky)]"><Sparkles className="h-5 w-5" /></span><div><h2 className="text-base font-extrabold text-[var(--heading)] dark:text-white">{isVi ? 'Cần hỗ trợ trong quá trình tìm việc?' : 'Need help with your job search?'}</h2><p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">{isVi ? 'Mở trung tâm trợ giúp để xem hướng dẫn và thông tin hỗ trợ hiện có.' : 'Open the help centre to review available guidance and support information.'}</p></div></div>
            <Link href="/help" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm font-bold text-[var(--primary)] transition hover:bg-blue-50 dark:border-[var(--border)] dark:bg-[var(--surface)] dark:text-[var(--retro-sky)] dark:hover:bg-[var(--surface)]">{isVi ? 'Trung tâm trợ giúp' : 'Help centre'}<ExternalLink className="h-4 w-4" /></Link>
          </section>
        </Reveal>
      </main>

      {notice ? (
        <div role="status" aria-live="polite" className="fixed bottom-5 left-1/2 z-[70] flex w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-2xl dark:border-[var(--border)] dark:bg-[var(--surface)] dark:text-slate-200">
          <Bookmark className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)] dark:text-[var(--retro-sky)]" /><p className="flex-1 leading-5">{notice}</p><button type="button" onClick={() => setNotice(null)} aria-label={isVi ? 'Đóng thông báo' : 'Dismiss notice'} className="rounded-xl p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-[var(--surface)] dark:hover:text-white"><X className="h-4 w-4" /></button>
        </div>
      ) : null}

      <CVUploadModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        quota={quota}
        onUploadSuccess={(uploadedCV) => setCvs((current) => [uploadedCV, ...current.filter((cv) => cv.id !== uploadedCV.id)])}
        onSuccess={retryDashboardData}
      />
      <QuickApplyModal
        job={applyJob}
        isOpen={Boolean(applyJob)}
        onClose={() => setApplyJob(null)}
        onSuccess={retryDashboardData}
      />
    </div>
  );
}

function TrendingUpIcon() {
  return <Zap className="h-4 w-4" />;
}
