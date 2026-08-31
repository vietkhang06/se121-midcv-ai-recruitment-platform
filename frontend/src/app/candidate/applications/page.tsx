'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Application } from '@/types';
import { MOCK_APPLICATIONS } from '@/lib/api';
import { Send, Building2, Calendar, FileText, CheckCircle2, Clock, ArrowRight } from 'lucide-react';

export default function ApplicationHistoryPage() {
  const [applications, setApplications] = useState<Application[]>(MOCK_APPLICATIONS);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider">
          <Send className="w-4 h-4" />
          <span>Application History Tracker</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Danh Sách Việc Làm Đã Nộp Đơn</h1>
        <p className="text-sm text-slate-400">Theo dõi trạng thái các đơn ứng tuyển và phiên bản CV snapshot đã gửi cho Nhà tuyển dụng</p>
      </div>

      {/* Applications List */}
      {applications.length > 0 ? (
        <div className="space-y-4">
          {applications.map((app) => (
            <div
              key={app.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-indigo-500/40 transition"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Đã nộp đơn thành công</span>
                  </span>
                  <span className="text-xs text-slate-400 font-mono">ID: #{app.id}</span>
                </div>

                <h3 className="text-lg font-bold text-white hover:text-cyan-400 transition-colors">
                  <Link href={`/jobs/${app.job.id}`}>{app.job.title}</Link>
                </h3>

                <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                  <span className="flex items-center gap-1 font-medium text-slate-300">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    {app.job.companyName}
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-indigo-400" />
                    CV dùng nộp: <strong className="text-slate-200">{app.appliedCvTitle} (v{app.appliedCvVersion}.0)</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Ngày nộp: {app.appliedDate}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 border-t sm:border-t-0 border-slate-800 pt-3 sm:pt-0">
                <Link
                  href={`/jobs/${app.job.id}`}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 transition"
                >
                  <span>Xem vị trí JD</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
          <Clock className="w-12 h-12 mx-auto text-slate-400" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">Bạn chưa nộp đơn cho vị trí nào</h3>
            <p className="text-xs text-slate-400">Khám phá các việc làm mới nhất và thực hiện Quick Apply</p>
          </div>
          <Link
            href="/jobs"
            className="inline-block px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition shadow-md shadow-indigo-500/20"
          >
            Khám phá việc làm ngay
          </Link>
        </div>
      )}
    </div>
  );
}
