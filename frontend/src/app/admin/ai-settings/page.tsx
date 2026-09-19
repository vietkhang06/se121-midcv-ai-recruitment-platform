'use client';

import React from 'react';
import Link from 'next/link';
import { Cpu, ArrowLeft, ShieldCheck } from 'lucide-react';
import { RecruiterNavbar } from '@/components/recruiter/RecruiterNavbar';
import { AiSettingsPanel } from '@/components/admin/AiSettingsPanel';

export default function AdminAiSettingsPage() {
  return (
    <div className="min-h-screen bg-[#F8FAF9] dark:bg-[#0B1329] text-slate-800 dark:text-slate-100 transition-colors">
      <RecruiterNavbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <Link
            href="/recruiter"
            className="hover:text-slate-900 dark:hover:text-white transition flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại Bảng điều khiển HR</span>
          </Link>
        </div>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-500 text-white shadow-sm">
                <Cpu className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Cấu hình AI & Engine Đối sánh
              </h1>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
              Quản lý mô hình bóc tách tài liệu (LLM) và vector embedding (BGE-M3 1024d) cho quy trình tuyển dụng thông minh.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Chế độ Quản trị & HR</span>
          </div>
        </div>

        {/* AI Settings Form Panel */}
        <AiSettingsPanel />
      </main>
    </div>
  );
}
