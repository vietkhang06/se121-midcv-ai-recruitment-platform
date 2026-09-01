'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Job, Company } from '@/types';
import { fetchRecruiterJobs, fetchRecruiterProfile } from '@/lib/api';
import { RecruiterNavbar } from '@/components/recruiter/RecruiterNavbar';
import { CompanyVerificationBanner } from '@/components/recruiter/CompanyVerificationBanner';
import { Briefcase, Users, FileText, PlusCircle, ArrowRight, ShieldCheck, Award } from 'lucide-react';

export default function HRDashboardPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [company, setCompany] = useState<Company | null>(null);

  useEffect(() => {
    fetchRecruiterJobs().then(setJobs);
    fetchRecruiterProfile().then(p => setCompany(p.company));
  }, []);

  const publishedJobs = jobs.filter(j => j.status === 'PUBLISHED');
  const draftJobs = jobs.filter(j => j.status === 'DRAFT');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <RecruiterNavbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 w-full">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider">
              <Briefcase className="w-4 h-4" />
              <span>HR Recruiter Management Dashboard</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Tổng Quan Tuyển Dụng Doanh Nghiệp</h1>
            <p className="text-sm text-slate-400">Theo dõi trạng thái các bài tuyển dụng, xếp hạng ứng viên và kết quả đối sánh AI Engine</p>
          </div>

          <Link
            href="/recruiter/jobs/new"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs text-white bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 shadow-md shadow-amber-500/20 transition active:scale-95 flex-shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Tạo Bài Tuyển Dụng Mới</span>
          </Link>
        </div>

        {/* Company Verification Gate Banner */}
        {company && (
          <CompanyVerificationBanner
            status={company.verificationStatus}
            companyName={company.name}
            reason={company.verificationReason}
          />
        )}

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 shadow-lg">
            <span className="text-xs text-slate-400 font-medium block">Tổng bài đăng</span>
            <span className="text-3xl font-extrabold text-white">{jobs.length}</span>
            <span className="text-[11px] text-slate-400 block">Tin tuyển dụng trên hệ thống</span>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 shadow-lg">
            <span className="text-xs text-emerald-400 font-medium block">Đang xuất bản (Published)</span>
            <span className="text-3xl font-extrabold text-emerald-400">{publishedJobs.length}</span>
            <span className="text-[11px] text-slate-400 block">Đang tiếp nhận nộp đơn</span>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 shadow-lg">
            <span className="text-xs text-amber-400 font-medium block">Bài nháp (Draft)</span>
            <span className="text-3xl font-extrabold text-amber-400">{draftJobs.length}</span>
            <span className="text-[11px] text-slate-400 block">Chưa xuất bản hoặc chờ xác minh</span>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 shadow-lg">
            <span className="text-xs text-indigo-400 font-medium block">Tổng số đơn nộp</span>
            <span className="text-3xl font-extrabold text-indigo-300">2 Đơn</span>
            <span className="text-[11px] text-slate-400 block">Đã ghi nhận snapshot an toàn</span>
          </div>
        </div>

        {/* Active Jobs Section with Ranking Links */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white">Bài Tuyển Dụng Mới Nhất</h2>
              <p className="text-xs text-slate-400">Xem danh sách ứng viên nộp đơn và mở màn hình Bảng Xếp Hạng AI Matching</p>
            </div>
            <Link href="/recruiter/jobs" className="text-xs text-amber-400 hover:underline font-semibold flex items-center gap-1">
              <span>Xem tất cả tin</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-4">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="p-5 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-amber-500/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-indigo-950 border border-indigo-500/30 text-indigo-300">
                      {job.industry}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded text-[11px] font-semibold ${
                      job.status === 'PUBLISHED' ? 'bg-emerald-950 border border-emerald-500/40 text-emerald-300' : 'bg-amber-950 border border-amber-500/40 text-amber-300'
                    }`}>
                      {job.status}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white hover:text-cyan-400 transition-colors">
                    <Link href={`/recruiter/jobs/${job.id}`}>{job.title}</Link>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Địa điểm: {job.location} • Lương dự kiến: ${job.salaryMin} - ${job.salaryMax} /tháng
                  </p>
                </div>

                <div className="flex items-center gap-2 border-t sm:border-t-0 border-slate-800 pt-3 sm:pt-0">
                  <Link
                    href={`/recruiter/jobs/${job.id}/applications`}
                    className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                  >
                    Xem Đơn Ứng Tuyển
                  </Link>

                  <Link
                    href={`/recruiter/jobs/${job.id}/ranking`}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 shadow-sm transition active:scale-95 flex items-center gap-1.5"
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>Xem Bảng Xếp Hạng AI</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
