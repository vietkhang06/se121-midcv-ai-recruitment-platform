'use client';

import React, { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { SaveJobButton } from '@/components/inbox/SaveJobButton';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BriefcaseBusiness, MapPin, Share2 } from 'lucide-react';
import { QuickApplyModal } from '@/components/application/QuickApplyModal';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { fetchCandidateApplications, fetchJobById } from '@/lib/api';
import { formatSalary, translateIndustry, translateSeniority, translateWorkMode } from '@/lib/i18n';
import { Application, Job } from '@/types';

type LoadState = 'loading' | 'ready' | 'missing' | 'error';

function descriptionAsText(value: string) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '• ')
    .replace(/<\/(p|div|li|h[1-6])\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .trim();
}

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { locale } = useLanguage();
  const isVi = locale === 'vi';
  const [job, setJob] = useState<Job | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [loadedJobId, setLoadedJobId] = useState('');
  const [loadError, setLoadError] = useState('');
  const [applicationLookup, setApplicationLookup] = useState<{ jobId: string; application: Application | null; failed: boolean }>({ jobId: '', application: null, failed: false });
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [shareMessage, setShareMessage] = useState('');

  useEffect(() => {
    let active = true;
    fetchJobById(id).then((result) => {
      if (!active) return;
      setJob(result);
      setLoadedJobId(id);
      setLoadState(result ? 'ready' : 'missing');
    }).catch((error: unknown) => {
      if (!active) return;
      setLoadError(error instanceof Error ? error.message : (isVi ? 'Không tải được tin tuyển dụng.' : 'Could not load this job.'));
      setLoadedJobId(id);
      setLoadState('error');
    });
    return () => { active = false; };
  }, [id, isVi]);

  useEffect(() => {
    let active = true;
    if (user?.role !== 'CANDIDATE') return () => { active = false; };
    fetchCandidateApplications().then((applications) => {
      if (active) setApplicationLookup({ jobId: id, application: applications.find((item) => item.job.id === id) ?? null, failed: false });
    }).catch(() => {
      if (active) setApplicationLookup({ jobId: id, application: null, failed: true });
    });
    return () => { active = false; };
  }, [id, user?.role]);

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: job?.title, url });
      else {
        await navigator.clipboard.writeText(url);
        setShareMessage(isVi ? 'Đã sao chép liên kết.' : 'Link copied.');
      }
    } catch {
      setShareMessage(isVi ? 'Không thể chia sẻ liên kết trên thiết bị này.' : 'Could not share the link on this device.');
    }
    window.setTimeout(() => setShareMessage(''), 3000);
  };

  const returnToJobs = () => {
    if (window.history.state?.idx > 0) router.back();
    else router.push('/jobs');
  };

  const application = user?.role === 'CANDIDATE' && applicationLookup.jobId === id ? applicationLookup.application : null;
  const applicationLookupFailed = user?.role === 'CANDIDATE' && applicationLookup.jobId === id && applicationLookup.failed;
  const applicationLookupPending = user?.role === 'CANDIDATE' && applicationLookup.jobId !== id;

  if (loadedJobId !== id || loadState === 'loading') return <main className="mx-auto min-h-[55vh] max-w-6xl px-4 py-16" aria-busy="true"><div className="animate-pulse space-y-4"><div className="h-4 w-40 rounded bg-slate-200 dark:bg-slate-800"/><div className="h-28 rounded-xl bg-slate-200 dark:bg-slate-800"/><div className="h-64 rounded-xl bg-slate-100 dark:bg-slate-900"/></div></main>;

  if (loadState === 'missing' || loadState === 'error' || !job) return (
    <main className="mx-auto min-h-[55vh] max-w-3xl px-4 py-20 text-center">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{loadState === 'missing' ? (isVi ? 'Không tìm thấy tin tuyển dụng' : 'Job not found') : (isVi ? 'Chưa thể tải tin tuyển dụng' : 'Could not load this job')}</h1>
      <p role={loadState === 'error' ? 'alert' : undefined} className="mx-auto mt-3 max-w-xl text-sm text-slate-600 dark:text-slate-300">{loadState === 'error' ? loadError : (isVi ? 'Tin có thể đã bị gỡ hoặc không còn công khai.' : 'This job may have been removed or is no longer public.')}</p>
      <div className="mt-6 flex justify-center gap-3"><button type="button" onClick={returnToJobs} className="rounded-xl border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900">{isVi ? 'Quay lại danh sách' : 'Back to jobs'}</button>{loadState === 'error' && <button type="button" onClick={() => { setLoadState('loading'); void fetchJobById(id).then((result) => { setJob(result); setLoadState(result ? 'ready' : 'missing'); }).catch((error: unknown) => { setLoadError(error instanceof Error ? error.message : (isVi ? 'Không tải được tin tuyển dụng.' : 'Could not load this job.')); setLoadState('error'); }); }} className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800">{isVi ? 'Thử tải lại' : 'Retry'}</button>}</div>
    </main>
  );

  const requirements = job.requirements ?? [];
  const description = descriptionAsText(job.description || '');
  const required = requirements.filter((item) => item.requirementType === 'REQUIRED');
  const preferred = requirements.filter((item) => item.requirementType === 'PREFERRED');
  const canApply = job.status === 'PUBLISHED' && (user == null || user.role === 'CANDIDATE') && !application && !applicationLookupPending && !applicationLookupFailed;

  const retryApplicationLookup = () => {
    setApplicationLookup({ jobId: '', application: null, failed: false });
    void fetchCandidateApplications().then((applications) => {
      setApplicationLookup({ jobId: id, application: applications.find((item) => item.job.id === id) ?? null, failed: false });
    }).catch(() => setApplicationLookup({ jobId: id, application: null, failed: true }));
  };

  return (
    <main className="min-h-screen bg-slate-50 pb-12 text-slate-900 dark:bg-[var(--surface)] dark:text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <nav aria-label={isVi ? 'Điều hướng' : 'Breadcrumb'} className="mb-5 flex min-w-0 items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <Link href="/jobs" className="shrink-0 hover:text-blue-700 dark:hover:text-blue-300">{isVi ? 'Danh sách việc làm' : 'Jobs'}</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page" className="min-w-0 break-words font-medium text-slate-900 dark:text-white">{job.title}</span>
        </nav>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-300">{job.companyName || (isVi ? 'Nhà tuyển dụng' : 'Employer')}</p>
              <h1 className="mt-2 break-words text-2xl font-bold tracking-tight sm:text-3xl">{job.title}</h1>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600 dark:text-slate-300">
                {job.location && <span className="inline-flex items-center gap-1.5"><MapPin size={16} aria-hidden="true"/>{job.location}</span>}
                {job.employmentType && <span className="inline-flex items-center gap-1.5"><BriefcaseBusiness size={16} aria-hidden="true"/>{translateWorkMode(job.employmentType, locale)}</span>}
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:min-w-48">
              {applicationLookupPending ? <p role="status" className="text-center text-sm text-slate-600 dark:text-slate-300">{isVi ? 'Đang kiểm tra đơn ứng tuyển…' : 'Checking application status…'}</p> : applicationLookupFailed ? <div className="space-y-2 text-center"><p role="alert" className="text-xs text-amber-700 dark:text-amber-300">{isVi ? 'Chưa kiểm tra được trạng thái đơn ứng tuyển.' : 'Could not check application status.'}</p><button type="button" onClick={retryApplicationLookup} className="text-sm font-semibold text-blue-800 underline dark:text-blue-300">{isVi ? 'Thử lại' : 'Retry'}</button></div> : user?.role === 'RECRUITER' ? <Link href={`/recruiter/jobs/${job.id}/applications`} className="rounded-xl bg-blue-700 px-5 py-3 text-center text-sm font-semibold text-white hover:bg-blue-800">{isVi ? 'Xem hồ sơ ứng tuyển' : 'View applications'}</Link> : application ? <Link href="/candidate/applications" className="rounded-xl bg-emerald-50 px-5 py-3 text-center text-sm font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">{isVi ? 'Bạn đã ứng tuyển' : 'You applied'}{application.status ? ` · ${application.status}` : ''}</Link> : canApply ? <button type="button" onClick={() => setIsApplyOpen(true)} className="rounded-xl bg-emerald-700 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">{isVi ? 'Ứng tuyển' : 'Apply'}</button> : <div className="rounded-xl bg-slate-100 px-5 py-3 text-center text-sm font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{job.status === 'CLOSED' ? (isVi ? 'Đã đóng tuyển dụng' : 'Applications closed') : (user?.role === 'ADMIN' ? (isVi ? 'Chức năng ứng tuyển chỉ dành cho ứng viên.' : 'Applications are available to candidates only.') : (isVi ? 'Không thể ứng tuyển' : 'Applications unavailable'))}</div>}
              {job.status !== 'PUBLISHED' && job.status !== 'CLOSED' && <p className="text-xs text-slate-500">{isVi ? 'Tin này chưa mở nhận hồ sơ.' : 'This job is not accepting applications.'}</p>}
              <button type="button" onClick={handleShare} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"><Share2 size={16} aria-hidden="true"/>{isVi ? 'Chia sẻ tin' : 'Share job'}</button>
              <SaveJobButton jobId={job.id}/>
              {shareMessage && <span role="status" className="text-center text-xs text-slate-600 dark:text-slate-300">{shareMessage}</span>}
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-slate-100 pt-5 text-sm dark:border-slate-800">
            <p><span className="text-slate-500 dark:text-slate-400">{isVi ? 'Mức lương' : 'Salary'}: </span><strong className="font-semibold">{formatSalary(job.salaryMin, job.salaryMax, job.salaryRange, locale, job.salaryNegotiable, job.salaryCurrency)}</strong></p>
            {job.industry && <p><span className="text-slate-500 dark:text-slate-400">{isVi ? 'Lĩnh vực' : 'Industry'}: </span><span>{translateIndustry(job.industry, locale)}</span></p>}
            {job.seniority && <p><span className="text-slate-500 dark:text-slate-400">{isVi ? 'Cấp bậc' : 'Seniority'}: </span><span>{translateSeniority(job.seniority, locale)}</span></p>}
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="min-w-0 space-y-6">
            {description && <section aria-labelledby="job-description" className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-7"><h2 id="job-description" className="text-lg font-semibold">{isVi ? 'Mô tả công việc' : 'Job description'}</h2><div className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700 dark:text-slate-300">{description}</div></section>}
            {requirements.length > 0 && <section aria-labelledby="job-requirements" className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-7"><h2 id="job-requirements" className="text-lg font-semibold">{isVi ? 'Yêu cầu ứng viên' : 'Candidate requirements'}</h2>{required.length > 0 && <div className="mt-4"><h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">{isVi ? 'Bắt buộc' : 'Required'}</h3><ul className="mt-2 flex flex-wrap gap-2">{required.map((req) => <li key={req.id || req.skillName} className="rounded-xl bg-blue-50 px-3 py-1.5 text-sm text-blue-900 dark:bg-blue-950/60 dark:text-blue-200">{req.skillName}{req.minYearsExperience ? ` · ${req.minYearsExperience}+ ${isVi ? 'năm' : 'years'}` : ''}</li>)}</ul></div>}{preferred.length > 0 && <div className="mt-5"><h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">{isVi ? 'Ưu tiên' : 'Preferred'}</h3><ul className="mt-2 flex flex-wrap gap-2">{preferred.map((req) => <li key={req.id || req.skillName} className="rounded-xl bg-slate-100 px-3 py-1.5 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">{req.skillName}{req.minYearsExperience ? ` · ${req.minYearsExperience}+ ${isVi ? 'năm' : 'years'}` : ''}</li>)}</ul></div>}</section>}
          </div>
          <aside className="h-fit rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 lg:sticky lg:top-24"><h2 className="text-base font-semibold">{isVi ? 'Thông tin nhà tuyển dụng' : 'Employer'}</h2><p className="mt-3 break-words text-sm font-medium">{job.companyName || (isVi ? 'Chưa có thông tin' : 'Not provided')}</p><p className="mt-5 text-sm text-slate-600 dark:text-slate-300">{job.location || (isVi ? 'Chưa cung cấp địa điểm' : 'Location not provided')}</p>{job.industry && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{translateIndustry(job.industry, locale)}</p>}</aside>
        </div>

        <button type="button" onClick={returnToJobs} className="mt-7 inline-flex items-center gap-2 text-sm font-medium text-blue-800 hover:underline dark:text-blue-300"><ArrowLeft size={16} aria-hidden="true"/>{isVi ? 'Quay lại kết quả việc làm' : 'Back to job results'}</button>
      </div>
      <QuickApplyModal job={job} isOpen={isApplyOpen} onClose={() => setIsApplyOpen(false)} onApplySubmitted={(submitted) => setApplicationLookup({ jobId: id, application: submitted, failed: false })}/>
    </main>
  );
}
