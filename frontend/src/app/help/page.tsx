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
  const { t } = useLanguage();
  const [activeRole, setActiveRole] = useState<'candidate' | 'recruiter'>('candidate');

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#071A17] text-[#1E3A5F] dark:text-[#D6E4E1] transition-colors pb-20">
      
      {/* ============================================================ */}
      {/* 01. HERO SECTION (White / Soft Cyan / Pastel Blue / Navy)     */}
      {/* ============================================================ */}
      <section className="bg-gradient-to-b from-[#EFF6FF]/60 via-[#F8FBFF] to-[#F8FAFC] dark:from-[#0B211D] dark:via-[#071A17] dark:to-[#071A17] border-b border-[#E2E8F0] dark:border-[#1F4A40] pt-12 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          {/* Left: 60% Content */}
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D7F9FA] dark:bg-[#102A25] border border-[#2563EB]/20 dark:border-[#00B14F]/30 text-xs font-semibold text-[#2563EB] dark:text-[#00B14F]">
              <BookOpen className="w-3.5 h-3.5" />
              <span className="font-mono tracking-wide uppercase text-[11px]">midCV® DOCUMENTATION & OPERATIONAL MANUAL</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-editorial font-bold text-[#0F2A52] dark:text-[#F1F5F9] tracking-tight leading-[1.15]">
              {t('help.title', 'Hướng Dẫn Sử Dụng Nền Tảng midCV®')}
            </h1>

            <p className="text-sm sm:text-base text-[#64748B] dark:text-[#94A3B8] leading-relaxed max-w-2xl font-normal">
              {t('help.subtitle', 'Tài liệu vận hành chi tiết và giải thích cơ chế đối sánh minh bạch, trích xuất thực thể AI và chính sách bảo vệ dữ liệu cho Ứng viên & Nhà tuyển dụng.')}
            </p>

            {/* Quick Metrics Badge Chips */}
            <div className="pt-2 flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white dark:bg-[#102A25] border border-[#E2E8F0] dark:border-[#1F4A40] shadow-2xs text-[#0F2A52] dark:text-[#F1F5F9] font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-[#00B14F]" />
                100% Thuật Toán Minh Bạch
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white dark:bg-[#102A25] border border-[#E2E8F0] dark:border-[#1F4A40] shadow-2xs text-[#0F2A52] dark:text-[#F1F5F9] font-medium">
                <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
                Vector Embedding 1536D
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#FEF9C3] dark:bg-[#FACC15]/15 border border-[#FACC15]/40 text-[#92400E] dark:text-[#FACC15] font-medium">
                <AlertCircle className="w-3.5 h-3.5 text-[#FACC15]" />
                Chính Sách Không Phạt GitHub
              </span>
            </div>
          </div>

          {/* Right: 40% Supporting Visual */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-md bg-white dark:bg-[#102A25] border border-[#E2E8F0] dark:border-[#1F4A40] rounded-2xl p-6 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#1F4A40] pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-400"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                  <span className="ml-2 font-mono text-[11px] text-[#64748B] dark:text-[#94A3B8]">docs.midcv.io/spec</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-[#2563EB] dark:text-[#00B14F] bg-[#EFF6FF] dark:bg-[#00B14F]/15 px-2 py-0.5 rounded">
                  v2.4 STABLE
                </span>
              </div>

              {/* Visual Match Architecture */}
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-[#F8FBFF] dark:bg-[#14332D] border border-[#DBEAFE] dark:border-[#1F4A40] space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#0F2A52] dark:text-[#F1F5F9]">
                    <span>01. Vector Similarity Engine</span>
                    <span className="text-[#2563EB] dark:text-[#00B14F] font-mono font-bold">85% Core</span>
                  </div>
                  <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                    Đối sánh kỹ năng cốt lõi, kinh nghiệm thực tế và học vấn từ CV với JD.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#FEF9C3]/50 dark:bg-[#FACC15]/10 border border-[#FACC15]/30 space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#92400E] dark:text-[#FACC15]">
                    <span>02. GitHub Signals (Bổ trợ)</span>
                    <span className="font-mono font-bold">15% Max</span>
                  </div>
                  <p className="text-[11px] text-[#78350F] dark:text-[#D6E4E1]/80">
                    Bổ trợ năng lực thực chiến qua repo commit. Không có GitHub = 100% Core Score.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#E8F8EE] dark:bg-[#00B14F]/15 border border-[#00B14F]/30 space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#065F46] dark:text-[#00B14F]">
                    <span>03. Immutable Snapshots</span>
                    <span className="font-mono font-bold">SHA-256</span>
                  </div>
                  <p className="text-[11px] text-[#065F46]/80 dark:text-[#D6E4E1]/80">
                    Bản lưu CV tại thời điểm nộp đơn được cố định bảo vệ tính toàn vẹn.
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
        <div className="flex items-center gap-2 bg-white dark:bg-[#102A25] p-1.5 rounded-2xl w-fit border border-[#E2E8F0] dark:border-[#1F4A40] shadow-2xs">
          <button
            onClick={() => setActiveRole('candidate')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeRole === 'candidate'
                ? 'bg-[#2563EB] text-white shadow-sm'
                : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F2A52] dark:hover:text-white'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>{t('help.candidateTab', 'Dành Cho Ứng Viên')}</span>
          </button>

          <button
            onClick={() => setActiveRole('recruiter')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeRole === 'recruiter'
                ? 'bg-[#2563EB] text-white shadow-sm'
                : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F2A52] dark:hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>{t('help.recruiterTab', 'Dành Cho Nhà Tuyển Dụng')}</span>
          </button>
        </div>

        {/* ============================================================ */}
        {/* CANDIDATE USER GUIDE                                         */}
        {/* ============================================================ */}
        {activeRole === 'candidate' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            
            {/* Table of Contents Sticky Sidebar */}
            <aside className="lg:col-span-1 space-y-2 sticky top-24 self-start bg-white dark:bg-[#102A25] p-5 rounded-2xl border border-[#E2E8F0] dark:border-[#1F4A40] shadow-xs">
              <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-[#64748B] dark:text-[#94A3B8] block mb-3">
                MỤC LỤC ỨNG VIÊN
              </span>
              <nav className="space-y-1.5 text-xs font-medium">
                {[
                  { id: 'c-registration', num: '01', title: 'Xác Thực Email & Đăng Ký' },
                  { id: 'c-industries', num: '02', title: 'Đa Ngành Nghề Định Hướng' },
                  { id: 'c-cv', num: '03', title: 'Tải Lên CV, Builder & Snapshot' },
                  { id: 'c-skills', num: '04', title: 'Gợi Ý & Chuẩn Hóa Kỹ Năng' },
                  { id: 'c-jobs', num: '05', title: 'Tìm Kiếm Việc Làm & Lọc AI' },
                  { id: 'c-apply', num: '06', title: 'Quick Apply & Match Reports' },
                  { id: 'c-insufficient', num: '07', title: 'Trạng Thái Chưa Đủ Dữ Liệu' },
                  { id: 'c-settings', num: '08', title: 'Đa Ngôn Ngữ & Giao Diện Sáng/Tối' },
                ].map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-[#1E3A5F] dark:text-[#D6E4E1] hover:bg-[#EFF6FF] dark:hover:bg-[#14332D] hover:text-[#2563EB] dark:hover:text-[#3B82F6] transition"
                  >
                    <span className="font-mono text-[10px] text-[#64748B] dark:text-[#94A3B8] font-bold">{item.num}</span>
                    <span className="truncate">{item.title}</span>
                  </a>
                ))}
              </nav>
            </aside>

            {/* Main Content */}
            <main className="lg:col-span-3 space-y-8">
              
              {/* Section 1 */}
              <section id="c-registration" className="bg-white dark:bg-[#102A25] p-6 sm:p-8 rounded-2xl border border-[#E2E8F0] dark:border-[#1F4A40] shadow-xs space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-[#EFF6FF] dark:bg-[#14332D] text-[#2563EB] dark:text-[#00B14F] text-xs font-bold flex items-center justify-center font-mono">
                    01
                  </span>
                  <h2 className="text-xl sm:text-2xl font-editorial font-bold text-[#0F2A52] dark:text-[#F1F5F9]">
                    Xác Thực Email & Khởi Tạo Tài Khoản
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-[#1E3A5F] dark:text-[#D6E4E1] leading-relaxed">
                  Để đảm bảo tính xác thực và ngăn chặn gian lận hồ sơ ứng tuyển, mọi tài khoản đăng ký trên midCV® phải trải qua quy trình xác thực email thực tế:
                </p>
                <ul className="text-xs sm:text-sm space-y-2 text-[#64748B] dark:text-[#94A3B8] list-disc pl-5">
                  <li><strong>Đăng ký (Registration):</strong> Nhập Họ tên, Email hợp lệ, Mật khẩu có đánh giá độ an toàn (Password Strength Meter) và chọn các Ngành nghề định hướng mục tiêu.</li>
                  <li><strong>Khóa đăng nhập trước xác thực:</strong> Người dùng chưa xác thực email sẽ bị từ chối đăng nhập (HTTP 403 Forbidden) cho tới khi hoàn tất mở liên kết xác thực gửi qua hộp thư.</li>
                  <li><strong>Liên kết xác thực:</strong> Hệ thống gửi một token bảo mật có hạn sử dụng 24 giờ. Khi mở liên kết, hệ thống chuyển sang trang <code className="bg-[#EFF6FF] dark:bg-[#14332D] text-[#2563EB] dark:text-[#3B82F6] font-mono px-2 py-0.5 rounded">/verify-email</code> với giao diện midCV® hiển thị trạng thái thành công.</li>
                </ul>

                <div className="p-3.5 rounded-xl bg-[#EFF6FF] dark:bg-[#14332D] border border-[#DBEAFE] dark:border-[#1F4A40] flex items-center justify-between text-xs">
                  <span className="text-[#2563EB] dark:text-[#3B82F6] font-medium">Bạn có thể dùng trang xác thực trực tiếp tại:</span>
                  <Link href="/verify-email" className="font-semibold text-[#2563EB] dark:text-[#3B82F6] hover:underline flex items-center gap-1">
                    <span>Mở /verify-email</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </section>

              {/* Section 2 */}
              <section id="c-industries" className="bg-white dark:bg-[#102A25] p-6 sm:p-8 rounded-2xl border border-[#E2E8F0] dark:border-[#1F4A40] shadow-xs space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-[#EFF6FF] dark:bg-[#14332D] text-[#2563EB] dark:text-[#00B14F] text-xs font-bold flex items-center justify-center font-mono">
                    02
                  </span>
                  <h2 className="text-xl sm:text-2xl font-editorial font-bold text-[#0F2A52] dark:text-[#F1F5F9]">
                    Đa Ngành Nghề Định Hướng (Multiple Target Industries)
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-[#1E3A5F] dark:text-[#D6E4E1] leading-relaxed">
                  Ứng viên không bị giới hạn trong một ngành nghề duy nhất. Tại trang Đăng ký và trang Hồ sơ cá nhân (<code className="bg-[#EFF6FF] dark:bg-[#14332D] text-[#2563EB] dark:text-[#3B82F6] font-mono px-2 py-0.5 rounded">/candidate/profile</code>), ứng viên có thể chọn nhiều ngành mục tiêu cùng lúc:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                  {['Technology (Công nghệ)', 'Marketing & Truyền thông', 'Finance (Tài chính)', 'Human Resources (Nhân sự)', 'Design (Thiết kế)', 'Other (Khác)'].map((ind) => (
                    <div key={ind} className="p-3 rounded-xl bg-[#F8FBFF] dark:bg-[#071A17] border border-[#E2E8F0] dark:border-[#1F4A40] flex items-center gap-2 text-[#0F2A52] dark:text-[#F1F5F9] font-medium">
                      <Check className="w-3.5 h-3.5 text-[#00B14F]" />
                      <span>{ind}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
                  Dữ liệu này được lưu trữ theo cấu trúc quan hệ chuẩn hóa trong cơ sở dữ liệu và được sử dụng để lọc tự động các cơ hội việc làm liên quan ngay trên thanh tìm kiếm.
                </p>
              </section>

              {/* Section 3 */}
              <section id="c-cv" className="bg-white dark:bg-[#102A25] p-6 sm:p-8 rounded-2xl border border-[#E2E8F0] dark:border-[#1F4A40] shadow-xs space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-[#EFF6FF] dark:bg-[#14332D] text-[#2563EB] dark:text-[#00B14F] text-xs font-bold flex items-center justify-center font-mono">
                    03
                  </span>
                  <h2 className="text-xl sm:text-2xl font-editorial font-bold text-[#0F2A52] dark:text-[#F1F5F9]">
                    Tải Lên CV, Trình Soạn Thảo & Bản Lưu Bất Biến (Immutable Snapshot)
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-[#1E3A5F] dark:text-[#D6E4E1] leading-relaxed">
                  midCV® hỗ trợ hai luồng xây dựng hồ sơ ứng tuyển hoàn chỉnh:
                </p>
                <ul className="text-xs sm:text-sm space-y-2.5 text-[#64748B] dark:text-[#94A3B8] list-disc pl-5">
                  <li><strong>Upload & Analyze CV:</strong> Tải lên tệp PDF hoặc DOCX (tối đa 10MB). AI Worker sẽ phân tích văn bản, trích xuất thực thể (Kỹ năng, Kinh nghiệm, Học vấn) và cho phép bạn duyệt/chỉnh sửa trước khi lưu.</li>
                  <li><strong>CV Builder tương tác:</strong> Tự soạn thảo CV theo mẫu thiết kế chuẩn hóa tại <code className="bg-[#EFF6FF] dark:bg-[#14332D] text-[#2563EB] dark:text-[#3B82F6] font-mono px-2 py-0.5 rounded">/candidate/cvs/builder</code>, gợi ý cấu trúc bởi AI và quản lý nhiều phiên bản (Versions).</li>
                  <li><strong>Immutable Application Snapshot:</strong> Khi nộp đơn cho bất kỳ vị trí nào, phiên bản CV tại thời điểm đó được cố định bất biến (Immutable Snapshot). Việc chỉnh sửa CV sau này không làm sai lệch bản đã gửi cho Nhà tuyển dụng.</li>
                </ul>
              </section>

              {/* Section 4 */}
              <section id="c-skills" className="bg-white dark:bg-[#102A25] p-6 sm:p-8 rounded-2xl border border-[#E2E8F0] dark:border-[#1F4A40] shadow-xs space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-[#EFF6FF] dark:bg-[#14332D] text-[#2563EB] dark:text-[#00B14F] text-xs font-bold flex items-center justify-center font-mono">
                    04
                  </span>
                  <h2 className="text-xl sm:text-2xl font-editorial font-bold text-[#0F2A52] dark:text-[#F1F5F9]">
                    Gợi Ý & Chuẩn Hóa Kỹ Năng Kỹ Thuật (Skills Normalization)
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-[#1E3A5F] dark:text-[#D6E4E1] leading-relaxed">
                  Khi gõ kỹ năng vào hệ thống, thành phần Autocomplete sẽ đề xuất các kỹ năng chuẩn hóa từ từ điển công nghệ trung tâm của midCV®, loại bỏ sai lệch từ viết tắt hay biến thể:
                </p>
                <div className="p-4 rounded-xl bg-[#F8FBFF] dark:bg-[#071A17] border border-[#DBEAFE] dark:border-[#1F4A40] text-xs space-y-2">
                  <span className="font-semibold block text-[#0F2A52] dark:text-[#F1F5F9]">Tự động chuẩn hóa từ đồng nghĩa (Synonym Normalization Engine):</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 font-mono text-[11px] pt-1 text-[#2563EB] dark:text-[#00B14F]">
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
              <section id="c-jobs" className="bg-white dark:bg-[#102A25] p-6 sm:p-8 rounded-2xl border border-[#E2E8F0] dark:border-[#1F4A40] shadow-xs space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-[#EFF6FF] dark:bg-[#14332D] text-[#2563EB] dark:text-[#00B14F] text-xs font-bold flex items-center justify-center font-mono">
                    05
                  </span>
                  <h2 className="text-xl sm:text-2xl font-editorial font-bold text-[#0F2A52] dark:text-[#F1F5F9]">
                    Tìm Kiếm Việc Làm & Tinh Chỉnh Đối Sánh (Refine Matches)
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-[#1E3A5F] dark:text-[#D6E4E1] leading-relaxed">
                  Trang danh sách việc làm (<code className="bg-[#EFF6FF] dark:bg-[#14332D] text-[#2563EB] dark:text-[#3B82F6] font-mono px-2 py-0.5 rounded">/jobs</code>) tích hợp bộ lọc trực tiếp dữ liệu theo thời gian thực:
                </p>
                <ul className="text-xs sm:text-sm space-y-1.5 text-[#64748B] dark:text-[#94A3B8] list-disc pl-5">
                  <li>Lọc theo từ khóa vị trí, công ty hoặc kỹ năng cần tìm.</li>
                  <li>Lọc theo Địa điểm (Hồ Chí Minh, Hà Nội, Đà Nẵng, Remote).</li>
                  <li>Lọc theo Ngành nghề và cấp bậc (Senior, Lead, Manager, Junior).</li>
                  <li>Lọc theo Hình thức làm việc (Full-time, Contract, Remote).</li>
                  <li>Nút đặt lại bộ lọc tức thì (Reset Filters).</li>
                </ul>
              </section>

              {/* Section 6 */}
              <section id="c-apply" className="bg-white dark:bg-[#102A25] p-6 sm:p-8 rounded-2xl border border-[#E2E8F0] dark:border-[#1F4A40] shadow-xs space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-[#EFF6FF] dark:bg-[#14332D] text-[#2563EB] dark:text-[#00B14F] text-xs font-bold flex items-center justify-center font-mono">
                    06
                  </span>
                  <h2 className="text-xl sm:text-2xl font-editorial font-bold text-[#0F2A52] dark:text-[#F1F5F9]">
                    Quy Trình Quick Apply 5 Bước & Báo Cáo Phù Hợp
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-[#1E3A5F] dark:text-[#D6E4E1] leading-relaxed">
                  Quy trình nộp đơn 5 bước minh bạch cho phép ứng viên kiểm tra điểm đối sánh, lựa chọn phiên bản CV phù hợp nhất và xem trước giải trình trước khi bấm gửi:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
                  {[
                    { step: '01', title: 'Xác thực hồ sơ' },
                    { step: '02', title: 'Chọn bản CV' },
                    { step: '03', title: 'Câu hỏi sàng lọc' },
                    { step: '04', title: 'Xem trước điểm số' },
                    { step: '05', title: 'Xác nhận nộp đơn' },
                  ].map((s) => (
                    <div key={s.step} className="p-3 rounded-xl bg-[#F8FBFF] dark:bg-[#071A17] border border-[#E2E8F0] dark:border-[#1F4A40] text-center space-y-1">
                      <span className="font-mono font-bold text-[#2563EB] dark:text-[#00B14F] text-xs">{s.step}</span>
                      <p className="font-semibold text-[#0F2A52] dark:text-[#F1F5F9]">{s.title}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                  Toàn bộ lịch sử và báo cáo đối sánh được lưu trữ vĩnh viễn tại mục <strong>Báo Cáo Phù Hợp</strong> (<code className="bg-[#EFF6FF] dark:bg-[#14332D] text-[#2563EB] dark:text-[#3B82F6] font-mono px-2 py-0.5 rounded">/candidate/applications</code>).
                </p>
              </section>

              {/* Section 7 */}
              <section id="c-insufficient" className="bg-white dark:bg-[#102A25] p-6 sm:p-8 rounded-2xl border border-[#E2E8F0] dark:border-[#1F4A40] shadow-xs space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-[#FEF9C3] dark:bg-[#FACC15]/20 text-[#B45309] dark:text-[#FACC15] text-xs font-bold flex items-center justify-center font-mono">
                    07
                  </span>
                  <h2 className="text-xl sm:text-2xl font-editorial font-bold text-[#0F2A52] dark:text-[#F1F5F9]">
                    Trạng Thái Khi Chưa Đủ Dữ Liệu (Insufficient Data Handling)
                  </h2>
                </div>
                
                {/* Yellow Highlight Alert Box */}
                <div className="p-4 rounded-xl bg-[#FEF9C3] dark:bg-[#FACC15]/10 border border-[#FACC15]/50 text-xs text-[#92400E] dark:text-[#FACC15] space-y-1.5">
                  <span className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-[#FACC15]" />
                    Chính sách minh bạch thuật toán midCV®:
                  </span>
                  <p className="leading-relaxed">
                    Một ứng viên mới đăng ký chưa có CV hoặc chưa có thông tin kinh nghiệm/kỹ năng sẽ <strong>KHÔNG BAO GIỜ</strong> bị gán một con số ảo (như 96%, 85% hay 80%).
                  </p>
                </div>

                <p className="text-xs sm:text-sm text-[#1E3A5F] dark:text-[#D6E4E1] leading-relaxed">
                  Hệ thống sẽ hiển thị trạng thái chuẩn hóa:
                </p>
                <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#F8FAFC] dark:bg-[#071A17] border border-[#CBD5E1] dark:border-[#1F4A40] text-xs font-semibold text-[#1E3A5F] dark:text-[#D6E4E1]">
                  <span>Chưa thể tính mức độ phù hợp</span>
                  <span className="text-[10px] text-[#64748B] font-mono bg-[#E2E8F0] dark:bg-[#14332D] px-1.5 py-0.5 rounded">(INSUFFICIENT_DATA)</span>
                </div>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
                  Kèm theo hướng dẫn: <em>&quot;Bạn hãy thêm CV hoặc bổ sung thông tin kinh nghiệm, kỹ năng và thế mạnh để AI có đủ dữ liệu tính toán.&quot;</em>
                </p>
              </section>

              {/* Section 8 */}
              <section id="c-settings" className="bg-white dark:bg-[#102A25] p-6 sm:p-8 rounded-2xl border border-[#E2E8F0] dark:border-[#1F4A40] shadow-xs space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-[#EFF6FF] dark:bg-[#14332D] text-[#2563EB] dark:text-[#00B14F] text-xs font-bold flex items-center justify-center font-mono">
                    08
                  </span>
                  <h2 className="text-xl sm:text-2xl font-editorial font-bold text-[#0F2A52] dark:text-[#F1F5F9]">
                    Đa Ngôn Ngữ & Chế Độ Giao Diện Sáng / Tối
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-[#1E3A5F] dark:text-[#D6E4E1] leading-relaxed">
                  midCV® hỗ trợ tùy chỉnh trải nghiệm tức thì trên thanh điều hướng (Navbar):
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-[#F8FBFF] dark:bg-[#071A17] border border-[#E2E8F0] dark:border-[#1F4A40] space-y-1.5">
                    <span className="font-semibold text-[#0F2A52] dark:text-[#F1F5F9] flex items-center gap-1.5">
                      <Globe className="w-4 h-4 text-[#2563EB] dark:text-[#00B14F]" />
                      Chuyển đổi Tiếng Việt / English
                    </span>
                    <p className="text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
                      Bấm vào nút VI / EN trên Navbar để chuyển đổi toàn bộ nhãn hệ thống, bảng điều khiển và thông báo. Lựa chọn được lưu trữ bền vững trong LocalStorage.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#F8FBFF] dark:bg-[#071A17] border border-[#E2E8F0] dark:border-[#1F4A40] space-y-1.5">
                    <span className="font-semibold text-[#0F2A52] dark:text-[#F1F5F9] flex items-center gap-1.5">
                      <Sun className="w-4 h-4 text-[#FACC15]" />
                      Chế độ Sáng / Tối (Light / Dark)
                    </span>
                    <p className="text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
                      Bấm biểu tượng Mặt trời / Mặt trăng để chuyển giữa giao diện nền tối sang trọng và nền sáng thanh lịch, đạt chuẩn tương phản và không gây lóa mắt.
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
            <aside className="lg:col-span-1 space-y-2 sticky top-24 self-start bg-white dark:bg-[#102A25] p-5 rounded-2xl border border-[#E2E8F0] dark:border-[#1F4A40] shadow-xs">
              <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-[#64748B] dark:text-[#94A3B8] block mb-3">
                MỤC LỤC NHÀ TUYỂN DỤNG
              </span>
              <nav className="space-y-1.5 text-xs font-medium">
                {[
                  { id: 'r-verification', num: '01', title: 'Xác Minh Doanh Nghiệp' },
                  { id: 'r-jdbuilder', num: '02', title: 'JD Builder & Trợ Lý AI' },
                  { id: 'r-pipeline', num: '03', title: 'Phễu Ứng Viên & Xếp Hạng' },
                  { id: 'r-evidence', num: '04', title: 'Bằng Chứng & Giải Trình Điểm' },
                  { id: 'r-github', num: '05', title: 'Tín Hiệu GitHub (Zero Penalty)' },
                  { id: 'r-privacy', num: '06', title: 'Bảo Mật & Phân Tích Hiệu Suất' },
                ].map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-[#1E3A5F] dark:text-[#D6E4E1] hover:bg-[#EFF6FF] dark:hover:bg-[#14332D] hover:text-[#2563EB] dark:hover:text-[#3B82F6] transition"
                  >
                    <span className="font-mono text-[10px] text-[#64748B] dark:text-[#94A3B8] font-bold">{item.num}</span>
                    <span className="truncate">{item.title}</span>
                  </a>
                ))}
              </nav>
            </aside>

            {/* Main Content */}
            <main className="lg:col-span-3 space-y-8">
              
              {/* Section 1 */}
              <section id="r-verification" className="bg-white dark:bg-[#102A25] p-6 sm:p-8 rounded-2xl border border-[#E2E8F0] dark:border-[#1F4A40] shadow-xs space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-[#EFF6FF] dark:bg-[#14332D] text-[#2563EB] dark:text-[#00B14F] text-xs font-bold flex items-center justify-center font-mono">
                    01
                  </span>
                  <h2 className="text-xl sm:text-2xl font-editorial font-bold text-[#0F2A52] dark:text-[#F1F5F9]">
                    Xác Minh Doanh Nghiệp (Company Verification)
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-[#1E3A5F] dark:text-[#D6E4E1] leading-relaxed">
                  Nhà tuyển dụng hoạt động trên midCV® được liên kết với một Doanh nghiệp chính thức. Huy hiệu <strong>Company Verified</strong> đảm bảo các vị trí tuyển dụng được chứng thực và bảo vệ quyền lợi ứng viên:
                </p>
                <div className="p-4 rounded-xl bg-[#E8F8EE] dark:bg-[#00B14F]/15 border border-[#00B14F]/30 text-xs text-[#065F46] dark:text-[#00B14F] flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span>Chỉ các tài khoản được ủy quyền mới có quyền truy cập vào danh sách ứng viên và báo cáo đối sánh thuộc phạm vi công ty mình.</span>
                </div>
              </section>

              {/* Section 2 */}
              <section id="r-jdbuilder" className="bg-white dark:bg-[#102A25] p-6 sm:p-8 rounded-2xl border border-[#E2E8F0] dark:border-[#1F4A40] shadow-xs space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-[#EFF6FF] dark:bg-[#14332D] text-[#2563EB] dark:text-[#00B14F] text-xs font-bold flex items-center justify-center font-mono">
                    02
                  </span>
                  <h2 className="text-xl sm:text-2xl font-editorial font-bold text-[#0F2A52] dark:text-[#F1F5F9]">
                    JD Builder & Trợ Lý AI Tinh Chỉnh Mô Tả Công Việc
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-[#1E3A5F] dark:text-[#D6E4E1] leading-relaxed">
                  Màn hình tạo tin tuyển dụng (<code className="bg-[#EFF6FF] dark:bg-[#14332D] text-[#2563EB] dark:text-[#3B82F6] font-mono px-2 py-0.5 rounded">/recruiter/jobs/new</code>) hỗ trợ AI tinh chỉnh mô tả công việc:
                </p>
                <ul className="text-xs sm:text-sm space-y-2 text-[#64748B] dark:text-[#94A3B8] list-disc pl-5">
                  <li>Tự động phân tách yêu cầu bắt buộc (REQUIRED) và ưu tiên (PREFERRED).</li>
                  <li>Chuẩn hóa số năm kinh nghiệm tối thiểu cho từng kỹ năng then chốt.</li>
                  <li>Trợ lý AI tự động gợi ý bộ kỹ năng tương ứng với vị trí và tiêu đề công việc.</li>
                  <li>Lưu dưới dạng bản nháp (Draft) hoặc Xuất bản công khai (Published) để đón nhận ứng viên.</li>
                </ul>
              </section>

              {/* Section 3 */}
              <section id="r-pipeline" className="bg-white dark:bg-[#102A25] p-6 sm:p-8 rounded-2xl border border-[#E2E8F0] dark:border-[#1F4A40] shadow-xs space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-[#EFF6FF] dark:bg-[#14332D] text-[#2563EB] dark:text-[#00B14F] text-xs font-bold flex items-center justify-center font-mono">
                    03
                  </span>
                  <h2 className="text-xl sm:text-2xl font-editorial font-bold text-[#0F2A52] dark:text-[#F1F5F9]">
                    Phễu Tuyển Dụng & Bảng Xếp Hạng Ứng Viên Khách Quan
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-[#1E3A5F] dark:text-[#D6E4E1] leading-relaxed">
                  Tại trang quản lý ứng viên theo vị trí (<code className="bg-[#EFF6FF] dark:bg-[#14332D] text-[#2563EB] dark:text-[#3B82F6] font-mono px-2 py-0.5 rounded">/recruiter/jobs/[id]/ranking</code>):
                </p>
                <ul className="text-xs sm:text-sm space-y-2 text-[#64748B] dark:text-[#94A3B8] list-disc pl-5">
                  <li>Phân loại ứng viên theo thứ tự xếp hạng (Rank 1, 2, 3...) dựa trên thuật toán tối ưu xếp hạng (NDCG@K).</li>
                  <li>Bộ lọc ngưỡng điểm đối sánh: Tối thiểu 80%, 70%, v.v.</li>
                  <li>Lọc ứng viên theo kỹ năng bắt buộc còn thiếu hoặc đã khớp toàn bộ.</li>
                  <li>Cập nhật trạng thái ứng viên: Nộp đơn (Submitted) → Đang đánh giá (Under Review) → Phỏng vấn (Shortlisted) → Từ chối (Rejected).</li>
                </ul>
              </section>

              {/* Section 4 */}
              <section id="r-evidence" className="bg-white dark:bg-[#102A25] p-6 sm:p-8 rounded-2xl border border-[#E2E8F0] dark:border-[#1F4A40] shadow-xs space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-[#EFF6FF] dark:bg-[#14332D] text-[#2563EB] dark:text-[#00B14F] text-xs font-bold flex items-center justify-center font-mono">
                    04
                  </span>
                  <h2 className="text-xl sm:text-2xl font-editorial font-bold text-[#0F2A52] dark:text-[#F1F5F9]">
                    Bằng Chứng Đối Sánh & Giải Trình Điểm Chi Tiết
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-[#1E3A5F] dark:text-[#D6E4E1] leading-relaxed">
                  midCV® kiên quyết từ chối phương pháp &quot;Hộp đen&quot; (Black Box AI). Mọi điểm số đưa ra cho Nhà tuyển dụng đều kèm theo bằng chứng cụ thể trích xuất trực tiếp từ CV:
                </p>
                <div className="p-4 rounded-xl bg-[#F8FBFF] dark:bg-[#071A17] border border-[#DBEAFE] dark:border-[#1F4A40] text-xs space-y-2">
                  <p><strong>Core JD-CV Score:</strong> Mức độ đáp ứng trực tiếp các tiêu chí kỹ năng cốt lõi và số năm kinh nghiệm.</p>
                  <p><strong>Evidence Snippets:</strong> Đoạn trích dẫn từ CV chứng minh ứng viên đã sử dụng công nghệ đó trong dự án nào, thời gian nào.</p>
                  <p><strong>Missing Skills Alert:</strong> Liệt kê chính xác những kỹ năng nào trong JD mà ứng viên chưa đề cập tới.</p>
                </div>
              </section>

              {/* Section 5 */}
              <section id="r-github" className="bg-white dark:bg-[#102A25] p-6 sm:p-8 rounded-2xl border border-[#E2E8F0] dark:border-[#1F4A40] shadow-xs space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-[#FEF9C3] dark:bg-[#FACC15]/20 text-[#B45309] dark:text-[#FACC15] text-xs font-bold flex items-center justify-center font-mono">
                    05
                  </span>
                  <h2 className="text-xl sm:text-2xl font-editorial font-bold text-[#0F2A52] dark:text-[#F1F5F9]">
                    Tín Hiệu Bổ Trợ GitHub & Chính Sách Không Phạt (Zero Penalty)
                  </h2>
                </div>
                <div className="p-4 rounded-xl bg-[#FEF9C3] dark:bg-[#FACC15]/10 border border-[#FACC15]/50 text-xs text-[#92400E] dark:text-[#FACC15] space-y-1.5">
                  <span className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-[#FACC15]" />
                    NGUYÊN TẮC BẢO VỆ ỨNG VIÊN CỦA midCV®:
                  </span>
                  <p className="leading-relaxed">
                    Tín hiệu GitHub chỉ là tín hiệu <strong>BỔ TRỢ (Supplementary Only)</strong>. Không bao giờ hạ điểm hoặc phạt một ứng viên đủ điều kiện chỉ vì họ không cung cấp hoặc không có hoạt động GitHub công khai.
                  </p>
                </div>
                <ul className="text-xs sm:text-sm space-y-2 text-[#64748B] dark:text-[#94A3B8] list-disc pl-5">
                  <li>Nếu ứng viên liên kết GitHub có mã nguồn liên quan: Điểm được kết hợp bổ trợ (85% Core + 15% GitHub).</li>
                  <li>Nếu ứng viên không có GitHub: Điểm đối sánh tự động fallback 100% về Core JD-CV Score mà không bị trừ điểm nào.</li>
                  <li>Đối với các vị trí phi kỹ thuật (Marketing, HR, Finance): Tín hiệu GitHub tự động được bỏ qua.</li>
                </ul>
              </section>

              {/* Section 6 */}
              <section id="r-privacy" className="bg-white dark:bg-[#102A25] p-6 sm:p-8 rounded-2xl border border-[#E2E8F0] dark:border-[#1F4A40] shadow-xs space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-[#EFF6FF] dark:bg-[#14332D] text-[#2563EB] dark:text-[#00B14F] text-xs font-bold flex items-center justify-center font-mono">
                    06
                  </span>
                  <h2 className="text-xl sm:text-2xl font-editorial font-bold text-[#0F2A52] dark:text-[#F1F5F9]">
                    Bảo Mật & Phân Tích Hiệu Suất Tuyển Dụng
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-[#1E3A5F] dark:text-[#D6E4E1] leading-relaxed">
                  Hệ thống kiểm soát ủy quyền bảo mật cấp máy chủ (Server-side RBAC). Nhà tuyển dụng có thể theo dõi tỷ lệ chuyển đổi phễu tuyển dụng, thời gian tuyển dụng trung bình (Time-to-Hire) và chất lượng nguồn ứng viên tại trang <strong>HR Dashboard</strong> (<code className="bg-[#EFF6FF] dark:bg-[#14332D] text-[#2563EB] dark:text-[#3B82F6] font-mono px-2 py-0.5 rounded">/recruiter</code>).
                </p>
              </section>

            </main>
          </div>
        )}

      </div>
    </div>
  );
}
