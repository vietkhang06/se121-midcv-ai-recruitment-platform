'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { LogoutConfirmModal } from '@/components/auth/LogoutConfirmModal';
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
  Sparkles
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
    if (href === '/') return pathname === '/';
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
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#071410]/95 backdrop-blur-md border-b border-[#E2E8F0] dark:border-[#1B3D34] text-slate-800 dark:text-slate-100 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3 sm:gap-4">
        
        {/* Brand Logo & Portal Badge */}
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-xl tracking-tight text-slate-900 dark:text-white group">
            <div className="w-8 h-8 rounded-lg bg-[#0C2B24] dark:bg-[#10B981]/20 border border-emerald-500/30 flex items-center justify-center text-[#10B981] shadow-xs group-hover:bg-[#133E34] transition">
              <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
            </div>
            <span className="font-editorial text-2xl tracking-normal text-[#0C2B24] dark:text-white">MatchJD</span>
          </Link>

          {isRecruiter && (
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-black dark:bg-emerald-950 text-white dark:text-emerald-300 border border-emerald-500/30 uppercase">
              HR PORTAL
            </span>
          )}
        </div>

        {/* Desktop Navigation Links (Prioritized & Zero-Overflow) */}
        <nav className="hidden lg:flex items-center gap-2 xl:gap-5 text-xs xl:text-sm font-semibold text-slate-600 dark:text-slate-300">
          {isRecruiter ? (
            <>
              <Link
                href="/recruiter"
                className={`hover:text-[#0C2B24] dark:hover:text-emerald-400 transition-colors pb-1 px-1.5 ${isTabActive('/recruiter') ? 'text-[#0C2B24] dark:text-emerald-400 font-bold border-b-2 border-[#0C2B24] dark:border-emerald-400' : ''}`}
              >
                {t('recruiterNav.dashboard', 'HR Dashboard')}
              </Link>
              <Link
                href="/recruiter/jobs"
                className={`hover:text-[#0C2B24] dark:hover:text-emerald-400 transition-colors pb-1 px-1.5 ${isTabActive('/recruiter/jobs') ? 'text-[#0C2B24] dark:text-emerald-400 font-bold border-b-2 border-[#0C2B24] dark:border-emerald-400' : ''}`}
              >
                {t('recruiterNav.jobs', 'Quản lý Bài đăng')}
              </Link>
              <Link
                href="/recruiter/company"
                className={`hover:text-[#0C2B24] dark:hover:text-emerald-400 transition-colors pb-1 px-1.5 ${isTabActive('/recruiter/company') ? 'text-[#0C2B24] dark:text-emerald-400 font-bold border-b-2 border-[#0C2B24] dark:border-emerald-400' : ''}`}
              >
                {t('recruiterNav.company', 'Doanh nghiệp')}
              </Link>
            </>
          ) : isCandidate ? (
            <>
              {/* 1. Tìm việc / Find Jobs */}
              <Link
                href="/jobs"
                className={`hover:text-[#0C2B24] dark:hover:text-emerald-400 transition-colors pb-1 px-1.5 ${isTabActive('/jobs') ? 'text-[#0C2B24] dark:text-emerald-400 font-bold border-b-2 border-[#0C2B24] dark:border-emerald-400' : ''}`}
              >
                {t('nav.searchJobs', 'Tìm Việc Làm')}
              </Link>

              {/* 2. Đối sánh / Match Reports */}
              <Link
                href="/candidate/applications"
                className={`hover:text-[#0C2B24] dark:hover:text-emerald-400 transition-colors pb-1 px-1.5 ${isTabActive('/candidate/applications') ? 'text-[#0C2B24] dark:text-emerald-400 font-bold border-b-2 border-[#0C2B24] dark:border-emerald-400' : ''}`}
              >
                {t('nav.matchReports', 'Báo Cáo Phù Hợp')}
              </Link>

              {/* 3. CV của tôi / My CV */}
              <Link
                href="/candidate/cvs"
                className={`hover:text-[#0C2B24] dark:hover:text-emerald-400 transition-colors pb-1 px-1.5 ${isTabActive('/candidate/cvs') ? 'text-[#0C2B24] dark:text-emerald-400 font-bold border-b-2 border-[#0C2B24] dark:border-emerald-400' : ''}`}
              >
                {t('nav.cvManagement', 'Quản Lý CV')}
              </Link>

              {/* 4. Hồ sơ / Profile */}
              <Link
                href="/candidate/profile"
                className={`hover:text-[#0C2B24] dark:hover:text-emerald-400 transition-colors pb-1 px-1.5 ${isTabActive('/candidate/profile') ? 'text-[#0C2B24] dark:text-emerald-400 font-bold border-b-2 border-[#0C2B24] dark:border-emerald-400' : ''}`}
              >
                {t('nav.dashboard', 'Tổng Quan')}
              </Link>
            </>
          ) : (
            <>
              <Link href="/jobs" className="hover:text-[#0C2B24] dark:hover:text-emerald-400 transition-colors pb-1 px-1.5">
                {t('nav.searchJobs', 'Tìm Việc Làm')}
              </Link>
              <a href="#pipeline" className="hover:text-[#0C2B24] dark:hover:text-emerald-400 transition-colors pb-1 px-1.5">
                {t('nav.features', 'Tính Năng')}
              </a>
              <Link href="/recruiter" className="hover:text-[#0C2B24] dark:hover:text-emerald-400 transition-colors pb-1 px-1.5">
                {t('nav.forEmployers', 'Dành Cho Doanh Nghiệp')}
              </Link>
            </>
          )}

          {/* 5. Hướng dẫn / Help */}
          <Link
            href="/help"
            className={`hover:text-[#0C2B24] dark:hover:text-emerald-400 transition-colors flex items-center gap-1 pb-1 px-1.5 ${isTabActive('/help') ? 'text-[#0C2B24] dark:text-emerald-400 font-bold border-b-2 border-[#0C2B24] dark:border-emerald-400' : ''}`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>{t('nav.help', 'Hướng Dẫn Sử Dụng')}</span>
          </Link>
        </nav>

        {/* Action Controls & User Right Section */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Language Switcher */}
          <button
            onClick={toggleLocale}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-bold rounded-lg border border-slate-200 dark:border-[#1B3D34] bg-slate-50 dark:bg-[#0E241E] text-slate-700 dark:text-slate-200 hover:border-slate-400 dark:hover:border-emerald-500 transition cursor-pointer"
            title={t('nav.switchLang', 'Switch Language')}
          >
            <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{locale.toUpperCase()}</span>
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-[#1B3D34] bg-slate-50 dark:bg-[#0E241E] text-slate-700 dark:text-slate-200 hover:border-slate-400 dark:hover:border-emerald-500 transition cursor-pointer"
            title={t('nav.switchTheme', 'Toggle Light/Dark Mode')}
            aria-label="Toggle Theme"
          >
            {theme === 'light' ? (
              <Moon className="w-4 h-4 text-slate-700" />
            ) : (
              <Sun className="w-4 h-4 text-amber-400" />
            )}
          </button>

          {isAuthenticated ? (
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Profile Verified Indicator */}
              {isCandidate && (
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 bg-slate-100/80 dark:bg-[#0E241E] px-2.5 py-1 rounded-full border border-slate-200 dark:border-[#1B3D34]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>{t('nav.profileStrength', 'Hồ sơ đã xác minh')}</span>
                </div>
              )}

              {/* User Name & Role */}
              <div className="text-right hidden sm:block">
                <span className="text-xs font-semibold text-slate-900 dark:text-white block truncate max-w-[140px]">{user?.fullName}</span>
                {user?.role && (
                  <span className="text-[10px] font-mono font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 uppercase inline-block">
                    {user.role}
                  </span>
                )}
              </div>

              {/* Avatar */}
              <div className="relative w-8 h-8 rounded-full overflow-hidden border border-slate-300 dark:border-[#1B3D34] shadow-xs shrink-0">
                <div className="w-full h-full bg-[#0C2B24] dark:bg-emerald-900 text-[#10B981] dark:text-emerald-200 text-xs font-bold flex items-center justify-center select-none">
                  {user?.fullName ? user.fullName.trim().charAt(0).toUpperCase() : 'U'}
                </div>
              </div>

              {/* Desktop Logout Button */}
              <button
                id="navbar-logout-btn"
                onClick={() => setIsLogoutModalOpen(true)}
                aria-label={t('nav.signOut', 'Sign Out')}
                title={t('nav.signOut', 'Sign Out')}
                className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-[#1B3D34] text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-[#14332B] transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{t('nav.signOut', 'Sign Out')}</span>
              </button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={() => openAuthModal('LOGIN')}
                className="text-xs sm:text-sm font-semibold text-[#0C2B24] dark:text-emerald-400 hover:text-[#10B981] px-2.5 py-1.5 transition cursor-pointer"
              >
                {t('nav.signIn', 'Sign In')}
              </button>
              <button
                onClick={() => openAuthModal('REGISTER')}
                className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold text-white bg-[#0C2B24] dark:bg-emerald-700 hover:bg-[#164E41] dark:hover:bg-emerald-600 transition shadow-xs cursor-pointer"
              >
                {t('nav.register', 'Register')}
              </button>
            </div>
          )}

          {/* Mobile Menu Hamburger Button */}
          <button
            id="mobile-menu-btn"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? t('common.close', 'Đóng menu') : t('nav.mobileMenu', 'Menu điều hướng')}
            className="lg:hidden p-2 rounded-lg border border-slate-200 dark:border-[#1B3D34] bg-slate-50 dark:bg-[#0E241E] text-slate-700 dark:text-slate-200 hover:border-slate-400 dark:hover:border-emerald-500 transition cursor-pointer"
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
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition ${isTabActive('/recruiter') ? 'bg-emerald-50 dark:bg-[#14332B] text-[#0C2B24] dark:text-emerald-400 font-bold' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#0E241E]'}`}
                >
                  <Briefcase className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{t('recruiterNav.dashboard', 'HR Dashboard')}</span>
                </Link>
                <Link
                  href="/recruiter/jobs"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition ${isTabActive('/recruiter/jobs') ? 'bg-emerald-50 dark:bg-[#14332B] text-[#0C2B24] dark:text-emerald-400 font-bold' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#0E241E]'}`}
                >
                  <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{t('recruiterNav.jobs', 'Quản lý Bài đăng')}</span>
                </Link>
                <Link
                  href="/recruiter/company"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition ${isTabActive('/recruiter/company') ? 'bg-emerald-50 dark:bg-[#14332B] text-[#0C2B24] dark:text-emerald-400 font-bold' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#0E241E]'}`}
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{t('recruiterNav.company', 'Doanh nghiệp')}</span>
                </Link>
              </>
            ) : (
              <>
                {/* 1. Tìm việc / Find Jobs */}
                <Link
                  href="/jobs"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition ${isTabActive('/jobs') ? 'bg-emerald-50 dark:bg-[#14332B] text-[#0C2B24] dark:text-emerald-400 font-bold' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#0E241E]'}`}
                >
                  <Search className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{t('nav.searchJobs', 'Tìm Việc Làm')}</span>
                </Link>

                {/* 2. Đối sánh / Match Reports */}
                <Link
                  href="/candidate/applications"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition ${isTabActive('/candidate/applications') ? 'bg-emerald-50 dark:bg-[#14332B] text-[#0C2B24] dark:text-emerald-400 font-bold' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#0E241E]'}`}
                >
                  <GitCompare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{t('nav.matchReports', 'Báo Cáo Phù Hợp')}</span>
                </Link>

                {/* 3. CV của tôi / My CV */}
                <Link
                  href="/candidate/cvs"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition ${isTabActive('/candidate/cvs') ? 'bg-emerald-50 dark:bg-[#14332B] text-[#0C2B24] dark:text-emerald-400 font-bold' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#0E241E]'}`}
                >
                  <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{t('nav.cvManagement', 'Quản Lý CV')}</span>
                </Link>

                {/* 4. Hồ sơ / Profile */}
                <Link
                  href="/candidate/profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition ${isTabActive('/candidate/profile') ? 'bg-emerald-50 dark:bg-[#14332B] text-[#0C2B24] dark:text-emerald-400 font-bold' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#0E241E]'}`}
                >
                  <UserIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{t('nav.dashboard', 'Tổng Quan')}</span>
                </Link>

                {!isCandidate && (
                  <>
                    <a
                      href="#pipeline"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#0E241E] transition"
                    >
                      <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>{t('nav.features', 'Tính Năng')}</span>
                    </a>
                    <Link
                      href="/recruiter"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#0E241E] transition"
                    >
                      <Briefcase className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
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
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition ${isTabActive('/help') ? 'bg-emerald-50 dark:bg-[#14332B] text-[#0C2B24] dark:text-emerald-400 font-bold' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#0E241E]'}`}
            >
              <HelpCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
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
