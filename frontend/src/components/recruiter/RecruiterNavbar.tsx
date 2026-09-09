'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Building2,
  LayoutDashboard,
  Briefcase,
  PlusCircle,
  ShieldCheck,
  Moon,
  Sun,
  Globe,
  Menu,
  X,
  ArrowLeft
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';

export const RecruiterNavbar: React.FC = () => {
  const pathname = usePathname();
  const { locale, toggleLocale, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Automatically close mobile menu upon route change
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

  const isActive = (path: string) => pathname === path || (path !== '/recruiter' && pathname?.startsWith(path));

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#071410]/95 backdrop-blur-md border-b border-[#E2E8F0] dark:border-[#1B3D34] text-slate-800 dark:text-slate-100 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3 sm:gap-4">
        
        {/* Brand & Recruiter Portal Indicator */}
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/recruiter" className="flex items-center gap-2 font-extrabold text-lg text-slate-900 dark:text-white">
            <div className="w-8 h-8 rounded-xl bg-[var(--primary)] dark:bg-[var(--primary-foreground)]/20 border border-emerald-500/30 flex items-center justify-center text-[#10B981] shadow-xs">
              <Building2 className="w-4 h-4" />
            </div>
            <span className="font-editorial text-2xl tracking-normal text-[#0C2B24] dark:text-white">
              MatchJD <span className="text-amber-700 dark:text-amber-400 text-xs font-semibold px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-500/30 font-sans tracking-wide">HR Portal</span>
            </span>
          </Link>
        </div>

        {/* HR Navigation Links (Desktop) */}
        <nav className="hidden lg:flex items-center gap-1.5 xl:gap-3 text-xs font-semibold">
          <Link
            href="/recruiter"
            className={`px-3 py-2 rounded-xl transition flex items-center gap-1.5 ${
              pathname === '/recruiter' 
                ? 'bg-slate-100 dark:bg-[var(--surface-secondary)] text-[var(--primary)] dark:text-emerald-400 font-bold' 
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-[#0E241E]'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>{t('recruiterNav.dashboard', 'HR Dashboard')}</span>
          </Link>

          <Link
            href="/recruiter/jobs"
            className={`px-3 py-2 rounded-xl transition flex items-center gap-1.5 ${
              isActive('/recruiter/jobs') 
                ? 'bg-slate-100 dark:bg-[#14332B] text-[#0C2B24] dark:text-emerald-400 font-bold' 
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-[#0E241E]'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>{t('recruiterNav.jobs', 'Quản lý Bài đăng')}</span>
          </Link>

          <Link
            href="/recruiter/company"
            className={`px-3 py-2 rounded-xl transition flex items-center gap-1.5 ${
              isActive('/recruiter/company') 
                ? 'bg-slate-100 dark:bg-[#14332B] text-[#0C2B24] dark:text-emerald-400 font-bold' 
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-[#0E241E]'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{t('recruiterNav.company', 'Doanh nghiệp')}</span>
          </Link>
        </nav>

        {/* Action Controls: Language, Theme, Create Job CTA, Back to Candidate */}
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

          {/* Create Job Action */}
          <Link
            href="/recruiter/jobs/new"
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] dark:bg-[var(--primary-foreground)] dark:hover:bg-[var(--primary-hover)] dark:text-[var(--foreground)] shadow-xs transition active:scale-95 shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t('recruiterNav.createJob', 'Tạo Bài tuyển dụng')}</span>
          </Link>

          {/* Candidate Portal Shortcut */}
          <Link
            href="/"
            className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white border-l border-slate-200 dark:border-slate-800 pl-3 hidden md:block shrink-0"
          >
            {t('recruiterNav.candidatePortal', 'Về Cổng Ứng viên')}
          </Link>

          {/* Recruiter Mobile Menu Hamburger */}
          <button
            id="recruiter-mobile-menu-btn"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? t('common.close', 'Đóng menu') : t('recruiterNav.mobileMenu', 'Menu tuyển dụng')}
            className="lg:hidden p-2 rounded-lg border border-slate-200 dark:border-[#1B3D34] bg-slate-50 dark:bg-[var(--surface-card)] text-slate-700 dark:text-slate-200 hover:border-slate-400 dark:hover:border-emerald-500 transition cursor-pointer"
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

      {/* Recruiter Mobile Drawer Panel */}
      {isMobileMenuOpen && (
        <div 
          className="fixed top-16 left-0 right-0 max-h-[calc(100vh-4rem)] overflow-y-auto bg-[var(--background)] dark:bg-[var(--background)] border-b border-slate-200 dark:border-[#1B3D34] p-5 shadow-2xl space-y-4 z-50 lg:hidden animate-fade-in"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#1B3D34]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#0C2B24] dark:bg-[#10B981]/20 border border-emerald-500/30 flex items-center justify-center text-[#10B981]">
                <Building2 className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                MatchJD HR Portal
              </span>
            </div>
            <span className="text-[10px] font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
              RECRUITER
            </span>
          </div>

          <nav className="flex flex-col space-y-1">
            <Link
              href="/recruiter"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                pathname === '/recruiter' 
                  ? 'bg-emerald-50 dark:bg-[#14332B] text-[#0C2B24] dark:text-emerald-400 font-bold' 
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#0E241E]'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{t('recruiterNav.dashboard', 'HR Dashboard')}</span>
            </Link>

            <Link
              href="/recruiter/jobs"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                isActive('/recruiter/jobs') 
                  ? 'bg-emerald-50 dark:bg-[#14332B] text-[#0C2B24] dark:text-emerald-400 font-bold' 
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#0E241E]'
              }`}
            >
              <Briefcase className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{t('recruiterNav.jobs', 'Quản lý Bài đăng')}</span>
            </Link>

            <Link
              href="/recruiter/company"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                isActive('/recruiter/company') 
                  ? 'bg-emerald-50 dark:bg-[#14332B] text-[#0C2B24] dark:text-emerald-400 font-bold' 
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#0E241E]'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{t('recruiterNav.company', 'Doanh nghiệp')}</span>
            </Link>

            <Link
              href="/recruiter/jobs/new"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/40 hover:bg-emerald-100 transition"
            >
              <PlusCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{t('recruiterNav.createJob', 'Tạo Bài tuyển dụng')}</span>
            </Link>
          </nav>

          <div className="pt-3 border-t border-slate-100 dark:border-[#1B3D34]">
            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 dark:border-[#1B3D34] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#14332B] transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t('recruiterNav.candidatePortal', 'Về Cổng Ứng viên')}</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
