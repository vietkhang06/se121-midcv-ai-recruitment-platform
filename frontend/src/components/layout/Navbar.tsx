'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ShieldCheck, LogOut, Briefcase, FileText, Send, User as UserIcon, LayoutDashboard, PlusCircle, CheckCircle2 } from 'lucide-react';
import { getImageSlot } from '@/config/imageConfig';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, openAuthModal, logout, login } = useAuth();
  const pathname = usePathname();

  const isRecruiter = isAuthenticated && user?.role === 'RECRUITER';
  const isCandidate = isAuthenticated && user?.role === 'CANDIDATE';

  const andrewAvatar = getImageSlot('avatarAndrewSterling').placeholderUrl;
  const sarahAvatar = getImageSlot('avatarSarahJenkins').placeholderUrl;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E2E8F0] text-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo & Optional Portal Badge */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-xl tracking-tight text-slate-900 group">
            <div className="w-8 h-8 rounded-lg bg-[#0C2B24] flex items-center justify-center text-[#10B981] shadow-sm group-hover:bg-[#133E34] transition">
              <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
            </div>
            <span className="font-editorial text-2xl tracking-normal text-[#0C2B24]">MatchProof</span>
          </Link>

          {isRecruiter && (
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-black text-white uppercase">
              HR PORTAL
            </span>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          {isRecruiter ? (
            <>
              <Link
                href="/recruiter"
                className={`hover:text-[#0C2B24] transition-colors ${pathname === '/recruiter' ? 'text-[#0C2B24] font-semibold border-b-2 border-[#0C2B24] pb-0.5' : ''}`}
              >
                Dashboard
              </Link>
              <Link
                href="/recruiter/jobs"
                className={`hover:text-[#0C2B24] transition-colors ${pathname.startsWith('/recruiter/jobs') ? 'text-[#0C2B24] font-semibold border-b-2 border-[#0C2B24] pb-0.5' : ''}`}
              >
                My Postings
              </Link>
              <Link
                href="/recruiter/jobs/job-tech-01/applications"
                className="hover:text-[#0C2B24] transition-colors"
              >
                Candidates
              </Link>
              <Link
                href="/recruiter/jobs/job-tech-01/ranking"
                className="hover:text-[#0C2B24] transition-colors"
              >
                Assessments
              </Link>
              <Link
                href="/recruiter/company"
                className="hover:text-[#0C2B24] transition-colors"
              >
                Analytics & Company
              </Link>
            </>
          ) : isCandidate ? (
            <>
              <Link
                href="/jobs"
                className={`hover:text-[#0C2B24] transition-colors ${pathname.startsWith('/jobs') ? 'text-[#0C2B24] font-semibold border-b-2 border-[#0C2B24] pb-0.5' : ''}`}
              >
                Search Jobs
              </Link>
              <Link
                href="/candidate/applications"
                className={`hover:text-[#0C2B24] transition-colors ${pathname === '/candidate/applications' ? 'text-[#0C2B24] font-semibold border-b-2 border-[#0C2B24] pb-0.5' : ''}`}
              >
                My Match Reports
              </Link>
              <Link
                href="/candidate/profile"
                className={`hover:text-[#0C2B24] transition-colors ${pathname === '/candidate/profile' ? 'text-[#0C2B24] font-semibold border-b-2 border-[#0C2B24] pb-0.5' : ''}`}
              >
                Dashboard
              </Link>
              <Link
                href="/candidate/cvs"
                className={`hover:text-[#0C2B24] transition-colors ${pathname.startsWith('/candidate/cvs') ? 'text-[#0C2B24] font-semibold border-b-2 border-[#0C2B24] pb-0.5' : ''}`}
              >
                CV Management
              </Link>
            </>
          ) : (
            <>
              <Link href="/jobs" className="hover:text-[#0C2B24] transition-colors">
                Search Jobs
              </Link>
              <a href="#pipeline" className="hover:text-[#0C2B24] transition-colors">
                Features
              </a>
              <a href="#indexes" className="hover:text-[#0C2B24] transition-colors">
                For Candidates
              </a>
              <Link href="/recruiter" className="hover:text-[#0C2B24] transition-colors">
                For Employers
              </Link>
            </>
          )}
        </nav>

        {/* User Right Section */}
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              {/* Candidate Profile Strength Indicator */}
              {isCandidate && (
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100/80 px-2.5 py-1 rounded-full border border-slate-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Verifiable Profile Strength: <strong className="text-slate-900 font-semibold">85%</strong></span>
                </div>
              )}

              {/* User Name & Role */}
              <div className="text-right">
                <span className="text-xs font-semibold text-slate-900 block">{user?.fullName}</span>
                {user?.role && (
                  <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 uppercase inline-block">
                    {user.role}
                  </span>
                )}
                {isRecruiter && (
                  <span className="text-[10px] text-slate-500 hidden sm:block">
                    Talent Acquisition @ {(user as any)?.companyName || (user?.email === 'recruiter@cloudscale.com' ? 'CloudScale' : 'MatchProof')}
                  </span>
                )}
              </div>

              {/* Avatar: Demo persona avatars for demo accounts, or initials badge for real users */}
              <div className="relative w-8 h-8 rounded-full overflow-hidden border border-slate-300 shadow-xs flex-shrink-0">
                {user?.email === 'andrew.sterling@devops.cloud' ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={andrewAvatar}
                    alt={user?.fullName || 'User Avatar'}
                    className="w-full h-full object-cover"
                  />
                ) : user?.email === 'recruiter@cloudscale.com' ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={sarahAvatar}
                    alt={user?.fullName || 'User Avatar'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-[#0C2B24] text-[#10B981] text-xs font-bold flex items-center justify-center select-none">
                    {user?.fullName ? user.fullName.trim().charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
              </div>

              {/* Logout Button */}
              <button
                onClick={logout}
                aria-label="Đăng xuất"
                title="Đăng xuất"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-slate-100 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Đăng xuất</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => openAuthModal('LOGIN')}
                className="text-xs sm:text-sm font-semibold text-[#0C2B24] hover:text-[#10B981] px-3 py-1.5 transition"
              >
                Đăng nhập
              </button>
              <button
                onClick={() => openAuthModal('REGISTER')}
                className="px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold text-white bg-[#0C2B24] hover:bg-[#164E41] transition shadow-xs"
              >
                Đăng ký
              </button>
              <Link
                href="/recruiter/jobs/new"
                className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 border border-slate-200 transition"
              >
                <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>Post a Job</span>
              </Link>
            </div>
          )}

        </div>

      </div>
    </header>
  );
};
