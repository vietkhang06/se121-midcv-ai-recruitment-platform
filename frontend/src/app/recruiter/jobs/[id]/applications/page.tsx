'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Job, Application } from '@/types';
import { fetchJobById, MOCK_APPLICATIONS } from '@/lib/api';
import { RecruiterNavbar } from '@/components/recruiter/RecruiterNavbar';
import { Users, ArrowLeft, Eye, Award, FileText, Calendar, CheckCircle2 } from 'lucide-react';

export default function JobApplicationsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [job, setJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState<Application[]>(MOCK_APPLICATIONS);

  useEffect(() => {
    fetchJobById(resolvedParams.id).then(setJob);
  }, [resolvedParams.id]);

  if (!job) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <RecruiterNavbar />
        <div className="p-10 text-center text-slate-400">Đang tải danh sách đơn ứng tuyển...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <RecruiterNavbar />

      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <Link href={`/recruiter/jobs/${job.id}`} className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white mb-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Quay lại bài đăng JD</span>
            </Link>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Danh Sách Đơn Ứng Tuyển</h1>
            <p className="text-sm text-slate-400">Vị trí: <strong className="text-white">{job.title}</strong> ({applications.length} đơn đã tiếp nhận)</p>
          </div>

          <Link
            href={`/recruiter/jobs/${job.id}/ranking`}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 shadow-md transition active:scale-95 flex-shrink-0"
          >
            <Award className="w-4 h-4" />
            <span>Mở Bảng Xếp Hạng AI</span>
          </Link>
        </div>

        {/* Applications List */}
        <div className="space-y-4">
          {applications.map((app) => (
            <div
              key={app.id}
              className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 transition shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-950 border border-emerald-500/40 text-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Đã nộp đơn
                  </span>
                  <span className="text-xs text-slate-400 font-mono">ID: #{app.id}</span>
                </div>

                <h3 className="text-lg font-bold text-white hover:text-cyan-400 transition-colors">
                  <Link href={`/recruiter/applications/${app.id}`}>Nguyen Van Java</Link>
                </h3>

                <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                  <span className="flex items-center gap-1 text-slate-300">
                    <FileText className="w-3.5 h-3.5 text-indigo-400" />
                    CV dùng nộp: <strong>{app.appliedCvTitle} (v{app.appliedCvVersion}.0)</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Ngày nộp: {app.appliedDate}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 border-t sm:border-t-0 border-slate-800 pt-3 sm:pt-0">
                <Link
                  href={`/recruiter/applications/${app.id}`}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition shadow-md"
                >
                  <Eye className="w-4 h-4" />
                  <span>Đánh Giá Chi Tiết & Đối Sánh AI</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
