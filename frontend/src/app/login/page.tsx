'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { AuthHeroBanner, AuthRole } from '@/components/auth/AuthHeroBanner';
import { ThemeSwitch } from '@/components/common/ThemeSwitch';
import { GoogleIcon, GitHubIcon } from '@/components/auth/SocialIcons';
import { BASE_URL } from '@/lib/api';
import { Reveal } from '@/components/motion/Reveal';
import {
  User,
  Briefcase,
  Eye,
  EyeOff,
  AlertCircle,
  RefreshCw,
  Globe
} from 'lucide-react';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated, user } = useAuth();
  const { locale, toggleLocale } = useLanguage();

  const roleParam = searchParams.get('role');
  const initialRole: AuthRole = roleParam === 'hr' || roleParam === 'recruiter' ? 'RECRUITER' : 'CANDIDATE';
  const [selectedRole, setSelectedRole] = useState<AuthRole | null>(null);
  const role = selectedRole ?? initialRole;

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'github' | null>(null);
  const [isUnverified, setIsUnverified] = useState<boolean>(false);

  const oauthNotice = useMemo(() => {
    const messages: Record<string, string> = {
      cancelled: locale === 'vi' ? 'Bạn đã hủy đăng nhập.' : 'Sign in was cancelled.',
      provider_not_configured: locale === 'vi' ? 'Đăng nhập mạng xã hội chưa được cấu hình.' : 'Social sign-in is not configured.',
      invalid_state: locale === 'vi' ? 'Phiên đăng nhập hết hạn hoặc không hợp lệ. Vui lòng thử lại.' : 'Sign-in session expired or is invalid. Please try again.',
      account_conflict: locale === 'vi' ? 'Email đã thuộc tài khoản khác. Hãy đăng nhập bằng phương thức cũ rồi liên kết tài khoản trong hồ sơ.' : 'This email belongs to another account. Sign in with your existing method and link the provider from your profile.',
      email_required: locale === 'vi' ? 'GitHub không cung cấp email đã xác minh. Hãy xác minh email trong GitHub hoặc dùng phương thức đăng nhập khác.' : 'GitHub did not provide a verified email. Verify an email in GitHub or use another sign-in method.',
    };
    const reason = searchParams.get('oauth_error');
    return reason ? (messages[reason] || (locale === 'vi' ? 'Không thể hoàn tất đăng nhập. Vui lòng thử lại.' : 'Sign-in could not be completed. Please try again.')) : null;
  }, [locale, searchParams]);

  useEffect(() => {
    if (isAuthenticated) {
      if (user?.role === 'RECRUITER') {
        router.push('/recruiter');
      } else {
        router.push('/candidate');
      }
    }
  }, [isAuthenticated, user, router]);

  const handleRoleChange = (newRole: AuthRole) => {
    setSelectedRole(newRole);
    setError(null);
    // Smooth URL update without page reload
    const newQuery = newRole === 'RECRUITER' ? '?role=hr' : '?role=candidate';
    window.history.replaceState(null, '', `/login${newQuery}`);
  };

  const handleOAuth = (provider: 'google' | 'github') => {
    if (role === 'RECRUITER') {
      setError(locale === 'vi' ? 'Đăng ký Nhà tuyển dụng cần thông tin doanh nghiệp; hãy dùng biểu mẫu email để hoàn tất hồ sơ.' : 'Recruiter registration requires company details. Use the email form to complete the profile.');
      return;
    }
    setOauthLoading(provider);
    setError(null);
    window.location.replace(`${BASE_URL}/api/v1/auth/oauth/${provider}/start?next=%2Fcandidate`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsUnverified(false);
    setIsLoading(true);

    try {
      await login(email.trim(), password);
      // AuthContext handles role-based redirection
    } catch (err: unknown) {
      const eObj = err as { code?: string; message?: string } | undefined;
      const msg = eObj?.message || '';
      if (
        eObj?.code === 'EMAIL_NOT_VERIFIED' ||
        msg.includes('EMAIL_NOT_VERIFIED') ||
        msg.toLowerCase().includes('not verified')
      ) {
        setIsUnverified(true);
        setError(
          locale === 'vi'
            ? 'Email của bạn chưa được xác thực. Vui lòng xác thực tài khoản để đăng nhập.'
            : 'Your email is not verified yet. Please verify your email before signing in.'
        );
      } else {
        setError(
          msg ||
            (locale === 'vi'
              ? 'Tài khoản hoặc mật khẩu không chính xác.'
              : 'Invalid email or password.')
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isCandidate = role === 'CANDIDATE';

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-white dark:bg-[var(--surface)] transition-colors">
      {/* Left Column: Visual Hero Banner with Role-Synchronized Imagery */}
      <div className="w-full md:w-1/2 lg:w-1/2 h-72 sm:h-96 md:h-auto md:min-h-screen relative shrink-0">
        <AuthHeroBanner role={role} />
      </div>

      {/* Right Column: Form Container (max-width 480px, responsive centered) */}
      <div className="w-full md:w-1/2 lg:w-1/2 min-h-screen flex flex-col justify-center items-center px-6 py-10 sm:px-10 lg:px-16 overflow-y-auto">
        <Reveal direction="up" delay={50} className="w-full max-w-[480px] my-auto">
          {/* Top Bar with Language and Theme Switch */}
          <div className="flex items-center justify-between mb-5">
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
              {locale === 'vi' ? 'Đăng nhập tài khoản' : 'Account Sign In'}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="login-lang-switch-btn"
                onClick={toggleLocale}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-sans font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-[var(--surface)] text-slate-700 dark:text-slate-200 hover:border-[var(--border)] hover:text-[var(--primary)] transition cursor-pointer shadow-xs"
                title={locale === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
              >
                <Globe className="w-3.5 h-3.5 text-[var(--primary)]" />
                <span>{locale.toUpperCase()}</span>
              </button>
              <ThemeSwitch />
            </div>
          </div>

          {/* Header Section */}
          <div className="mb-6">
            <h2 className="text-2xl sm:text-[30px] font-extrabold text-[var(--heading)] dark:text-white tracking-tight leading-tight mb-2">
              {locale === 'vi' ? 'Chào mừng quay trở lại!' : 'Welcome back!'}
            </h2>
            <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed">
              {locale === 'vi'
                ? 'Đăng nhập để tiếp tục hành trình nghề nghiệp của bạn cùng midCV'
                : 'Sign in to continue your career journey with midCV'}
            </p>
          </div>

          {/* Role Switcher Tabs (Figma Pixel-Perfect Pill Style) */}
          <div className="grid grid-cols-2 gap-3 mb-6 p-1 bg-slate-100/80 dark:bg-[var(--surface)] rounded-xl border border-slate-200/60 dark:border-slate-800">
            <button
              type="button"
              id="login-role-candidate-btn"
              onClick={() => handleRoleChange('CANDIDATE')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                isCandidate
                  ? 'bg-white dark:bg-[var(--surface)] text-[var(--primary)] dark:text-[var(--retro-sky)] shadow-sm border border-blue-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-transparent'
              }`}
            >
              <User className={`w-4 h-4 ${isCandidate ? 'text-[var(--primary)] dark:text-[var(--retro-sky)]' : 'text-slate-500'}`} />
              <span>{locale === 'vi' ? 'Ứng viên' : 'Candidate'}</span>
            </button>

            <button
              type="button"
              id="login-role-recruiter-btn"
              onClick={() => handleRoleChange('RECRUITER')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                !isCandidate
                  ? 'bg-white dark:bg-[var(--surface)] text-[var(--primary)] dark:text-[var(--retro-sky)] shadow-sm border border-blue-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-transparent'
              }`}
            >
              <Briefcase className={`w-4 h-4 ${!isCandidate ? 'text-[var(--primary)] dark:text-[var(--retro-sky)]' : 'text-slate-500'}`} />
              <span>{locale === 'vi' ? 'Nhà tuyển dụng' : 'Recruiter'}</span>
            </button>
          </div>

          {/* Error / Alert notice */}
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span>{error}</span>
                {isUnverified && (
                  <div className="pt-1">
                    <Link
                      href="/verify-email"
                      className="text-[var(--primary)] dark:text-[var(--retro-sky)] underline font-semibold hover:text-[var(--primary)]"
                    >
                      {locale === 'vi' ? 'Đến trang xác thực email' : 'Go to email verification'}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* OAuth Simulation Notice */}
          {oauthNotice && (
            <div className="mb-5 p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-blue-800 dark:text-blue-300 text-xs flex items-center gap-2.5">
              <RefreshCw className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 animate-spin" />
              <span>{oauthNotice}</span>
            </div>
          )}

          {/* Main Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email / Username field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {locale === 'vi' ? 'Email / Số điện thoại' : 'Email or Phone number'} <span className="text-red-500">*</span>
              </label>
              <input
                id="login-email-input"
                type="text"
                placeholder={locale === 'vi' ? 'you@example.com' : 'you@example.com'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[var(--surface)] text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--border)]/20 focus:border-[var(--border)] transition"
              />
            </div>

            {/* Password field with Visibility Toggle */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {locale === 'vi' ? 'Mật khẩu' : 'Password'} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="login-password-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={locale === 'vi' ? 'Nhập mật khẩu...' : 'Enter your password...'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-4 pr-11 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[var(--surface)] text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--border)]/20 focus:border-[var(--border)] transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? (locale === 'vi' ? 'Ẩn mật khẩu' : 'Hide password') : (locale === 'vi' ? 'Hiển thị mật khẩu' : 'Show password')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer transition focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Options Row: Remember Me & Forgot Password */}
            <div className="flex items-center justify-between pt-0.5 text-xs">
              <span>{locale === 'vi' ? 'Quản lý phiên trong mục Bảo mật' : 'Manage sessions in Security'}</span>

              <a
                href="/forgot-password"
                className="font-medium text-[var(--primary)] hover:text-[var(--primary)] dark:text-[var(--retro-sky)] hover:underline"
              >
                {locale === 'vi' ? 'Quên mật khẩu?' : 'Forgot password?'}
              </a>
            </div>

            {/* Submit CTA Button */}
            <button
              id="login-submit-btn"
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary)] active:scale-[0.99] shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{locale === 'vi' ? 'Đang đăng nhập...' : 'Signing in...'}</span>
                </span>
              ) : (
                <span>
                  {isCandidate
                    ? (locale === 'vi' ? 'Đăng nhập với tư cách Ứng viên' : 'Sign In as Candidate')
                    : (locale === 'vi' ? 'Đăng nhập với tư cách Nhà tuyển dụng' : 'Sign In as Recruiter')}
                </span>
              )}
            </button>
          </form>

          {/* Social Logins Divider */}
          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800" />
            </div>
            <span className="relative px-3 bg-white dark:bg-[var(--surface)] text-xs text-slate-400 font-medium">
              {locale === 'vi' ? '- Hoặc tiếp tục với -' : '- Or continue with -'}
            </span>
          </div>

          {/* Social login uses backend authorization code flows. */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            {/* Google Button */}
            <button
              type="button"
              onClick={() => handleOAuth('google')}
              disabled={oauthLoading !== null}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[var(--surface)] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-600 transition cursor-pointer shadow-xs disabled:opacity-60"
            >
              {oauthLoading === 'google' ? (
                <RefreshCw className="w-4 h-4 animate-spin text-[var(--primary)]" />
              ) : (
                <GoogleIcon className="w-4 h-4 shrink-0" />
              )}
              <span className="truncate">Google</span>
            </button>

            {/* GitHub Button */}
            <button
              type="button"
              onClick={() => handleOAuth('github')}
              disabled={oauthLoading !== null}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[var(--surface)] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-600 transition cursor-pointer shadow-xs disabled:opacity-60"
            >
              {oauthLoading === 'github' ? (
                <RefreshCw className="w-4 h-4 animate-spin text-[var(--primary)]" />
              ) : (
                <GitHubIcon className="w-4 h-4 shrink-0" />
              )}
              <span className="truncate">GitHub</span>
            </button>

          </div>

          {/* Bottom Switch Link */}
          <div className="mt-8 text-center text-xs text-slate-500 dark:text-slate-400">
            {locale === 'vi' ? 'Chưa có tài khoản?' : "Don't have an account?"}{' '}
            <Link
              href={`/register?role=${isCandidate ? 'candidate' : 'hr'}`}
              className="font-semibold text-[var(--primary)] hover:text-[var(--primary)] dark:text-[var(--retro-sky)] hover:underline"
            >
              {locale === 'vi' ? 'Đăng ký ngay' : 'Register now'}
            </Link>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[var(--surface)]">
          <RefreshCw className="w-6 h-6 animate-spin text-[var(--primary)]" />
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
