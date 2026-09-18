'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { LogoutConfirmModal } from '@/components/auth/LogoutConfirmModal';
import { BrandLogo } from '@/components/common/BrandLogo';
import { ThemeSwitch } from '@/components/common/ThemeSwitch';
import {
  ShieldCheck,
  LogOut,
  Briefcase,
  FileText,
  User as UserIcon,
  GitCompare,
  Search,
  CheckCircle2,
  Sun,
  Moon,
  Globe,
  HelpCircle,
  Menu,
  X,
  Sparkles,
  ChevronDown
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, openAuthModal, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { locale, toggleLocale, t } = useLanguage();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const isRecruiter = isAuthenticated && user?.role === 'RECRUITER';
  const isCandidate = isAuthenticated && user?.role === 'CANDIDATE';

  // Automatically close mobile drawer upon navigation
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Handle escape key to close mobile menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };
    if (isMobileMenuOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

  const isTabActive = (href: string) => {
    if (!pathname) return false;
    if (href === '/jobs') return pathname === '/jobs' || pathname.startsWith('/jobs/');
    if (href === '/candidate/applications') return pathname === '/candidate/applications';
    if (href === '/candidate/cvs') return pathname.startsWith('/candidate/cvs');
    if (href === '/candidate/profile') return pathname === '/candidate/profile';
    if (href === '/help') return pathname === '/help';
    if (href === '/recruiter') return pathname === '/recruiter';
    if (href === '/recruiter/jobs') return pathname.startsWith('/recruiter/jobs');
    if (href === '/recruiter/company') return pathname.startsWith('/recruiter/company');
    return pathname === href;
  };

  // If on recruiter portal routes, let RecruiterLayout / RecruiterNavbar handle top navigation
  if (pathname?.startsWith('/recruiter')) {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#0B1329]/95 backdrop-blur-md border-b border-blue-100/80 dark:border-[#1E293B] text-[#173B73] dark:text-[#D6E4E1] transition-colors">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-2 xl:gap-4">
        
        {/* Brand Logo (No tagline under logo as requested) */}
        <div className="flex items-center gap-3 shrink-0">
          <BrandLogo size="md" />

          {isRecruiter && (
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-[#0F2A52] dark:bg-[#13233F] text-white dark:text-[#3B82F6] border border-[#2563EB]/40 uppercase whitespace-nowrap">
              HR PORTAL
            </span>
          )}
        </div>

        {/* Desktop Navigation Menus (whitespace-nowrap to prevent line breaks) */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2.5 text-xs xl:text-[13px] font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap shrink-0">
          
          {/* 1. Việc làm Dropdown */}
          <div className="relative group py-3 shrink-0">
            <Link
              href="/jobs"
              className={`flex items-center gap-1 px-2.5 xl:px-3 py-1.5 rounded-lg hover:text-[#2563EB] dark:hover:text-[#3B82F6] transition-colors whitespace-nowrap ${
                isTabActive('/jobs') ? 'text-[#2563EB] font-bold' : ''
              }`}
            >
              <span className="whitespace-nowrap">{locale === 'vi' ? 'Việc làm' : 'Jobs'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#2563EB] group-hover:rotate-180 transition-transform duration-200" />
            </Link>

            <div className="absolute top-full left-0 hidden group-hover:block bg-white dark:bg-[#111C38] border border-blue-100 dark:border-[#1E293B] rounded-xl shadow-xl py-2 w-56 z-50 animate-fade-in">
              <Link href="/jobs" className="block px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-[#18294E] hover:text-[#2563EB] whitespace-nowrap">
                {locale === 'vi' ? 'Tìm việc làm mới nhất' : 'Find Latest Jobs'}
              </Link>
              <Link href="/jobs" className="block px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-[#18294E] hover:text-[#2563EB] whitespace-nowrap">
                {locale === 'vi' ? 'Việc làm IT & Công nghệ' : 'Technology & IT Roles'}
              </Link>
              <Link href="/jobs" className="block px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-[#18294E] hover:text-[#2563EB] whitespace-nowrap">
                {locale === 'vi' ? 'Việc làm đối sánh AI phù hợp' : 'AI Matched Positions'}
              </Link>
            </div>
          </div>

          {/* 2. Tạo CV Dropdown */}
          <div className="relative group py-3 shrink-0">
            <Link
              href="/candidate/cvs"
              className={`flex items-center gap-1 px-2.5 xl:px-3 py-1.5 rounded-lg hover:text-[#2563EB] dark:hover:text-[#3B82F6] transition-colors whitespace-nowrap ${
                isTabActive('/candidate/cvs') ? 'text-[#2563EB] font-bold' : ''
              }`}
            >
              <span className="whitespace-nowrap">{locale === 'vi' ? 'Tạo CV' : 'Create CV'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#2563EB] group-hover:rotate-180 transition-transform duration-200" />
            </Link>

            <div className="absolute top-full left-0 hidden group-hover:block bg-white dark:bg-[#111C38] border border-blue-100 dark:border-[#1E293B] rounded-xl shadow-xl py-2 w-60 z-50 animate-fade-in">
              <Link href="/candidate/cvs" className="block px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-[#18294E] hover:text-[#2563EB] whitespace-nowrap">
                {locale === 'vi' ? 'Thư viện CV của tôi' : 'My CV Repository'}
              </Link>
              <Link href="/candidate/cvs" className="block px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-[#18294E] hover:text-[#2563EB] whitespace-nowrap">
                {locale === 'vi' ? 'Tải lên CV & Trích xuất AI' : 'Upload CV & AI Parser'}
              </Link>
              <Link href="/candidate/cvs/builder" className="block px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-[#18294E] hover:text-[#2563EB] whitespace-nowrap">
                {locale === 'vi' ? 'Trình tạo CV chuẩn ATS' : 'ATS Resume Studio'}
              </Link>
            </div>
          </div>

          {/* 3. Công cụ Dropdown */}
          <div className="relative group py-3 shrink-0">
            <Link
              href="/candidate/applications"
              className={`flex items-center gap-1 px-2.5 xl:px-3 py-1.5 rounded-lg hover:text-[#2563EB] dark:hover:text-[#3B82F6] transition-colors whitespace-nowrap ${
                isTabActive('/candidate/applications') ? 'text-[#2563EB] font-bold' : ''
              }`}
            >
              <span className="whitespace-nowrap">{locale === 'vi' ? 'Công cụ' : 'Tools'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#2563EB] group-hover:rotate-180 transition-transform duration-200" />
            </Link>

            <div className="absolute top-full left-0 hidden group-hover:block bg-white dark:bg-[#111C38] border border-blue-100 dark:border-[#1E293B] rounded-xl shadow-xl py-2 w-64 z-50 animate-fade-in">
              <Link href="/candidate/applications" className="block px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-[#18294E] hover:text-[#2563EB] whitespace-nowrap">
                {locale === 'vi' ? 'Báo cáo ứng tuyển & Đối sánh' : 'Match & Application Reports'}
              </Link>
              <Link href="/candidate/profile" className="block px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-[#18294E] hover:text-[#2563EB] whitespace-nowrap">
                {locale === 'vi' ? 'Xác thực hồ sơ & GitHub Signal' : 'Profile & GitHub Verification'}
              </Link>
              <Link href="/help" className="block px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-[#18294E] hover:text-[#2563EB] whitespace-nowrap">
                {locale === 'vi' ? 'Kiểm tra độ chuẩn hóa NDCG@3' : 'NDCG@3 Validation Telemetry'}
              </Link>
            </div>
          </div>

          {/* 4. Cẩm nang nghề nghiệp */}
          <div className="relative group py-3 shrink-0">
            <Link
              href="/help"
              className={`flex items-center gap-1 px-2.5 xl:px-3 py-1.5 rounded-lg hover:text-[#2563EB] dark:hover:text-[#3B82F6] transition-colors whitespace-nowrap ${
                isTabActive('/help') ? 'text-[#2563EB] font-bold' : ''
              }`}
            >
              <span className="whitespace-nowrap">{locale === 'vi' ? 'Cẩm nang nghề nghiệp' : 'Career Guide'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#2563EB] group-hover:rotate-180 transition-transform duration-200" />
            </Link>

            <div className="absolute top-full left-0 hidden group-hover:block bg-white dark:bg-[#111C38] border border-blue-100 dark:border-[#1E293B] rounded-xl shadow-xl py-2 w-64 z-50 animate-fade-in">
              <Link href="/help" className="block px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-[#18294E] hover:text-[#2563EB] whitespace-nowrap">
                {locale === 'vi' ? 'Hướng dẫn nền tảng midCV®' : 'midCV® Platform Guide'}
              </Link>
              <Link href="/help" className="block px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-[#18294E] hover:text-[#2563EB] whitespace-nowrap">
                {locale === 'vi' ? 'Chính sách bảo vệ Zero-Penalty' : 'Zero-Penalty Policy'}
              </Link>
            </div>
          </div>

          {/* 5. midCV Pro Badge */}
          <Link
            href="/help"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:text-[#2563EB] dark:hover:text-[#3B82F6] transition whitespace-nowrap shrink-0"
          >
            <span className="whitespace-nowrap">midCV</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold font-mono bg-[#FEF3C7] dark:bg-amber-950/80 text-[#D97706] dark:text-amber-300 border border-[#FDE68A] dark:border-amber-700">
              Pro
            </span>
          </Link>

        </nav>

        {/* Action Controls & User Right Section */}
        <div className="flex items-center gap-2 sm:gap-2.5 xl:gap-3 shrink-0">
          
          {/* Language Switcher */}
          <button
            onClick={toggleLocale}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full border border-blue-100 dark:border-[#1E293B] bg-blue-50/50 dark:bg-[#111C38] text-slate-700 dark:text-slate-200 hover:border-[#2563EB] hover:text-[#2563EB] transition cursor-pointer shadow-2xs whitespace-nowrap shrink-0"
            title={locale === 'vi' ? 'Chuyển sang English' : 'Switch to Tiếng Việt'}
          >
            <Globe className="w-3.5 h-3.5 text-[#2563EB]" />
            <span className="whitespace-nowrap">{locale.toUpperCase()}</span>
          </button>

          {/* Theme Toggle Slider Switch (Kiểu gạt qua lại) */}
          <ThemeSwitch />

          {isAuthenticated ? (
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Recruiter button */}
              <Link
                href="/recruiter"
                className="hidden xl:inline-flex items-center px-4 py-2 rounded-full text-xs font-semibold bg-blue-50 dark:bg-[#152342] hover:bg-blue-100 dark:hover:bg-[#1C2F57] text-[#173B73] dark:text-blue-200 border border-blue-200/60 dark:border-blue-900/50 transition whitespace-nowrap"
              >
                {locale === 'vi' ? 'Đăng tuyển & tìm hồ sơ' : 'Recruiter Portal'}
              </Link>

              {/* User Name & Role */}
              <div className="text-right hidden sm:block">
                <span className="text-xs font-semibold text-[#0F2A52] dark:text-[#F1F5F9] block truncate max-w-[140px]">{user?.fullName}</span>
                {user?.role && (
                  <span className="text-[10px] font-mono font-bold text-[#2563EB] bg-blue-50 dark:bg-[#2563EB]/15 px-1.5 py-0.5 rounded border border-[#2563EB]/30 uppercase inline-block">
                    {user.role}
                  </span>
                )}
              </div>

              {/* Avatar */}
              <div className="relative w-8 h-8 rounded-full overflow-hidden border border-[#CBD5E1] dark:border-[#1E293B] shadow-xs shrink-0">
                <div className="w-full h-full bg-blue-50 dark:bg-[#152342] text-[#2563EB] text-xs font-bold flex items-center justify-center select-none">
                  {user?.fullName ? user.fullName.trim().charAt(0).toUpperCase() : 'U'}
                </div>
              </div>

              {/* Desktop Logout Button */}
              <button
                id="navbar-logout-btn"
                onClick={() => setIsLogoutModalOpen(true)}
                aria-label={t('nav.signOut', 'Sign Out')}
                title={t('nav.signOut', 'Sign Out')}
                className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-[#1E293B] text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-[#FEF2F2] dark:hover:bg-rose-950/30 transition cursor-pointer whitespace-nowrap shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="whitespace-nowrap">{t('nav.signOut', 'Sign Out')}</span>
              </button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2 xl:gap-2.5 shrink-0">
              {/* Đăng nhập: Clean text / subtle pill matching Image 3 */}
              <button
                onClick={() => openAuthModal('LOGIN')}
                className="px-3.5 py-2 rounded-full text-xs font-bold text-[#173B73] dark:text-slate-200 hover:text-[#2563EB] dark:hover:text-[#3B82F6] hover:bg-blue-50/70 dark:hover:bg-[#152342] transition cursor-pointer whitespace-nowrap shrink-0"
              >
                {locale === 'vi' ? 'Đăng nhập' : 'Sign In'}
              </button>

              {/* Đăng ký: Solid blue pill (#2563EB) matching Image 3 */}
              <button
                onClick={() => openAuthModal('REGISTER')}
                className="px-5 py-2 rounded-full text-xs font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] transition shadow-xs cursor-pointer whitespace-nowrap shrink-0 active:scale-95"
              >
                {locale === 'vi' ? 'Đăng ký' : 'Register'}
              </button>

              {/* Đăng tuyển & tìm hồ sơ: Subtle pill */}
              <Link
                href="/recruiter"
                className="hidden xl:inline-flex items-center px-3.5 py-2 rounded-full text-xs font-semibold bg-blue-50/80 dark:bg-[#152342] hover:bg-blue-100 dark:hover:bg-[#1C2F57] text-[#173B73] dark:text-blue-200 border border-blue-200/60 dark:border-blue-900/50 transition cursor-pointer whitespace-nowrap shrink-0"
              >
                {locale === 'vi' ? 'Đăng tuyển & tìm hồ sơ' : 'Recruiter Portal'}
              </Link>
            </div>
          )}

          {/* Mobile Menu Hamburger Button */}
          <button
            id="mobile-menu-btn"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? t('common.close', 'Đóng menu') : t('nav.mobileMenu', 'Menu điều hướng')}
            className="lg:hidden p-2 rounded-lg border border-slate-200 dark:border-[#1E293B] bg-white dark:bg-[#111C38] text-slate-800 dark:text-slate-200 hover:border-[#2563EB] transition cursor-pointer"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

        </div>

      </div>

      {/* Mobile Drawer Backdrop Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 top-16 bg-black/50 backdrop-blur-xs z-40 lg:hidden animate-fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Drawer Panel */}
      {isMobileMenuOpen && (
        <div 
          className="fixed top-16 left-0 right-0 max-h-[calc(100vh-4rem)] overflow-y-auto bg-white dark:bg-[#071410] border-b border-slate-200 dark:border-[#1B3D34] p-5 shadow-2xl space-y-4 z-50 lg:hidden animate-fade-in"
        >
          {/* User Info Row in Mobile */}
          {isAuthenticated ? (
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#1B3D34]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#0C2B24] dark:bg-emerald-900 text-[#10B981] dark:text-emerald-200 text-xs font-bold flex items-center justify-center">
                  {user?.fullName ? user.fullName.trim().charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">{user?.fullName}</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">{user?.email}</span>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 uppercase">
                {user?.role}
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 pb-3 border-b border-slate-100 dark:border-[#1B3D34]">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  openAuthModal('LOGIN');
                }}
                className="w-full py-2 text-center text-xs font-semibold rounded-lg border border-slate-200 dark:border-[#1B3D34] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#14332B] transition cursor-pointer"
              >
                {t('nav.signIn', 'Sign In')}
              </button>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  openAuthModal('REGISTER');
                }}
                className="w-full py-2 text-center text-xs font-semibold rounded-lg bg-[#0C2B24] dark:bg-emerald-700 text-white hover:bg-[#164E41] transition cursor-pointer shadow-xs"
              >
                {t('nav.register', 'Register')}
              </button>
            </div>
          )}

          {/* Navigation Links in Mobile */}
          <nav className="flex flex-col space-y-1">
            {isRecruiter ? (
              <>
                <Link
                  href="/recruiter"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition ${isTabActive('/recruiter') ? 'bg-[#EFF6FF] dark:bg-[#14332D] text-[#2563EB] dark:text-[#3B82F6] font-bold' : 'text-[#1E3A5F] dark:text-[#D6E4E1] hover:bg-[#F8FAFC] dark:hover:bg-[#102A25]'}`}
                >
                  <Briefcase className="w-4 h-4 text-[#2563EB] dark:text-[#00B14F]" />
                  <span>{t('recruiterNav.dashboard', 'HR Dashboard')}</span>
                </Link>
                <Link
                  href="/recruiter/jobs"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition ${isTabActive('/recruiter/jobs') ? 'bg-[#EFF6FF] dark:bg-[#14332D] text-[#2563EB] dark:text-[#3B82F6] font-bold' : 'text-[#1E3A5F] dark:text-[#D6E4E1] hover:bg-[#F8FAFC] dark:hover:bg-[#102A25]'}`}
                >
                  <FileText className="w-4 h-4 text-[#2563EB] dark:text-[#00B14F]" />
                  <span>{t('recruiterNav.jobs', 'Quản lý Bài đăng')}</span>
                </Link>
                <Link
                  href="/recruiter/company"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition ${isTabActive('/recruiter/company') ? 'bg-[#EFF6FF] dark:bg-[#14332D] text-[#2563EB] dark:text-[#3B82F6] font-bold' : 'text-[#1E3A5F] dark:text-[#D6E4E1] hover:bg-[#F8FAFC] dark:hover:bg-[#102A25]'}`}
                >
                  <ShieldCheck className="w-4 h-4 text-[#2563EB] dark:text-[#00B14F]" />
                  <span>{t('recruiterNav.company', 'Doanh nghiệp')}</span>
                </Link>
              </>
            ) : (
              <>
                {/* 1. Tìm việc / Find Jobs */}
                <Link
                  href="/jobs"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition ${isTabActive('/jobs') ? 'bg-[#EFF6FF] dark:bg-[#14332D] text-[#2563EB] dark:text-[#3B82F6] font-bold' : 'text-[#1E3A5F] dark:text-[#D6E4E1] hover:bg-[#F8FAFC] dark:hover:bg-[#102A25]'}`}
                >
                  <Search className="w-4 h-4 text-[#2563EB] dark:text-[#00B14F]" />
                  <span>{t('nav.searchJobs', 'Tìm Việc Làm')}</span>
                </Link>

                {/* 2. Đối sánh / Match Reports */}
                <Link
                  href="/candidate/applications"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition ${isTabActive('/candidate/applications') ? 'bg-[#EFF6FF] dark:bg-[#14332D] text-[#2563EB] dark:text-[#3B82F6] font-bold' : 'text-[#1E3A5F] dark:text-[#D6E4E1] hover:bg-[#F8FAFC] dark:hover:bg-[#102A25]'}`}
                >
                  <GitCompare className="w-4 h-4 text-[#2563EB] dark:text-[#00B14F]" />
                  <span>{t('nav.matchReports', 'Báo Cáo Phù Hợp')}</span>
                </Link>

                {/* 3. CV của tôi / My CV */}
                <Link
                  href="/candidate/cvs"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition ${isTabActive('/candidate/cvs') ? 'bg-[#EFF6FF] dark:bg-[#14332D] text-[#2563EB] dark:text-[#3B82F6] font-bold' : 'text-[#1E3A5F] dark:text-[#D6E4E1] hover:bg-[#F8FAFC] dark:hover:bg-[#102A25]'}`}
                >
                  <FileText className="w-4 h-4 text-[#2563EB] dark:text-[#00B14F]" />
                  <span>{t('nav.cvManagement', 'Quản Lý CV')}</span>
                </Link>

                {/* 4. Hồ sơ / Profile */}
                <Link
                  href="/candidate/profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition ${isTabActive('/candidate/profile') ? 'bg-[#EFF6FF] dark:bg-[#14332D] text-[#2563EB] dark:text-[#3B82F6] font-bold' : 'text-[#1E3A5F] dark:text-[#D6E4E1] hover:bg-[#F8FAFC] dark:hover:bg-[#102A25]'}`}
                >
                  <UserIcon className="w-4 h-4 text-[#2563EB] dark:text-[#00B14F]" />
                  <span>{t('nav.dashboard', 'Tổng Quan')}</span>
                </Link>

                {!isCandidate && (
                  <>
                    <a
                      href="#pipeline"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-[#1E3A5F] dark:text-[#D6E4E1] hover:bg-[#F8FAFC] dark:hover:bg-[#102A25] transition"
                    >
                      <Sparkles className="w-4 h-4 text-[#2563EB] dark:text-[#00B14F]" />
                      <span>{t('nav.features', 'Tính Năng')}</span>
                    </a>
                    <Link
                      href="/recruiter"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-[#1E3A5F] dark:text-[#D6E4E1] hover:bg-[#F8FAFC] dark:hover:bg-[#102A25] transition"
                    >
                      <Briefcase className="w-4 h-4 text-[#2563EB] dark:text-[#00B14F]" />
                      <span>{t('nav.forEmployers', 'Dành Cho Doanh Nghiệp')}</span>
                    </Link>
                  </>
                )}
              </>
            )}

            {/* 5. Hướng dẫn / Help */}
            <Link
              href="/help"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition ${isTabActive('/help') ? 'bg-[#EFF6FF] dark:bg-[#14332D] text-[#2563EB] dark:text-[#3B82F6] font-bold' : 'text-[#1E3A5F] dark:text-[#D6E4E1] hover:bg-[#F8FAFC] dark:hover:bg-[#102A25]'}`}
            >
              <HelpCircle className="w-4 h-4 text-[#2563EB] dark:text-[#00B14F]" />
              <span>{t('nav.help', 'Hướng Dẫn Sử Dụng')}</span>
            </Link>
          </nav>

          {/* Mobile Logout Action */}
          {isAuthenticated && (
            <div className="pt-3 border-t border-slate-100 dark:border-[#1B3D34]">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsLogoutModalOpen(true);
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/40 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>{t('nav.signOut', 'Sign Out')}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Logout Confirmation Modal */}
      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={logout}
      />
    </header>
  );
};
