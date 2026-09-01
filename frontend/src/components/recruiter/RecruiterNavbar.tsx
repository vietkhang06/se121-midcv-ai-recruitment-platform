'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, LayoutDashboard, Briefcase, PlusCircle, ShieldCheck, UserCheck } from 'lucide-react';
import { MOCK_COMPANY } from '@/lib/api';

export const RecruiterNavbar: React.FC = () => {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path || (path !== '/recruiter' && pathname?.startsWith(path));

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand & Recruiter Portal Indicator */}
        <div className="flex items-center gap-3">
          <Link href="/recruiter" className="flex items-center gap-2 font-extrabold text-lg text-white">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
              <Building2 className="w-4 h-4" />
            </div>
            <span>AI Recruitment <span className="text-amber-400 text-xs font-semibold px-2 py-0.5 rounded bg-amber-950/80 border border-amber-500/30">HR Portal</span></span>
          </Link>
        </div>

        {/* HR Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 text-xs font-semibold">
          <Link
            href="/recruiter"
            className={`px-3 py-2 rounded-xl transition flex items-center gap-1.5 ${
              pathname === '/recruiter' ? 'bg-slate-800 text-amber-400 font-bold' : 'text-slate-300 hover:text-white hover:bg-slate-900'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>HR Dashboard</span>
          </Link>

          <Link
            href="/recruiter/company"
            className={`px-3 py-2 rounded-xl transition flex items-center gap-1.5 ${
              isActive('/recruiter/company') ? 'bg-slate-800 text-amber-400 font-bold' : 'text-slate-300 hover:text-white hover:bg-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Doanh nghiệp ({MOCK_COMPANY.verificationStatus})</span>
          </Link>

          <Link
            href="/recruiter/jobs"
            className={`px-3 py-2 rounded-xl transition flex items-center gap-1.5 ${
              isActive('/recruiter/jobs') ? 'bg-slate-800 text-amber-400 font-bold' : 'text-slate-300 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Quản lý Bài đăng</span>
          </Link>
        </nav>

        {/* Create Job CTA & Profile */}
        <div className="flex items-center gap-3">
          <Link
            href="/recruiter/jobs/new"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 shadow-md shadow-amber-500/20 transition active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Tạo Bài tuyển dụng</span>
          </Link>

          <Link
            href="/"
            className="text-xs text-slate-400 hover:text-slate-200 border-l border-slate-800 pl-3 hidden sm:block"
          >
            Về Cổng Ứng viên
          </Link>
        </div>
      </div>
    </header>
  );
};
