'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import {
  ShieldCheck,
  LogOut,
  Briefcase,
  FileText,
  Send,
  User as UserIcon,
  LayoutDashboard,
  PlusCircle,
  CheckCircle2,
  Sun,
  Moon,
  Globe,
  HelpCircle
} from 'lucide-react';
import { getImageSlot } from '@/config/imageConfig';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, openAuthModal, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { locale, toggleLocale, t } = useLanguage();
  const pathname = usePathname();

  const isRecruiter = isAuthenticated && user?.role === 'RECRUITER';
  const isCandidate = isAuthenticated && user?.role === 'CANDIDATE';

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#071410]/95 backdrop-blur-md border-b border-[#E2E8F0] dark:border-[#1B3D34] text-slate-800 dark:text-slate-100 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Brand Logo & Portal Badge */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-xl tracking-tight text-slate-900 dark:text-white group">
            <div className="w-8 h-8 rounded-lg bg-[#0C2B24] dark:bg-[#10B981]/20 border border-emerald-500/30 flex items-center justify-center text-[#10B981] shadow-sm group-hover:bg-[#133E34] transition">
              <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
            </div>
            <span className="font-editorial text-2xl tracking-normal text-[#0C2B24] dark:text-white">MatchProof</span>
          </Link>

          {isRecruiter && (
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-black dark:bg-emerald-950 text-white dark:text-emerald-300 border border-emerald-500/30 uppercase">
              HR PORTAL
            </span>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
          {isRecruiter ? (
            <>
              <Link
                href="/recruiter"
                className={`hover:text-[#0C2B24] dark:hover:text-emerald-400 transition-colors ${pathname === '/recruiter' ? 'text-[#0C2B24] dark:text-emerald-400 font-semibold border-b-2 border-[#0C2B24] dark:border-emerald-400 pb-0.5' : ''}`}
              >
                {t('nav.dashboard', 'Dashboard')}
              </Link>
              <Link
                href="/recruiter/jobs"
                className={`hover:text-[#0C2B24] dark:hover:text-emerald-400 transition-colors ${pathname.startsWith('/recruiter/jobs') ? 'text-[#0C2B24] dark:text-emerald-400 font-semibold border-b-2 border-[#0C2B24] dark:border-emerald-400 pb-0.5' : ''}`}
              >
                My Postings
              </Link>
              <Link
                href="/recruiter/company"
                className="hover:text-[#0C2B24] dark:hover:text-emerald-400 transition-colors"
              >
                Company
              </Link>
            </>
          ) : isCandidate ? (
            <>
              <Link
                href="/jobs"
                className={`hover:text-[#0C2B24] dark:hover:text-emerald-400 transition-colors ${pathname.startsWith('/jobs') ? 'text-[#0C2B24] dark:text-emerald-400 font-semibold border-b-2 border-[#0C2B24] dark:border-emerald-400 pb-0.5' : ''}`}
              >
                {t('nav.searchJobs', 'Search Jobs')}
              </Link>
              <Link
                href="/candidate/applications"
                className={`hover:text-[#0C2B24] dark:hover:text-emerald-400 transition-colors ${pathname === '/candidate/applications' ? 'text-[#0C2B24] dark:text-emerald-400 font-semibold border-b-2 border-[#0C2B24] dark:border-emerald-400 pb-0.5' : ''}`}
              >
                {t('nav.matchReports', 'My Match Reports')}
              </Link>
              <Link
                href="/candidate/profile"
                className={`hover:text-[#0C2B24] dark:hover:text-emerald-400 transition-colors ${pathname === '/candidate/profile' ? 'text-[#0C2B24] dark:text-emerald-400 font-semibold border-b-2 border-[#0C2B24] dark:border-emerald-400 pb-0.5' : ''}`}
              >
                {t('nav.dashboard', 'Dashboard')}
              </Link>
              <Link
                href="/candidate/cvs"
                className={`hover:text-[#0C2B24] dark:hover:text-emerald-400 transition-colors ${pathname.startsWith('/candidate/cvs') ? 'text-[#0C2B24] dark:text-emerald-400 font-semibold border-b-2 border-[#0C2B24] dark:border-emerald-400 pb-0.5' : ''}`}
              >
                {t('nav.cvManagement', 'CV Management')}
              </Link>
            </>
          ) : (
            <>
              <Link href="/jobs" className="hover:text-[#0C2B24] dark:hover:text-emerald-400 transition-colors">
                {t('nav.searchJobs', 'Search Jobs')}
              </Link>
              <a href="#pipeline" className="hover:text-[#0C2B24] dark:hover:text-emerald-400 transition-colors">
                Features
              </a>
              <Link href="/recruiter" className="hover:text-[#0C2B24] dark:hover:text-emerald-400 transition-colors">
                For Employers
              </Link>
            </>
          )}

          {/* User Guide Link */}
          <Link
            href="/help"
            className={`hover:text-[#0C2B24] dark:hover:text-emerald-400 transition-colors flex items-center gap-1 ${pathname === '/help' ? 'text-[#0C2B24] dark:text-emerald-400 font-semibold border-b-2 border-[#0C2B24] dark:border-emerald-400 pb-0.5' : ''}`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>{t('nav.help', 'User Guide')}</span>
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
            <div className="flex items-center gap-3">
              {/* Profile Verified Indicator */}
              {isCandidate && (
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 bg-slate-100/80 dark:bg-[#0E241E] px-2.5 py-1 rounded-full border border-slate-200 dark:border-[#1B3D34]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>{t('nav.profileStrength', 'Profile Verified')}</span>
                </div>
              )}

              {/* User Name & Role */}
              <div className="text-right hidden sm:block">
                <span className="text-xs font-semibold text-slate-900 dark:text-white block">{user?.fullName}</span>
                {user?.role && (
                  <span className="text-[10px] font-mono font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 uppercase inline-block">
                    {user.role}
                  </span>
                )}
              </div>

              {/* Avatar */}
              <div className="relative w-8 h-8 rounded-full overflow-hidden border border-slate-300 dark:border-[#1B3D34] shadow-xs flex-shrink-0">
                <div className="w-full h-full bg-[#0C2B24] dark:bg-emerald-900 text-[#10B981] dark:text-emerald-200 text-xs font-bold flex items-center justify-center select-none">
                  {user?.fullName ? user.fullName.trim().charAt(0).toUpperCase() : 'U'}
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={logout}
                aria-label="Đăng xuất"
                title={t('nav.signOut', 'Sign Out')}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-[#1B3D34] text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-[#14332B] transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('nav.signOut', 'Sign Out')}</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
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

        </div>

      </div>
    </header>
  );
};
