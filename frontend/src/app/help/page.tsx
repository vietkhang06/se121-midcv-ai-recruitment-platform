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
  Moon,
  AlertCircle,
  Info,
  ChevronRight,
  BookOpen,
  Check
} from 'lucide-react';

export default function UserGuidePage() {
  const { t } = useLanguage();
  const [activeRole, setActiveRole] = useState<'candidate' | 'recruiter'>('candidate');

  return (
    <div className="min-h-screen bg-[#F8FAF9] dark:bg-[#071410] text-slate-800 dark:text-slate-100 py-10 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Header */}
        <div className="space-y-2 border-b border-slate-200 dark:border-[#1B3D34] pb-6">
          <div className="flex items-center gap-2 text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
            <BookOpen className="w-4 h-4" />
            <span>MIDCV DOCUMENTATION & OPERATIONAL MANUAL</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-editorial font-bold text-slate-900 dark:text-white tracking-tight">
            {t('help.title', 'MidCV Platform User Guide')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-3xl leading-relaxed">
            {t('help.subtitle', 'Complete operational instructions and algorithmic transparency for Candidates and Recruiters.')}
          </p>
        </div>

        {/* Role Switcher Tabs */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-[#0E241E] p-1.5 rounded-2xl w-fit border border-slate-200 dark:border-[#1B3D34]">
          <button
            onClick={() => setActiveRole('candidate')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeRole === 'candidate'
                ? 'bg-[#0C2B24] dark:bg-[#10B981] text-white dark:text-[#071410] shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>{t('help.candidateTab', 'Candidate Guide')}</span>
          </button>

          <button
            onClick={() => setActiveRole('recruiter')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeRole === 'recruiter'
                ? 'bg-[#0C2B24] dark:bg-[#10B981] text-white dark:text-[#071410] shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>{t('help.recruiterTab', 'Recruiter Guide')}</span>
          </button>
        </div>

        {/* ============================================================ */}
        {/* CANDIDATE USER GUIDE */}
        {/* ============================================================ */}
        {activeRole === 'candidate' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            
            {/* Table of Contents Sticky Sidebar */}
            <aside className="lg:col-span-1 space-y-2 sticky top-24 self-start bg-white dark:bg-[#0E241E] p-4 rounded-2xl border border-slate-200 dark:border-[#1B3D34] shadow-xs">
              <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 block mb-2">
                {t('help.tocTitle', 'Guide Sections')}
              </span>
              <nav className="space-y-1 text-xs font-medium">
                <a href="#c-registration" className="block px-2.5 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#14332B] hover:text-emerald-600 dark:hover:text-emerald-400 transition">
                  1. Registration & Email Verification
                </a>
                <a href="#c-industries" className="block px-2.5 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#14332B] hover:text-emerald-600 dark:hover:text-emerald-400 transition">
                  2. Multiple Target Industries
                </a>
                <a href="#c-cv" className="block px-2.5 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#14332B] hover:text-emerald-600 dark:hover:text-emerald-400 transition">
                  3. CV Upload, Builder & Versions
                </a>
                <a href="#c-skills" className="block px-2.5 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#14332B] hover:text-emerald-600 dark:hover:text-emerald-400 transition">
                  4. Skills Autocomplete & Normalization
                </a>
                <a href="#c-jobs" className="block px-2.5 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#14332B] hover:text-emerald-600 dark:hover:text-emerald-400 transition">
                  5. Job Search & Refine Matches
                </a>
                <a href="#c-apply" className="block px-2.5 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#14332B] hover:text-emerald-600 dark:hover:text-emerald-400 transition">
                  6. Quick Apply & Match Reports
                </a>
                <a href="#c-insufficient" className="block px-2.5 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#14332B] hover:text-emerald-600 dark:hover:text-emerald-400 transition">
                  7. Insufficient Data Behavior
                </a>
                <a href="#c-settings" className="block px-2.5 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#14332B] hover:text-emerald-600 dark:hover:text-emerald-400 transition">
                  8. Language & Dark/Light Mode
                </a>
              </nav>
            </aside>

            {/* Main Content */}
            <main className="lg:col-span-3 space-y-8">
              
              {/* Section 1 */}
              <section id="c-registration" className="bg-white dark:bg-[#0E241E] p-6 sm:p-7 rounded-2xl border border-slate-200 dark:border-[#1B3D34] shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <h2 className="text-xl font-editorial font-bold text-slate-900 dark:text-white">
                    1. Registration & Email Verification (Xác Thực Email Bắt Buộc)
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Để đảm bảo tính xác thực và ngăn chặn gian lận, mọi tài khoản đăng ký trên MidCV phải trải qua quy trình xác thực email thực tế:
                </p>
                <ul className="text-xs space-y-2 text-slate-600 dark:text-slate-300 list-disc pl-5">
                  <li><strong>Đăng ký (Registration):</strong> Nhập Họ tên, Email hợp lệ, Mật khẩu có đánh giá độ an toàn (Password Strength Meter) và chọn các Ngành nghề định hướng.</li>
                  <li><strong>Khóa đăng nhập trước xác thực:</strong> Người dùng chưa xác thực email sẽ bị từ chối đăng nhập (HTTP 403 Forbidden) cho tới khi mở liên kết xác thực.</li>
                  <li><strong>Liên kết xác thực:</strong> Hệ thống gửi một token bảo mật có hạn sử dụng (24 giờ). Khi mở liên kết, hệ thống chuyển sang trang <code className="bg-slate-100 dark:bg-[#071410] px-1.5 py-0.5 rounded text-emerald-700 dark:text-emerald-400 font-mono">/verify-email</code> với giao diện MidCV hiển thị trạng thái thành công và cho phép tiếp tục vào hệ thống.</li>
                </ul>
              </section>

              {/* Section 2 */}
              <section id="c-industries" className="bg-white dark:bg-[#0E241E] p-6 sm:p-7 rounded-2xl border border-slate-200 dark:border-[#1B3D34] shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <h2 className="text-xl font-editorial font-bold text-slate-900 dark:text-white">
                    2. Multiple Target Industries (Đa Ngành Nghề Định Hướng)
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Ứng viên không bị giới hạn trong một ngành duy nhất. Khi đăng ký và trong trang Hồ sơ cá nhân (<code className="bg-slate-100 dark:bg-[#071410] px-1.5 py-0.5 rounded text-emerald-700 dark:text-emerald-400 font-mono">/candidate/profile</code>), ứng viên có thể chọn nhiều ngành mục tiêu cùng lúc:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  {['Technology (Công nghệ)', 'Marketing & Truyền thông', 'Finance (Tài chính)', 'Human Resources (Nhân sự)', 'Design (Thiết kế)', 'Other (Khác)'].map((ind) => (
                    <div key={ind} className="p-2 rounded-lg bg-slate-50 dark:bg-[#071410] border border-slate-200 dark:border-[#1B3D34] flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>{ind}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Dữ liệu này được lưu trữ theo cấu trúc quan hệ chuẩn hóa trong cơ sở dữ liệu và được sử dụng để lọc tự động các cơ hội việc làm liên quan.
                </p>
              </section>

              {/* Section 3 */}
              <section id="c-cv" className="bg-white dark:bg-[#0E241E] p-6 sm:p-7 rounded-2xl border border-slate-200 dark:border-[#1B3D34] shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <h2 className="text-xl font-editorial font-bold text-slate-900 dark:text-white">
                    3. CV Upload, CV Builder & Versioning (Tải Lên & Tạo Bản CV)
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Hỗ trợ 2 luồng tạo CV hoàn chỉnh:
                </p>
                <ul className="text-xs space-y-2 text-slate-600 dark:text-slate-300 list-disc pl-5">
                  <li><strong>Upload & Analyze CV:</strong> Tải lên tệp PDF hoặc DOCX (tối đa 10MB). AI Worker sẽ phân tích văn bản, trích xuất thực thể (Kỹ năng, Kinh nghiệm, Học vấn) và cho phép bạn duyệt/chỉnh sửa trước khi lưu.</li>
                  <li><strong>CV Builder tương tác:</strong> Tự soạn thảo CV theo mẫu thiết kế chuẩn hóa, gợi ý cấu trúc bởi AI và quản lý các phiên bản (Versions).</li>
                  <li><strong>Immutable Application Snapshot:</strong> Khi nộp đơn cho bất kỳ vị trí nào, phiên bản CV tại thời điểm đó được cố định bất biến (Immutable Snapshot). Việc chỉnh sửa CV sau này không làm thay đổi bản đã gửi cho Nhà tuyển dụng.</li>
                </ul>
              </section>

              {/* Section 4 */}
              <section id="c-skills" className="bg-white dark:bg-[#0E241E] p-6 sm:p-7 rounded-2xl border border-slate-200 dark:border-[#1B3D34] shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <h2 className="text-xl font-editorial font-bold text-slate-900 dark:text-white">
                    4. Technical Skills Index & Normalization (Gợi Ý & Chuẩn Hóa Kỹ Năng)
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Khi gõ kỹ năng vào hệ thống (ví dụ: <code className="bg-slate-100 dark:bg-[#071410] px-1.5 py-0.5 rounded font-mono">jav</code>, <code className="bg-slate-100 dark:bg-[#071410] px-1.5 py-0.5 rounded font-mono">spr</code>, <code className="bg-slate-100 dark:bg-[#071410] px-1.5 py-0.5 rounded font-mono">doc</code>), thành phần Autocomplete sẽ đề xuất các kỹ năng chuẩn hóa từ từ điển công nghệ trung tâm.
                </p>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#071410] border border-slate-200 dark:border-[#1B3D34] text-xs space-y-1">
                  <span className="font-semibold block text-slate-800 dark:text-white">Tự động chuẩn hóa từ đồng nghĩa (Synonym Normalization):</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-[11px] pt-1">
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
              <section id="c-jobs" className="bg-white dark:bg-[#0E241E] p-6 sm:p-7 rounded-2xl border border-slate-200 dark:border-[#1B3D34] shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <Search className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <h2 className="text-xl font-editorial font-bold text-slate-900 dark:text-white">
                    5. Job Search & Refine Matches (Bộ Lọc Đối Sánh Thực Tế)
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Trang danh sách việc làm (<code className="bg-slate-100 dark:bg-[#071410] px-1.5 py-0.5 rounded text-emerald-700 dark:text-emerald-400 font-mono">/jobs</code>) tích hợp hệ thống <strong>Refine Matches</strong> lọc trực tiếp dữ liệu theo thời gian thực:
                </p>
                <ul className="text-xs space-y-1.5 text-slate-600 dark:text-slate-300 list-disc pl-5">
                  <li>Lọc theo từ khóa vị trí, công ty hoặc kỹ năng</li>
                  <li>Lọc theo Địa điểm (Hồ Chí Minh, Hà Nội, Đà Nẵng, Remote)</li>
                  <li>Lọc theo Ngành nghề và cấp bậc (Senior, Lead, Manager, Junior)</li>
                  <li>Lọc theo Hình thức làm việc (Full-time, Contract, Remote)</li>
                  <li>Lọc nhanh theo Ngành nghề mục tiêu đã đăng ký của bạn</li>
                  <li>Nút đặt lại bộ lọc tức thì (Reset Filters)</li>
                </ul>
              </section>

              {/* Section 6 */}
              <section id="c-apply" className="bg-white dark:bg-[#0E241E] p-6 sm:p-7 rounded-2xl border border-slate-200 dark:border-[#1B3D34] shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <Send className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <h2 className="text-xl font-editorial font-bold text-slate-900 dark:text-white">
                    6. Quick Apply 5 Bước & My Match Reports
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Quy trình nộp đơn 5 bước minh bạch cho phép ứng viên kiểm tra điểm đối sánh, lựa chọn phiên bản CV phù hợp nhất và xem trước giải trình trước khi bấm gửi:
                </p>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#071410] border border-slate-200 dark:border-[#1B3D34] text-xs space-y-1">
                  <p><strong>Bước 1:</strong> Xác thực hồ sơ và tài khoản</p>
                  <p><strong>Bước 2:</strong> Chọn phiên bản CV nộp đơn</p>
                  <p><strong>Bước 3:</strong> Trả lời câu hỏi sàng lọc của Nhà tuyển dụng</p>
                  <p><strong>Bước 4:</strong> Xem trước bảng phân tích điểm đối sánh (Core Score & Supplementary)</p>
                  <p><strong>Bước 5:</strong> Xác nhận nộp đơn và tạo bản lưu snapshot bất biến</p>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Theo dõi lại toàn bộ các báo cáo đối sánh tại mục <strong>My Match Reports</strong> (<code className="bg-slate-100 dark:bg-[#071410] px-1.5 py-0.5 rounded font-mono">/candidate/applications</code>).
                </p>
              </section>

              {/* Section 7 */}
              <section id="c-insufficient" className="bg-white dark:bg-[#0E241E] p-6 sm:p-7 rounded-2xl border border-slate-200 dark:border-[#1B3D34] shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  <h2 className="text-xl font-editorial font-bold text-slate-900 dark:text-white">
                    7. Insufficient Data Behavior (Trạng Thái Khi Chưa Đủ Dữ Liệu)
                  </h2>
                </div>
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                  <span className="font-semibold block">Chính sách minh bạch thuật toán MidCV:</span>
                  <p className="leading-relaxed">
                    Một ứng viên mới đăng ký chưa có CV hoặc chưa có thông tin kinh nghiệm/kỹ năng sẽ <strong>KHÔNG BAO GIỜ</strong> bị gán một con số ảo (như 96%, 85% hay 80%).
                  </p>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Hệ thống sẽ hiển thị trạng thái chuẩn hóa:
                </p>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#071410] border border-slate-300 dark:border-[#1B3D34] text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span>Chưa thể tính mức độ phù hợp</span>
                  <span className="text-[10px] text-slate-500 font-mono">(INSUFFICIENT_DATA)</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Kèm theo tooltip hướng dẫn: <em>"Bạn hãy thêm CV hoặc bổ sung thông tin kinh nghiệm, kỹ năng và thế mạnh để AI có đủ dữ liệu tính toán."</em>
                </p>
              </section>

              {/* Section 8 */}
              <section id="c-settings" className="bg-white dark:bg-[#0E241E] p-6 sm:p-7 rounded-2xl border border-slate-200 dark:border-[#1B3D34] shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <h2 className="text-xl font-editorial font-bold text-slate-900 dark:text-white">
                    8. Language Switcher & Dark/Light Mode (Đa Ngôn Ngữ & Giao Diện Sáng/Tối)
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  MidCV hỗ trợ tùy chỉnh trải nghiệm đầy đủ trên thanh điều hướng (Navbar):
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#071410] border border-slate-200 dark:border-[#1B3D34] space-y-1">
                    <span className="font-semibold text-slate-800 dark:text-white flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      Chuyển đổi Tiếng Việt / English
                    </span>
                    <p className="text-slate-500 dark:text-slate-400">
                      Bấm vào nút VI / EN trên Navbar để chuyển đổi toàn bộ nhãn hệ thống, bảng điều khiển và thông báo. Lựa chọn được lưu trữ bền vững trong trình duyệt.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#071410] border border-slate-200 dark:border-[#1B3D34] space-y-1">
                    <span className="font-semibold text-slate-800 dark:text-white flex items-center gap-1.5">
                      <Sun className="w-3.5 h-3.5 text-amber-500" />
                      Chế độ Sáng / Tối (Light / Dark)
                    </span>
                    <p className="text-slate-500 dark:text-slate-400">
                      Bấm biểu tượng Mặt trời / Mặt trăng để chuyển giữa giao diện nền Deep Forest Green tối và nền Ivory sáng tao nhã, không gây lóa mắt.
                    </p>
                  </div>
                </div>
              </section>

            </main>
          </div>
        )}

        {/* ============================================================ */}
        {/* RECRUITER USER GUIDE */}
        {/* ============================================================ */}
        {activeRole === 'recruiter' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            
            {/* Table of Contents Sticky Sidebar */}
            <aside className="lg:col-span-1 space-y-2 sticky top-24 self-start bg-white dark:bg-[#0E241E] p-4 rounded-2xl border border-slate-200 dark:border-[#1B3D34] shadow-xs">
              <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 block mb-2">
                {t('help.tocTitle', 'Guide Sections')}
              </span>
              <nav className="space-y-1 text-xs font-medium">
                <a href="#r-verification" className="block px-2.5 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#14332B] hover:text-emerald-600 dark:hover:text-emerald-400 transition">
                  1. Company Verification
                </a>
                <a href="#r-jdbuilder" className="block px-2.5 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#14332B] hover:text-emerald-600 dark:hover:text-emerald-400 transition">
                  2. JD Builder & AI Assistance
                </a>
                <a href="#r-pipeline" className="block px-2.5 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#14332B] hover:text-emerald-600 dark:hover:text-emerald-400 transition">
                  3. Candidate Pipeline & Ranking
                </a>
                <a href="#r-evidence" className="block px-2.5 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#14332B] hover:text-emerald-600 dark:hover:text-emerald-400 transition">
                  4. Match Evidence & Factors
                </a>
                <a href="#r-github" className="block px-2.5 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#14332B] hover:text-emerald-600 dark:hover:text-emerald-400 transition">
                  5. GitHub Signals (Zero Penalty)
                </a>
                <a href="#r-privacy" className="block px-2.5 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#14332B] hover:text-emerald-600 dark:hover:text-emerald-400 transition">
                  6. Privacy & Telemetry Analytics
                </a>
              </nav>
            </aside>

            {/* Main Content */}
            <main className="lg:col-span-3 space-y-8">
              
              {/* Section 1 */}
              <section id="r-verification" className="bg-white dark:bg-[#0E241E] p-6 sm:p-7 rounded-2xl border border-slate-200 dark:border-[#1B3D34] shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <h2 className="text-xl font-editorial font-bold text-slate-900 dark:text-white">
                    1. Company Verification (Xác Minh Doanh Nghiệp & HR Portal)
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Nhà tuyển dụng hoạt động trên MidCV được liên kết với một Doanh nghiệp chính thức. Huy hiệu <strong>Company Verified</strong> đảm bảo các vị trí tuyển dụng được chứng thực và bảo vệ quyền lợi ứng viên.
                </p>
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>Chỉ các tài khoản được ủy quyền mới có quyền truy cập vào danh sách ứng viên và báo cáo đối sánh thuộc phạm vi công ty mình.</span>
                </div>
              </section>

              {/* Section 2 */}
              <section id="r-jdbuilder" className="bg-white dark:bg-[#0E241E] p-6 sm:p-7 rounded-2xl border border-slate-200 dark:border-[#1B3D34] shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <h2 className="text-xl font-editorial font-bold text-slate-900 dark:text-white">
                    2. JD Builder & AI JD Assistance (Tạo Tin Tuyển Dụng Chuẩn Hóa)
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Màn hình tạo tin tuyển dụng (<code className="bg-slate-100 dark:bg-[#071410] px-1.5 py-0.5 rounded text-emerald-700 dark:text-emerald-400 font-mono">/recruiter/jobs/new</code>) hỗ trợ AI tinh chỉnh mô tả công việc:
                </p>
                <ul className="text-xs space-y-1.5 text-slate-600 dark:text-slate-300 list-disc pl-5">
                  <li>Tự động phân tách yêu cầu bắt buộc (REQUIRED) và ưu tiên (PREFERRED)</li>
                  <li>Chuẩn hóa số năm kinh nghiệm tối thiểu cho từng kỹ năng then chốt</li>
                  <li>Trợ lý AI tự động gợi ý bộ kỹ năng tương ứng với vị trí và tiêu đề công việc</li>
                  <li>Lưu dưới dạng bản nháp (Draft) hoặc Xuất bản công khai (Published) để đón nhận ứng viên</li>
                </ul>
              </section>

              {/* Section 3 */}
              <section id="r-pipeline" className="bg-white dark:bg-[#0E241E] p-6 sm:p-7 rounded-2xl border border-slate-200 dark:border-[#1B3D34] shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <h2 className="text-xl font-editorial font-bold text-slate-900 dark:text-white">
                    3. Candidate Pipeline & Ranking (Xếp Hạng Ứng Viên Khách Quan)
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Tại trang quản lý ứng viên theo vị trí (<code className="bg-slate-100 dark:bg-[#071410] px-1.5 py-0.5 rounded text-emerald-700 dark:text-emerald-400 font-mono">/recruiter/jobs/[id]/ranking</code>):
                </p>
                <ul className="text-xs space-y-1.5 text-slate-600 dark:text-slate-300 list-disc pl-5">
                  <li>Hệ sinh thái phân loại ứng viên theo các thứ tự xếp hạng (Rank 1, 2, 3...) dựa trên thuật toán tối ưu xếp hạng (NDCG@K)</li>
                  <li>Bộ lọc ngưỡng điểm đối sánh: Tối thiểu 80%, 70%, v.v.</li>
                  <li>Lọc ứng viên theo kỹ năng bắt buộc còn thiếu hoặc đã khớp toàn bộ</li>
                  <li>Cập nhật trạng thái ứng viên: Nộp đơn (Submitted) → Đang đánh giá (Under Review) → Chọn vào phỏng vấn (Shortlisted) → Từ chối (Rejected)</li>
                </ul>
              </section>

              {/* Section 4 */}
              <section id="r-evidence" className="bg-white dark:bg-[#0E241E] p-6 sm:p-7 rounded-2xl border border-slate-200 dark:border-[#1B3D34] shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <h2 className="text-xl font-editorial font-bold text-slate-900 dark:text-white">
                    4. Match Evidence & Factor Inspection (Bằng Chứng & Giải Trình Điểm)
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  MidCV kiên quyết từ chối phương pháp "Hộp đen" (Black Box AI). Mọi điểm số đưa ra cho Nhà tuyển dụng đều kèm theo bằng chứng cụ thể trích xuất trực tiếp từ CV của ứng viên:
                </p>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#071410] border border-slate-200 dark:border-[#1B3D34] text-xs space-y-1.5">
                  <p><strong>Core JD-CV Score:</strong> Mức độ đáp ứng trực tiếp các tiêu chí kỹ năng cốt lõi và số năm kinh nghiệm.</p>
                  <p><strong>Evidence Snippets:</strong> Đoạn văn bản trong CV chứng minh ứng viên đã sử dụng công nghệ đó trong dự án nào, thời gian nào.</p>
                  <p><strong>Missing Skills Alert:</strong> Liệt kê chính xác những kỹ năng nào trong JD mà ứng viên chưa đề cập tới.</p>
                </div>
              </section>

              {/* Section 5 */}
              <section id="r-github" className="bg-white dark:bg-[#0E241E] p-6 sm:p-7 rounded-2xl border border-slate-200 dark:border-[#1B3D34] shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <GitBranch className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <h2 className="text-xl font-editorial font-bold text-slate-900 dark:text-white">
                    5. GitHub Supporting Signals & Zero Penalty Policy (Chính Sách Không Phạt GitHub)
                  </h2>
                </div>
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
                  <span className="font-semibold block">NGUYÊN TẮC BẢO VỆ ỨNG VIÊN CỦA MIDCV:</span>
                  <p className="leading-relaxed">
                    Tín hiệu GitHub chỉ là tín hiệu <strong>BỔ TRỢ (Supplementary Only)</strong>. Không bao giờ hạ điểm hoặc phạt một ứng viên đủ điều kiện chỉ vì họ không cung cấp hoặc không có hoạt động GitHub công khai.
                  </p>
                </div>
                <ul className="text-xs space-y-1.5 text-slate-600 dark:text-slate-300 list-disc pl-5">
                  <li>Nếu ứng viên liên kết GitHub có mã nguồn liên quan: Điểm được kết hợp bổ trợ (85% Core + 15% GitHub).</li>
                  <li>Nếu ứng viên không có GitHub: Điểm đối sánh tự động Fallback 100% về Core JD-CV Score mà không bị trừ điểm nào.</li>
                  <li>Đối với các vị trí phi kỹ thuật (Marketing, HR, Finance): Tín hiệu GitHub tự động được bỏ qua.</li>
                </ul>
              </section>

              {/* Section 6 */}
              <section id="r-privacy" className="bg-white dark:bg-[#0E241E] p-6 sm:p-7 rounded-2xl border border-slate-200 dark:border-[#1B3D34] shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <h2 className="text-xl font-editorial font-bold text-slate-900 dark:text-white">
                    6. Privacy & Telemetry Analytics (Bảo Mật & Phân Tích Hiệu Suất)
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Hệ thống kiểm soát ủy quyền bảo mật cấp máy chủ (Server-side RBAC). Nhà tuyển dụng có thể theo dõi biểu đồ chuyển đổi phễu tuyển dụng, thời gian tuyển dụng trung bình (Time-to-Hire) và chất lượng nguồn ứng viên tại trang <strong>Recruitment Telemetry</strong> (<code className="bg-slate-100 dark:bg-[#071410] px-1.5 py-0.5 rounded font-mono">/recruiter</code> tab Analytics).
                </p>
              </section>

            </main>
          </div>
        )}

      </div>
    </div>
  );
}
