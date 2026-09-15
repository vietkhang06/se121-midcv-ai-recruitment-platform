'use client';

import React from 'react';
import Link from 'next/link';
import { Job } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { Briefcase, Bookmark, ShieldCheck, HelpCircle, Info } from 'lucide-react';

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
    <div className="bg-white dark:bg-[#102A25] border border-slate-200 dark:border-[#1F4A40] hover:border-[#2563EB] dark:hover:border-[#2563EB] rounded-2xl p-6 shadow-xs hover:shadow-md transition-all duration-200">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        
        {/* Left: Company Icon + Details */}
        <div className="flex items-start gap-4 flex-1">
          <div className="w-12 h-12 rounded-xl bg-[#EFF6FF] dark:bg-[#071A17] border border-[#BFDBFE] dark:border-[#1F4A40] flex items-center justify-center text-[#2563EB] shrink-0">
            <Briefcase className="w-6 h-6" />
          </div>

          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-semibold text-[#0F2A52] dark:text-[#F1F5F9] hover:text-[#2563EB] dark:hover:text-[#60A5FA] transition">
                <Link href={`/jobs/${job.id}`}>{job.title}</Link>
              </h3>
              {job.companyVerified && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#00B14F] dark:text-[#10B981] bg-[#E8F8EE] dark:bg-[#00B14F]/15 border border-[#00B14F]/30 px-2.5 py-0.5 rounded-full">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Doanh nghiệp xác thực</span>
                </span>
              )}
            </div>

            <div className="text-xs text-[#64748B] dark:text-[#94A3B8]">
              <span className="font-semibold text-[#0F2A52] dark:text-slate-200">{job.companyName}</span>
              <span className="mx-2 text-slate-300 dark:text-slate-600">•</span>
              <span>{job.location} ({job.employmentType})</span>
              <span className="mx-2 text-slate-300 dark:text-slate-600">•</span>
              <span className="font-mono text-[#00B14F] dark:text-[#10B981]">{job.industry}</span>
            </div>

            {/* Matching Technical Skills Bar */}
            <div className="pt-2 max-w-md space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#64748B] dark:text-[#94A3B8] font-medium">Đối sánh kỹ năng yêu cầu</span>
                <span className="font-semibold text-[#0F2A52] dark:text-slate-200 font-mono">
                  {hasInsufficientData
                    ? 'Chưa đủ dữ liệu hồ sơ'
                    : `${verifiedCount} / ${totalReqs} Đạt chuẩn`}
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-[#071A17] rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-[#00B14F] h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${percentVerified}%` }}
                />
              </div>
            </div>

            {/* Salary & Date */}
            <div className="pt-2 text-xs text-[#64748B] dark:text-[#94A3B8] font-mono">
              <span className="font-semibold text-[#0F2A52] dark:text-slate-200">
                {job.salaryRange || (job.salaryMin ? `$${job.salaryMin} - $${job.salaryMax} /mo` : 'Thỏa thuận')}
              </span>
              <span className="mx-2 text-slate-300 dark:text-slate-600">•</span>
              <span>Đăng {job.publishedDate || 'gần đây'}</span>
            </div>
          </div>
        </div>

        {/* Right: Match Badge & Actions */}
        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 shrink-0 pt-2 sm:pt-0">
          <div className="flex items-center gap-2">
            {hasInsufficientData ? (
              /* Insufficient Data Match State: Transparent Explanatory Badge */
              <div
                className="group relative inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-[#071A17] text-[#64748B] dark:text-[#94A3B8] border border-slate-200 dark:border-[#1F4A40] cursor-help"
                title={
                  locale === 'vi'
                    ? 'Bạn hãy thêm CV hoặc bổ sung thông tin kinh nghiệm, kỹ năng và thế mạnh để AI có đủ dữ liệu tính toán.'
                    : 'We need more candidate information to calculate a reliable match. Add a CV or complete your experience and skills.'
                }
              >
                <Info className="w-3.5 h-3.5 text-[#64748B] dark:text-[#94A3B8]" />
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
              <span className="px-2.5 py-1 rounded-full text-xs font-bold font-mono bg-[#FEF9C3] dark:bg-[#FACC15]/20 text-[#92400E] dark:text-[#FACC15] border border-[#FACC15]/40">
                {matchScore}% MATCH
              </span>
            )}

            <button className="text-slate-400 hover:text-[#0F2A52] dark:hover:text-white p-1 cursor-pointer transition" title="Lưu công việc">
              <Bookmark className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Link
              href={`/jobs/${job.id}`}
              className="px-3.5 py-2 rounded-xl text-xs font-medium border border-slate-200 dark:border-[#1F4A40] text-[#0F2A52] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1F4A40]/50 transition cursor-pointer"
            >
              {t('jobs.viewDetails', 'Xem chi tiết')}
            </Link>
            <button
              onClick={() => onApplyClick && onApplyClick(job)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#00B14F] hover:bg-[#009643] transition shadow-xs active:scale-[0.99] cursor-pointer"
            >
              {t('jobs.applyNow', 'Ứng tuyển nhanh')}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
