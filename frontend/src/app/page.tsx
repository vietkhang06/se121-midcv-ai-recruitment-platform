'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Job } from '@/types';
import { fetchJobs } from '@/lib/api';
import { JobCard } from '@/components/jobs/JobCard';
import { QuickApplyModal } from '@/components/application/QuickApplyModal';
import { Sparkles, Search, ArrowRight, Code, Megaphone, Palette, Landmark, ShieldCheck, Briefcase } from 'lucide-react';

export default function Home() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [applyJob, setApplyJob] = useState<Job | null>(null);

  useEffect(() => {
    fetchJobs().then(setJobs);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    window.location.href = `/jobs?keyword=${encodeURIComponent(searchKeyword)}`;
  };

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Search Section */}
      <section className="relative pt-12 pb-20 overflow-hidden border-b border-slate-800/60">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-indigo-600/15 via-cyan-500/10 to-transparent blur-3xl -z-10" />
        
        <div className="max-w-5xl mx-auto px-4 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-950/80 border border-indigo-500/30 text-xs font-semibold text-indigo-300">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>AI Matching Engine • Vector Embedding 1536D</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight">
            Tìm Việc Làm Mới Nhất & Đối Sánh Hồ Sơ Bằng <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-400 to-violet-400">Trí Tuệ Nhân Tạo</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto font-normal">
            Khám phá hàng ngàn cơ hội việc làm chất lượng cao đa ngành. Tạo CV chuẩn AI và nộp đơn Quick Apply chỉ trong 1 cú nhấp chuột.
          </p>

          {/* Quick Search Bar */}
          <form onSubmit={handleSearchSubmit} className="max-w-3xl mx-auto pt-4">
            <div className="relative flex items-center bg-slate-900 border border-slate-700/80 rounded-2xl p-2 shadow-2xl shadow-indigo-500/10 hover:border-indigo-500/50 transition">
              <Search className="w-5 h-5 text-slate-400 ml-3 mr-2" />
              <input
                type="text"
                placeholder="Nhập chức danh việc làm, công nghệ (Java, Marketing, Figma, MISA...)..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full bg-transparent border-none text-white text-sm focus:outline-none placeholder-slate-400 py-2"
              />
              <button
                type="submit"
                className="px-6 py-3 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 shadow-md transition active:scale-95 flex-shrink-0 flex items-center gap-1.5"
              >
                <span>Tìm kiếm</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Popular Industries Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Ngành Nghề Nổi Bật</h2>
            <p className="text-xs text-slate-400 mt-1">Lựa chọn ngành nghề để xem danh sách việc làm phù hợp</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Link href="/jobs?industry=Technology" className="group p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900 transition flex flex-col justify-between space-y-4">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm group-hover:text-cyan-400 transition-colors">Technology / IT</h3>
              <p className="text-xs text-slate-400 mt-0.5">Java, Python, React, AI Engine</p>
            </div>
          </Link>

          <Link href="/jobs?industry=Marketing" className="group p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900 transition flex flex-col justify-between space-y-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-950/80 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm group-hover:text-indigo-400 transition-colors">Digital Marketing</h3>
              <p className="text-xs text-slate-400 mt-0.5">Meta Ads, GA4, Performance</p>
            </div>
          </Link>

          <Link href="/jobs?industry=Design" className="group p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-violet-500/50 hover:bg-slate-900 transition flex flex-col justify-between space-y-4">
            <div className="w-10 h-10 rounded-xl bg-violet-950/80 border border-violet-500/30 flex items-center justify-center text-violet-400 group-hover:scale-110 transition-transform">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm group-hover:text-violet-400 transition-colors">UI/UX Product Design</h3>
              <p className="text-xs text-slate-400 mt-0.5">Figma, Design System, UX</p>
            </div>
          </Link>

          <Link href="/jobs?industry=Finance" className="group p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900 transition flex flex-col justify-between space-y-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm group-hover:text-emerald-400 transition-colors">Tài chính - Kế toán</h3>
              <p className="text-xs text-slate-400 mt-0.5">Báo cáo tài chính, MISA, SAP</p>
            </div>
          </Link>
        </div>
      </section>

      {/* Featured Jobs Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Việc Làm Hấp Dẫn Mới Nhất</h2>
            <p className="text-xs text-slate-400 mt-1">Các vị trí tuyển dụng chất lượng cao đã được kiểm duyệt</p>
          </div>
          <Link href="/jobs" className="text-xs font-semibold text-cyan-400 hover:underline flex items-center gap-1">
            <span>Xem tất cả</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} onApplyClick={(j) => setApplyJob(j)} />
          ))}
        </div>
      </section>

      {/* Quick Apply Modal Trigger */}
      <QuickApplyModal
        job={applyJob}
        isOpen={!!applyJob}
        onClose={() => setApplyJob(null)}
        onApplySubmitted={() => {}}
      />
    </div>
  );
}
