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
    <div className="bg-white dark:bg-[#0E241E] border border-[#E2E8F0] dark:border-[#1B3D34] hover:border-[#0C2B24] dark:hover:border-emerald-500 rounded-xl p-6 shadow-xs hover:shadow-md transition-all duration-200">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        
        {/* Left: Company Icon + Details */}
        <div className="flex items-start gap-4 flex-1">
          <div className="w-12 h-12 rounded-lg bg-[#F1F5F3] dark:bg-[#14332B] border border-[#E2E8F0] dark:border-[#1B3D34] flex items-center justify-center text-[#0C2B24] dark:text-emerald-400 shrink-0">
            <Briefcase className="w-6 h-6" />
          </div>

          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white hover:text-[#0C2B24] dark:hover:text-emerald-400 transition">
                <Link href={`/jobs/${job.id}`}>{job.title}</Link>
              </h3>
              {job.companyVerified && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Verified Company</span>
                </span>
              )}
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-400">
              <span className="font-medium text-slate-800 dark:text-slate-200">{job.companyName}</span>
              <span className="mx-2 text-slate-400">•</span>
              <span>{job.location} ({job.employmentType})</span>
              <span className="mx-2 text-slate-400">•</span>
              <span className="font-mono text-emerald-700 dark:text-emerald-400">{job.industry}</span>
            </div>

            {/* Matching Technical Skills Bar */}
            <div className="pt-2 max-w-md space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Matching Technical Skills</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                  {hasInsufficientData
                    ? 'Profile data required'
                    : `${verifiedCount} / ${totalReqs} Verified`}
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-[#14332B] rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-[#0C2B24] dark:bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${percentVerified}%` }}
                />
              </div>
            </div>

            {/* Salary & Date */}
            <div className="pt-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {job.salaryRange || (job.salaryMin ? `$${job.salaryMin} - $${job.salaryMax} /mo` : 'Competitive')}
              </span>
              <span className="mx-2 text-slate-300 dark:text-slate-600">•</span>
              <span>Posted {job.publishedDate || 'Recently'}</span>
            </div>
          </div>
        </div>

        {/* Right: Match Badge & Actions */}
        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 shrink-0 pt-2 sm:pt-0">
          <div className="flex items-center gap-2">
            {hasInsufficientData ? (
              /* Insufficient Data Match State: Transparent Explanatory Badge */
              <div
                className="group relative inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-[#14332B] text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-[#1B3D34] cursor-help"
                title={
                  locale === 'vi'
                    ? 'Bạn hãy thêm CV hoặc bổ sung thông tin kinh nghiệm, kỹ năng và thế mạnh để AI có đủ dữ liệu tính toán.'
                    : 'We need more candidate information to calculate a reliable match. Add a CV or complete your experience and skills.'
                }
              >
                <Info className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
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
              <span className="px-2.5 py-1 rounded-full text-xs font-bold font-mono bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                {matchScore}% MATCH
              </span>
            )}

            <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer" title="Bookmark job">
              <Bookmark className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Link
              href={`/jobs/${job.id}`}
              className="px-3.5 py-1.5 rounded-md text-xs font-medium border border-[#E2E8F0] dark:border-[#1B3D34] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#14332B] transition cursor-pointer"
            >
              {t('jobs.viewDetails', 'View Match Details')}
            </Link>
            <button
              onClick={() => onApplyClick && onApplyClick(job)}
              className="px-4 py-1.5 rounded-md text-xs font-semibold text-white bg-[#0C2B24] dark:bg-emerald-700 hover:bg-[#133E34] dark:hover:bg-emerald-600 transition shadow-xs cursor-pointer"
            >
              {t('jobs.applyNow', 'Quick Apply')}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
