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
import { BrandLogo } from '@/components/common/BrandLogo';
import { ThemeSwitch } from '@/components/common/ThemeSwitch';

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
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#071A17]/95 backdrop-blur-md border-b border-[#E2E8F0] dark:border-[#1F4A40] text-[#1E3A5F] dark:text-[#D6E4E1] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3 sm:gap-4">
        
        {/* Brand & Recruiter Portal Indicator */}
        <div className="flex items-center gap-2.5 shrink-0">
          <BrandLogo href="/recruiter" size="md" />
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[#FEF3C7] dark:bg-[#FACC15]/15 text-[#B45309] dark:text-[#FACC15] border border-[#FACC15]/40 font-sans tracking-wide">
            HR Portal
          </span>
        </div>

        {/* HR Navigation Links (Desktop) */}
        <nav className="hidden lg:flex items-center gap-1.5 xl:gap-3 text-xs font-semibold">
          <Link
            href="/recruiter"
            className={`px-3 py-2 rounded-xl transition flex items-center gap-1.5 ${
              pathname === '/recruiter' 
                ? 'bg-[#EFF6FF] dark:bg-[#14332D] text-[#2563EB] dark:text-[#3B82F6] font-bold' 
                : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F2A52] dark:hover:text-white hover:bg-[#F8FAFC] dark:hover:bg-[#102A25]'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>{t('recruiterNav.dashboard', 'HR Dashboard')}</span>
          </Link>

          <Link
            href="/recruiter/jobs"
            className={`px-3 py-2 rounded-xl transition flex items-center gap-1.5 ${
              isActive('/recruiter/jobs') 
                ? 'bg-[#EFF6FF] dark:bg-[#14332D] text-[#2563EB] dark:text-[#3B82F6] font-bold' 
                : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F2A52] dark:hover:text-white hover:bg-[#F8FAFC] dark:hover:bg-[#102A25]'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>{t('recruiterNav.jobs', 'Quản lý Bài đăng')}</span>
          </Link>

          <Link
            href="/recruiter/company"
            className={`px-3 py-2 rounded-xl transition flex items-center gap-1.5 ${
              isActive('/recruiter/company') 
                ? 'bg-[#EFF6FF] dark:bg-[#14332D] text-[#2563EB] dark:text-[#3B82F6] font-bold' 
                : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F2A52] dark:hover:text-white hover:bg-[#F8FAFC] dark:hover:bg-[#102A25]'
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
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-bold rounded-lg border border-[#E2E8F0] dark:border-[#1F4A40] bg-white dark:bg-[#102A25] text-[#1E3A5F] dark:text-[#D6E4E1] hover:border-[#2563EB] dark:hover:border-[#00B14F] transition cursor-pointer shadow-2xs"
            title={t('nav.switchLang', 'Switch Language')}
          >
            <Globe className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#00B14F]" />
            <span>{locale.toUpperCase()}</span>
          </button>

          {/* Theme Toggle Slider Switch (Kiểu gạt qua lại) */}
          <ThemeSwitch />

          {/* Create Job Action */}
          <Link
            href="/recruiter/jobs/new"
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] shadow-sm transition active:scale-95 shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t('recruiterNav.createJob', 'Tạo Bài tuyển dụng')}</span>
          </Link>

          {/* Candidate Portal Shortcut */}
          <Link
            href="/"
            className="text-xs text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F2A52] dark:hover:text-white border-l border-[#E2E8F0] dark:border-[#1F4A40] pl-3 hidden md:block shrink-0"
          >
            {t('recruiterNav.candidatePortal', 'Về Cổng Ứng viên')}
          </Link>

          {/* Recruiter Mobile Menu Hamburger */}
          <button
            id="recruiter-mobile-menu-btn"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? t('common.close', 'Đóng menu') : t('recruiterNav.mobileMenu', 'Menu tuyển dụng')}
            className="lg:hidden p-2 rounded-lg border border-[#E2E8F0] dark:border-[#1F4A40] bg-white dark:bg-[#102A25] text-[#1E3A5F] dark:text-[#D6E4E1] hover:border-[#2563EB] transition cursor-pointer"
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
          className="fixed top-16 left-0 right-0 max-h-[calc(100vh-4rem)] overflow-y-auto bg-white dark:bg-[#071A17] border-b border-[#E2E8F0] dark:border-[#1F4A40] p-5 shadow-2xl space-y-4 z-50 lg:hidden animate-fade-in"
        >
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-[#1F4A40]">
            <BrandLogo href="/recruiter" size="sm" />
            <span className="text-[10px] font-mono font-bold text-[#B45309] dark:text-[#FACC15] bg-[#FEF3C7] dark:bg-[#FACC15]/15 px-2 py-0.5 rounded border border-[#FACC15]/40 uppercase">
              RECRUITER
            </span>
          </div>

          <nav className="flex flex-col space-y-1">
            <Link
              href="/recruiter"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                pathname === '/recruiter' 
                  ? 'bg-[#EFF6FF] dark:bg-[#14332D] text-[#2563EB] dark:text-[#3B82F6] font-bold' 
                  : 'text-[#1E3A5F] dark:text-[#D6E4E1] hover:bg-[#F8FAFC] dark:hover:bg-[#102A25]'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-[#2563EB] dark:text-[#00B14F]" />
              <span>{t('recruiterNav.dashboard', 'HR Dashboard')}</span>
            </Link>

            <Link
              href="/recruiter/jobs"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                isActive('/recruiter/jobs') 
                  ? 'bg-[#EFF6FF] dark:bg-[#14332D] text-[#2563EB] dark:text-[#3B82F6] font-bold' 
                  : 'text-[#1E3A5F] dark:text-[#D6E4E1] hover:bg-[#F8FAFC] dark:hover:bg-[#102A25]'
              }`}
            >
              <Briefcase className="w-4 h-4 text-[#2563EB] dark:text-[#00B14F]" />
              <span>{t('recruiterNav.jobs', 'Quản lý Bài đăng')}</span>
            </Link>

            <Link
              href="/recruiter/company"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                isActive('/recruiter/company') 
                  ? 'bg-[#EFF6FF] dark:bg-[#14332D] text-[#2563EB] dark:text-[#3B82F6] font-bold' 
                  : 'text-[#1E3A5F] dark:text-[#D6E4E1] hover:bg-[#F8FAFC] dark:hover:bg-[#102A25]'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-[#2563EB] dark:text-[#00B14F]" />
              <span>{t('recruiterNav.company', 'Doanh nghiệp')}</span>
            </Link>

            <Link
              href="/recruiter/jobs/new"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] transition shadow-xs"
            >
              <PlusCircle className="w-4 h-4 text-white" />
              <span>{t('recruiterNav.createJob', 'Tạo Bài tuyển dụng')}</span>
            </Link>
          </nav>

          <div className="pt-3 border-t border-[#E2E8F0] dark:border-[#1F4A40]">
            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#1F4A40] text-xs font-semibold text-[#1E3A5F] dark:text-[#D6E4E1] hover:bg-[#F8FAFC] dark:hover:bg-[#102A25] transition"
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
