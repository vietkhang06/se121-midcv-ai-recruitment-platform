'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { UserRole } from '@/types';
import { ShieldAlert, Lock, Loader2, ArrowRight } from 'lucide-react';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles, children }) => {
  const { user, isAuthenticated, authState, openAuthModal } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { t, locale } = useLanguage();

  const isRoleAllowed = user && allowedRoles.includes(user.role);

  useEffect(() => {
    // If authenticated but role is forbidden, automatically redirect to user's home portal
    if (authState === 'AUTHENTICATED' && user && !isRoleAllowed) {
      const redirectTimer = setTimeout(() => {
        if (user.role === 'RECRUITER') {
          router.replace('/recruiter');
        } else {
          router.replace('/');
        }
      }, 1200);
      return () => clearTimeout(redirectTimer);
    }
  }, [authState, user, isRoleAllowed, router]);

  // 1. Loading state while checking authentication
  if (authState === 'INITIALIZING') {
    return (
      <div 
        id="role-guard-loading"
        className="min-h-[50vh] flex flex-col items-center justify-center space-y-4 p-8"
      >
        <Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" />
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          {locale === 'vi' ? 'Đang xác thực quyền truy cập...' : 'Verifying access authorization...'}
        </p>
      </div>
    );
  }

  // 2. Unauthenticated state: Block children and prompt for sign-in
  if (!isAuthenticated || !user) {
    return (
      <div 
        id="role-guard-unauthenticated"
        className="max-w-md mx-auto my-20 p-8 bg-white dark:bg-[#111C38] border border-amber-200 dark:border-amber-900/40 rounded-2xl text-center space-y-5 shadow-xl animate-fade-in"
      >
        <div className="w-14 h-14 mx-auto rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
          <Lock className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {t('auth.loginRequired', 'Yêu cầu đăng nhập')}
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {locale === 'vi'
              ? 'Bạn cần đăng nhập tài khoản có thẩm quyền để truy cập trang này.'
              : 'You must sign in with an authorized account to access this section.'}
          </p>
        </div>
        <button
          onClick={() => openAuthModal('LOGIN', { type: 'NAVIGATE', target: pathname })}
          className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] transition shadow-xs cursor-pointer flex items-center justify-center gap-2"
        >
          <span>{locale === 'vi' ? 'Đăng nhập ngay' : 'Sign In Now'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // 3. Unauthorized role state: Strictly block children and show explicit Access Denied
  if (!isRoleAllowed) {
    const targetDashboard = user.role === 'RECRUITER' ? '/recruiter' : '/';
    const targetLabel = user.role === 'RECRUITER'
      ? (locale === 'vi' ? 'Về Cổng Nhà tuyển dụng (HR)' : 'Go to Recruiter Portal')
      : (locale === 'vi' ? 'Về Trang chủ Ứng viên' : 'Go to Candidate Portal');

    return (
      <div 
        id="role-guard-forbidden"
        className="max-w-lg mx-auto my-20 p-8 bg-white dark:bg-[#111C38] border border-rose-200 dark:border-rose-900/40 rounded-2xl text-center space-y-5 shadow-xl animate-fade-in"
      >
        <div className="w-14 h-14 mx-auto rounded-full bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/40 flex items-center justify-center text-rose-600 dark:text-rose-400">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {locale === 'vi' ? 'Không Có Quyền Truy Cập (403)' : 'Access Denied (403 Forbidden)'}
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {locale === 'vi'
              ? `Khu vực này chỉ dành cho vai trò: ${allowedRoles.join(', ')}. Vai trò tài khoản hiện tại của bạn là: ${user.role}. Bạn đang được chuyển hướng về đúng cổng của mình...`
              : `This section requires role: ${allowedRoles.join(', ')}. Your current role is: ${user.role}. Redirecting to your assigned portal...`}
          </p>
        </div>
        <button
          onClick={() => router.replace(targetDashboard)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition shadow-xs cursor-pointer"
        >
          <span>{targetLabel}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // 4. Authorized: Render children
  return <>{children}</>;
};
