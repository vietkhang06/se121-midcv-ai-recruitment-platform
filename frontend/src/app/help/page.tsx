'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import {
  HelpCircle,
  UserCheck,
  Building2,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Search,
  SlidersHorizontal,
  Send,
  Sparkles,
  GitBranch,
  Lock,
  Globe,
  Sun,
  AlertCircle,
  BookOpen,
  Check,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  BadgeAlert
} from 'lucide-react';

export default function UserGuidePage() {
  const { t, locale } = useLanguage();
  const [activeRole, setActiveRole] = useState<'candidate' | 'recruiter'>('candidate');
  const isVi = locale === 'vi';

  const candidateToc = isVi
    ? [
        { id: 'c-registration', num: '01', title: 'Xác Thực Email & Đăng Ký' },
        { id: 'c-industries', num: '02', title: 'Đa Ngành Nghề Định Hướng' },
        { id: 'c-cv', num: '03', title: 'Tải Lên CV, Builder & Snapshot' },
        { id: 'c-skills', num: '04', title: 'Gợi Ý & Chuẩn Hóa Kỹ Năng' },
        { id: 'c-jobs', num: '05', title: 'Tìm Kiếm Việc Làm & Lọc AI' },
        { id: 'c-apply', num: '06', title: 'Quick Apply & Match Reports' },
        { id: 'c-insufficient', num: '07', title: 'Trạng Thái Chưa Đủ Dữ Liệu' },
        { id: 'c-settings', num: '08', title: 'Đa Ngôn Ngữ & Giao Diện Sáng/Tối' },
      ]
    : [
        { id: 'c-registration', num: '01', title: 'Email Verification & Account Setup' },
        { id: 'c-industries', num: '02', title: 'Multiple Target Industries' },
        { id: 'c-cv', num: '03', title: 'CV Upload, Builder & Snapshot' },
        { id: 'c-skills', num: '04', title: 'Skills Suggestion & Normalization' },
        { id: 'c-jobs', num: '05', title: 'Job Search & AI Filters' },
        { id: 'c-apply', num: '06', title: 'Quick Apply & Match Reports' },
        { id: 'c-insufficient', num: '07', title: 'Insufficient Data Handling' },
        { id: 'c-settings', num: '08', title: 'Multilingual & Dark/Light Mode' },
      ];

  const recruiterToc = isVi
    ? [
        { id: 'r-verification', num: '01', title: 'Xác Minh Doanh Nghiệp' },
        { id: 'r-jdbuilder', num: '02', title: 'JD Builder & Trợ Lý AI' },
        { id: 'r-pipeline', num: '03', title: 'Phễu Ứng Viên & Xếp Hạng' },
        { id: 'r-evidence', num: '04', title: 'Bằng Chứng & Giải Trình Điểm' },
        { id: 'r-github', num: '05', title: 'Tín Hiệu GitHub (Zero Penalty)' },
        { id: 'r-privacy', num: '06', title: 'Bảo Mật & Phân Tích Hiệu Suất' },
      ]
    : [
        { id: 'r-verification', num: '01', title: 'Company Verification' },
        { id: 'r-jdbuilder', num: '02', title: 'JD Builder & AI Assistant' },
        { id: 'r-pipeline', num: '03', title: 'Candidate Pipeline & Ranking' },
        { id: 'r-evidence', num: '04', title: 'Verifiable Evidence & Scoring' },
        { id: 'r-github', num: '05', title: 'GitHub Signal (Zero Penalty)' },
        { id: 'r-privacy', num: '06', title: 'Security & Hiring Analytics' },
      ];

  return (
    <div className="min-h-screen bg-[var(--surface)] dark:bg-[var(--surface)] text-[var(--heading)] dark:text-[var(--text-secondary)] transition-colors pb-20">
      
      {/* ============================================================ */}
      {/* 01. HERO SECTION (White / Soft Cyan / Pastel Blue / Navy)     */}
      {/* ============================================================ */}
      <section className="bg-gradient-to-b from-[var(--surface-secondary)]/60 via-[var(--surface)] to-[var(--surface)] dark:from-[var(--surface)] dark:via-[var(--surface)] dark:to-[var(--surface)] border-b border-[var(--border-soft)] dark:border-[var(--border)] pt-12 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          {/* Left: 60% Content */}
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-[var(--surface-secondary)] dark:bg-[var(--surface)] border border-[var(--border)]/20 dark:border-[var(--border)]/30 text-xs font-semibold text-[var(--primary)] dark:text-[var(--retro-sky)]">
              <BookOpen className="w-3.5 h-3.5" />
              <span className="font-sans tracking-wide uppercase text-[11px]">midCV® DOCUMENTATION & OPERATIONAL MANUAL</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-editorial font-bold text-[var(--heading)] dark:text-[var(--retro-cream)] tracking-tight leading-[1.15]">
              {t('help.title', isVi ? 'Hướng Dẫn Sử Dụng Nền Tảng midCV®' : 'midCV® Platform User Guide')}
            </h1>

            <p className="text-sm sm:text-base text-[var(--text-secondary)] dark:text-[var(--text-secondary)] leading-relaxed max-w-2xl font-normal">
              {t('help.subtitle', isVi ? 'Tài liệu vận hành chi tiết và giải thích cơ chế đối sánh minh bạch, trích xuất thực thể AI và chính sách bảo vệ dữ liệu cho Ứng viên & Nhà tuyển dụng.' : 'Complete operational instructions and algorithmic transparency for Candidates and Recruiters.')}
            </p>

            {/* Quick Metrics Badge Chips */}
            <div className="pt-2 flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white dark:bg-[var(--surface)] border border-[var(--border-soft)] dark:border-[var(--border)] shadow-2xs text-[var(--heading)] dark:text-[var(--retro-cream)] font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-[var(--success)]" />
                {isVi ? 'Giải thích các tính năng hiện có' : 'How current features work'}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white dark:bg-[var(--surface)] border border-[var(--border-soft)] dark:border-[var(--border)] shadow-2xs text-[var(--heading)] dark:text-[var(--retro-cream)] font-medium">
                <Sparkles className="w-3.5 h-3.5 text-[var(--primary)]" />
                {isVi ? 'Đối sánh có giải thích' : 'Explainable matching'}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[var(--surface-secondary)] dark:bg-[var(--warning)]/15 border border-[var(--border)]/40 text-[var(--warning)] dark:text-[var(--warning)] font-medium">
                <AlertCircle className="w-3.5 h-3.5 text-[var(--warning)]" />
                {isVi ? 'Chính Sách Không Phạt GitHub' : 'No GitHub Penalty Policy'}
              </span>
            </div>
          </div>

          {/* Right: 40% Supporting Visual */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-md bg-white dark:bg-[var(--surface)] border border-[var(--border-soft)] dark:border-[var(--border)] rounded-xl p-6 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-[var(--border-soft)] dark:border-[var(--border)] pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-xl bg-rose-400"></div>
                  <div className="w-3 h-3 rounded-xl bg-amber-400"></div>
                  <div className="w-3 h-3 rounded-xl bg-emerald-400"></div>
                  <span className="ml-2 font-sans text-[11px] text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">docs.midcv.io/spec</span>
                </div>
                <span className="text-[10px] font-sans font-bold text-[var(--primary)] dark:text-[var(--retro-sky)] bg-[var(--surface-secondary)] dark:bg-[var(--primary)]/15 px-2 py-0.5 rounded">
                  v2.4 STABLE
                </span>
              </div>

              {/* Visual Match Architecture */}
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-[var(--surface)] dark:bg-[var(--surface)] border border-[var(--border-soft)] dark:border-[var(--border)] space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-[var(--heading)] dark:text-[var(--retro-cream)]">
                    <span>01. Vector Similarity Engine</span>
                    <span className="text-[var(--primary)] dark:text-[var(--retro-sky)] font-sans font-bold">85% Core</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
                    {isVi
                      ? 'Đối sánh kỹ năng cốt lõi, kinh nghiệm thực tế và học vấn từ CV với JD.'
                      : 'Semantic alignment of core skills, verified experience, and background from CV to JD.'}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[var(--surface-secondary)]/50 dark:bg-[var(--warning)]/10 border border-[var(--border)]/30 space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-[var(--warning)] dark:text-[var(--warning)]">
                    <span>02. GitHub Signals ({isVi ? 'Bổ trợ' : 'Supplementary'})</span>
                    <span className="font-sans font-bold">15% Max</span>
                  </div>
                  <p className="text-[11px] text-[var(--heading)] dark:text-[var(--text-secondary)]/80">
                    {isVi
                      ? 'Bổ trợ năng lực thực chiến qua repo commit. Không có GitHub = 100% Core Score.'
                      : 'Practical engineering boost via verified commit history. No GitHub = 100% Core Score.'}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[var(--surface-secondary)] dark:bg-[var(--primary)]/15 border border-[var(--border)]/30 space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-[var(--heading)] dark:text-[var(--retro-sky)]">
                    <span>03. Immutable Snapshots</span>
                    <span className="font-sans font-bold">SHA-256</span>
                  </div>
                  <p className="text-[11px] text-[var(--heading)]/80 dark:text-[var(--text-secondary)]/80">
                    {isVi
                      ? 'Bản lưu CV tại thời điểm nộp đơn được cố định bảo vệ tính toàn vẹn.'
                      : 'CV copy frozen immutably upon application submission to preserve integrity.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ============================================================ */}
      {/* 02. AUDIENCE TABS & MAIN DOCUMENTATION LAYOUT               */}
      {/* ============================================================ */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 space-y-8">
        
        {/* Role Switcher Tabs */}
        <div className="flex items-center gap-2 bg-white dark:bg-[var(--surface)] p-1.5 rounded-xl w-fit border border-[var(--border-soft)] dark:border-[var(--border)] shadow-2xs">
          <button
            onClick={() => setActiveRole('candidate')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeRole === 'candidate'
                ? 'bg-[var(--primary)] text-white shadow-sm'
                : 'text-[var(--text-secondary)] dark:text-[var(--text-secondary)] hover:text-[var(--heading)] dark:hover:text-white'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>{t('help.candidateTab', isVi ? 'Dành Cho Ứng Viên' : 'Candidate Guide')}</span>
          </button>

          <button
            onClick={() => setActiveRole('recruiter')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeRole === 'recruiter'
                ? 'bg-[var(--primary)] text-white shadow-sm'
                : 'text-[var(--text-secondary)] dark:text-[var(--text-secondary)] hover:text-[var(--heading)] dark:hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>{t('help.recruiterTab', isVi ? 'Dành Cho Nhà Tuyển Dụng' : 'Recruiter Guide')}</span>
          </button>
        </div>

        {/* ============================================================ */}
        {/* CANDIDATE USER GUIDE                                         */}
        {/* ============================================================ */}
        {activeRole === 'candidate' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            
            {/* Table of Contents Sticky Sidebar */}
            <aside className="lg:col-span-1 space-y-2 sticky top-24 self-start bg-white dark:bg-[var(--surface)] p-5 rounded-xl border border-[var(--border-soft)] dark:border-[var(--border)] shadow-xs">
              <span className="text-[11px] font-sans uppercase tracking-wider font-bold text-[var(--text-secondary)] dark:text-[var(--text-secondary)] block mb-3">
                {isVi ? 'MỤC LỤC ỨNG VIÊN' : 'CANDIDATE TABLE OF CONTENTS'}
              </span>
              <nav className="space-y-1.5 text-xs font-medium">
                {candidateToc.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-[var(--heading)] dark:text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] dark:hover:bg-[var(--surface)] hover:text-[var(--primary)] dark:hover:text-[var(--retro-sky)] transition"
                  >
                    <span className="font-sans text-[10px] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-bold">{item.num}</span>
                    <span className="truncate">{item.title}</span>
                  </a>
                ))}
              </nav>
            </aside>

            {/* Main Content */}
            <main className="lg:col-span-3 space-y-8">
              
              {/* Section 1 */}
              <section id="c-registration" className="bg-white dark:bg-[var(--surface)] p-6 sm:p-8 rounded-xl border border-[var(--border-soft)] dark:border-[var(--border)] shadow-xs space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-[var(--surface-secondary)] dark:bg-[var(--surface)] text-[var(--primary)] dark:text-[var(--retro-sky)] text-xs font-bold flex items-center justify-center font-sans">
                    01
                  </span>
                  <h2 className="text-xl sm:text-2xl font-editorial font-bold text-[var(--heading)] dark:text-[var(--retro-cream)]">
                    {isVi ? 'Xác Thực Email & Khởi Tạo Tài Khoản' : 'Email Verification & Account Initialization'}
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-[var(--heading)] dark:text-[var(--text-secondary)] leading-relaxed">
                  {isVi
                    ? 'Để đảm bảo tính xác thực và ngăn chặn gian lận hồ sơ ứng tuyển, mọi tài khoản đăng ký trên midCV® phải trải qua quy trình xác thực email thực tế:'
                    : 'To ensure profile integrity and prevent fraudulent job submissions, all candidate accounts on midCV® undergo genuine email verification:'}
                </p>
                <ul className="text-xs sm:text-sm space-y-2 text-[var(--text-secondary)] dark:text-[var(--text-secondary)] list-disc pl-5">
                  <li>
                    <strong>{isVi ? 'Đăng ký (Registration):' : 'Registration:'}</strong>{' '}
                    {isVi
                      ? 'Nhập Họ tên, Email hợp lệ, Mật khẩu có đánh giá độ an toàn (Password Strength Meter) và chọn các Ngành nghề định hướng mục tiêu.'
                      : 'Provide Full Name, valid Email, password validated by the Password Strength Meter, and select target career industries.'}
                  </li>
                  <li>
                    <strong>{isVi ? 'Khóa đăng nhập trước xác thực:' : 'Gated sign-in before verification:'}</strong>{' '}
                    {isVi
                      ? 'Người dùng chưa xác thực email sẽ bị từ chối đăng nhập (HTTP 403 Forbidden) cho tới khi hoàn tất mở liên kết xác thực gửi qua hộp thư.'
                      : 'Unverified accounts are prevented from logging in (HTTP 403 Forbidden) until opening the secure email verification link.'}
                  </li>
                  <li>
                    <strong>{isVi ? 'Liên kết xác thực:' : 'Verification link:'}</strong>{' '}
                    {isVi
                      ? 'Hệ thống gửi một token bảo mật có hạn sử dụng 24 giờ. Khi mở liên kết, hệ thống chuyển sang trang'
                      : 'A secure token valid for 24 hours is dispatched. Visiting the link activates the profile on'}{' '}
                    <code className="bg-[var(--surface-secondary)] dark:bg-[var(--surface)] text-[var(--primary)] dark:text-[var(--retro-sky)] font-sans px-2 py-0.5 rounded">/verify-email</code>{' '}
                    {isVi ? 'với giao diện midCV® hiển thị trạng thái thành công.' : 'displaying verification confirmation.'}
                  </li>
                </ul>

                <div className="p-3.5 rounded-xl bg-[var(--surface-secondary)] dark:bg-[var(--surface)] border border-[var(--border-soft)] dark:border-[var(--border)] flex items-center justify-between text-xs">
                  <span className="text-[var(--primary)] dark:text-[var(--retro-sky)] font-medium">
                    {isVi ? 'Bạn có thể dùng trang xác thực trực tiếp tại:' : 'Direct verification endpoint available at:'}
                  </span>
                  <Link href="/verify-email" className="font-semibold text-[var(--primary)] dark:text-[var(--retro-sky)] hover:underline flex items-center gap-1">
                    <span>{isVi ? 'Mở /verify-email' : 'Open /verify-email'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </section>

              {/* Section 2 */}
              <section id="c-industries" className="bg-white dark:bg-[var(--surface)] p-6 sm:p-8 rounded-xl border border-[var(--border-soft)] dark:border-[var(--border)] shadow-xs space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-[var(--surface-secondary)] dark:bg-[var(--surface)] text-[var(--primary)] dark:text-[var(--retro-sky)] text-xs font-bold flex items-center justify-center font-sans">
                    02
                  </span>
                  <h2 className="text-xl sm:text-2xl font-editorial font-bold text-[var(--heading)] dark:text-[var(--retro-cream)]">
                    {isVi ? 'Đa Ngành Nghề Định Hướng (Multiple Target Industries)' : 'Multiple Target Industries'}
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-[var(--heading)] dark:text-[var(--text-secondary)] leading-relaxed">
                  {isVi
                    ? 'Ứng viên không bị giới hạn trong một ngành nghề duy nhất. Tại trang Đăng ký và trang Hồ sơ cá nhân (/candidate/profile), ứng viên có thể chọn nhiều ngành mục tiêu cùng lúc:'
                    : 'Candidates are not constrained to a single field. In Registration and Profile settings (/candidate/profile), candidates can configure multiple target sectors:'}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                  {[
                    isVi ? 'Technology (Công nghệ)' : 'Technology',
                    isVi ? 'Marketing & Truyền thông' : 'Marketing & Communications',
                    isVi ? 'Finance (Tài chính)' : 'Finance & Accounting',
                    isVi ? 'Human Resources (Nhân sự)' : 'Human Resources',
                    isVi ? 'Design (Thiết kế)' : 'Product & UI/UX Design',
                    isVi ? 'Other (Khác)' : 'Other Sectors',
                  ].map((ind) => (
                    <div key={ind} className="p-3 rounded-xl bg-[var(--surface)] dark:bg-[var(--surface)] border border-[var(--border-soft)] dark:border-[var(--border)] flex items-center gap-2 text-[var(--heading)] dark:text-[var(--retro-cream)] font-medium">
                      <Check className="w-3.5 h-3.5 text-[var(--success)]" />
                      <span>{ind}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-secondary)] leading-relaxed">
                  {isVi
                    ? 'Dữ liệu này được lưu trữ theo cấu trúc quan hệ chuẩn hóa trong cơ sở dữ liệu và được sử dụng để lọc tự động các cơ hội việc làm liên quan ngay trên thanh tìm kiếm.'
                    : 'This configuration is stored as relational records in the database and utilized to auto-filter relevant opportunities across search filters.'}
                </p>
              </section>

              {/* Section 3 */}
              <section id="c-cv" className="bg-white dark:bg-[var(--surface)] p-6 sm:p-8 rounded-xl border border-[var(--border-soft)] dark:border-[var(--border)] shadow-xs space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-[var(--surface-secondary)] dark:bg-[var(--surface)] text-[var(--primary)] dark:text-[var(--retro-sky)] text-xs font-bold flex items-center justify-center font-sans">
                    03
                  </span>
                  <h2 className="text-xl sm:text-2xl font-editorial font-bold text-[var(--heading)] dark:text-[var(--retro-cream)]">
                    {isVi ? 'Tải Lên CV, Trình Soạn Thảo & Bản Lưu Bất Biến (Immutable Snapshot)' : 'CV Upload, Builder & Immutable Snapshots'}
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-[var(--heading)] dark:text-[var(--text-secondary)] leading-relaxed">
                  {isVi ? 'midCV® hỗ trợ hai luồng xây dựng hồ sơ ứng tuyển hoàn chỉnh:' : 'midCV® provides dual workflows for profile composition:'}
                </p>
                <ul className="text-xs sm:text-sm space-y-2.5 text-[var(--text-secondary)] dark:text-[var(--text-secondary)] list-disc pl-5">
                  <li>
                    <strong>{isVi ? 'Upload & Analyze CV:' : 'Upload & Analyze CV:'}</strong>{' '}
                    {isVi
                      ? 'Tải lên tệp PDF hoặc DOCX (tối đa 10MB). AI Worker sẽ phân tích văn bản, trích xuất thực thể (Kỹ năng, Kinh nghiệm, Học vấn) và cho phép bạn duyệt/chỉnh sửa trước khi lưu.'
                      : 'Upload PDF or DOCX documents (up to 10MB). The AI Worker extracts entities (Skills, Experience, Education) with an interactive confirmation gate.'}
                  </li>
                  <li>
                    <strong>{isVi ? 'CV Builder tương tác:' : 'Interactive CV Builder:'}</strong>{' '}
                    {isVi
                      ? 'Tự soạn thảo CV theo mẫu thiết kế chuẩn hóa tại /candidate/cvs/builder, gợi ý cấu trúc bởi AI và quản lý nhiều phiên bản (Versions).'
                      : 'Craft standardized CVs at /candidate/cvs/builder, receive AI structure hints, and manage semantic multi-versions.'}
                  </li>
                  <li>
                    <strong>{isVi ? 'Immutable Application Snapshot:' : 'Immutable Application Snapshot:'}</strong>{' '}
                    {isVi
                      ? 'Khi nộp đơn cho bất kỳ vị trí nào, phiên bản CV tại thời điểm đó được cố định bất biến (Immutable Snapshot). Việc chỉnh sửa CV sau này không làm sai lệch bản đã gửi cho Nhà tuyển dụng.'
                      : 'Upon application submission, the current CV snapshot is permanently frozen via SHA-256 verification so future edits never alter recruiter records.'}
                  </li>
                </ul>
              </section>

              {/* Section 4 */}
              <section id="c-skills" className="bg-white dark:bg-[var(--surface)] p-6 sm:p-8 rounded-xl border border-[var(--border-soft)] dark:border-[var(--border)] shadow-xs space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-[var(--surface-secondary)] dark:bg-[var(--surface)] text-[var(--primary)] dark:text-[var(--retro-sky)] text-xs font-bold flex items-center justify-center font-sans">
                    04
                  </span>
                  <h2 className="text-xl sm:text-2xl font-editorial font-bold text-[var(--heading)] dark:text-[var(--retro-cream)]">
                    {isVi ? 'Gợi Ý & Chuẩn Hóa Kỹ Năng Kỹ Thuật (Skills Normalization)' : 'Skills Suggestion & Tech Normalization'}
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-[var(--heading)] dark:text-[var(--text-secondary)] leading-relaxed">
                  {isVi
                    ? 'Khi gõ kỹ năng vào hệ thống, thành phần Autocomplete sẽ đề xuất các kỹ năng chuẩn hóa từ từ điển công nghệ trung tâm của midCV®, loại bỏ sai lệch từ viết tắt hay biến thể:'
                    : 'While typing skills, the Autocomplete component provides canonical suggestions from midCV® central tech taxonomy, eliminating abbreviation ambiguities:'}
                </p>
                <div className="p-4 rounded-xl bg-[var(--surface)] dark:bg-[var(--surface)] border border-[var(--border-soft)] dark:border-[var(--border)] text-xs space-y-2">
                  <span className="font-semibold block text-[var(--heading)] dark:text-[var(--retro-cream)]">
                    {isVi ? 'Tự động chuẩn hóa từ đồng nghĩa (Synonym Normalization Engine):' : 'Synonym Normalization Engine:'}
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 font-sans text-[11px] pt-1 text-[var(--primary)] dark:text-[var(--retro-sky)]">
                    <span>JS → JavaScript</span>
                    <span>TS → TypeScript</span>
                    <span>Postgres → PostgreSQL</span>
                    <span>K8s → Kubernetes</span>
                    <span>React.js → React</span>
                    <span>Golang → Go</span>
                  </div>
                </div>
              </section>

              {/* Section 5 */}
              <section id="c-jobs" className="bg-white dark:bg-[var(--surface)] p-6 sm:p-8 rounded-xl border border-[var(--border-soft)] dark:border-[var(--border)] shadow-xs space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-[var(--surface-secondary)] dark:bg-[var(--surface)] text-[var(--primary)] dark:text-[var(--retro-sky)] text-xs font-bold flex items-center justify-center font-sans">
                    05
                  </span>
                  <h2 className="text-xl sm:text-2xl font-editorial font-bold text-[var(--heading)] dark:text-[var(--retro-cream)]">
                    {isVi ? 'Tìm Kiếm Việc Làm & Tinh Chỉnh Đối Sánh (Refine Matches)' : 'Job Discovery & Refine Matches'}
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-[var(--heading)] dark:text-[var(--text-secondary)] leading-relaxed">
                  {isVi
                    ? 'Trang danh sách việc làm (/jobs) tích hợp bộ lọc trực tiếp dữ liệu theo thời gian thực:'
                    : 'The job search board (/jobs) provides real-time client-side and dynamic faceted filtering:'}
                </p>
                <ul className="text-xs sm:text-sm space-y-1.5 text-[var(--text-secondary)] dark:text-[var(--text-secondary)] list-disc pl-5">
                  <li>{isVi ? 'Lọc theo từ khóa vị trí, công ty hoặc kỹ năng cần tìm.' : 'Search by role keyword, company, or technical competencies.'}</li>
                  <li>{isVi ? 'Lọc theo Địa điểm (Hồ Chí Minh, Hà Nội, Đà Nẵng, Remote).' : 'Filter by Location (Ho Chi Minh City, Ha Noi, Da Nang, Remote).'}</li>
                  <li>{isVi ? 'Lọc theo Ngành nghề và cấp bậc (Senior, Lead, Manager, Junior).' : 'Filter by Industry sector and Seniority level (Junior, Mid, Senior, Lead).'}</li>
                  <li>{isVi ? 'Lọc theo Hình thức làm việc (Full-time, Contract, Remote, Hybrid).' : 'Filter by Employment Mode (Full-time, Contract, Remote, Hybrid).'}</li>
                  <li>{isVi ? 'Nút đặt lại bộ lọc tức thì (Reset Filters).' : 'Instant filter reset button.'}</li>
                </ul>
              </section>

              {/* Section 6 */}
              <section id="c-apply" className="bg-white dark:bg-[var(--surface)] p-6 sm:p-8 rounded-xl border border-[var(--border-soft)] dark:border-[var(--border)] shadow-xs space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-[var(--surface-secondary)] dark:bg-[var(--surface)] text-[var(--primary)] dark:text-[var(--retro-sky)] text-xs font-bold flex items-center justify-center font-sans">
                    06
                  </span>
                  <h2 className="text-xl sm:text-2xl font-editorial font-bold text-[var(--heading)] dark:text-[var(--retro-cream)]">
                    {isVi ? 'Quy Trình Quick Apply 5 Bước & Báo Cáo Phù Hợp' : '5-Step Quick Apply Workflow & Match Reports'}
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-[var(--heading)] dark:text-[var(--text-secondary)] leading-relaxed">
                  {isVi
                    ? 'Quy trình nộp đơn 5 bước minh bạch cho phép ứng viên kiểm tra điểm đối sánh, lựa chọn phiên bản CV phù hợp nhất và xem trước giải trình trước khi bấm gửi:'
                    : 'The transparent 5-step workflow enables candidates to review match scores, select their best CV version, and inspect audit rubrics before sending:'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
                  {[
                    { step: '01', title: isVi ? 'Xác thực hồ sơ' : 'Profile Check' },
                    { step: '02', title: isVi ? 'Chọn bản CV' : 'Select CV' },
                    { step: '03', title: isVi ? 'Câu hỏi sàng lọc' : 'Screening Qs' },
                    { step: '04', title: isVi ? 'Xem trước điểm số' : 'Preview Match' },
                    { step: '05', title: isVi ? 'Xác nhận nộp đơn' : 'Confirm Apply' },
                  ].map((s) => (
                    <div key={s.step} className="p-3 rounded-xl bg-[var(--surface)] dark:bg-[var(--surface)] border border-[var(--border-soft)] dark:border-[var(--border)] text-center space-y-1">
                      <span className="font-sans font-bold text-[var(--primary)] dark:text-[var(--retro-sky)] text-xs">{s.step}</span>
                      <p className="font-semibold text-[var(--heading)] dark:text-[var(--retro-cream)]">{s.title}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
                  {isVi
                    ? 'Toàn bộ lịch sử và báo cáo đối sánh được lưu trữ vĩnh viễn tại mục Báo Cáo Phù Hợp (/candidate/applications).'
                    : 'Full application history and explainable match breakdowns are permanently accessible under Applications (/candidate/applications).'}
                </p>
              </section>

              {/* Section 7 */}
              <section id="c-insufficient" className="bg-white dark:bg-[var(--surface)] p-6 sm:p-8 rounded-xl border border-[var(--border-soft)] dark:border-[var(--border)] shadow-xs space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-[var(--surface-secondary)] dark:bg-[var(--warning)]/20 text-[var(--warning)] dark:text-[var(--warning)] text-xs font-bold flex items-center justify-center font-sans">
                    07
                  </span>
                  <h2 className="text-xl sm:text-2xl font-editorial font-bold text-[var(--heading)] dark:text-[var(--retro-cream)]">
                    {isVi ? 'Trạng Thái Khi Chưa Đủ Dữ Liệu (Insufficient Data Handling)' : 'Insufficient Data Handling'}
                  </h2>
                </div>
                
                {/* Yellow Highlight Alert Box */}
                <div className="p-4 rounded-xl bg-[var(--surface-secondary)] dark:bg-[var(--warning)]/10 border border-[var(--border)]/50 text-xs text-[var(--warning)] dark:text-[var(--warning)] space-y-1.5">
                  <span className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-[var(--warning)]" />
                    {isVi ? 'Chính sách minh bạch thuật toán midCV®:' : 'midCV® Algorithmic Transparency Policy:'}
                  </span>
                  <p className="leading-relaxed">
                    {isVi
                      ? 'Một ứng viên mới đăng ký chưa có CV hoặc chưa có thông tin kinh nghiệm/kỹ năng sẽ KHÔNG BAO GIỜ bị gán một con số ảo (như 96%, 85% hay 80%).'
                      : 'A newly registered candidate without a CV or detailed experience will NEVER be assigned an arbitrary pseudo-score (like 96%, 85%, or 80%).'}
                  </p>
                </div>

                <p className="text-xs sm:text-sm text-[var(--heading)] dark:text-[var(--text-secondary)] leading-relaxed">
                  {isVi ? 'Hệ thống sẽ hiển thị trạng thái chuẩn hóa:' : 'The platform renders the canonical uncalculated state:'}
                </p>
                <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--surface)] dark:bg-[var(--surface)] border border-[var(--border-soft)] dark:border-[var(--border)] text-xs font-semibold text-[var(--heading)] dark:text-[var(--text-secondary)]">
                  <span>{isVi ? 'Chưa thể tính mức độ phù hợp' : 'Match unavailable'}</span>
                  <span className="text-[10px] text-[var(--text-secondary)] font-sans bg-[var(--surface-secondary)] dark:bg-[var(--surface)] px-1.5 py-0.5 rounded">(INSUFFICIENT_DATA)</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-secondary)] leading-relaxed">
                  {isVi ? (
                    <>Kèm theo hướng dẫn: <em>&quot;Bạn hãy thêm CV hoặc bổ sung thông tin kinh nghiệm, kỹ năng và thế mạnh để AI có đủ dữ liệu tính toán.&quot;</em></>
                  ) : (
                    <>With guidance: <em>&quot;Add a CV or complete your experience and skills so the AI has verified data to calculate a match.&quot;</em></>
                  )}
                </p>
              </section>

              {/* Section 8 */}
              <section id="c-settings" className="bg-white dark:bg-[var(--surface)] p-6 sm:p-8 rounded-xl border border-[var(--border-soft)] dark:border-[var(--border)] shadow-xs space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-[var(--surface-secondary)] dark:bg-[var(--surface)] text-[var(--primary)] dark:text-[var(--retro-sky)] text-xs font-bold flex items-center justify-center font-sans">
                    08
                  </span>
                  <h2 className="text-xl sm:text-2xl font-editorial font-bold text-[var(--heading)] dark:text-[var(--retro-cream)]">
                    {isVi ? 'Đa Ngôn Ngữ & Chế Độ Giao Diện Sáng / Tối' : 'Multilingual Localization & Light/Dark Theme'}
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-[var(--heading)] dark:text-[var(--text-secondary)] leading-relaxed">
                  {isVi ? 'midCV® hỗ trợ tùy chỉnh trải nghiệm tức thì trên thanh điều hướng (Navbar):' : 'midCV® supports immediate customization controls on the main Navbar:'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-[var(--surface)] dark:bg-[var(--surface)] border border-[var(--border-soft)] dark:border-[var(--border)] space-y-1.5">
                    <span className="font-semibold text-[var(--heading)] dark:text-[var(--retro-cream)] flex items-center gap-1.5">
                      <Globe className="w-4 h-4 text-[var(--primary)] dark:text-[var(--retro-sky)]" />
                      {isVi ? 'Chuyển đổi Tiếng Việt / English' : 'Switch Vietnamese / English'}
                    </span>
                    <p className="text-[var(--text-secondary)] dark:text-[var(--text-secondary)] leading-relaxed">
                      {isVi
                        ? 'Bấm vào nút VI / EN trên Navbar để chuyển đổi toàn bộ nhãn hệ thống, bảng điều khiển và thông báo. Lựa chọn được lưu trữ bền vững trong LocalStorage.'
                        : 'Toggle VI / EN button on the Navbar to switch system labels, dashboards, and notices. Preference is persisted in LocalStorage.'}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[var(--surface)] dark:bg-[var(--surface)] border border-[var(--border-soft)] dark:border-[var(--border)] space-y-1.5">
                    <span className="font-semibold text-[var(--heading)] dark:text-[var(--retro-cream)] flex items-center gap-1.5">
                      <Sun className="w-4 h-4 text-[var(--warning)]" />
                      {isVi ? 'Chế độ Sáng / Tối (Light / Dark)' : 'Light / Dark Theme'}
                    </span>
                    <p className="text-[var(--text-secondary)] dark:text-[var(--text-secondary)] leading-relaxed">
                      {isVi
                        ? 'Bấm biểu tượng Mặt trời / Mặt trăng để chuyển giữa giao diện nền tối sang trọng và nền sáng thanh lịch, đạt chuẩn tương phản và không gây lóa mắt.'
                        : 'Toggle Sun / Moon icon to switch between modern dark mode and crisp light mode, meeting accessibility contrast standards.'}
                    </p>
                  </div>
                </div>
              </section>

            </main>
          </div>
        )}

        {/* ============================================================ */}
        {/* RECRUITER USER GUIDE                                         */}
        {/* ============================================================ */}
        {activeRole === 'recruiter' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            
            {/* Table of Contents Sticky Sidebar */}
            <aside className="lg:col-span-1 space-y-2 sticky top-24 self-start bg-white dark:bg-[var(--surface)] p-5 rounded-xl border border-[var(--border-soft)] dark:border-[var(--border)] shadow-xs">
              <span className="text-[11px] font-sans uppercase tracking-wider font-bold text-[var(--text-secondary)] dark:text-[var(--text-secondary)] block mb-3">
                {isVi ? 'MỤC LỤC NHÀ TUYỂN DỤNG' : 'RECRUITER TABLE OF CONTENTS'}
              </span>
              <nav className="space-y-1.5 text-xs font-medium">
                {recruiterToc.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-[var(--heading)] dark:text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] dark:hover:bg-[var(--surface)] hover:text-[var(--primary)] dark:hover:text-[var(--retro-sky)] transition"
                  >
                    <span className="font-sans text-[10px] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-bold">{item.num}</span>
                    <span className="truncate">{item.title}</span>
                  </a>
                ))}
              </nav>
            </aside>

            {/* Main Content */}
            <main className="lg:col-span-3 space-y-8">
              
              {/* Section 1 */}
              <section id="r-verification" className="bg-white dark:bg-[var(--surface)] p-6 sm:p-8 rounded-xl border border-[var(--border-soft)] dark:border-[var(--border)] shadow-xs space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-[var(--surface-secondary)] dark:bg-[var(--surface)] text-[var(--primary)] dark:text-[var(--retro-sky)] text-xs font-bold flex items-center justify-center font-sans">
                    01
                  </span>
                  <h2 className="text-xl sm:text-2xl font-editorial font-bold text-[var(--heading)] dark:text-[var(--retro-cream)]">
                    {isVi ? 'Xác Minh Doanh Nghiệp (Company Verification)' : 'Company Verification'}
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-[var(--heading)] dark:text-[var(--text-secondary)] leading-relaxed">
                  {isVi
                    ? 'Nhà tuyển dụng hoạt động trên midCV® được liên kết với một Doanh nghiệp chính thức. Huy hiệu Company Verified đảm bảo các vị trí tuyển dụng được chứng thực và bảo vệ quyền lợi ứng viên:'
                    : 'Recruiters operating on midCV® are linked to a registered Enterprise. The Company Verified badge ensures authenticated job requisitions:'}
                </p>
                <div className="p-4 rounded-xl bg-[var(--surface-secondary)] dark:bg-[var(--primary)]/15 border border-[var(--border)]/30 text-xs text-[var(--heading)] dark:text-[var(--retro-sky)] flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span>
                    {isVi
                      ? 'Chỉ các tài khoản được ủy quyền mới có quyền truy cập vào danh sách ứng viên và báo cáo đối sánh thuộc phạm vi công ty mình.'
                      : 'Only authorized employer accounts have permission to access candidate pipelines and match reports within their company scope.'}
                  </span>
                </div>
              </section>

              {/* Section 2 */}
              <section id="r-jdbuilder" className="bg-white dark:bg-[var(--surface)] p-6 sm:p-8 rounded-xl border border-[var(--border-soft)] dark:border-[var(--border)] shadow-xs space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-[var(--surface-secondary)] dark:bg-[var(--surface)] text-[var(--primary)] dark:text-[var(--retro-sky)] text-xs font-bold flex items-center justify-center font-sans">
                    02
                  </span>
                  <h2 className="text-xl sm:text-2xl font-editorial font-bold text-[var(--heading)] dark:text-[var(--retro-cream)]">
                    {isVi ? 'Tạo và quản lý tin tuyển dụng' : 'Create and manage job postings'}
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-[var(--heading)] dark:text-[var(--text-secondary)] leading-relaxed">
                  {isVi
                    ? 'Màn hình tạo tin tuyển dụng (/recruiter/jobs/new) cho phép nhập thông tin vị trí, yêu cầu và chế độ làm việc:'
                    : 'The job authoring screen (/recruiter/jobs/new) lets recruiters enter role details, requirements, and work arrangement:'}
                </p>
                <ul className="text-xs sm:text-sm space-y-2 text-[var(--text-secondary)] dark:text-[var(--text-secondary)] list-disc pl-5">
                  <li>{isVi ? 'Nhập tiêu đề, mô tả, địa điểm, hình thức làm việc và khoảng lương theo loại tiền tệ đã chọn.' : 'Enter the title, description, location, work arrangement, and salary range in the selected currency.'}</li>
                  <li>{isVi ? 'Chọn ngành nghề, cấp bậc, loại hình việc làm và kỹ năng từ các trường có sẵn; có thể ghi rõ lựa chọn Khác.' : 'Choose industry, seniority, employment type, and skills; provide a custom value for Other classifications.'}</li>
                  <li>{isVi ? 'Lưu tin ở trạng thái bản nháp hoặc xuất bản theo quyền tài khoản.' : 'Save the posting as a draft or publish it according to account permissions.'}</li>
                </ul>
              </section>

              {/* Section 3 */}
              <section id="r-pipeline" className="bg-white dark:bg-[var(--surface)] p-6 sm:p-8 rounded-xl border border-[var(--border-soft)] dark:border-[var(--border)] shadow-xs space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-[var(--surface-secondary)] dark:bg-[var(--surface)] text-[var(--primary)] dark:text-[var(--retro-sky)] text-xs font-bold flex items-center justify-center font-sans">
                    03
                  </span>
                  <h2 className="text-xl sm:text-2xl font-editorial font-bold text-[var(--heading)] dark:text-[var(--retro-cream)]">
                    {isVi ? 'Phễu Tuyển Dụng & Bảng Xếp Hạng Ứng Viên Khách Quan' : 'Candidate Pipeline & Objective AI Ranking'}
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-[var(--heading)] dark:text-[var(--text-secondary)] leading-relaxed">
                  {isVi
                    ? 'Tại trang quản lý ứng viên theo vị trí (/recruiter/jobs/[id]/ranking):'
                    : 'On the role candidate management screen (/recruiter/jobs/[id]/ranking):'}
                </p>
                <ul className="text-xs sm:text-sm space-y-2 text-[var(--text-secondary)] dark:text-[var(--text-secondary)] list-disc pl-5">
                  <li>{isVi ? 'Xem danh sách ứng viên theo thứ tự điểm đối sánh hiện có.' : 'View applicants ordered by their available match score.'}</li>
                  <li>{isVi ? 'Bộ lọc ngưỡng điểm đối sánh: Tối thiểu 80%, 70%, v.v.' : 'Threshold filters: Minimum 80%, 70%, etc.'}</li>
                  <li>{isVi ? 'Lọc ứng viên theo kỹ năng bắt buộc còn thiếu hoặc đã khớp toàn bộ.' : 'Filter candidates by missing required skills or 100% matched.'}</li>
                  <li>{isVi ? 'Cập nhật trạng thái ứng viên: Nộp đơn (Submitted) → Đang đánh giá (Under Review) → Phỏng vấn (Shortlisted) → Từ chối (Rejected).' : 'Update pipeline stages: Submitted → Under Review → Shortlisted → Rejected.'}</li>
                </ul>
              </section>

              {/* Section 4 */}
              <section id="r-evidence" className="bg-white dark:bg-[var(--surface)] p-6 sm:p-8 rounded-xl border border-[var(--border-soft)] dark:border-[var(--border)] shadow-xs space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-[var(--surface-secondary)] dark:bg-[var(--surface)] text-[var(--primary)] dark:text-[var(--retro-sky)] text-xs font-bold flex items-center justify-center font-sans">
                    04
                  </span>
                  <h2 className="text-xl sm:text-2xl font-editorial font-bold text-[var(--heading)] dark:text-[var(--retro-cream)]">
                    {isVi ? 'Bằng Chứng Đối Sánh & Giải Trình Điểm Chi Tiết' : 'Verifiable Evidence & Explainable Scoring'}
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-[var(--heading)] dark:text-[var(--text-secondary)] leading-relaxed">
                  {isVi
                    ? 'midCV® kiên quyết từ chối phương pháp "Hộp đen" (Black Box AI). Mọi điểm số đưa ra cho Nhà tuyển dụng đều kèm theo bằng chứng cụ thể trích xuất trực tiếp từ CV:'
                    : 'midCV® strictly rejects "Black Box AI". Every score displayed to recruiters is accompanied by verifiable evidence extracted from the candidate profile:'}
                </p>
                <div className="p-4 rounded-xl bg-[var(--surface)] dark:bg-[var(--surface)] border border-[var(--border-soft)] dark:border-[var(--border)] text-xs space-y-2">
                  <p>
                    <strong>Core JD-CV Score:</strong>{' '}
                    {isVi ? 'Mức độ đáp ứng trực tiếp các tiêu chí kỹ năng cốt lõi và số năm kinh nghiệm.' : 'Direct alignment with core technical skills and required years of experience.'}
                  </p>
                  <p>
                    <strong>Evidence Snippets:</strong>{' '}
                    {isVi ? 'Đoạn trích dẫn từ CV chứng minh ứng viên đã sử dụng công nghệ đó trong dự án nào, thời gian nào.' : 'Direct excerpts from CV proving where and when the candidate deployed the technology.'}
                  </p>
                  <p>
                    <strong>Missing Skills Alert:</strong>{' '}
                    {isVi ? 'Liệt kê chính xác những kỹ năng nào trong JD mà ứng viên chưa đề cập tới.' : 'Explicit list of JD requirements not yet covered in candidate claims.'}
                  </p>
                </div>
              </section>

              {/* Section 5 */}
              <section id="r-github" className="bg-white dark:bg-[var(--surface)] p-6 sm:p-8 rounded-xl border border-[var(--border-soft)] dark:border-[var(--border)] shadow-xs space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-[var(--surface-secondary)] dark:bg-[var(--warning)]/20 text-[var(--warning)] dark:text-[var(--warning)] text-xs font-bold flex items-center justify-center font-sans">
                    05
                  </span>
                  <h2 className="text-xl sm:text-2xl font-editorial font-bold text-[var(--heading)] dark:text-[var(--retro-cream)]">
                    {isVi ? 'Tín Hiệu Bổ Trợ GitHub & Chính Sách Không Phạt (Zero Penalty)' : 'GitHub Signal & Zero Penalty Policy'}
                  </h2>
                </div>
                <div className="p-4 rounded-xl bg-[var(--surface-secondary)] dark:bg-[var(--warning)]/10 border border-[var(--border)]/50 text-xs text-[var(--warning)] dark:text-[var(--warning)] space-y-1.5">
                  <span className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-[var(--warning)]" />
                    {isVi ? 'NGUYÊN TẮC BẢO VỆ ỨNG VIÊN CỦA midCV®:' : 'midCV® CANDIDATE PROTECTION PRINCIPLE:'}
                  </span>
                  <p className="leading-relaxed">
                    {isVi
                      ? 'Tín hiệu GitHub chỉ là tín hiệu BỔ TRỢ (Supplementary Only). Không bao giờ hạ điểm hoặc phạt một ứng viên đủ điều kiện chỉ vì họ không cung cấp hoặc không có hoạt động GitHub công khai.'
                      : 'GitHub activity is purely SUPPLEMENTARY. The algorithm NEVER penalizes or lowers scores for qualified candidates who do not link or possess public GitHub repositories.'}
                  </p>
                </div>
                <ul className="text-xs sm:text-sm space-y-2 text-[var(--text-secondary)] dark:text-[var(--text-secondary)] list-disc pl-5">
                  <li>
                    {isVi
                      ? 'Nếu ứng viên liên kết GitHub có mã nguồn liên quan: Điểm được kết hợp bổ trợ (85% Core + 15% GitHub).'
                      : 'Connected GitHub with relevant codebases: Weighted composite score (85% Core + 15% GitHub).'}
                  </li>
                  <li>
                    {isVi
                      ? 'Nếu ứng viên không có GitHub: Điểm đối sánh tự động fallback 100% về Core JD-CV Score mà không bị trừ điểm nào.'
                      : 'No GitHub provided: The score automatically defaults to 100% Core JD-CV Score with zero penalty.'}
                  </li>
                  <li>
                    {isVi
                      ? 'Đối với các vị trí phi kỹ thuật (Marketing, HR, Finance): Tín hiệu GitHub tự động được bỏ qua.'
                      : 'Non-technical domains (Marketing, HR, Finance): GitHub signal is automatically bypassed.'}
                  </li>
                </ul>
              </section>

              {/* Section 6 */}
              <section id="r-privacy" className="bg-white dark:bg-[var(--surface)] p-6 sm:p-8 rounded-xl border border-[var(--border-soft)] dark:border-[var(--border)] shadow-xs space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-[var(--surface-secondary)] dark:bg-[var(--surface)] text-[var(--primary)] dark:text-[var(--retro-sky)] text-xs font-bold flex items-center justify-center font-sans">
                    06
                  </span>
                  <h2 className="text-xl sm:text-2xl font-editorial font-bold text-[var(--heading)] dark:text-[var(--retro-cream)]">
                    {isVi ? 'Bảo Mật & Phân Tích Hiệu Suất Tuyển Dụng' : 'Security & Hiring Performance Analytics'}
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-[var(--heading)] dark:text-[var(--text-secondary)] leading-relaxed">
                  {isVi
                    ? 'Quyền truy cập được kiểm tra ở phía máy chủ theo tài khoản và phạm vi công ty. Nhà tuyển dụng có thể xem và cập nhật ứng viên trong quy trình tuyển dụng của tin mình quản lý.'
                    : 'Access is checked server-side using the account and company scope. Recruiters can view and update applicants in the pipelines for jobs they manage.'}
                </p>
              </section>

            </main>
          </div>
        )}

      </div>
    </div>
  );
}
