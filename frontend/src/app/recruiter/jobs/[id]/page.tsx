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
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <RecruiterNavbar />
        <div className="p-10 text-center text-slate-400">Đang tải chi tiết tin tuyển dụng...</div>
      </div>
    );
  }

  const requiredSkills = job.requirements.filter(r => r.requirementType === 'REQUIRED');
  const preferredSkills = job.requirements.filter(r => r.requirementType === 'PREFERRED');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <RecruiterNavbar />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 w-full">
        <Link href="/recruiter/jobs" className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white mb-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Quay lại Quản lý bài đăng</span>
        </Link>

        {/* Header Summary */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-indigo-950 border border-indigo-500/30 text-indigo-300">
                  {job.industry}
                </span>
                <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-950 border border-emerald-500/40 text-emerald-300">
                  {job.status}
                </span>
              </div>
              <h1 className="text-2xl font-extrabold text-white">{job.title}</h1>
              <p className="text-xs text-slate-400">{job.companyName} • {job.location} • Lương: ${job.salaryMin} - ${job.salaryMax} /tháng</p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Link
                href={`/recruiter/jobs/${job.id}/applications`}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
              >
                Xem Đơn Ứng Tuyển
              </Link>
              <Link
                href={`/recruiter/jobs/${job.id}/ranking`}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 shadow-md transition flex items-center gap-1.5"
              >
                <Award className="w-4 h-4" />
                <span>Xem Bảng Xếp Hạng AI</span>
              </Link>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-3 text-xs text-slate-300">
            <h3 className="text-sm font-bold text-white">Mô tả công việc (JD Description)</h3>
            <p className="leading-relaxed text-slate-300">{job.description}</p>
          </div>

          {/* Required vs Preferred Skills */}
          <div className="space-y-3 pt-4 border-t border-slate-800 text-xs">
            <h3 className="text-sm font-bold text-white">Kỹ năng Bắt buộc vs Ưu tiên</h3>

            <div>
              <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider block mb-1.5">Required Skills</span>
              <div className="flex flex-wrap gap-2">
                {requiredSkills.map(req => (
                  <span key={req.id} className="px-2.5 py-1 rounded-lg bg-cyan-950 border border-cyan-500/30 text-cyan-300 font-semibold">
                    {req.skillName}
                  </span>
                ))}
              </div>
            </div>

            {preferredSkills.length > 0 && (
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Preferred Skills</span>
                <div className="flex flex-wrap gap-2">
                  {preferredSkills.map(pref => (
                    <span key={pref.id} className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-400">
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
