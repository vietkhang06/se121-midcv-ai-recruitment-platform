'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Job } from '@/types';
import { fetchJobById } from '@/lib/api';
import { QuickApplyModal } from '@/components/application/QuickApplyModal';
import { Building2, MapPin, DollarSign, Briefcase, ShieldCheck, Calendar, ArrowLeft, Send, CheckCircle2, Sparkles } from 'lucide-react';

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [job, setJob] = useState<Job | null>(null);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState<boolean>(false);

  useEffect(() => {
    fetchJobById(resolvedParams.id).then(setJob);
  }, [resolvedParams.id]);

  if (!job) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
        <p className="text-slate-400 text-sm">Đang tải thông tin vị trí việc làm...</p>
      </div>
    );
  }

  const requiredSkills = job.requirements.filter(r => r.requirementType === 'REQUIRED');
  const preferredSkills = job.requirements.filter(r => r.requirementType === 'PREFERRED');

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Back Link */}
      <Link href="/jobs" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition">
        <ArrowLeft className="w-4 h-4" />
        <span>Quay lại danh sách việc làm</span>
      </Link>

      {/* Main Job Card Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-950 border border-indigo-500/30 text-indigo-300">
                {job.industry}
              </span>
              <span className="px-3 py-1 rounded-lg text-xs font-medium bg-slate-800 text-slate-300">
                {job.employmentType}
              </span>
              {job.companyVerified && (
                <span className="flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verified Company</span>
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{job.title}</h1>
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Building2 className="w-4 h-4 text-cyan-400" />
              <span className="font-semibold">{job.companyName}</span>
            </div>
          </div>

          <button
            onClick={() => setIsApplyModalOpen(true)}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 shadow-lg shadow-indigo-500/25 transition active:scale-95 flex-shrink-0"
          >
            <Send className="w-4 h-4" />
            <span>Nộp đơn Ung tuyển ngay</span>
          </button>
        </div>

        {/* Quick Meta Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-slate-400 block">Địa điểm làm việc</span>
            <span className="font-semibold text-white flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-cyan-400" />{job.location}</span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-slate-400 block">Mức lương dự kiến</span>
            <span className="font-bold text-emerald-400 flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" />${job.salaryMin} - ${job.salaryMax} /tháng</span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-slate-400 block">Cấp bậc</span>
            <span className="font-semibold text-white flex items-center gap-1"><Briefcase className="w-3.5 h-3.5 text-indigo-400" />{job.seniority}</span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-slate-400 block">Ngày đăng tin</span>
            <span className="font-semibold text-slate-300 flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-slate-400" />{job.publishedDate}</span>
          </div>
        </div>

        {/* Job Description */}
        <div className="space-y-4 text-sm text-slate-300 pt-4 border-t border-slate-800">
          <h3 className="text-base font-bold text-white">Mô tả công việc</h3>
          <p className="leading-relaxed text-slate-300">{job.description}</p>

          {job.responsibilities && (
            <div className="space-y-2">
              <h4 className="font-semibold text-white text-xs uppercase tracking-wider text-indigo-400">Trách nhiệm chính</h4>
              <ul className="list-disc pl-5 space-y-1 text-slate-300">
                {job.responsibilities.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Requirements Section */}
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <h3 className="text-base font-bold text-white">Yêu cầu ứng viên</h3>
          
          <div className="space-y-3">
            <div>
              <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider block mb-2">Kỹ năng Bắt buộc (Required Skills)</span>
              <div className="flex flex-wrap gap-2">
                {requiredSkills.map(req => (
                  <span key={req.id} className="px-3 py-1 rounded-lg text-xs font-semibold bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{req.skillName} {req.minExperienceYears ? `(${req.minExperienceYears}+ năm)` : ''}</span>
                  </span>
                ))}
              </div>
            </div>

            {preferredSkills.length > 0 && (
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Kỹ năng Ưu tiên (Preferred Skills - Point Bonus)</span>
                <div className="flex flex-wrap gap-2">
                  {preferredSkills.map(pref => (
                    <span key={pref.id} className="px-3 py-1 rounded-lg text-xs font-medium bg-slate-800 border border-slate-700 text-slate-300">
                      + {pref.skillName}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Benefits Section */}
        {job.benefits && (
          <div className="space-y-3 pt-4 border-t border-slate-800 text-sm">
            <h3 className="text-base font-bold text-white">Quyền lợi & Đãi ngộ</h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {job.benefits.map((b, i) => (
                <li key={i} className="flex items-center gap-2 text-xs text-slate-300 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Apply CTA Bar */}
        <div className="pt-6 border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400">Ứng tuyển ngay để AI Matching Engine đánh giá độ phù hợp với CV của bạn</span>
          <button
            onClick={() => setIsApplyModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/25 transition active:scale-95"
          >
            <Send className="w-4 h-4" />
            <span>Ứng tuyển ngay</span>
          </button>
        </div>
      </div>

      {/* Quick Apply Modal */}
      <QuickApplyModal
        job={job}
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        onApplySubmitted={() => {}}
      />
    </div>
  );
}
