'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { AuthHeroBanner, AuthRole } from '@/components/auth/AuthHeroBanner';
import { ThemeSwitch } from '@/components/common/ThemeSwitch';
import { GoogleIcon, GitHubIcon, LinkedInIcon } from '@/components/auth/SocialIcons';
import { PasswordStrengthBar } from '@/components/auth/PasswordStrengthBar';
import { Reveal } from '@/components/motion/Reveal';
import {
  User,
  Briefcase,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Globe
} from 'lucide-react';

function RegisterFormContent() {
  const searchParams = useSearchParams();
  const { locale, toggleLocale } = useLanguage();
  const isVi = locale === 'vi';

  const roleParam = searchParams.get('role');
  const initialRole: AuthRole = roleParam === 'hr' || roleParam === 'recruiter' ? 'RECRUITER' : 'CANDIDATE';
  const [selectedRole, setSelectedRole] = useState<AuthRole | null>(null);
  const role = selectedRole ?? initialRole;

  // Traditional credentials
  const [emailOrPhone, setEmailOrPhone] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [agreedTerms, setAgreedTerms] = useState<boolean>(true);

  // States
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [oauthNotice, setOauthNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'github' | 'linkedin' | null>(null);

  const handleRoleChange = (newRole: AuthRole) => {
    setSelectedRole(newRole);
    setError(null);
    setSuccessNotice(null);
    setOauthNotice(null);
    const newQuery = newRole === 'RECRUITER' ? '?role=hr' : '?role=candidate';
    window.history.replaceState(null, '', `/register${newQuery}`);
  };

  const handleOAuth = (provider: 'google' | 'github' | 'linkedin') => {
    setOauthLoading(provider);
    setError(null);
    setSuccessNotice(null);
    setOauthNotice(null);

    // Simulate OAuth connection state per UX specification
    setTimeout(() => {
      setOauthLoading(null);
      const providerNames = {
        google: 'Google',
        github: 'GitHub',
        linkedin: 'LinkedIn',
      };
      setOauthNotice(
        isVi
          ? `Đang kết nối xác thực đăng ký tài khoản qua ${providerNames[provider]}... (Chế độ mô phỏng giao diện)`
          : `Connecting to ${providerNames[provider]} OAuth registration... (UI simulation mode)`
      );
    }, 1200);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessNotice(null);
    setOauthNotice(null);

    const trimmedInput = emailOrPhone.trim();
    if (!trimmedInput) {
      setError(isVi ? 'Vui lòng nhập Email hoặc Số điện thoại.' : 'Please enter Email or Phone number.');
      return;
    }

    if (!agreedTerms) {
      setError(
        isVi
          ? 'Vui lòng đồng ý với Điều khoản dịch vụ & Chính sách bảo mật.'
          : 'Please agree to the Terms of Service & Privacy Policy.'
      );
      return;
    }

    if (password.length < 8) {
      setError(
        isVi
          ? 'Mật khẩu phải chứa ít nhất 8 ký tự.'
          : 'Password must be at least 8 characters.'
      );
      return;
    }

    if (password !== confirmPassword) {
      setError(isVi ? 'Mật khẩu xác nhận không khớp.' : 'Passwords do not match.');
      return;
    }

    setIsLoading(true);
    // Simulate UI validation & registration flow per strict constraints
    setTimeout(() => {
      setIsLoading(false);
      setSuccessNotice(
        isVi
          ? `Tài khoản ${trimmedInput} đã được tạo thành công! Vui lòng kiểm tra hộp thư để kích hoạt tài khoản.`
          : `Account ${trimmedInput} created successfully! Please check your inbox for verification link.`
      );
    }, 900);
  };

  const isCandidate = role === 'CANDIDATE';
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-white dark:bg-[#0B1329] transition-colors">
      {/* Left Column: Hero Visual Banner synchronized with Role */}
      <div className="w-full md:w-1/2 lg:w-1/2 h-72 sm:h-96 md:h-auto md:min-h-screen relative shrink-0">
        <AuthHeroBanner role={role} />
      </div>

      {/* Right Column: Registration Form (max-width 480px, responsive centered) */}
      <div className="w-full md:w-1/2 lg:w-1/2 min-h-screen flex flex-col justify-center items-center px-6 py-10 sm:px-10 lg:px-16 overflow-y-auto">
        <Reveal direction="up" delay={50} className="w-full max-w-[480px] my-auto">
          {/* Top Bar with "Already have account" and Language / Theme Switch */}
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-6">
            <div>
              <span>{isVi ? 'Đã có tài khoản?' : 'Already have an account?'} </span>
              <Link
                href={`/login?role=${isCandidate ? 'candidate' : 'hr'}`}
                className="font-semibold text-[#2563EB] hover:text-[#1D4ED8] dark:text-[#38BDF8] hover:underline ml-0.5"
              >
                {isVi ? 'Đăng nhập' : 'Sign in'}
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="register-lang-switch-btn"
                onClick={toggleLocale}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-[#111C38] text-slate-700 dark:text-slate-200 hover:border-[#2563EB] hover:text-[#2563EB] transition cursor-pointer shadow-xs"
                title={isVi ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
              >
                <Globe className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>{locale.toUpperCase()}</span>
              </button>
              <ThemeSwitch />
            </div>
          </div>

          {/* Form Title & Subtitle */}
          <div className="mb-5">
            <h2 className="text-2xl sm:text-[28px] font-extrabold text-[#0F172A] dark:text-white tracking-tight leading-tight mb-1.5">
              {isCandidate
                ? (isVi ? 'Tạo tài khoản ứng viên' : 'Create Candidate Account')
                : (isVi ? 'Tạo tài khoản nhà tuyển dụng' : 'Create Recruiter Account')}
            </h2>
            <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed">
              {isCandidate
                ? (isVi
                    ? 'Bắt đầu hành trình tìm kiếm công việc thông minh cùng midCV.'
                    : 'Start your intelligent job search journey with midCV.')
                : (isVi
                    ? 'Tạo tài khoản tuyển dụng và bắt đầu kết nối với những ứng viên phù hợp.'
                    : 'Create an employer account and connect with top matched candidates.')}
            </p>
          </div>

          {/* Role Switcher Tabs (Figma Pixel-Perfect Pill Style) */}
          <div className="grid grid-cols-2 gap-3 mb-6 p-1 bg-slate-100/80 dark:bg-[#111C38] rounded-2xl border border-slate-200/60 dark:border-slate-800">
            <button
              type="button"
              id="register-role-candidate-btn"
              onClick={() => handleRoleChange('CANDIDATE')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                isCandidate
                  ? 'bg-white dark:bg-[#1E293B] text-[#2563EB] dark:text-[#38BDF8] shadow-sm border border-blue-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-transparent'
              }`}
            >
              <User className={`w-4 h-4 ${isCandidate ? 'text-[#2563EB] dark:text-[#38BDF8]' : 'text-slate-500'}`} />
              <span>{isVi ? 'Ứng viên' : 'Candidate'}</span>
            </button>

            <button
              type="button"
              id="register-role-recruiter-btn"
              onClick={() => handleRoleChange('RECRUITER')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                !isCandidate
                  ? 'bg-white dark:bg-[#1E293B] text-[#2563EB] dark:text-[#38BDF8] shadow-sm border border-blue-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-transparent'
              }`}
            >
              <Briefcase className={`w-4 h-4 ${!isCandidate ? 'text-[#2563EB] dark:text-[#38BDF8]' : 'text-slate-500'}`} />
              <span>{isVi ? 'Nhà tuyển dụng' : 'Recruiter'}</span>
            </button>
          </div>

          {/* Success Alert */}
          {successNotice && (
            <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{successNotice}</span>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* OAuth Simulation Notice */}
          {oauthNotice && (
            <div className="mb-4 p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-blue-800 dark:text-blue-300 text-xs flex items-center gap-2.5">
              <RefreshCw className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 animate-spin" />
              <span>{oauthNotice}</span>
            </div>
          )}

          {/* Registration Form (Strict Scope: Email/Phone + Password + Confirm Password + Terms) */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 1. Email or Phone number field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {isVi ? 'Email / Số điện thoại' : 'Email or Phone number'} <span className="text-red-500">*</span>
              </label>
              <input
                id="register-email-input"
                type="text"
                placeholder={isVi ? 'name@example.com hoặc 0901234567' : 'name@example.com or phone number'}
                value={emailOrPhone}
                onChange={(e) => {
                  setEmailOrPhone(e.target.value);
                  setError(null);
                }}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#13233F] text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition"
              />
            </div>

            {/* 2. Password with Visibility Toggle & Strength Bar */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {isVi ? 'Mật khẩu' : 'Password'} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="register-password-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={isVi ? 'Tối thiểu 8 ký tự' : 'At least 8 characters'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  required
                  className="w-full pl-4 pr-11 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#13233F] text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? (isVi ? 'Ẩn mật khẩu' : 'Hide password') : (isVi ? 'Hiển thị mật khẩu' : 'Show password')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer transition focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Strength Bar */}
              <PasswordStrengthBar password={password} locale={locale} />
            </div>

            {/* 3. Confirm Password with Visibility Toggle & Real-time Match Feedback */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {isVi ? 'Nhập lại mật khẩu' : 'Confirm Password'} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="register-confirm-password-input"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder={isVi ? 'Xác nhận lại mật khẩu' : 'Re-enter password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError(null);
                  }}
                  required
                  className={`w-full pl-4 pr-11 py-2.5 rounded-xl border bg-white dark:bg-[#13233F] text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 transition ${
                    passwordsMatch
                      ? 'border-emerald-500 focus:ring-emerald-500/20'
                      : passwordsMismatch
                      ? 'border-rose-400 focus:ring-rose-500/20'
                      : 'border-slate-200 dark:border-slate-700 focus:ring-[#2563EB]/20 focus:border-[#2563EB]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? (isVi ? 'Ẩn mật khẩu' : 'Hide password') : (isVi ? 'Hiển thị mật khẩu' : 'Show password')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer transition focus:outline-none"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Match Status Notification */}
              {passwordsMatch && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 mt-1.5 font-medium animate-fadeIn">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{isVi ? 'Mật khẩu trùng khớp' : 'Passwords match'}</span>
                </div>
              )}
              {passwordsMismatch && (
                <div className="flex items-center gap-1.5 text-xs text-rose-500 dark:text-rose-400 mt-1.5 font-medium animate-fadeIn">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{isVi ? 'Mật khẩu chưa khớp' : 'Passwords do not match'}</span>
                </div>
              )}
            </div>

            {/* 4. Terms of Service & Privacy Policy Checkbox */}
            <div className="pt-0.5">
              <label className="flex items-start gap-2 cursor-pointer select-none text-xs text-slate-600 dark:text-slate-400 leading-normal">
                <input
                  type="checkbox"
                  checked={agreedTerms}
                  onChange={(e) => setAgreedTerms(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]/30 cursor-pointer shrink-0"
                />
                <span>
                  {isVi ? 'Tôi đồng ý với ' : 'I agree to the '}
                  <a
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    className="text-[#2563EB] dark:text-[#38BDF8] hover:underline font-semibold"
                  >
                    {isVi ? 'Điều khoản dịch vụ' : 'Terms of Service'}
                  </a>
                  {isVi ? ' & ' : ' & '}
                  <a
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    className="text-[#2563EB] dark:text-[#38BDF8] hover:underline font-semibold"
                  >
                    {isVi ? 'Chính sách bảo mật' : 'Privacy Policy'}
                  </a>
                  {isVi ? ' của midCV.' : ' of midCV.'}
                </span>
              </label>
            </div>

            {/* 5. Submit CTA Button */}
            <button
              id="register-submit-btn"
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.99] shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{isVi ? 'Đang tạo tài khoản...' : 'Creating account...'}</span>
                </span>
              ) : (
                <span>
                  {isVi ? 'Tạo tài khoản & nhận link xác thực' : 'Create Account & Get Verification Link'}
                </span>
              )}
            </button>
          </form>

          {/* Social Logins Divider */}
          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800" />
            </div>
            <span className="relative px-3 bg-white dark:bg-[#0B1329] text-xs text-slate-400 font-medium">
              {isVi ? '- Hoặc tiếp tục với -' : '- Or continue with -'}
            </span>
          </div>

          {/* Social Login Buttons: Google, GitHub, LinkedIn */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
            {/* Google Button */}
            <button
              type="button"
              onClick={() => handleOAuth('google')}
              disabled={oauthLoading !== null}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#13233F] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-600 transition cursor-pointer shadow-xs disabled:opacity-60"
            >
              {oauthLoading === 'google' ? (
                <RefreshCw className="w-4 h-4 animate-spin text-[#2563EB]" />
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
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#13233F] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-600 transition cursor-pointer shadow-xs disabled:opacity-60"
            >
              {oauthLoading === 'github' ? (
                <RefreshCw className="w-4 h-4 animate-spin text-[#2563EB]" />
              ) : (
                <GitHubIcon className="w-4 h-4 shrink-0" />
              )}
              <span className="truncate">GitHub</span>
            </button>

            {/* LinkedIn Button */}
            <button
              type="button"
              onClick={() => handleOAuth('linkedin')}
              disabled={oauthLoading !== null}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#13233F] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-600 transition cursor-pointer shadow-xs disabled:opacity-60"
            >
              {oauthLoading === 'linkedin' ? (
                <RefreshCw className="w-4 h-4 animate-spin text-[#0A66C2]" />
              ) : (
                <LinkedInIcon className="w-4 h-4 shrink-0 text-[#0A66C2]" />
              )}
              <span className="truncate">LinkedIn</span>
            </button>
          </div>

          {/* Bottom Switch Link */}
          <div className="mt-8 text-center text-xs text-slate-500 dark:text-slate-400">
            {isVi ? 'Đã có tài khoản? ' : 'Already have an account? '}
            <Link
              href={`/login?role=${isCandidate ? 'candidate' : 'hr'}`}
              className="font-semibold text-[#2563EB] hover:text-[#1D4ED8] dark:text-[#38BDF8] hover:underline"
            >
              {isCandidate
                ? (isVi ? 'Đăng nhập ngay' : 'Sign in now')
                : (isVi ? 'Đăng nhập tại đây' : 'Sign in here')}
            </Link>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0B1329]">
          <RefreshCw className="w-6 h-6 animate-spin text-[#2563EB]" />
        </div>
      }
    >
      <RegisterFormContent />
    </Suspense>
  );
}
