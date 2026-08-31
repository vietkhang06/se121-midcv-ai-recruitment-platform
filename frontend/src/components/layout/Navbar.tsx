'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Briefcase, User as UserIcon, FileText, Send, LogOut, LogIn, UserPlus, Sparkles } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, openAuthModal, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight text-white group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span>AI Recruitment<span className="text-cyan-400 font-normal">Platform</span></span>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          <Link href="/jobs" className="flex items-center gap-1.5 hover:text-white transition-colors">
            <Briefcase className="w-4 h-4 text-cyan-400" />
            <span>Việc làm</span>
          </Link>
          {isAuthenticated && (
            <>
              <Link href="/candidate/cvs" className="flex items-center gap-1.5 hover:text-white transition-colors">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span>Thư viện CV</span>
              </Link>
              <Link href="/candidate/applications" className="flex items-center gap-1.5 hover:text-white transition-colors">
                <Send className="w-4 h-4 text-emerald-400" />
                <span>Việc làm đã nộp</span>
              </Link>
              <Link href="/candidate/profile" className="flex items-center gap-1.5 hover:text-white transition-colors">
                <UserIcon className="w-4 h-4 text-amber-400" />
                <span>Hồ sơ cá nhân</span>
              </Link>
            </>
          )}
        </nav>

        {/* User Auth Buttons */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-sm font-semibold text-slate-100">{user?.fullName}</span>
                <span className="text-xs text-indigo-400 font-mono">{user?.role}</span>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 text-xs text-slate-300 hover:text-white hover:bg-slate-700 transition"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                <span>Đăng xuất</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => openAuthModal('LOGIN')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-slate-200 hover:text-white hover:bg-slate-800 transition"
              >
                <LogIn className="w-4 h-4 text-cyan-400" />
                <span>Đăng nhập</span>
              </button>
              <button
                onClick={() => openAuthModal('REGISTER')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-md shadow-indigo-500/25 transition transform active:scale-95"
              >
                <UserPlus className="w-4 h-4" />
                <span>Đăng ký Ung viên</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
