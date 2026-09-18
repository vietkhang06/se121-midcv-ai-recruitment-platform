'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Job } from '@/types';
import { fetchJobById } from '@/lib/api';
import { RecruiterNavbar } from '@/components/recruiter/RecruiterNavbar';
import { Building2, MapPin, DollarSign, Briefcase, Calendar, ArrowLeft, Award, Users, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function HRJobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [job, setJob] = useState<Job | null>(null);

  useEffect(() => {
    fetchJobById(resolvedParams.id).then(setJob);
  }, [resolvedParams.id]);

  if (!job) {
    return (
      <div className="min-h-screen bg-[#F8FAF9] dark:bg-[#071410] text-slate-800 dark:text-slate-100 transition-colors">
        <div className="p-10 text-center text-slate-500 dark:text-slate-400">Đang tải chi tiết tin tuyển dụng...</div>
      </div>
    );
  }

  const requiredSkills = job.requirements.filter(r => r.requirementType === 'REQUIRED');
  const preferredSkills = job.requirements.filter(r => r.requirementType === 'PREFERRED');

  return (
    <div className="min-h-screen bg-[#F8FAF9] dark:bg-[#071410] text-slate-800 dark:text-slate-100 flex flex-col transition-colors">
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 w-full">
        <Link href="/recruiter/jobs" className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-1 transition">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Quay lại Quản lý bài đăng</span>
        </Link>

        {/* Header Summary */}
        <div className="bg-white dark:bg-[#0E241E] border border-slate-200 dark:border-[#1B3D34] rounded-2xl p-6 sm:p-8 shadow-xs space-y-6 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-[#1B3D34] pb-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-slate-100 dark:bg-[#14332B] border border-slate-200 dark:border-[#1B3D34] text-slate-700 dark:text-emerald-300 font-mono">
                  {job.industry}
                </span>
                <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300">
                  {job.status}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-editorial font-bold text-slate-900 dark:text-white">{job.title}</h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">{job.companyName} • {job.location} • Lương: ${job.salaryMin} - ${job.salaryMax} /tháng</p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Link
                href={`/recruiter/jobs/${job.id}/applications`}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition"
              >
                Xem Đơn Ứng Tuyển
              </Link>
              <Link
                href={`/recruiter/jobs/${job.id}/ranking`}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#0C2B24] hover:bg-[#133E34] dark:bg-[#10B981] dark:hover:bg-[#059669] dark:text-[#040D0A] shadow-xs transition active:scale-95 flex items-center gap-1.5"
              >
                <Award className="w-4 h-4" />
                <span>Xem Bảng Xếp Hạng AI</span>
              </Link>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
            <h3 className="text-sm font-bold font-editorial text-slate-900 dark:text-white">Mô tả công việc (JD Description)</h3>
            <p className="leading-relaxed text-slate-600 dark:text-slate-300">{job.description}</p>
          </div>

          {/* Required vs Preferred Skills */}
          <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-[#1B3D34] text-xs">
            <h3 className="text-sm font-bold font-editorial text-slate-900 dark:text-white">Kỹ năng Bắt buộc vs Ưu tiên</h3>

            <div>
              <span className="text-[11px] font-bold font-mono text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block mb-1.5">Required Skills</span>
              <div className="flex flex-wrap gap-2">
                {requiredSkills.map(req => (
                  <span key={req.id} className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-mono font-medium">
                    {req.skillName}
                  </span>
                ))}
              </div>
            </div>

            {preferredSkills.length > 0 && (
              <div>
                <span className="text-[11px] font-semibold font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">Preferred Skills</span>
                <div className="flex flex-wrap gap-2">
                  {preferredSkills.map(pref => (
                    <span key={pref.id} className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#071410] border border-slate-200 dark:border-[#1B3D34] text-slate-600 dark:text-slate-400 font-mono">
                      + {pref.skillName}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
