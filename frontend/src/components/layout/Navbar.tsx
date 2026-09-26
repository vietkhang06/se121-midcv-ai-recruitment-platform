'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
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
  Globe,
  HelpCircle,
  Menu,
  X,
  Sparkles,
  ChevronDown
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, openAuthModal, logout } = useAuth();
  const { locale, toggleLocale, t } = useLanguage();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const [prevPathname, setPrevPathname] = useState(pathname);

  // Automatically close mobile drawer upon navigation (React 19 render-time adjustment)
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setIsMobileMenuOpen(false);
  }

  const isRecruiter = isAuthenticated && user?.role === 'RECRUITER';
  const isCandidate = isAuthenticated && user?.role === 'CANDIDATE';
  const isAdmin = isAuthenticated && user?.role === 'ADMIN';

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
    if (href === '/admin') return pathname === '/admin';
    return pathname === href;
  };

  // If on recruiter or admin portal routes, let their dedicated layouts handle top navigation
  if (pathname?.startsWith('/recruiter') || pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#0B1329]/95 backdrop-blur-md border-b border-blue-100/80 dark:border-[#1E293B] text-[#173B73] dark:text-[#D6E4E1] transition-colors">
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-2.5 xl:gap-4">
        
        {/* Brand Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <BrandLogo size="md" />

          {isRecruiter && (
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-[#0F2A52] dark:bg-[#13233F] text-white dark:text-[#3B82F6] border border-[#2563EB]/40 uppercase whitespace-nowrap">
              HR PORTAL
            </span>
          )}
          {isAdmin && (
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-indigo-950 text-indigo-300 border border-indigo-500/40 uppercase whitespace-nowrap">
              ADMIN
            </span>
          )}
        </div>

        {/* Desktop Navigation Menus (Strictly segregated by Role, no text compression) */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2.5 text-xs xl:text-[13px] font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap shrink-0">
          
          {/* 1. Việc làm (Public / Shared) */}
          <Link
            href="/jobs"
            className={`px-2.5 xl:px-3 py-1.5 rounded-lg hover:text-[#2563EB] dark:hover:text-[#3B82F6] transition-colors whitespace-nowrap shrink-0 ${
              isTabActive('/jobs') ? 'text-[#2563EB] font-bold' : ''
            }`}
          >
            {locale === 'vi' ? 'Việc làm' : 'Jobs'}
          </Link>

          {isCandidate && (
            /* CANDIDATE Desktop Links */
            <>
              {/* Tạo CV Dropdown */}
              <div className="relative group py-3 shrink-0">
                <Link
                  href="/candidate/cvs"
                  className={`flex items-center gap-1 px-2.5 xl:px-3 py-1.5 rounded-lg hover:text-[#2563EB] dark:hover:text-[#3B82F6] transition-colors whitespace-nowrap shrink-0 ${
                    isTabActive('/candidate/cvs') ? 'text-[#2563EB] font-bold' : ''
                  }`}
                >
                  <span className="whitespace-nowrap">{locale === 'vi' ? 'Tạo CV' : 'Create CV'}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#2563EB] group-hover:rotate-180 transition-transform duration-200 shrink-0" />
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

              {/* Công cụ Dropdown */}
              <div className="relative group py-3 shrink-0">
                <Link
                  href="/candidate/applications"
                  className={`flex items-center gap-1 px-2.5 xl:px-3 py-1.5 rounded-lg hover:text-[#2563EB] dark:hover:text-[#3B82F6] transition-colors whitespace-nowrap shrink-0 ${
                    isTabActive('/candidate/applications') ? 'text-[#2563EB] font-bold' : ''
                  }`}
                >
                  <span className="whitespace-nowrap">{locale === 'vi' ? 'Công cụ' : 'Tools'}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#2563EB] group-hover:rotate-180 transition-transform duration-200 shrink-0" />
                </Link>

                <div className="absolute top-full left-0 hidden group-hover:block bg-white dark:bg-[#111C38] border border-blue-100 dark:border-[#1E293B] rounded-xl shadow-xl py-2 w-64 z-50 animate-fade-in">
                  <Link href="/candidate/applications" className="block px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-[#18294E] hover:text-[#2563EB] whitespace-nowrap">
                    {locale === 'vi' ? 'Báo cáo ứng tuyển & Đối sánh' : 'Match & Application Reports'}
                  </Link>
                  <Link href="/candidate/profile" className="block px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-[#18294E] hover:text-[#2563EB] whitespace-nowrap">
                    {locale === 'vi' ? 'Xác thực hồ sơ & GitHub Signal' : 'Profile & GitHub Verification'}
                  </Link>
                </div>
              </div>
            </>
          )}

          {/* Hướng dẫn / Help (Public) */}
          <Link
            href="/help"
            className={`px-3 py-1.5 rounded-lg hover:text-[#2563EB] dark:hover:text-[#3B82F6] transition-colors whitespace-nowrap ${
              isTabActive('/help') ? 'text-[#2563EB] font-bold' : ''
            }`}
          >
            {locale === 'vi' ? 'Cẩm nang' : 'Help & Guides'}
          </Link>

          {/* midCV Pro Badge */}
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
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-bold rounded-lg border border-blue-100 dark:border-[#1E293B] bg-blue-50/50 dark:bg-[#111C38] text-slate-700 dark:text-slate-200 hover:border-[#2563EB] hover:text-[#2563EB] transition cursor-pointer shadow-2xs whitespace-nowrap shrink-0"
            title={locale === 'vi' ? 'Chuyển sang English' : 'Switch to Tiếng Việt'}
          >
            <Globe className="w-3.5 h-3.5 text-[#2563EB]" />
            <span className="whitespace-nowrap">{locale.toUpperCase()}</span>
          </button>

          {/* Theme Toggle Slider Switch */}
          <ThemeSwitch />

          {isAuthenticated ? (
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              {/* Role-Specific Destination CTA */}
              {isAdmin ? (
                <Link
                  href="/admin"
                  className="hidden xl:inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 transition whitespace-nowrap shrink-0"
                >
                  {locale === 'vi' ? 'Cổng Quản trị (Admin)' : 'Admin Portal'}
                </Link>
              ) : isRecruiter ? (
                <Link
                  href="/recruiter"
                  className="hidden xl:inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 transition whitespace-nowrap shrink-0"
                >
                  {locale === 'vi' ? 'Cổng Tuyển dụng (HR)' : 'Recruiter Portal'}
                </Link>
              ) : null}

              {/* User Name & Role */}
              <div className="text-right hidden sm:block">
                <span className="text-xs font-semibold text-[#0F2A52] dark:text-[#F1F5F9] block truncate max-w-[100px] xl:max-w-[130px]">{user?.fullName}</span>
                {user?.role && (
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border uppercase inline-block ${
                    user.role === 'ADMIN'
                      ? 'text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-900'
                      : user.role === 'RECRUITER'
                      ? 'text-amber-600 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-900'
                      : 'text-[#2563EB] dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-900'
                  }`}>
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
              {/* Đăng nhập */}
              <button
                onClick={() => openAuthModal('LOGIN')}
                className="px-3.5 py-2 rounded-full text-xs font-bold text-[#173B73] dark:text-slate-200 hover:text-[#2563EB] dark:hover:text-[#3B82F6] hover:bg-blue-50/70 dark:hover:bg-[#152342] transition cursor-pointer whitespace-nowrap shrink-0"
              >
                {locale === 'vi' ? 'Đăng nhập' : 'Sign In'}
              </button>

              {/* Đăng ký */}
              <button
                onClick={() => openAuthModal('REGISTER')}
                className="px-5 py-2 rounded-full text-xs font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] transition shadow-xs cursor-pointer whitespace-nowrap shrink-0 active:scale-95"
              >
                {locale === 'vi' ? 'Đăng ký' : 'Register'}
              </button>

              {/* Dành cho Doanh nghiệp (Anonymous only) */}
              <Link
                href="/recruiter"
                className="hidden xl:inline-flex items-center px-3.5 py-2 rounded-full text-xs font-semibold bg-blue-50/80 dark:bg-[#152342] hover:bg-blue-100 dark:hover:bg-[#1C2F57] text-[#173B73] dark:text-blue-200 border border-blue-200/60 dark:border-blue-900/50 transition cursor-pointer whitespace-nowrap shrink-0"
              >
                {locale === 'vi' ? 'Dành cho Doanh nghiệp' : 'For Employers'}
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
          className="fixed top-16 left-0 right-0 max-h-[calc(100vh-4rem)] overflow-y-auto bg-white dark:bg-[#0B1329] border-b border-slate-200 dark:border-[#1E293B] p-5 shadow-2xl space-y-4 z-50 lg:hidden animate-fade-in"
        >
          {/* User Info Row in Mobile */}
          {isAuthenticated ? (
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#1E293B]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-[#152342] text-[#2563EB] dark:text-[#3B82F6] text-xs font-bold flex items-center justify-center">
                  {user?.fullName ? user.fullName.trim().charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">{user?.fullName}</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">{user?.email}</span>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold text-[#2563EB] dark:text-[#3B82F6] bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800 uppercase">
                {user?.role}
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 pb-3 border-b border-slate-100 dark:border-[#1E293B]">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  openAuthModal('LOGIN');
                }}
                className="w-full py-2 text-center text-xs font-semibold rounded-lg border border-slate-200 dark:border-[#1E293B] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#18294E] transition cursor-pointer"
              >
                {t('nav.signIn', 'Sign In')}
              </button>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  openAuthModal('REGISTER');
                }}
                className="w-full py-2 text-center text-xs font-semibold rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white transition cursor-pointer shadow-xs"
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
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition ${isTabActive('/recruiter') ? 'bg-[#EFF6FF] dark:bg-[#152342] text-[#2563EB] dark:text-[#3B82F6] font-bold' : 'text-[#1E3A5F] dark:text-[#D6E4E1] hover:bg-[#F8FAFC] dark:hover:bg-[#18294E]'}`}
                >
                  <Briefcase className="w-4 h-4 text-[#2563EB] dark:text-[#3B82F6]" />
                  <span>{t('recruiterNav.dashboard', 'HR Dashboard')}</span>
                </Link>
                <Link
                  href="/recruiter/jobs"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition ${isTabActive('/recruiter/jobs') ? 'bg-[#EFF6FF] dark:bg-[#152342] text-[#2563EB] dark:text-[#3B82F6] font-bold' : 'text-[#1E3A5F] dark:text-[#D6E4E1] hover:bg-[#F8FAFC] dark:hover:bg-[#18294E]'}`}
                >
                  <FileText className="w-4 h-4 text-[#2563EB] dark:text-[#3B82F6]" />
                  <span>{t('recruiterNav.jobs', 'Quản lý Bài đăng')}</span>
                </Link>
                <Link
                  href="/recruiter/company"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition ${isTabActive('/recruiter/company') ? 'bg-[#EFF6FF] dark:bg-[#152342] text-[#2563EB] dark:text-[#3B82F6] font-bold' : 'text-[#1E3A5F] dark:text-[#D6E4E1] hover:bg-[#F8FAFC] dark:hover:bg-[#18294E]'}`}
                >
                  <ShieldCheck className="w-4 h-4 text-[#2563EB] dark:text-[#3B82F6]" />
                  <span>{t('recruiterNav.company', 'Doanh nghiệp')}</span>
                </Link>
              </>
            ) : (
              <>
                {/* 1. Tìm việc / Find Jobs */}
                <Link
                  href="/jobs"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition ${isTabActive('/jobs') ? 'bg-[#EFF6FF] dark:bg-[#152342] text-[#2563EB] dark:text-[#3B82F6] font-bold' : 'text-[#1E3A5F] dark:text-[#D6E4E1] hover:bg-[#F8FAFC] dark:hover:bg-[#18294E]'}`}
                >
                  <Search className="w-4 h-4 text-[#2563EB] dark:text-[#3B82F6]" />
                  <span>{t('nav.searchJobs', 'Tìm Việc Làm')}</span>
                </Link>

                {/* 2. Đối sánh / Match Reports */}
                <Link
                  href="/candidate/applications"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition ${isTabActive('/candidate/applications') ? 'bg-[#EFF6FF] dark:bg-[#152342] text-[#2563EB] dark:text-[#3B82F6] font-bold' : 'text-[#1E3A5F] dark:text-[#D6E4E1] hover:bg-[#F8FAFC] dark:hover:bg-[#18294E]'}`}
                >
                  <GitCompare className="w-4 h-4 text-[#2563EB] dark:text-[#3B82F6]" />
                  <span>{t('nav.matchReports', 'Báo Cáo Phù Hợp')}</span>
                </Link>

                {/* 3. CV của tôi / My CV */}
                <Link
                  href="/candidate/cvs"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition ${isTabActive('/candidate/cvs') ? 'bg-[#EFF6FF] dark:bg-[#152342] text-[#2563EB] dark:text-[#3B82F6] font-bold' : 'text-[#1E3A5F] dark:text-[#D6E4E1] hover:bg-[#F8FAFC] dark:hover:bg-[#18294E]'}`}
                >
                  <FileText className="w-4 h-4 text-[#2563EB] dark:text-[#3B82F6]" />
                  <span>{t('nav.cvManagement', 'Quản Lý CV')}</span>
                </Link>

                {/* 4. Hồ sơ / Profile */}
                <Link
                  href="/candidate/profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition ${isTabActive('/candidate/profile') ? 'bg-[#EFF6FF] dark:bg-[#152342] text-[#2563EB] dark:text-[#3B82F6] font-bold' : 'text-[#1E3A5F] dark:text-[#D6E4E1] hover:bg-[#F8FAFC] dark:hover:bg-[#18294E]'}`}
                >
                  <UserIcon className="w-4 h-4 text-[#2563EB] dark:text-[#3B82F6]" />
                  <span>{t('nav.dashboard', 'Tổng Quan')}</span>
                </Link>

                {!isCandidate && (
                  <>
                    <a
                      href="#pipeline"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-[#1E3A5F] dark:text-[#D6E4E1] hover:bg-[#F8FAFC] dark:hover:bg-[#18294E] transition"
                    >
                      <Sparkles className="w-4 h-4 text-[#2563EB] dark:text-[#3B82F6]" />
                      <span>{t('nav.features', 'Tính Năng')}</span>
                    </a>
                    <Link
                      href="/recruiter"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-[#1E3A5F] dark:text-[#D6E4E1] hover:bg-[#F8FAFC] dark:hover:bg-[#18294E] transition"
                    >
                      <Briefcase className="w-4 h-4 text-[#2563EB] dark:text-[#3B82F6]" />
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
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition ${isTabActive('/help') ? 'bg-[#EFF6FF] dark:bg-[#152342] text-[#2563EB] dark:text-[#3B82F6] font-bold' : 'text-[#1E3A5F] dark:text-[#D6E4E1] hover:bg-[#F8FAFC] dark:hover:bg-[#18294E]'}`}
            >
              <HelpCircle className="w-4 h-4 text-[#2563EB] dark:text-[#3B82F6]" />
              <span>{t('nav.help', 'Hướng Dẫn Sử Dụng')}</span>
            </Link>
          </nav>

          {/* Mobile Logout Action */}
          {isAuthenticated && (
            <div className="pt-3 border-t border-slate-100 dark:border-[#1E293B]">
              <button
                id="mobile-drawer-logout-btn"
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

      </header>

      {/* Logout Confirmation Modal */}
      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={logout}
      />
    </>
  );
};
