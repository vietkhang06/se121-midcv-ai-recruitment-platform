'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Briefcase,
  GitBranch,
  BarChart3,
  Building2,
  User,
  PlusCircle,
  Globe,
  Menu,
  X,
  LogOut,
  ChevronDown
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
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setIsMobileMenuOpen(false);
    setIsAccountMenuOpen(false);
  }

  // Handle escape key and outside click to close menus
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false);
        setIsAccountMenuOpen(false);
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target as Node)
      ) {
        setIsAccountMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const isActive = (path: string) => {
    return (
      pathname === path ||
      (path !== '/recruiter' && pathname?.startsWith(path))
    );
  };

  const navItems = [
    {
      href: '/recruiter',
      label: t('recruiterNav.dashboard', 'Tổng quan'),
      icon: LayoutDashboard,
      active: pathname === '/recruiter',
    },
    {
      href: '/recruiter/jobs',
      label: t('recruiterNav.jobs', 'Tin tuyển dụng'),
      icon: Briefcase,
      active: isActive('/recruiter/jobs'),
    },
    {
      href: '/recruiter/pipeline',
      label: t('recruiterNav.pipeline', 'Quy trình tuyển dụng'),
      icon: GitBranch,
      active: isActive('/recruiter/pipeline'),
    },
    {
      href: '/recruiter/analytics',
      label: t('recruiterNav.analytics', 'Phân tích & Báo cáo'),
      icon: BarChart3,
      active: isActive('/recruiter/analytics'),
    },
    {
      href: '/recruiter/company',
      label: t('recruiterNav.company', 'Doanh nghiệp'),
      icon: Building2,
      active: isActive('/recruiter/company'),
    },
    {
      href: '/recruiter/profile',
      label: t('recruiterNav.profile', 'Hồ sơ HR'),
      icon: User,
      active: isActive('/recruiter/profile'),
    },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#0B1329]/95 backdrop-blur-md border-b border-[#E2E8F0] dark:border-[#1E293B] text-[#1E3A5F] dark:text-[#D6E4E1] transition-colors w-full">
        {/* Tier 1: Brand Logo, Language, Theme, Create Job CTA, Account Menu, Direct Logout */}
        <div className="w-full">
          <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-15 flex items-center justify-between gap-3 min-w-0">
            {/* Left: Brand Logo & HR Badge */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 min-w-0">
              <BrandLogo href="/recruiter" size="md" />
              <span className="hidden sm:inline-block text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[#EFF6FF] dark:bg-[#1E3A5F]/40 text-[#2563EB] dark:text-[#3B82F6] border border-[#2563EB]/20 font-sans tracking-wide whitespace-nowrap">
                HR Portal
              </span>
            </div>

            {/* Right: Quick Tools, Create Job CTA, Account Dropdown & Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
              {/* Language Switch */}
              <button
                type="button"
                onClick={toggleLocale}
                className="flex items-center gap-1 px-2 sm:px-2.5 py-1 text-xs font-mono font-bold rounded-lg border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111C38] text-[#1E3A5F] dark:text-[#D6E4E1] hover:border-[#2563EB] dark:hover:border-[#3B82F6] transition cursor-pointer shadow-2xs whitespace-nowrap shrink-0"
                title={t('nav.switchLang', 'Switch Language')}
                aria-label={t('nav.switchLang', 'Switch Language')}
              >
                <Globe className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#3B82F6]" />
                <span>{locale.toUpperCase()}</span>
              </button>

              {/* Theme Switch */}
              <ThemeSwitch />

              {/* Create Job CTA */}
              <Link
                href="/recruiter/jobs/new"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] shadow-sm transition active:scale-95 whitespace-nowrap shrink-0"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{t('recruiterNav.createJob', 'Tạo bài tuyển dụng')}</span>
              </Link>

              {/* Account Dropdown Menu */}
              <div className="relative hidden sm:block" ref={accountMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsAccountMenuOpen((prev) => !prev)}
                  aria-expanded={isAccountMenuOpen}
                  aria-haspopup="true"
                  className="flex items-center gap-1.5 sm:gap-2 p-1 sm:px-2 sm:py-1 rounded-xl border border-transparent hover:border-[#E2E8F0] dark:hover:border-[#1E293B] hover:bg-slate-50 dark:hover:bg-[#111C38] transition cursor-pointer shrink-0"
                >
                  <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden border border-[#CBD5E1] dark:border-[#1E293B] shadow-2xs shrink-0 bg-amber-50 dark:bg-[#1E293B] text-[#B45309] dark:text-[#FACC15] text-xs font-bold flex items-center justify-center select-none">
                    {user?.fullName
                      ? user.fullName.trim().charAt(0).toUpperCase()
                      : 'H'}
                  </div>

                  <div className="hidden lg:flex flex-col text-left">
                    <span className="text-xs font-semibold text-[#0F2A52] dark:text-[#F1F5F9] max-w-[110px] truncate leading-tight">
                      {user?.fullName || 'HR Recruiter'}
                    </span>
                    <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] leading-tight">
                      Recruiter
                    </span>
                  </div>

                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                      isAccountMenuOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Dropdown Card */}
                {isAccountMenuOpen && (
                  <div id="recruiter-account-dropdown" className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-[#0B1329] border border-[#E2E8F0] dark:border-[#1E293B] shadow-xl py-2 z-50 text-xs">
                    <div className="px-3.5 py-2 border-b border-[#E2E8F0] dark:border-[#1E293B]">
                      <p className="font-bold text-[#0F2A52] dark:text-white truncate">
                        {user?.fullName || 'HR Recruiter'}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {user?.email}
                      </p>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span className="text-[10px] font-mono font-bold text-[#B45309] dark:text-[#FACC15] bg-[#FEF3C7] dark:bg-[#FACC15]/15 px-1.5 py-0.5 rounded border border-[#FACC15]/40 uppercase">
                          RECRUITER
                        </span>
                      </div>
                    </div>

                    <div className="py-1">
                      <Link
                        href="/recruiter/profile"
                        onClick={() => setIsAccountMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-[#EFF6FF] dark:hover:bg-[#13233F] hover:text-[#2563EB] dark:hover:text-[#3B82F6] transition"
                      >
                        <User className="w-4 h-4 text-[#2563EB] dark:text-[#3B82F6]" />
                        <span>{t('recruiterNav.profile', 'Hồ sơ HR')}</span>
                      </Link>

                      <Link
                        href="/recruiter/company"
                        onClick={() => setIsAccountMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-[#EFF6FF] dark:hover:bg-[#13233F] hover:text-[#2563EB] dark:hover:text-[#3B82F6] transition"
                      >
                        <Building2 className="w-4 h-4 text-[#2563EB] dark:text-[#3B82F6]" />
                        <span>{t('recruiterNav.company', 'Doanh nghiệp')}</span>
                      </Link>
                    </div>

                    <div className="pt-1 border-t border-[#E2E8F0] dark:border-[#1E293B]">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAccountMenuOpen(false);
                          setIsLogoutModalOpen(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition text-left cursor-pointer font-medium"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>{t('nav.signOut', 'Sign Out')}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Direct Desktop Logout Action */}
              <button
                id="recruiter-navbar-logout-btn"
                type="button"
                onClick={() => setIsLogoutModalOpen(true)}
                aria-label={t('nav.signOut', 'Sign Out')}
                title={t('nav.signOut', 'Sign Out')}
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-[#1E293B] text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-[#FEF2F2] dark:hover:bg-rose-950/30 transition cursor-pointer whitespace-nowrap shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="whitespace-nowrap">
                  {t('nav.signOut', 'Sign Out')}
                </span>
              </button>

              {/* Mobile Hamburger Button */}
              <button
                id="recruiter-mobile-menu-btn"
                type="button"
                onClick={() => setIsMobileMenuOpen((v) => !v)}
                aria-label={
                  isMobileMenuOpen
                    ? t('common.close', 'Đóng menu')
                    : t('recruiterNav.mobileMenu', 'Menu tuyển dụng')
                }
                aria-expanded={isMobileMenuOpen}
                className="md:hidden p-2 rounded-lg border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111C38] text-[#1E3A5F] dark:text-[#D6E4E1] hover:border-[#2563EB] transition cursor-pointer shrink-0"
              >
                {isMobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Tier 2: Recruiter Navigation Bar (Desktop & Tablet Horizontal Scrolling) */}
        <div className="hidden md:block w-full border-t border-[#E2E8F0]/80 dark:border-[#1E293B]/80 bg-slate-50/70 dark:bg-[#0B1528]/80">
          <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex items-center gap-1 sm:gap-2 py-2 overflow-x-auto no-scrollbar min-w-0">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                      item.active
                        ? 'bg-[#EFF6FF] dark:bg-[#152342] text-[#2563EB] dark:text-[#3B82F6] font-bold shadow-2xs'
                        : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F2A52] dark:hover:text-white hover:bg-white/60 dark:hover:bg-[#18294E]/60'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Mobile Backdrop */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 top-[56px] bg-black/50 backdrop-blur-xs z-40 md:hidden animate-fade-in"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="fixed top-[56px] left-0 right-0 max-h-[calc(100vh-3.5rem)] overflow-y-auto bg-white dark:bg-[#0B1329] border-b border-[#E2E8F0] dark:border-[#1E293B] p-5 shadow-2xl space-y-4 z-50 md:hidden animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-[#1E293B]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-amber-50 dark:bg-[#1E293B] text-[#B45309] dark:text-[#FACC15] text-xs font-bold flex items-center justify-center">
                  {user?.fullName
                    ? user.fullName.trim().charAt(0).toUpperCase()
                    : 'H'}
                </div>

                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    {user?.fullName || 'HR Recruiter'}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {user?.email}
                  </span>
                </div>
              </div>

              <span className="text-[10px] font-mono font-bold text-[#B45309] dark:text-[#FACC15] bg-[#FEF3C7] dark:bg-[#FACC15]/15 px-2 py-0.5 rounded border border-[#FACC15]/40 uppercase">
                HR
              </span>
            </div>

            <nav className="flex flex-col space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                      item.active
                        ? 'bg-[#EFF6FF] dark:bg-[#152342] text-[#2563EB] dark:text-[#3B82F6] font-bold'
                        : 'text-[#1E3A5F] dark:text-[#D6E4E1] hover:bg-[#F8FAFC] dark:hover:bg-[#18294E]'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-[#2563EB] dark:text-[#3B82F6]" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              <Link
                href="/recruiter/jobs/new"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 mt-2 rounded-xl text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] transition shadow-xs"
              >
                <PlusCircle className="w-4 h-4 text-white" />
                <span>{t('recruiterNav.createJob', 'Tạo Bài Tuyển Dụng')}</span>
              </Link>
            </nav>

            <div className="pt-3 border-t border-[#E2E8F0] dark:border-[#1E293B]">
              <button
                id="recruiter-mobile-drawer-logout-btn"
                type="button"
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

      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={logout}
      />
    </>
  );
};