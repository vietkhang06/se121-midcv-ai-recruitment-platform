'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Job } from '@/types';
import { ApiError, fetchRecruiterJobById, publishJob, closeJob } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';
import {
  ArrowLeft, Award, Sparkles, XCircle, Send, Pencil
} from 'lucide-react';
import { QuickScreeningModal } from '@/components/recruiter/QuickScreeningModal';
import { formatSalary } from '@/lib/i18n';
import { statusLabel } from '@/lib/statusLabels';
import { displayJobStatus, formatJobDeadline, isJobExpired } from '@/lib/jobDeadline';
import { ConfirmActionDialog } from '@/components/common/ConfirmActionDialog';
import { RichTextDisplay } from '@/components/editor/RichText';

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError && typeof error.responseBody === 'object' && error.responseBody !== null && 'message' in error.responseBody && typeof error.responseBody.message === 'string') {
    return error.responseBody.message;
  }
  return error instanceof Error ? error.message : fallback;
}

export default function HRJobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { t, locale } = useLanguage();
  const isVi = locale === 'vi';
  const [job, setJob] = useState<Job | null>(null);
  const [isScreeningOpen, setIsScreeningOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [pendingAction, setPendingAction] = useState<'publish' | 'close' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetchRecruiterJobById(resolvedParams.id).then(result => { if (active) setJob(result); })
      .catch(error => { if (active) setLoadError(getErrorMessage(error, 'Unable to load job')); });
    return () => { active = false; };
  }, [resolvedParams.id]);

  if (loadError) return <div role="alert" className="mx-auto max-w-5xl space-y-3 p-8">
    <p>{loadError}</p><Link href="/recruiter/jobs" className="underline">{isVi ? 'Quay lại danh sách' : 'Back to jobs'}</Link>
  </div>;

  if (!job || job.id !== resolvedParams.id) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[var(--surface)] text-slate-800 dark:text-slate-100 transition-colors">
        <div className="p-16 text-center text-slate-500 dark:text-slate-400">
          <div className="inline-block animate-spin rounded-xl h-8 w-8 border-b-2 border-blue-600 mb-3" />
          <p className="text-sm font-medium">{t('common.loading', 'Đang tải chi tiết tin tuyển dụng...')}</p>
        </div>
      </div>
    );
  }

  const confirmAction = async () => {
    if (!pendingAction || actionLoading) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const updated = await (pendingAction === 'publish' ? publishJob(job.id) : closeJob(job.id));
      if (updated) setJob(updated);
      setPendingAction(null);
    } catch (error) {
      setActionError(getErrorMessage(error, isVi ? 'Không thể cập nhật tin.' : 'Unable to update this job.'));
    } finally {
      setActionLoading(false);
    }
  };

  const canPublish = Boolean(job.applicationDeadline && job.vacancyCount && !isJobExpired(job.applicationDeadline));
  const needsPublication = job.status === 'DRAFT' || job.status === 'CLOSED';

  const requiredSkills = (job.requirements || []).filter(r => r.requirementType === 'REQUIRED');
  const preferredSkills = (job.requirements || []).filter(r => r.requirementType === 'PREFERRED');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[var(--surface)] text-slate-800 dark:text-slate-100 flex flex-col transition-colors pb-16 w-full min-w-0">
      <main className="flex-1 w-full max-w-5xl min-w-0 mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Link href="/recruiter/jobs" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{locale === 'vi' ? 'Quay lại Quản lý bài đăng' : 'Back to Job Postings'}</span>
        </Link>

        {/* Header Summary Card */}
        <div className="bg-white dark:bg-[var(--surface)] border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 shadow-xs space-y-6 transition-colors">
          <div className="space-y-5 border-b border-slate-100 dark:border-slate-800/80 pb-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                {job.industry && (
                  <span className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-sans">
                    {job.industry}
                  </span>
                )}
                <span className={`px-2.5 py-1 rounded-xl text-xs font-bold  ${
                  displayJobStatus(job) === 'PUBLISHED'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60'
                    : job.status === 'DRAFT'
                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                }`}>
                  {statusLabel(displayJobStatus(job), locale)}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight break-words">{job.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-slate-700 dark:text-slate-300">{job.companyName}</span>
                {job.location && <span>{job.location}</span>}
                {job.vacancyCount != null && <span>{isVi ? 'Số lượng tuyển' : 'Openings'}{' · '}{job.vacancyCount}</span>}
                {job.applicationDeadline && <span>{isVi ? 'Hạn nộp' : 'Deadline'}{' · '}{formatJobDeadline(job.applicationDeadline, locale)}</span>}
                <span>
                  {locale === 'vi' ? 'Lương' : 'Salary'}: {formatSalary(job.salaryMin, job.salaryMax, job.salaryRange, locale, job.salaryNegotiable, job.salaryCurrency)}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border-soft)] pt-4">
              <Link href={`/recruiter/jobs/${job.id}/edit`} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-soft)] px-4 py-2.5 text-xs font-semibold">
                <Pencil className="size-4" /> {isVi ? 'Chỉnh sửa' : 'Edit'}
              </Link>
              {needsPublication && !canPublish && <p className="basis-full text-xs text-[var(--text-secondary)]">
                {isVi ? 'Thêm số lượng tuyển và hạn nộp hợp lệ trong phần chỉnh sửa để đăng tin.' : 'Set openings and a valid deadline in the editor to publish.'}
              </p>}
              {needsPublication && canPublish && (
                <button
                  type="button"
                  onClick={() => { setActionError(null); setPendingAction('publish'); }}
                  disabled={actionLoading}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{locale === 'vi' ? 'Đăng tin ngay' : 'Publish Job'}</span>
                </button>
              )}
              {job.status === 'PUBLISHED' && (
                <button
                  type="button"
                  onClick={() => { setActionError(null); setPendingAction('close'); }}
                  disabled={actionLoading}
                  className="px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>{locale === 'vi' ? 'Đóng tin' : 'Close Job'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsScreeningOpen(true)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800/60 shadow-xs transition flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4 text-blue-500" />
                <span>{locale === 'vi' ? 'Sàng lọc nhanh' : 'Quick Screening'}</span>
              </button>
              {job.status !== 'DRAFT' && <>
              <Link
                href={`/recruiter/jobs/${job.id}/applications`}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition"
              >
                {locale === 'vi' ? 'Xem đơn ứng tuyển' : 'View Applications'}
              </Link>
              <Link
                href={`/recruiter/jobs/${job.id}/ranking`}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition active:scale-95 flex items-center gap-1.5"
              >
                <Award className="w-4 h-4" />
                <span>{locale === 'vi' ? 'Xếp hạng AI' : 'AI Ranking'}</span>
              </Link>
              </>}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white  text-xs">
              {locale === 'vi' ? 'Mô tả công việc' : 'Job Description'}
            </h3>
            <RichTextDisplay html={job.descriptionHtml} fallback={job.description} />
            {(job.responsibilitiesHtml || Boolean(job.responsibilities?.length)) && <div className="space-y-2 pt-3">
              <h3 className="font-bold">{isVi ? 'Trách nhiệm chính' : 'Key responsibilities'}</h3>
              <RichTextDisplay html={job.responsibilitiesHtml} fallback={job.responsibilities?.join('\n')} />
            </div>}
          </div>

          {/* Required vs Preferred Skills */}
          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800/80">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white ">
              {locale === 'vi' ? 'Kỹ năng cần có' : 'Skills'}
            </h3>

            <div>
              <span className="text-[11px] font-bold font-sans text-emerald-700 dark:text-emerald-400  block mb-2">
                {locale === 'vi' ? 'Bắt buộc' : 'Required Skills'}
              </span>
              <div className="flex flex-wrap gap-2">
                {requiredSkills.length > 0 ? (
                  requiredSkills.map(req => (
                    <span key={req.id || req.skillName} className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300 font-sans text-xs font-medium">
                      ✓ {req.skillName}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400 italic">{locale === 'vi' ? 'Không có kỹ năng bắt buộc' : 'No required skills listed'}</span>
                )}
              </div>
            </div>

            {preferredSkills.length > 0 && (
              <div>
                <span className="text-[11px] font-semibold font-sans text-blue-600 dark:text-blue-400  block mb-2">
                  {locale === 'vi' ? 'Ưu tiên' : 'Preferred Skills'}
                </span>
                <div className="flex flex-wrap gap-2">
                  {preferredSkills.map(pref => (
                    <span key={pref.id || pref.skillName} className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/50 text-blue-700 dark:text-blue-300 font-sans text-xs">
                      + {pref.skillName}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <ConfirmActionDialog
        isOpen={pendingAction !== null}
        title={pendingAction === 'close' ? (isVi ? 'Đóng tin tuyển dụng?' : 'Close this job?') : (isVi ? 'Đăng tin tuyển dụng?' : 'Publish this job?')}
        description={pendingAction === 'close' ? (isVi ? 'Tin sẽ ngừng nhận hồ sơ mới. Các hồ sơ đã nộp vẫn được lưu.' : 'New applications will stop. Existing applications will remain available.')
          : (isVi ? 'Ứng viên sẽ có thể xem và ứng tuyển vào tin này.' : 'Candidates will be able to view and apply to this job.')}
        confirmLabel={isVi ? 'Xác nhận' : 'Confirm'}
        cancelLabel={isVi ? 'Quay lại' : 'Go back'}
        variant={pendingAction === 'close' ? 'warning' : 'info'}
        isLoading={actionLoading}
        errorMessage={actionError}
        onConfirm={confirmAction}
        onCancel={() => setPendingAction(null)}
      />
      {/* Quick Screening Modal */}
      <QuickScreeningModal
        job={job}
        isOpen={isScreeningOpen}
        onClose={() => setIsScreeningOpen(false)}
      />
    </div>
  );
}
