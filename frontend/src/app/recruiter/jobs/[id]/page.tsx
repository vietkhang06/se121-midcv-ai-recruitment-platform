'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Job } from '@/types';
import { fetchJobById, publishJob, closeJob } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';
import {
  Building2, MapPin, DollarSign, Briefcase, Calendar, ArrowLeft,
  Award, Users, ShieldCheck, CheckCircle2, Sparkles, XCircle, Send
} from 'lucide-react';
import { QuickScreeningModal } from '@/components/recruiter/QuickScreeningModal';

export default function HRJobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { t, locale } = useLanguage();
  const [job, setJob] = useState<Job | null>(null);
  const [isScreeningOpen, setIsScreeningOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchJobById(resolvedParams.id).then(setJob).catch(console.error);
  }, [resolvedParams.id]);

  if (!job) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0B1329] text-slate-800 dark:text-slate-100 transition-colors">
        <div className="p-16 text-center text-slate-500 dark:text-slate-400">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3" />
          <p className="text-sm font-medium">{t('common.loading', 'Đang tải chi tiết tin tuyển dụng...')}</p>
        </div>
      </div>
    );
  }

  const handlePublish = async () => {
    setActionLoading(true);
    try {
      const updated = await publishJob(job.id);
      setJob(updated);
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to publish job');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClose = async () => {
    if (!confirm(locale === 'vi' ? 'Bạn có chắc chắn muốn đóng tin tuyển dụng này? Ứng viên sẽ không thể nộp đơn tiếp.' : 'Are you sure you want to close this job posting? Candidates will no longer be able to apply.')) return;
    setActionLoading(true);
    try {
      const updated = await closeJob(job.id);
      setJob(updated);
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to close job');
    } finally {
      setActionLoading(false);
    }
  };

  const requiredSkills = (job.requirements || []).filter(r => r.requirementType === 'REQUIRED');
  const preferredSkills = (job.requirements || []).filter(r => r.requirementType === 'PREFERRED');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1329] text-slate-800 dark:text-slate-100 flex flex-col transition-colors pb-16">
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 w-full">
        <Link href="/recruiter/jobs" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{locale === 'vi' ? 'Quay lại Quản lý bài đăng' : 'Back to Job Postings'}</span>
        </Link>

        {/* Header Summary Card */}
        <div className="bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6 transition-colors">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-100 dark:border-slate-800/80 pb-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                {job.industry && (
                  <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                    {job.industry}
                  </span>
                )}
                <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${
                  job.status === 'PUBLISHED'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60'
                    : job.status === 'DRAFT'
                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                }`}>
                  {job.status}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{job.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-slate-700 dark:text-slate-300">{job.companyName}</span>
                <span>•</span>
                <span>{job.location || 'Remote / Hybrid'}</span>
                <span>•</span>
                <span>
                  {locale === 'vi' ? 'Lương' : 'Salary'}: ${job.salaryMin?.toLocaleString()} - ${job.salaryMax?.toLocaleString()} /tháng
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
              {job.status === 'DRAFT' && (
                <button
                  type="button"
                  onClick={handlePublish}
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
                  onClick={handleClose}
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
              <Link
                href={`/recruiter/jobs/${job.id}/applications`}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition"
              >
                {locale === 'vi' ? 'Xem Đơn Ứng Tuyển' : 'View Applications'}
              </Link>
              <Link
                href={`/recruiter/jobs/${job.id}/ranking`}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition active:scale-95 flex items-center gap-1.5"
              >
                <Award className="w-4 h-4" />
                <span>{locale === 'vi' ? 'Bảng Xếp Hạng AI' : 'AI Ranking'}</span>
              </Link>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs">
              {locale === 'vi' ? 'Mô tả công việc (JD Description)' : 'Job Description'}
            </h3>
            <p className="leading-relaxed whitespace-pre-line text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-900/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
              {job.description}
            </p>
          </div>

          {/* Required vs Preferred Skills */}
          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800/80">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {locale === 'vi' ? 'Rubric Kỹ năng đánh giá AI' : 'AI Evaluation Rubric Skills'}
            </h3>

            <div>
              <span className="text-[11px] font-bold font-mono text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block mb-2">
                {locale === 'vi' ? 'Kỹ năng bắt buộc (Required Skills)' : 'Required Skills'}
              </span>
              <div className="flex flex-wrap gap-2">
                {requiredSkills.length > 0 ? (
                  requiredSkills.map(req => (
                    <span key={req.id || req.skillName} className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300 font-mono text-xs font-medium">
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
                <span className="text-[11px] font-semibold font-mono text-blue-600 dark:text-blue-400 uppercase tracking-wider block mb-2">
                  {locale === 'vi' ? 'Kỹ năng ưu tiên (Preferred Skills)' : 'Preferred Skills'}
                </span>
                <div className="flex flex-wrap gap-2">
                  {preferredSkills.map(pref => (
                    <span key={pref.id || pref.skillName} className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/50 text-blue-700 dark:text-blue-300 font-mono text-xs">
                      + {pref.skillName}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Quick Screening Modal */}
      <QuickScreeningModal
        job={job}
        isOpen={isScreeningOpen}
        onClose={() => setIsScreeningOpen(false)}
      />
    </div>
  );
}
