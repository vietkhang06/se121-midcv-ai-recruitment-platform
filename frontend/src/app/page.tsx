'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Job } from '@/types';
import { fetchJobs } from '@/lib/api';
import { QuickApplyModal } from '@/components/application/QuickApplyModal';
import { EmptyState } from '@/components/common/EmptyState';
import { useLanguage } from '@/context/LanguageContext';
import {
  Sparkles,
  GitBranch,
  ShieldCheck,
  Search,
  ArrowRight,
  ChevronRight,
  LineChart,
  FileCheck2,
  CheckCircle2,
  Building2,
  MapPin,
  Briefcase
} from 'lucide-react';

export default function HomePage() {
  const { locale, t } = useLanguage();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [applyJob, setApplyJob] = useState<Job | null>(null);
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');

  const loadJobs = () => {
    setIsLoading(true);
    fetchJobs()
      .then((res) => {
        setJobs(res || []);
        setFetchError(null);
      })
      .catch((err) => {
        setFetchError(err.message || 'Không thể tải danh sách việc làm.');
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchKeyword) params.set('keyword', searchKeyword);
    if (selectedLocation && selectedLocation !== 'Toàn quốc') params.set('location', selectedLocation);
    window.location.href = `/jobs?${params.toString()}`;
  };

  return (
    <div className="space-y-0 text-[#173B73] dark:text-[#D6E4E1] bg-[#F8FBFF] dark:bg-[#0B1329] transition-colors">
      
      {/* ============================================================ */}
      {/* 01 — HERO BANNER (Soft Sky Blue / Navy Palette matching Image 3) */}
      {/* ============================================================ */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#EBF5FF] via-[#F1F8FE] to-[#F8FBFF] dark:from-[#0B1528] dark:via-[#0F203D] dark:to-[#0B1329] pt-14 pb-18 px-4 sm:px-6 lg:px-8 border-b border-blue-100/80 dark:border-[#1E2E4A] transition-colors">
        {/* Soft atmospheric radial glows inspired by Image 3 */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -right-16 -top-16 w-96 h-96 bg-blue-300/25 dark:bg-blue-600/10 rounded-full blur-3xl" />
          <div className="absolute -left-16 -bottom-16 w-96 h-96 bg-sky-200/35 dark:bg-cyan-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-blue-100/40 dark:bg-blue-500/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-5xl mx-auto text-center space-y-6 relative z-10">
          
          {/* Main Headline */}
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-[#173B73] dark:text-white drop-shadow-2xs">
            midCV® -{' '}
            <span className="text-[#2563EB] dark:text-[#3B82F6]">
              {locale === 'vi' 
                ? 'Tạo CV, Tìm việc làm, Tuyển dụng hiệu quả' 
                : 'Author CVs, Find Jobs, Hire Effectively'}
            </span>
          </h1>

          {/* Prominent White Pill Search Bar */}
          <form onSubmit={handleSearchSubmit} className="bg-white dark:bg-[#13233F] rounded-full p-2 pl-6 shadow-xl shadow-blue-500/8 flex flex-col md:flex-row items-center gap-3 border border-blue-200/90 dark:border-[#1E3A5F] max-w-4xl mx-auto transition-all hover:border-[#2563EB]/40">
            {/* Input 1: Job title / Company keyword */}
            <div className="flex items-center gap-3 flex-1 w-full text-slate-800 dark:text-slate-100">
              <Search className="w-5 h-5 text-[#2563EB] shrink-0" />
              <input
                type="text"
                placeholder={locale === 'vi' ? 'Vị trí tuyển dụng, tên công ty...' : 'Job title, company name...'}
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full bg-transparent text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-none placeholder-slate-400 py-1"
              />
            </div>

            {/* Divider */}
            <div className="hidden md:block w-px h-8 bg-blue-100 dark:bg-[#1E3A5F]" />

            {/* Input 2: Location selector */}
            <div className="flex items-center gap-2 px-2 w-full md:w-52 text-slate-700 dark:text-slate-200">
              <MapPin className="w-4 h-4 text-[#2563EB] shrink-0" />
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full bg-transparent text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer py-1"
              >
                <option value="" className="text-slate-800 dark:text-slate-100 bg-white dark:bg-[#13233F]">{locale === 'vi' ? 'Địa điểm' : 'Location'}</option>
                <option value="Toàn quốc" className="text-slate-800 dark:text-slate-100 bg-white dark:bg-[#13233F]">{locale === 'vi' ? 'Toàn quốc' : 'All Regions'}</option>
                <option value="Hà Nội" className="text-slate-800 dark:text-slate-100 bg-white dark:bg-[#13233F]">Hà Nội</option>
                <option value="TP. Hồ Chí Minh" className="text-slate-800 dark:text-slate-100 bg-white dark:bg-[#13233F]">TP. Hồ Chí Minh</option>
                <option value="Đà Nẵng" className="text-slate-800 dark:text-slate-100 bg-white dark:bg-[#13233F]">Đà Nẵng</option>
                <option value="Remote" className="text-slate-800 dark:text-slate-100 bg-white dark:bg-[#13233F]">Remote / Từ xa</option>
              </select>
            </div>

            {/* Input 3: Primary Blue Submit Button (#2563EB) */}
            <button
              type="submit"
              className="w-full md:w-auto px-8 py-3 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-600/25 transition flex items-center justify-center gap-2 cursor-pointer shrink-0 active:scale-95 whitespace-nowrap"
            >
              <Search className="w-4 h-4" />
              <span className="whitespace-nowrap">{locale === 'vi' ? 'Tìm kiếm' : 'Search'}</span>
            </button>
          </form>

          {/* Quick trending tags below search bar */}
          <div className="flex items-center justify-center gap-2 flex-wrap text-xs text-slate-600 dark:text-slate-300 pt-1">
            <span className="font-semibold text-[#173B73] dark:text-blue-200">{locale === 'vi' ? 'Gợi ý tìm kiếm:' : 'Popular:'}</span>
            {['Java', 'ReactJS', 'NodeJS', 'Frontend', 'Backend', 'DevOps', 'Data Engineer'].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  setSearchKeyword(tag);
                  window.location.href = `/jobs?keyword=${encodeURIComponent(tag)}`;
                }}
                className="px-3 py-1 rounded-full bg-white hover:bg-blue-50 dark:bg-[#13233F] dark:hover:bg-[#1B3158] text-[#1E40AF] dark:text-blue-200 border border-blue-200/80 dark:border-blue-900/50 shadow-2xs transition cursor-pointer text-[11px] font-medium"
              >
                {tag}
              </button>
            ))}
          </div>

        </div>
      </section>

      {/* ============================================================ */}
      {/* 02 — SPECIALISED MATCHING SECTORS                            */}
      {/* ============================================================ */}
      <section id="indexes" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-[#2563EB] dark:text-[#3B82F6]">
              {locale === 'vi' ? 'ĐA DẠNG LĨNH VỰC' : 'DIVERSE SECTORS'}
            </span>
            <h2 className="text-3xl font-editorial font-bold text-[#173B73] dark:text-[#F1F5F9] mt-1">
              {locale === 'vi' ? 'Các Nhóm Ngành Định Hướng' : 'Focus Industry Sectors'}
            </h2>
          </div>
          <Link href="/jobs" className="text-xs font-semibold text-[#2563EB] dark:text-[#3B82F6] hover:underline flex items-center gap-1">
            <span>{locale === 'vi' ? 'Xem Tất Cả Việc Làm' : 'View All Jobs'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { title: 'Distributed Systems', sector: locale === 'vi' ? 'Công nghệ' : 'Technology', href: '/jobs?sector=Technology' },
            { title: 'Artificial Intelligence', sector: locale === 'vi' ? 'Công nghệ' : 'Technology', href: '/jobs?sector=Technology' },
            { title: 'Cloud & DevOps', sector: locale === 'vi' ? 'Công nghệ' : 'Technology', href: '/jobs?sector=Technology' },
            { title: 'Quantitative Finance', sector: locale === 'vi' ? 'Tài chính' : 'Finance', href: '/jobs?sector=Finance' },
            { title: 'Growth Marketing', sector: locale === 'vi' ? 'Tiếp thị' : 'Marketing', href: '/jobs?sector=Marketing' },
            { title: 'UI/UX Design Systems', sector: locale === 'vi' ? 'Thiết kế' : 'Design', href: '/jobs?sector=Design' },
          ].map((item, idx) => (
            <Link
              key={idx}
              href={item.href}
              className="bg-white dark:bg-[#111C38] p-4 rounded-xl border border-slate-200 dark:border-[#1E293B] hover:border-[#2563EB] dark:hover:border-[#3B82F6] hover:shadow-xs transition text-left"
            >
              <div className="font-semibold text-[#173B73] dark:text-[#F1F5F9] text-xs mb-1">{item.title}</div>
              <div className="text-[10px] text-[#2563EB] dark:text-[#3B82F6] font-mono">{item.sector} {locale === 'vi' ? 'Ngành' : 'Sector'}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* ============================================================ */}
      {/* 03 — DUAL ACTION CARDS                                       */}
      {/* ============================================================ */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-[#111C38] p-8 rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-xs space-y-4">
          <span className="text-[11px] font-mono uppercase text-[#2563EB] dark:text-[#3B82F6] font-bold">
            {locale === 'vi' ? 'DÀNH CHO NHÀ TUYỂN DỤNG' : 'FOR RECRUITERS'}
          </span>
          <h3 className="text-2xl font-editorial font-bold text-[#173B73] dark:text-[#F1F5F9]">
            {locale === 'vi' ? 'Tuyển dụng nhân sự dựa trên năng lực thực chứng' : 'Evidence-Based Technical Hiring'}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {locale === 'vi' 
              ? 'Thiết lập bộ tiêu chí tuyển dụng chuẩn hóa, lọc ứng viên theo bảng xếp hạng AI minh bạch và kết nối nhanh chóng với nhân tài phù hợp nhất.' 
              : 'Establish standardized hiring rubrics, screen candidates via transparent AI ranking, and connect with top talent rapidly.'}
          </p>
          <div className="pt-2">
            <Link
              href="/recruiter"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white transition shadow-sm"
            >
              <span>{locale === 'vi' ? 'Vào Cổng Nhà Tuyển Dụng' : 'Enter Recruiter Portal'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#0F2A52] to-[#1E3A5F] dark:from-[#0F172A] dark:to-[#1E293B] text-white p-8 rounded-2xl border border-[#2563EB]/20 dark:border-[#1E293B] shadow-xs space-y-4">
          <span className="text-[11px] font-mono uppercase text-[#3B82F6] font-bold">
            {locale === 'vi' ? 'DÀNH CHO ỨNG VIÊN' : 'FOR CANDIDATES'}
          </span>
          <h3 className="text-2xl font-editorial font-bold text-white">
            {locale === 'vi' ? 'Xây dựng hồ sơ năng lực xác thực đa ngành' : 'Build Multi-Industry Verifiable Profiles'}
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            {locale === 'vi'
              ? 'Tải lên CV hoặc tạo hồ sơ trực tuyến, liên kết GitHub để nhận điểm số phù hợp khách quan và ứng tuyển vào các doanh nghiệp hàng đầu.'
              : 'Upload your CV or build an online profile, connect GitHub to receive objective match scores, and apply to top companies.'}
          </p>
          <div className="pt-2">
            <Link
              href="/candidate/cvs/builder"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white transition shadow-sm"
            >
              <span>{locale === 'vi' ? 'Tạo CV Chuẩn Hóa' : 'Build Standardized CV'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 04 — ACTIVE JOB OPPORTUNITIES CATALOG                        */}
      {/* ============================================================ */}
      <section className="py-16 bg-white dark:bg-[#0B1329] border-t border-slate-200 dark:border-[#1E293B]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-[#2563EB] dark:text-[#3B82F6]">
                {locale === 'vi' ? 'CƠ HỘI NỔI BẬT' : 'FEATURED OPPORTUNITIES'}
              </span>
              <h2 className="text-3xl font-editorial font-bold text-[#173B73] dark:text-[#F1F5F9] mt-1">
                {locale === 'vi' ? 'Vị Trí Tuyển Dụng Mới Nhất' : 'Latest Job Openings'}
              </h2>
            </div>
            <Link href="/jobs" className="text-xs font-semibold text-[#2563EB] dark:text-[#3B82F6] hover:underline flex items-center gap-1">
              <span>{locale === 'vi' ? `Xem Tất Cả (${jobs.length})` : `View All (${jobs.length})`}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {isLoading ? (
            <EmptyState
              type="LOADING"
              title={locale === 'vi' ? 'Đang tải danh sách việc làm...' : 'Loading job listings...'}
              description={locale === 'vi' ? 'Hệ thống đang đồng bộ cơ sở dữ liệu việc làm...' : 'Synchronizing jobs database...'}
            />
          ) : fetchError ? (
            <EmptyState
              type="ERROR"
              title={locale === 'vi' ? 'Không thể tải danh sách việc làm' : 'Unable to load jobs'}
              description={fetchError}
              primaryCtaText={locale === 'vi' ? 'Thử lại' : 'Retry'}
              onPrimaryCtaClick={loadJobs}
            />
          ) : jobs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jobs.slice(0, 6).map((job) => (
                <div key={job.id} className="bg-[#F8FBFF] dark:bg-[#111C38] p-6 rounded-2xl border border-slate-200 dark:border-[#1E293B] flex flex-col justify-between hover:border-[#2563EB] dark:hover:border-[#3B82F6] hover:shadow-xs transition">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">{job.department || 'Engineering'}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-blue-50 dark:bg-blue-950/50 text-[#2563EB] dark:text-[#3B82F6] border border-blue-200 dark:border-blue-800/40">
                        {job.industry}
                      </span>
                    </div>
                    <h3 className="font-semibold text-[#173B73] dark:text-[#F1F5F9] text-base mb-1 hover:text-[#2563EB] dark:hover:text-[#3B82F6]">
                      <Link href={`/jobs/${job.id}`}>{job.title}</Link>
                    </h3>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
                      <span>{job.companyName}</span>
                      <span>•</span>
                      <span>{job.location}</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mb-4 leading-relaxed">{job.description}</p>
                  </div>
                  <div className="pt-4 border-t border-slate-200 dark:border-[#1E293B] flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold text-[#173B73] dark:text-[#F1F5F9]">
                      {job.salaryMin ? `$${job.salaryMin} - $${job.salaryMax} ${locale === 'vi' ? '/tháng' : '/mo'}` : (job.salaryRange || (locale === 'vi' ? 'Thoả thuận' : 'Negotiable'))}
                    </span>
                    <button
                      onClick={() => setApplyJob(job)}
                      className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white transition cursor-pointer shadow-xs active:scale-95"
                    >
                      {locale === 'vi' ? 'Ứng Tuyển Nhanh' : 'Quick Apply'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              type="EMPTY"
              title={locale === 'vi' ? 'Chưa có vị trí tuyển dụng nào được xuất bản' : 'No job openings published yet'}
              description={locale === 'vi' ? 'Hệ thống hiện chưa có tin tuyển dụng nào từ doanh nghiệp. Bạn có thể là nhà tuyển dụng đầu tiên đăng tin tuyển dụng.' : 'No active requisitions from companies yet. You can be the first recruiter to post a job.'}
              primaryCtaText={locale === 'vi' ? 'Đăng tin tuyển dụng' : 'Post a Job'}
              primaryCtaHref="/recruiter/jobs/new"
              secondaryCtaText={locale === 'vi' ? 'Về cổng nhà tuyển dụng' : 'Recruiter Portal'}
              secondaryCtaHref="/recruiter"
            />
          )}
        </div>
      </section>

      {/* Quick Apply Stepper Modal */}
      {applyJob && (
        <QuickApplyModal
          job={applyJob}
          isOpen={true}
          onClose={() => setApplyJob(null)}
          onSuccess={() => setApplyJob(null)}
        />
      )}

    </div>
  );
}
