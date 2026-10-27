'use client';

import { AccountTools } from '@/components/inbox/AccountTools';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Briefcase,
  GitBranch,
  BarChart3,
  Building2,
  User,
  PlusCircle,
  Globe,
  Menu,
  X,
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

  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setIsMobileMenuOpen(false);
  }

  // Handle escape key and outside click to close menus
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false);
          }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
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

  const isSuspended = user?.accountStatus === 'SUSPENDED' || user?.isActive === false;

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[var(--surface)]/95 backdrop-blur-md border-b border-[var(--border-soft)] dark:border-[var(--border)] text-[var(--heading)] dark:text-[var(--text-secondary)] transition-colors w-full">
        {/* Tier 1: Brand Logo, Language, Theme, Create Job CTA, Account Menu, Direct Logout */}
        <div className="w-full">
          <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-15 flex items-center justify-between gap-3 min-w-0">
            {/* Left: Brand Logo & HR Badge */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 min-w-0">
              <BrandLogo href="/recruiter" size="md" />
              <span className="hidden sm:inline-block text-[11px] font-semibold px-2 py-0.5 rounded-xl bg-[var(--surface-secondary)] dark:bg-[var(--surface)]/40 text-[var(--primary)] dark:text-[var(--retro-sky)] border border-[var(--border)]/20 font-sans tracking-wide whitespace-nowrap">
                HR Portal
              </span>
              {isSuspended && (
                <span className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-800 tracking-wide uppercase whitespace-nowrap">
                  Tài khoản bị đình chỉ
                </span>
              )}
            </div>

            {/* Right: Quick Tools, Create Job CTA, Account Dropdown & Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
              {/* Language Switch */}
              <button
                type="button"
                onClick={toggleLocale}
                className="flex items-center gap-1 px-2 sm:px-2.5 py-1 text-xs font-sans font-bold rounded-xl border border-[var(--border-soft)] dark:border-[var(--border)] bg-white dark:bg-[var(--surface)] text-[var(--heading)] dark:text-[var(--text-secondary)] hover:border-[var(--border)] dark:hover:border-[var(--border)] transition cursor-pointer shadow-2xs whitespace-nowrap shrink-0"
                title={t('nav.switchLang', 'Switch Language')}
                aria-label={t('nav.switchLang', 'Switch Language')}
              >
                <Globe className="w-3.5 h-3.5 text-[var(--primary)] dark:text-[var(--retro-sky)]" />
                <span>{locale.toUpperCase()}</span>
              </button>

              {/* Theme Switch */}
              <ThemeSwitch />

              {/* Create Job CTA */}
              {!isSuspended ? (
                <Link
                  href="/recruiter/jobs/new"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary)] shadow-sm transition active:scale-95 whitespace-nowrap shrink-0"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>{t('recruiterNav.createJob', 'Tạo bài tuyển dụng')}</span>
                </Link>
              ) : (
                <span
                  title="Tài khoản bị đình chỉ không thể tạo bài tuyển dụng mới"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 cursor-not-allowed whitespace-nowrap shrink-0"
                >
                  <PlusCircle className="w-4 h-4 opacity-50" />
                  <span>{t('recruiterNav.createJob', 'Tạo bài tuyển dụng')}</span>
                </span>
              )}

              {/* Account Dropdown Menu */}
              <AccountTools />


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
                className="md:hidden p-2 rounded-xl border border-[var(--border-soft)] dark:border-[var(--border)] bg-white dark:bg-[var(--surface)] text-[var(--heading)] dark:text-[var(--text-secondary)] hover:border-[var(--border)] transition cursor-pointer shrink-0"
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
        <div className="hidden md:block w-full border-t border-[var(--border-soft)]/80 dark:border-[var(--border)]/80 bg-slate-50/70 dark:bg-[var(--surface)]/80">
          <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex items-center gap-1 sm:gap-2 py-2 overflow-x-auto no-scrollbar min-w-0">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                      item.active
                        ? 'bg-[var(--surface-secondary)] dark:bg-[var(--surface)] text-[var(--primary)] dark:text-[var(--retro-sky)] font-bold shadow-2xs'
                        : 'text-[var(--text-secondary)] dark:text-[var(--text-secondary)] hover:text-[var(--heading)] dark:hover:text-white hover:bg-white/60 dark:hover:bg-[var(--surface)]/60'
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
          <div className="fixed top-[56px] left-0 right-0 max-h-[calc(100vh-3.5rem)] overflow-y-auto bg-white dark:bg-[var(--surface)] border-b border-[var(--border-soft)] dark:border-[var(--border)] p-5 shadow-2xl space-y-4 z-50 md:hidden animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-soft)] dark:border-[var(--border)]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-[var(--surface)] text-[var(--warning)] dark:text-[var(--warning)] text-xs font-bold flex items-center justify-center">
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

              <span className="text-[10px] font-sans font-bold text-[var(--warning)] dark:text-[var(--warning)] bg-[var(--surface-secondary)] dark:bg-[var(--warning)]/15 px-2 py-0.5 rounded border border-[var(--border)]/40 uppercase">
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
                        ? 'bg-[var(--surface-secondary)] dark:bg-[var(--surface)] text-[var(--primary)] dark:text-[var(--retro-sky)] font-bold'
                        : 'text-[var(--heading)] dark:text-[var(--text-secondary)] hover:bg-[var(--surface)] dark:hover:bg-[var(--surface)]'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-[var(--primary)] dark:text-[var(--retro-sky)]" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              <Link
                href="/recruiter/jobs/new"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 mt-2 rounded-xl text-xs font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary)] transition shadow-xs"
              >
                <PlusCircle className="w-4 h-4 text-white" />
                <span>{t('recruiterNav.createJob', 'Tạo Bài Tuyển Dụng')}</span>
              </Link>
            </nav>

            <div className="pt-3 border-t border-[var(--border-soft)] dark:border-[var(--border)]">
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
