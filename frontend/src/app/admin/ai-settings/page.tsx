'use client';

import React from 'react';
import Link from 'next/link';
import { Cpu, ArrowLeft, ShieldAlert } from 'lucide-react';
import { AiSettingsPanel } from '@/components/admin/AiSettingsPanel';

export default function AdminAiSettingsPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#060D1E] text-slate-800 dark:text-slate-100 transition-colors">
      <main className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <Link
            href="/admin"
            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại Bảng điều khiển Quản trị</span>
          </Link>
        </div>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-sm">
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

          <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 shrink-0">
            <ShieldAlert className="w-4 h-4 text-rose-500" />
            <span>Khu vực Độc quyền Quản trị viên (Admin Only)</span>
          </div>
        </div>

        {/* AI Settings Form Panel */}
        <AiSettingsPanel />
      </main>
    </div>
  );
}
