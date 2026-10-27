'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Job } from '@/types';
import { fetchJobs } from '@/lib/api';
import { QuickApplyModal } from '@/components/application/QuickApplyModal';
import { EmptyState } from '@/components/common/EmptyState';
import { useLanguage } from '@/context/LanguageContext';
import { formatSalary } from '@/lib/i18n';
import { Reveal, staggerDelay } from '@/components/motion';
import { Search, ArrowRight, ChevronRight, MapPin } from 'lucide-react';

export default function HomePage() {
  const { locale } = useLanguage();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [applyJob, setApplyJob] = useState<Job | null>(null);
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const result = await fetchJobs();
        if (active) { setJobs(result); setFetchError(null); }
      } catch (error: unknown) {
        if (active) setFetchError(error instanceof Error ? error.message : 'Không thể tải danh sách việc làm.');
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, []);

  const loadJobs = () => {
    setIsLoading(true);
    fetchJobs().then((result) => { setJobs(result); setFetchError(null); })
      .catch((error: unknown) => setFetchError(error instanceof Error ? error.message : 'Không thể tải danh sách việc làm.'))
      .finally(() => setIsLoading(false));
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchKeyword) params.set('keyword', searchKeyword);
    if (selectedLocation && selectedLocation !== 'Toàn quốc') params.set('location', selectedLocation);
    router.push(`/jobs?${params.toString()}`);
  };

  return (
    <div className="space-y-0 text-[var(--heading)] dark:text-[var(--text-secondary)] bg-[var(--surface)] dark:bg-[var(--surface)] transition-colors">
      
      {/* ============================================================ */}
      {/* 01 — HERO BANNER (Soft Sky Blue / Navy Palette matching Image 3) */}
      {/* ============================================================ */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[var(--surface-secondary)] via-[var(--surface-secondary)] to-[var(--surface)] dark:from-[var(--surface)] dark:via-[var(--surface)] dark:to-[var(--surface)] pt-14 pb-18 px-4 sm:px-6 lg:px-8 border-b border-blue-100/80 dark:border-[var(--border)] transition-colors">
        {/* Soft atmospheric radial glows inspired by Image 3 */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -right-16 -top-16 w-96 h-96 bg-blue-300/25 dark:bg-blue-600/10 rounded-xl opacity-0" />
          <div className="absolute -left-16 -bottom-16 w-96 h-96 bg-sky-200/35 dark:bg-cyan-500/10 rounded-xl opacity-0" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-blue-100/40 dark:bg-blue-500/5 rounded-xl opacity-0" />
        </div>

        <div className="max-w-5xl mx-auto text-center space-y-6 relative z-10">
          
          {/* Main Headline with progressive entrance */}
          <Reveal direction="up" delay={0}>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-[var(--heading)] dark:text-white drop-shadow-2xs">
              midCV® -{' '}
              <span className="text-[var(--primary)] dark:text-[var(--retro-sky)]">
                {locale === 'vi' 
                  ? 'Tạo CV, Tìm việc làm, Tuyển dụng hiệu quả' 
                  : 'Author CVs, Find Jobs, Hire Effectively'}
              </span>
            </h1>
          </Reveal>

          {/* Prominent White Pill Search Bar */}
          <Reveal direction="up" delay={80}>
            <form onSubmit={handleSearchSubmit} className="bg-white dark:bg-[var(--surface)] rounded-xl p-2 pl-6 shadow-xl shadow-blue-500/8 flex flex-col md:flex-row items-center gap-3 border border-blue-200/90 dark:border-[var(--border)] max-w-4xl mx-auto transition-[border-color,box-shadow,background-color,color] hover:border-[var(--border)]/40">
              {/* Input 1: Job title / Company keyword */}
              <div className="flex items-center gap-3 flex-1 w-full text-slate-800 dark:text-slate-100">
                <Search className="w-5 h-5 text-[var(--primary)] shrink-0" />
                <input
                  type="text"
                  placeholder={locale === 'vi' ? 'Vị trí tuyển dụng, tên công ty...' : 'Job title, company name...'}
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="w-full bg-transparent text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-none placeholder-slate-400 py-1"
                />
              </div>

              {/* Divider */}
              <div className="hidden md:block w-px h-8 bg-blue-100 dark:bg-[var(--surface)]" />

              {/* Input 2: Location selector */}
              <div className="flex items-center gap-2 px-2 w-full md:w-52 text-slate-700 dark:text-slate-200">
                <MapPin className="w-4 h-4 text-[var(--primary)] shrink-0" />
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full bg-transparent text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer py-1"
                >
                  <option value="" className="text-slate-800 dark:text-slate-100 bg-white dark:bg-[var(--surface)]">{locale === 'vi' ? 'Địa điểm' : 'Location'}</option>
                  <option value="Toàn quốc" className="text-slate-800 dark:text-slate-100 bg-white dark:bg-[var(--surface)]">{locale === 'vi' ? 'Toàn quốc' : 'All Regions'}</option>
                  <option value="Hà Nội" className="text-slate-800 dark:text-slate-100 bg-white dark:bg-[var(--surface)]">Hà Nội</option>
                  <option value="TP. Hồ Chí Minh" className="text-slate-800 dark:text-slate-100 bg-white dark:bg-[var(--surface)]">TP. Hồ Chí Minh</option>
                  <option value="Đà Nẵng" className="text-slate-800 dark:text-slate-100 bg-white dark:bg-[var(--surface)]">Đà Nẵng</option>
                  <option value="Remote" className="text-slate-800 dark:text-slate-100 bg-white dark:bg-[var(--surface)]">Remote / Từ xa</option>
                </select>
              </div>

              {/* Input 3: Primary Blue Submit Button (var(--primary)) */}
              <button
                type="submit"
                className="w-full md:w-auto px-8 py-3 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary)] text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-600/25 transition flex items-center justify-center gap-2 cursor-pointer shrink-0 active:scale-95 whitespace-nowrap"
              >
                <Search className="w-4 h-4" />
                <span className="whitespace-nowrap">{locale === 'vi' ? 'Tìm kiếm' : 'Search'}</span>
              </button>
            </form>
          </Reveal>

          {/* Quick trending tags below search bar */}
          <Reveal direction="up" delay={140}>
            <div className="flex items-center justify-center gap-2 flex-wrap text-xs text-slate-600 dark:text-slate-300 pt-1">
              <span className="font-semibold text-[var(--heading)] dark:text-blue-200">{locale === 'vi' ? 'Gợi ý tìm kiếm:' : 'Popular:'}</span>
              {['Java', 'ReactJS', 'NodeJS', 'Frontend', 'Backend', 'DevOps', 'Data Engineer'].map((tag, idx) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    setSearchKeyword(tag);
                    router.push(`/jobs?keyword=${encodeURIComponent(tag)}`);
                  }}
                  style={{ animationDelay: `${staggerDelay(idx)}ms` }}
                  className="animate-chip-in px-3 py-1 rounded-xl bg-white hover:bg-blue-50 dark:bg-[var(--surface)] dark:hover:bg-[var(--surface)] text-[var(--primary)] dark:text-blue-200 border border-blue-200/80 dark:border-blue-900/50 shadow-2xs transition cursor-pointer text-[11px] font-medium"
                >
                  {tag}
                </button>
              ))}
            </div>
          </Reveal>

          {/* Product principle */}
          <Reveal direction="up" delay={200}>
            <p className="pt-2 text-center text-xs text-slate-600 dark:text-slate-300">
              {locale === 'vi' ? 'Nhà tuyển dụng đưa ra quyết định cuối cùng dựa trên hồ sơ và bằng chứng.' : 'Recruiters make final decisions using candidate profiles and evidence.'}
            </p>
          </Reveal>

        </div>
      </section>

      {/* ============================================================ */}
      {/* 02 — SPECIALISED MATCHING SECTORS                            */}
      {/* ============================================================ */}
      <section id="indexes" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal direction="up" delay={0}>
          <div className="flex items-center justify-between mb-8">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-[var(--primary)] dark:text-[var(--retro-sky)]">
                {locale === 'vi' ? 'ĐA DẠNG LĨNH VỰC' : 'DIVERSE SECTORS'}
              </span>
              <h2 className="text-3xl font-editorial font-bold text-[var(--heading)] dark:text-[var(--retro-cream)] mt-1">
                {locale === 'vi' ? 'Các Nhóm Ngành Định Hướng' : 'Focus Industry Sectors'}
              </h2>
            </div>
            <Link href="/jobs" className="text-xs font-semibold text-[var(--primary)] dark:text-[var(--retro-sky)] hover:underline flex items-center gap-1">
              <span>{locale === 'vi' ? 'Xem Tất Cả Việc Làm' : 'View All Jobs'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Reveal>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { title: 'Distributed Systems', sector: locale === 'vi' ? 'Công nghệ' : 'Technology', href: '/jobs?sector=Technology' },
            { title: 'Artificial Intelligence', sector: locale === 'vi' ? 'Công nghệ' : 'Technology', href: '/jobs?sector=Technology' },
            { title: 'Cloud & DevOps', sector: locale === 'vi' ? 'Công nghệ' : 'Technology', href: '/jobs?sector=Technology' },
            { title: 'Quantitative Finance', sector: locale === 'vi' ? 'Tài chính' : 'Finance', href: '/jobs?sector=Finance' },
            { title: 'Growth Marketing', sector: locale === 'vi' ? 'Tiếp thị' : 'Marketing', href: '/jobs?sector=Marketing' },
            { title: 'UI/UX Design Systems', sector: locale === 'vi' ? 'Thiết kế' : 'Design', href: '/jobs?sector=Design' },
          ].map((item, idx) => (
            <Reveal key={item.title} delay={staggerDelay(idx)} className="h-full">
              <Link
                href={item.href}
                className="motion-hover-lift h-full block bg-white dark:bg-[var(--surface)] p-4 rounded-xl border border-slate-200 dark:border-[var(--border)] hover:border-[var(--border)] dark:hover:border-[var(--border)] hover:shadow-xs text-left"
              >
                <div className="font-semibold text-[var(--heading)] dark:text-[var(--retro-cream)] text-xs mb-1">{item.title}</div>
                <div className="text-[10px] text-[var(--primary)] dark:text-[var(--retro-sky)] font-sans">{item.sector} {locale === 'vi' ? 'Ngành' : 'Sector'}</div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============================================================ */}
      {/* 03 — DUAL ACTION CARDS                                       */}
      {/* ============================================================ */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-8">
        <Reveal direction="up" delay={0} className="h-full">
          <div className="motion-hover-lift h-full bg-white dark:bg-[var(--surface)] p-8 rounded-xl border border-slate-200 dark:border-[var(--border)] shadow-xs space-y-4 hover:border-[var(--border)] dark:hover:border-[var(--border)] transition-colors">
            <span className="text-[11px] font-sans uppercase text-[var(--primary)] dark:text-[var(--retro-sky)] font-bold">
              {locale === 'vi' ? 'DÀNH CHO NHÀ TUYỂN DỤNG' : 'FOR RECRUITERS'}
            </span>
            <h3 className="text-2xl font-editorial font-bold text-[var(--heading)] dark:text-[var(--retro-cream)]">
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
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-[var(--primary)] hover:bg-[var(--primary)] text-white transition shadow-sm active:scale-95"
              >
                <span>{locale === 'vi' ? 'Vào Cổng Nhà Tuyển Dụng' : 'Enter Recruiter Portal'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </Reveal>

        <Reveal direction="up" delay={120} className="h-full">
          <div className="motion-hover-lift h-full bg-gradient-to-br from-[var(--retro-deep)] to-[var(--retro-deep)] dark:from-[var(--surface)] dark:to-[var(--surface)] text-white p-8 rounded-xl border border-[var(--border)]/20 dark:border-[var(--border)] shadow-xs space-y-4 hover:border-[var(--border)] transition-colors">
            <span className="text-[11px] font-sans uppercase text-[var(--primary)] font-bold">
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
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-[var(--primary)] hover:bg-[var(--primary)] text-white transition shadow-sm active:scale-95"
              >
                <span>{locale === 'vi' ? 'Tạo CV Chuẩn Hóa' : 'Build Standardized CV'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ============================================================ */}
      {/* 04 — ACTIVE JOB OPPORTUNITIES CATALOG                        */}
      {/* ============================================================ */}
      <section className="py-16 bg-white dark:bg-[var(--surface)] border-t border-slate-200 dark:border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal direction="up" delay={0}>
          <div className="flex items-center justify-between mb-8">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-[var(--primary)] dark:text-[var(--retro-sky)]">
                {locale === 'vi' ? 'CƠ HỘI NỔI BẬT' : 'FEATURED OPPORTUNITIES'}
              </span>
              <h2 className="text-3xl font-editorial font-bold text-[var(--heading)] dark:text-[var(--retro-cream)] mt-1">
                {locale === 'vi' ? 'Vị Trí Tuyển Dụng Mới Nhất' : 'Latest Job Openings'}
              </h2>
            </div>
            <Link href="/jobs" className="text-xs font-semibold text-[var(--primary)] dark:text-[var(--retro-sky)] hover:underline flex items-center gap-1">
              <span>{locale === 'vi' ? `Xem Tất Cả (${jobs.length})` : `View All (${jobs.length})`}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Reveal>

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
              {jobs.slice(0, 6).map((job, idx) => (
                <Reveal key={job.id} delay={staggerDelay(idx)} className="h-full">
                <div className="motion-hover-lift h-full bg-[var(--surface)] dark:bg-[var(--surface)] p-6 rounded-xl border border-slate-200 dark:border-[var(--border)] flex flex-col justify-between hover:border-[var(--border)] dark:hover:border-[var(--border)] hover:shadow-xs">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-sans uppercase text-slate-500 dark:text-slate-400">{job.department || 'Engineering'}</span>
                      <span className="px-2 py-0.5 rounded-xl text-[10px] font-bold font-sans bg-blue-50 dark:bg-blue-950/50 text-[var(--primary)] dark:text-[var(--retro-sky)] border border-blue-200 dark:border-blue-800/40">
                        {job.industry}
                      </span>
                    </div>
                    <h3 className="font-semibold text-[var(--heading)] dark:text-[var(--retro-cream)] text-base mb-1 hover:text-[var(--primary)] dark:hover:text-[var(--retro-sky)]">
                      <Link href={`/jobs/${job.id}`}>{job.title}</Link>
                    </h3>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
                      <span>{job.companyName}</span>
                      <span>•</span>
                      <span>{job.location}</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mb-4 leading-relaxed">{job.description}</p>
                  </div>
                  <div className="pt-4 border-t border-slate-200 dark:border-[var(--border)] flex items-center justify-between">
                    <span className="text-xs font-sans font-semibold text-[var(--heading)] dark:text-[var(--retro-cream)]">
                      {formatSalary(job.salaryMin, job.salaryMax, job.salaryRange, locale, job.salaryNegotiable, job.salaryCurrency)}
                    </span>
                    <button
                      onClick={() => setApplyJob(job)}
                      className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-[var(--primary)] hover:bg-[var(--primary)] text-white transition cursor-pointer shadow-xs active:scale-95"
                    >
                      {locale === 'vi' ? 'Ứng Tuyển Nhanh' : 'Quick Apply'}
                    </button>
                  </div>
                </div>
                </Reveal>
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
