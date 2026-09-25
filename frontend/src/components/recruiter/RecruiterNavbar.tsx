'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Briefcase,
  PlusCircle,
  ShieldCheck,
  Globe,
  Menu,
  X,
  Cpu,
  LogOut
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { BrandLogo } from '@/components/common/BrandLogo';
import { ThemeSwitch } from '@/components/common/ThemeSwitch';
import { LogoutConfirmModal } from '@/components/auth/LogoutConfirmModal';

export const RecruiterNavbar: React.FC = () => {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { locale, toggleLocale, t } = useLanguage();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);

  // Automatically close mobile menu upon route change
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setIsMobileMenuOpen(false);
  }

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
    <>
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#0B1329]/95 backdrop-blur-md border-b border-[#E2E8F0] dark:border-[#1E293B] text-[#1E3A5F] dark:text-[#D6E4E1] transition-colors">
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2.5 sm:gap-4">
          
          {/* Brand & Recruiter Portal Indicator */}
          <div className="flex items-center gap-2.5 shrink-0">
            <BrandLogo href="/recruiter" size="md" />
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[#FEF3C7] dark:bg-[#FACC15]/15 text-[#B45309] dark:text-[#FACC15] border border-[#FACC15]/40 font-sans tracking-wide whitespace-nowrap">
              HR Portal
            </span>
          </div>

          {/* HR Navigation Links (Desktop - Strict HR only) */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2 text-xs font-semibold shrink-0">
            <Link
              href="/recruiter"
              className={`px-2.5 xl:px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                pathname === '/recruiter' 
                  ? 'bg-[#EFF6FF] dark:bg-[#152342] text-[#2563EB] dark:text-[#3B82F6] font-bold' 
                  : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F2A52] dark:hover:text-white hover:bg-[#F8FAFC] dark:hover:bg-[#18294E]'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>{t('recruiterNav.dashboard', 'HR Dashboard')}</span>
            </Link>

            <Link
              href="/recruiter/jobs"
              className={`px-2.5 xl:px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                isActive('/recruiter/jobs') 
                  ? 'bg-[#EFF6FF] dark:bg-[#152342] text-[#2563EB] dark:text-[#3B82F6] font-bold' 
                  : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F2A52] dark:hover:text-white hover:bg-[#F8FAFC] dark:hover:bg-[#18294E]'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>{t('recruiterNav.jobs', 'Quản lý Bài đăng')}</span>
            </Link>

            <Link
              href="/recruiter/company"
              className={`px-2.5 xl:px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                isActive('/recruiter/company') 
                  ? 'bg-[#EFF6FF] dark:bg-[#152342] text-[#2563EB] dark:text-[#3B82F6] font-bold' 
                  : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F2A52] dark:hover:text-white hover:bg-[#F8FAFC] dark:hover:bg-[#18294E]'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{t('recruiterNav.company', 'Doanh nghiệp')}</span>
            </Link>
          </nav>

          {/* Action Controls: Language, Theme, Create Job CTA, User Info, Logout */}
          <div className="flex items-center gap-2 sm:gap-2.5 xl:gap-3 shrink-0">
            {/* Language Switcher */}
            <button
              onClick={toggleLocale}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-bold rounded-lg border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111C38] text-[#1E3A5F] dark:text-[#D6E4E1] hover:border-[#2563EB] dark:hover:border-[#3B82F6] transition cursor-pointer shadow-2xs whitespace-nowrap shrink-0"
              title={t('nav.switchLang', 'Switch Language')}
            >
              <Globe className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#3B82F6]" />
              <span>{locale.toUpperCase()}</span>
            </button>

            {/* Theme Toggle Slider Switch */}
            <ThemeSwitch />

            {/* Create Job Action */}
            <Link
              href="/recruiter/jobs/new"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 xl:px-3.5 xl:py-2 rounded-xl text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] shadow-sm transition active:scale-95 whitespace-nowrap shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t('recruiterNav.createJob', 'Tạo Bài tuyển dụng')}</span>
            </Link>

            {/* HR User Profile Info (Desktop) */}
            <div className="hidden md:flex items-center gap-2 pl-2 border-l border-[#E2E8F0] dark:border-[#1E293B] shrink-0">
              <div className="text-right">
                <span className="text-xs font-semibold text-[#0F2A52] dark:text-[#F1F5F9] block truncate max-w-[100px] xl:max-w-[130px]">
                  {user?.fullName || 'HR Recruiter'}
                </span>
                <span className="text-[10px] font-mono font-bold text-[#B45309] dark:text-[#FACC15] bg-[#FEF3C7] dark:bg-[#FACC15]/15 px-1.5 py-0.2 rounded border border-[#FACC15]/40 uppercase inline-block">
                  HR
                </span>
              </div>
              <div className="relative w-8 h-8 rounded-full overflow-hidden border border-[#CBD5E1] dark:border-[#1E293B] shadow-xs shrink-0">
                <div className="w-full h-full bg-amber-50 dark:bg-[#1E293B] text-[#B45309] dark:text-[#FACC15] text-xs font-bold flex items-center justify-center select-none">
                  {user?.fullName ? user.fullName.trim().charAt(0).toUpperCase() : 'H'}
                </div>
              </div>
            </div>

            {/* HR Desktop Logout Button */}
            <button
              id="recruiter-navbar-logout-btn"
              onClick={() => setIsLogoutModalOpen(true)}
              aria-label={t('nav.signOut', 'Sign Out')}
              title={t('nav.signOut', 'Sign Out')}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-[#1E293B] text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-[#FEF2F2] dark:hover:bg-rose-950/30 transition cursor-pointer whitespace-nowrap shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="whitespace-nowrap">{t('nav.signOut', 'Sign Out')}</span>
            </button>

            {/* Recruiter Mobile Menu Hamburger */}
            <button
              id="recruiter-mobile-menu-btn"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? t('common.close', 'Đóng menu') : t('recruiterNav.mobileMenu', 'Menu tuyển dụng')}
              className="lg:hidden p-2 rounded-lg border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111C38] text-[#1E3A5F] dark:text-[#D6E4E1] hover:border-[#2563EB] transition cursor-pointer"
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
            className="fixed top-16 left-0 right-0 max-h-[calc(100vh-4rem)] overflow-y-auto bg-white dark:bg-[#0B1329] border-b border-[#E2E8F0] dark:border-[#1E293B] p-5 shadow-2xl space-y-4 z-50 lg:hidden animate-fade-in"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-[#1E293B]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-950/50 text-[#B45309] dark:text-[#FACC15] text-xs font-bold flex items-center justify-center">
                  {user?.fullName ? user.fullName.trim().charAt(0).toUpperCase() : 'H'}
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">{user?.fullName || 'HR Recruiter'}</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">{user?.email}</span>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold text-[#B45309] dark:text-[#FACC15] bg-[#FEF3C7] dark:bg-[#FACC15]/15 px-2 py-0.5 rounded border border-[#FACC15]/40 uppercase">
                HR
              </span>
            </div>

            <nav className="flex flex-col space-y-1">
              <Link
                href="/recruiter"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                  pathname === '/recruiter' 
                    ? 'bg-[#EFF6FF] dark:bg-[#152342] text-[#2563EB] dark:text-[#3B82F6] font-bold' 
                    : 'text-[#1E3A5F] dark:text-[#D6E4E1] hover:bg-[#F8FAFC] dark:hover:bg-[#18294E]'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-[#2563EB] dark:text-[#3B82F6]" />
                <span>{t('recruiterNav.dashboard', 'HR Dashboard')}</span>
              </Link>

              <Link
                href="/recruiter/jobs"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                  isActive('/recruiter/jobs') 
                    ? 'bg-[#EFF6FF] dark:bg-[#152342] text-[#2563EB] dark:text-[#3B82F6] font-bold' 
                    : 'text-[#1E3A5F] dark:text-[#D6E4E1] hover:bg-[#F8FAFC] dark:hover:bg-[#18294E]'
                }`}
              >
                <Briefcase className="w-4 h-4 text-[#2563EB] dark:text-[#3B82F6]" />
                <span>{t('recruiterNav.jobs', 'Quản lý Bài đăng')}</span>
              </Link>

              <Link
                href="/recruiter/company"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                  isActive('/recruiter/company') 
                    ? 'bg-[#EFF6FF] dark:bg-[#152342] text-[#2563EB] dark:text-[#3B82F6] font-bold' 
                    : 'text-[#1E3A5F] dark:text-[#D6E4E1] hover:bg-[#F8FAFC] dark:hover:bg-[#18294E]'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-[#2563EB] dark:text-[#3B82F6]" />
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

            {/* Mobile Drawer Logout Action */}
            <div className="pt-3 border-t border-[#E2E8F0] dark:border-[#1E293B]">
              <button
                id="recruiter-mobile-drawer-logout-btn"
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
          </div>
        )}
      </header>

      {/* Recruiter Logout Confirmation Modal */}
      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={logout}
      />
    </>
  );
};
