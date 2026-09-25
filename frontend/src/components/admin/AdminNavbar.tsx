'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Cpu,
  Building2,
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

export const AdminNavbar: React.FC = () => {
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

  const isActive = (path: string) => pathname === path || (path !== '/admin' && pathname?.startsWith(path));

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#0B1329]/95 dark:bg-[#060D1E]/95 backdrop-blur-md border-b border-indigo-900/30 dark:border-indigo-900/40 text-slate-100 transition-colors shadow-sm">
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          
          {/* Brand & Admin Portal Indicator */}
          <div className="flex items-center gap-2.5 shrink-0">
            <BrandLogo href="/admin" size="md" />
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-mono tracking-wider uppercase whitespace-nowrap">
              Admin Portal
            </span>
          </div>

          {/* Admin Navigation Links (Desktop) */}
          <nav className="hidden lg:flex items-center gap-1.5 xl:gap-2.5 text-xs font-semibold shrink-0">
            <Link
              href="/admin"
              className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                pathname === '/admin'
                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-indigo-400" />
              <span>{locale === 'vi' ? 'Tổng Quan' : 'Dashboard'}</span>
            </Link>

            <Link
              href="/admin/ai-settings"
              className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                isActive('/admin/ai-settings')
                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              <Cpu className="w-4 h-4 text-indigo-400" />
              <span>{locale === 'vi' ? 'Cấu hình AI & LLM' : 'AI Engine Settings'}</span>
            </Link>

            <Link
              href="/admin/companies"
              className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                isActive('/admin/companies')
                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              <Building2 className="w-4 h-4 text-indigo-400" />
              <span>{locale === 'vi' ? 'Xác thực Doanh nghiệp' : 'Company Verification'}</span>
            </Link>
          </nav>

          {/* Action Controls: Language, Theme, Admin Profile, Logout */}
          <div className="flex items-center gap-2 sm:gap-2.5 xl:gap-3 shrink-0">
            {/* Language Switcher */}
            <button
              onClick={toggleLocale}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-bold rounded-lg border border-slate-700 bg-slate-800/80 text-slate-200 hover:border-indigo-400 transition cursor-pointer whitespace-nowrap shrink-0 shadow-2xs"
              title={t('nav.switchLang', 'Switch Language')}
            >
              <Globe className="w-3.5 h-3.5 text-indigo-400" />
              <span>{locale.toUpperCase()}</span>
            </button>

            {/* Theme Toggle Slider Switch */}
            <ThemeSwitch />

            {/* Admin User Profile Info (Desktop) */}
            <div className="hidden md:flex items-center gap-2.5 pl-2 border-l border-slate-700/80 shrink-0">
              <div className="text-right">
                <span className="text-xs font-bold text-white block truncate max-w-[120px]">
                  {user?.fullName || 'System Admin'}
                </span>
                <span className="text-[10px] font-mono font-bold text-rose-300 bg-rose-950/60 px-1.5 py-0.2 rounded border border-rose-800/60 uppercase inline-block">
                  ADMIN
                </span>
              </div>
              <div className="relative w-8 h-8 rounded-full overflow-hidden border border-indigo-400/40 shadow-xs shrink-0">
                <div className="w-full h-full bg-indigo-950 text-indigo-200 text-xs font-bold flex items-center justify-center select-none">
                  {user?.fullName ? user.fullName.trim().charAt(0).toUpperCase() : 'A'}
                </div>
              </div>
            </div>

            {/* Admin Desktop Logout Button */}
            <button
              id="admin-navbar-logout-btn"
              onClick={() => setIsLogoutModalOpen(true)}
              aria-label={t('nav.signOut', 'Sign Out')}
              title={t('nav.signOut', 'Sign Out')}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-700 text-xs font-semibold text-slate-300 hover:text-rose-400 hover:bg-rose-950/40 hover:border-rose-800 transition cursor-pointer whitespace-nowrap shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="whitespace-nowrap">{t('nav.signOut', 'Sign Out')}</span>
            </button>

            {/* Admin Mobile Menu Hamburger */}
            <button
              id="admin-mobile-menu-btn"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? t('common.close', 'Đóng menu') : 'Menu Quản trị'}
              className="lg:hidden p-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 hover:border-indigo-400 transition cursor-pointer"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer Backdrop Overlay */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 top-16 bg-black/60 backdrop-blur-xs z-40 lg:hidden animate-fade-in"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Admin Mobile Drawer Panel */}
        {isMobileMenuOpen && (
          <div 
            className="fixed top-16 left-0 right-0 max-h-[calc(100vh-4rem)] overflow-y-auto bg-[#0B1329] border-b border-indigo-900/40 p-5 shadow-2xl space-y-4 z-50 lg:hidden animate-fade-in text-slate-100"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-indigo-950 text-indigo-300 text-xs font-bold flex items-center justify-center border border-indigo-800">
                  {user?.fullName ? user.fullName.trim().charAt(0).toUpperCase() : 'A'}
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">{user?.fullName || 'System Administrator'}</span>
                  <span className="text-[10px] text-slate-400">{user?.email}</span>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold text-rose-300 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800 uppercase">
                ADMIN
              </span>
            </div>

            <nav className="flex flex-col space-y-1">
              <Link
                href="/admin"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                  pathname === '/admin' 
                    ? 'bg-indigo-600 text-white font-bold' 
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-indigo-400" />
                <span>{locale === 'vi' ? 'Tổng Quan Quản Trị' : 'Admin Dashboard'}</span>
              </Link>

              <Link
                href="/admin/ai-settings"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                  isActive('/admin/ai-settings') 
                    ? 'bg-indigo-600 text-white font-bold' 
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Cpu className="w-4 h-4 text-indigo-400" />
                <span>{locale === 'vi' ? 'Cấu hình AI & LLM' : 'AI Engine Settings'}</span>
              </Link>

              <Link
                href="/admin/companies"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                  isActive('/admin/companies') 
                    ? 'bg-indigo-600 text-white font-bold' 
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Building2 className="w-4 h-4 text-indigo-400" />
                <span>{locale === 'vi' ? 'Xác thực Doanh nghiệp' : 'Company Verification'}</span>
              </Link>
            </nav>

            {/* Mobile Drawer Logout Action */}
            <div className="pt-3 border-t border-slate-800">
              <button
                id="admin-mobile-drawer-logout-btn"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsLogoutModalOpen(true);
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-rose-900/60 text-xs font-semibold text-rose-400 hover:bg-rose-950/40 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>{t('nav.signOut', 'Sign Out')}</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Admin Logout Confirmation Modal */}
      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={logout}
      />
    </>
  );
};
