'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Job } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { translateIndustry, translateWorkMode, formatSalary } from '@/lib/i18n';
import { Briefcase, Bookmark, ShieldCheck, Info } from 'lucide-react';

interface JobCardProps {
  job: Job;
  onApplyClick?: (job: Job) => void;
  matchScore?: number | null;
  matchStatus?: 'INSUFFICIENT_DATA' | 'CALCULATED' | 'NOT_CALCULATED';
}

export const JobCard: React.FC<JobCardProps> = ({
  job,
  onApplyClick,
  matchScore,
  matchStatus
}) => {
  const { user } = useAuth();
  const { t, locale } = useLanguage();
  const isVi = locale === 'vi';
  const [isSaved, setIsSaved] = useState(false);

  const isCandidate = user?.role === 'CANDIDATE';
  const hasInsufficientData =
    matchStatus === 'INSUFFICIENT_DATA' ||
    matchScore === null ||
    matchScore === undefined ||
    !isCandidate;

  // Real verified count based on job requirements
  const totalReqs = job.requirements ? job.requirements.length : 0;
  const verifiedCount = !hasInsufficientData && typeof matchScore === 'number'
    ? Math.round((matchScore / 100) * totalReqs)
    : 0;
  const percentVerified = totalReqs > 0 ? Math.round((verifiedCount / totalReqs) * 100) : 0;

  return (
    <div className="motion-hover-lift bg-white dark:bg-[var(--surface)] border border-slate-200 dark:border-[var(--border)] hover:border-[var(--border)] dark:hover:border-[var(--border)] rounded-xl p-6 shadow-xs hover:shadow-md transition-all">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        
        {/* Left: Company Icon + Details */}
        <div className="flex items-start gap-4 flex-1">
          <div className="w-12 h-12 rounded-xl bg-[var(--surface-secondary)] dark:bg-[var(--surface)] border border-[var(--border-soft)] dark:border-[var(--border)] flex items-center justify-center text-[var(--primary)] dark:text-[var(--retro-sky)] shrink-0 font-bold">
            <Briefcase className="w-6 h-6" />
          </div>

          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-semibold text-[var(--heading)] dark:text-[var(--retro-cream)] hover:text-[var(--primary)] dark:hover:text-[var(--retro-sky)] transition">
                <Link href={`/jobs/${job.id}`}>{job.title}</Link>
              </h3>
              {job.companyVerified && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--success)] dark:text-[var(--success)] bg-[var(--surface-secondary)] dark:bg-[var(--success)]/15 border border-[var(--border)]/30 px-2.5 py-0.5 rounded-xl">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{isVi ? 'Doanh nghiệp xác thực' : 'Company Verified'}</span>
                </span>
              )}
            </div>

            <div className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
              <span className="font-semibold text-[var(--heading)] dark:text-slate-200">{job.companyName}</span>
              <span className="mx-2 text-slate-300 dark:text-slate-600">•</span>
              <span>{job.location}</span>
            </div>

            {/* SE347 Adapted Highlight Badges (Salary, Mode, Industry) */}
            <div className="job-highlight-group pt-1">
              <span className="job-highlight-badge badge-salary">
                {formatSalary(job.salaryMin, job.salaryMax, job.salaryRange, locale, job.salaryNegotiable, job.salaryCurrency)}
              </span>
              <span className="job-highlight-badge">
                {translateWorkMode(job.employmentType, locale)}
              </span>
              <span className="job-highlight-badge">
                {translateIndustry(job.industry, locale)}
              </span>
            </div>

            {/* Matching Technical Skills Bar */}
            <div className="pt-2 max-w-md space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-medium">
                  {isVi ? 'Đối sánh kỹ năng yêu cầu' : 'Matching Technical Skills'}
                </span>
                <span className="font-semibold text-[var(--heading)] dark:text-slate-200 font-sans">
                  {hasInsufficientData
                    ? (isVi ? 'Chưa đủ dữ liệu hồ sơ' : 'Insufficient profile data')
                    : `${verifiedCount} / ${totalReqs} ${isVi ? 'Đạt chuẩn' : 'Verified'}`}
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-[var(--surface)] rounded-xl h-1.5 overflow-hidden">
                <div
                  className="bg-[var(--primary)] dark:bg-[var(--primary)] h-1.5 rounded-xl origin-left transition-transform duration-500 motion-reduce:transition-none"
                  style={{ transform: `scaleX(${percentVerified / 100})` }}
                />
              </div>
            </div>

            {/* Date line */}
            <div className="pt-1 text-[11px] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-sans">
              <span>{isVi ? `Đăng ${job.publishedDate || 'gần đây'}` : `Posted ${job.publishedDate || 'recently'}`}</span>
            </div>
          </div>
        </div>

        {/* Right: Match Badge & Actions */}
        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 shrink-0 pt-2 sm:pt-0">
          <div className="flex items-center gap-2">
            {hasInsufficientData ? (
              /* Insufficient Data Match State: Transparent Explanatory Badge */
              <div
                className="group relative inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-medium bg-slate-100 dark:bg-[var(--surface)] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] border border-slate-200 dark:border-[var(--border)] cursor-help"
                title={
                  locale === 'vi'
                    ? 'Bạn hãy thêm CV hoặc bổ sung thông tin kinh nghiệm, kỹ năng và thế mạnh để AI có đủ dữ liệu tính toán.'
                    : 'We need more candidate information to calculate a reliable match. Add a CV or complete your experience and skills.'
                }
              >
                <Info className="w-3.5 h-3.5 text-[var(--text-secondary)] dark:text-[var(--text-secondary)]" />
                <span>
                  {locale === 'vi' ? 'Chưa thể tính mức độ phù hợp' : 'Match unavailable'}
                </span>

                {/* Custom Tooltip */}
                <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-30 w-64 p-2.5 bg-slate-900 text-white text-[11px] rounded-xl shadow-xl leading-relaxed border border-slate-700 animate-fade-in pointer-events-none">
                  {locale === 'vi'
                    ? 'Bạn hãy thêm CV hoặc bổ sung thông tin kinh nghiệm, kỹ năng và thế mạnh để AI có đủ dữ liệu tính toán.'
                    : 'We need more candidate information to calculate a reliable match. Add a CV or complete your experience and skills.'}
                </div>
              </div>
            ) : (
              <span className="px-2.5 py-1 rounded-xl text-xs font-bold font-sans bg-[var(--surface-secondary)] dark:bg-[var(--warning)]/20 text-[var(--warning)] dark:text-[var(--warning)] border border-[var(--border)]/40">
                {matchScore}% MATCH
              </span>
            )}

            <button
              onClick={() => setIsSaved(!isSaved)}
              className={`p-1.5 rounded-xl border transition cursor-pointer ${
                isSaved
                  ? 'border-rose-400 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                  : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-500'
              }`}
              title={isSaved ? (isVi ? 'Bỏ lưu' : 'Unsave') : (isVi ? 'Lưu công việc' : 'Save job')}
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
            </button>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Link
              href={`/jobs/${job.id}`}
              className="px-3.5 py-2 rounded-xl text-xs font-medium border border-slate-200 dark:border-[var(--border)] text-[var(--heading)] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[var(--surface)] transition cursor-pointer"
            >
              {t('jobs.viewDetails', 'Xem chi tiết')}
            </Link>
            <button
              onClick={() => onApplyClick && onApplyClick(job)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary)] transition shadow-xs active:scale-[0.99] cursor-pointer"
            >
              {t('jobs.applyNow', 'Ứng tuyển nhanh')}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
