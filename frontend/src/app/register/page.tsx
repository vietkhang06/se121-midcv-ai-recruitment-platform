'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { AuthHeroBanner, AuthRole } from '@/components/auth/AuthHeroBanner';
import { ThemeSwitch } from '@/components/common/ThemeSwitch';
import { GoogleIcon, GitHubIcon } from '@/components/auth/SocialIcons';
import {
  BASE_URL,
  registerCandidateAccount,
  registerRecruiterAccount,
} from '@/lib/api';
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
  Globe,
} from 'lucide-react';

function RegisterFormContent() {
  const searchParams = useSearchParams();
  const { locale, toggleLocale } = useLanguage();
  const isVi = locale === 'vi';

  const roleParam = searchParams.get('role');
  const initialRole: AuthRole =
    roleParam === 'hr' || roleParam === 'recruiter'
      ? 'RECRUITER'
      : 'CANDIDATE';

  const [selectedRole, setSelectedRole] = useState<AuthRole | null>(null);
  const role = selectedRole ?? initialRole;

  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<
    'google' | 'github' | null
  >(null);

  const busy = isLoading || oauthLoading !== null;
  const isCandidate = role === 'CANDIDATE';
  const passwordsMatch =
    confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch =
    confirmPassword.length > 0 && password !== confirmPassword;

  const handleRoleChange = (newRole: AuthRole) => {
    if (busy) return;

    setSelectedRole(newRole);
    setError(null);
    setSuccessNotice(null);

    const newQuery =
      newRole === 'RECRUITER' ? '?role=hr' : '?role=candidate';

    window.history.replaceState(null, '', `/register${newQuery}`);
  };

  const handleOAuth = (provider: 'google' | 'github') => {
    if (busy) return;

    if (role === 'RECRUITER') {
      setSuccessNotice(null);
      setError(
        isVi
          ? 'Đăng ký Nhà tuyển dụng cần thông tin doanh nghiệp; hãy dùng biểu mẫu để hoàn tất hồ sơ.'
          : 'Recruiter registration requires company details. Use the form to complete the profile.'
      );
      return;
    }

    setOauthLoading(provider);
    setError(null);
    setSuccessNotice(null);

    window.location.replace(
      `${BASE_URL}/api/v1/auth/oauth/${provider}/start?next=%2Fcandidate`
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (busy) return;

    setError(null);
    setSuccessNotice(null);

    const trimmedEmail = email.trim();
    const trimmedFullName = fullName.trim();
    const trimmedCompanyName = companyName.trim();

    if (!trimmedFullName) {
      setError(
        isVi
          ? 'Vui lòng nhập họ và tên.'
          : 'Please enter your full name.'
      );
      return;
    }

    if (
      !trimmedEmail ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)
    ) {
      setError(
        isVi
          ? 'Vui lòng nhập email hợp lệ.'
          : 'Please enter a valid email address.'
      );
      return;
    }

    if (role === 'RECRUITER' && !trimmedCompanyName) {
      setError(
        isVi
          ? 'Vui lòng nhập tên công ty.'
          : 'Please enter your company name.'
      );
      return;
    }

    if (!agreedTerms) {
      setError(
        isVi
          ? 'Vui lòng đồng ý cho phép xử lý thông tin để tạo tài khoản.'
          : 'Please agree to the processing of your information to create an account.'
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
      setError(
        isVi
          ? 'Mật khẩu xác nhận không khớp.'
          : 'Passwords do not match.'
      );
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        email: trimmedEmail,
        password,
        fullName: trimmedFullName,
      };

      const result =
        role === 'RECRUITER'
          ? await registerRecruiterAccount({
              ...payload,
              companyName: trimmedCompanyName,
            })
          : await registerCandidateAccount(payload);

      setSuccessNotice(
        isVi
          ? `Đã tạo tài khoản ${result.email}. Vui lòng xác thực email trước khi đăng nhập.`
          : `Account ${result.email} has been created. Please verify your email before signing in.`
      );

      setPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : isVi
            ? 'Không thể tạo tài khoản. Vui lòng thử lại.'
            : 'Unable to create an account. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-white dark:bg-[var(--surface)] transition-colors">
      {/* Hero banner */}
      <div className="w-full md:w-1/2 lg:w-1/2 h-72 sm:h-96 md:h-auto md:min-h-screen relative shrink-0">
        <AuthHeroBanner role={role} />
      </div>

      {/* Registration form */}
      <div className="w-full md:w-1/2 lg:w-1/2 min-h-screen flex flex-col justify-center items-center px-6 py-10 sm:px-10 lg:px-16 overflow-y-auto">
        <Reveal
          direction="up"
          delay={50}
          className="w-full max-w-[480px] my-auto"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-6">
            <div>
              <span>
                {isVi ? 'Đã có tài khoản?' : 'Already have an account?'}{' '}
              </span>
              <Link
                href={`/login?role=${isCandidate ? 'candidate' : 'hr'}`}
                className="font-semibold text-[var(--primary)] hover:text-[var(--primary)] dark:text-[var(--retro-sky)] hover:underline ml-0.5"
              >
                {isVi ? 'Đăng nhập' : 'Sign in'}
              </Link>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                id="register-lang-switch-btn"
                onClick={toggleLocale}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-sans font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-[var(--surface)] text-slate-700 dark:text-slate-200 hover:border-[var(--border)] hover:text-[var(--primary)] transition cursor-pointer shadow-xs"
                title={
                  isVi ? 'Switch to English' : 'Chuyển sang Tiếng Việt'
                }
              >
                <Globe className="w-3.5 h-3.5 text-[var(--primary)]" />
                <span>{locale.toUpperCase()}</span>
              </button>
              <ThemeSwitch />
            </div>
          </div>

          <div className="mb-5">
            <h2 className="text-2xl sm:text-[28px] font-extrabold text-[var(--heading)] dark:text-white tracking-tight leading-tight mb-1.5">
              {isCandidate
                ? isVi
                  ? 'Tạo tài khoản ứng viên'
                  : 'Create Candidate Account'
                : isVi
                  ? 'Tạo tài khoản nhà tuyển dụng'
                  : 'Create Recruiter Account'}
            </h2>

            <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed">
              {isCandidate
                ? isVi
                  ? 'Bắt đầu hành trình tìm kiếm công việc thông minh cùng midCV.'
                  : 'Start your intelligent job search journey with midCV.'
                : isVi
                  ? 'Tạo tài khoản tuyển dụng và bắt đầu kết nối với những ứng viên phù hợp.'
                  : 'Create an employer account and connect with top matched candidates.'}
            </p>
          </div>

          {/* Role switcher */}
          <div className="grid grid-cols-2 gap-3 mb-6 p-1 bg-slate-100/80 dark:bg-[var(--surface)] rounded-xl border border-slate-200/60 dark:border-slate-800">
            <button
              type="button"
              id="register-role-candidate-btn"
              disabled={busy}
              onClick={() => handleRoleChange('CANDIDATE')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer disabled:opacity-60 ${
                isCandidate
                  ? 'bg-white dark:bg-[var(--surface)] text-[var(--primary)] dark:text-[var(--retro-sky)] shadow-sm border border-blue-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-transparent'
              }`}
            >
              <User
                className={`w-4 h-4 ${
                  isCandidate
                    ? 'text-[var(--primary)] dark:text-[var(--retro-sky)]'
                    : 'text-slate-500'
                }`}
              />
              <span>{isVi ? 'Ứng viên' : 'Candidate'}</span>
            </button>

            <button
              type="button"
              id="register-role-recruiter-btn"
              disabled={busy}
              onClick={() => handleRoleChange('RECRUITER')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer disabled:opacity-60 ${
                !isCandidate
                  ? 'bg-white dark:bg-[var(--surface)] text-[var(--primary)] dark:text-[var(--retro-sky)] shadow-sm border border-blue-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-transparent'
              }`}
            >
              <Briefcase
                className={`w-4 h-4 ${
                  !isCandidate
                    ? 'text-[var(--primary)] dark:text-[var(--retro-sky)]'
                    : 'text-slate-500'
                }`}
              />
              <span>{isVi ? 'Nhà tuyển dụng' : 'Recruiter'}</span>
            </button>
          </div>

          {successNotice && (
            <div
              role="status"
              className="mb-4 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{successNotice}</span>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mb-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <fieldset disabled={busy} className="space-y-4">
              <div>
                <label
                  htmlFor="register-full-name-input"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  {isVi ? 'Họ và tên' : 'Full name'}{' '}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  id="register-full-name-input"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    setError(null);
                  }}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[var(--surface)] text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--border)]/20 focus:border-[var(--border)] transition"
                />
              </div>

              {!isCandidate && (
                <div>
                  <label
                    htmlFor="register-company-name-input"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    {isVi ? 'Tên công ty' : 'Company name'}{' '}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="register-company-name-input"
                    type="text"
                    autoComplete="organization"
                    value={companyName}
                    onChange={(e) => {
                      setCompanyName(e.target.value);
                      setError(null);
                    }}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[var(--surface)] text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--border)]/20 focus:border-[var(--border)] transition"
                  />
                </div>
              )}

              <div>
                <label
                  htmlFor="register-email-input"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  id="register-email-input"
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[var(--surface)] text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--border)]/20 focus:border-[var(--border)] transition"
                />
              </div>

              <div>
                <label
                  htmlFor="register-password-input"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  {isVi ? 'Mật khẩu' : 'Password'}{' '}
                  <span className="text-red-500">*</span>
                </label>

                <div className="relative">
                  <input
                    id="register-password-input"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder={
                      isVi ? 'Tối thiểu 8 ký tự' : 'At least 8 characters'
                    }
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError(null);
                    }}
                    required
                    minLength={8}
                    className="w-full pl-4 pr-11 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[var(--surface)] text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--border)]/20 focus:border-[var(--border)] transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={
                      showPassword
                        ? isVi
                          ? 'Ẩn mật khẩu'
                          : 'Hide password'
                        : isVi
                          ? 'Hiển thị mật khẩu'
                          : 'Show password'
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer transition focus:outline-none"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <PasswordStrengthBar password={password} locale={locale} />
              </div>

              <div>
                <label
                  htmlFor="register-confirm-password-input"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  {isVi ? 'Nhập lại mật khẩu' : 'Confirm Password'}{' '}
                  <span className="text-red-500">*</span>
                </label>

                <div className="relative">
                  <input
                    id="register-confirm-password-input"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder={
                      isVi ? 'Xác nhận lại mật khẩu' : 'Re-enter password'
                    }
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setError(null);
                    }}
                    required
                    minLength={8}
                    className={`w-full pl-4 pr-11 py-2.5 rounded-xl border bg-white dark:bg-[var(--surface)] text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 transition ${
                      passwordsMatch
                        ? 'border-emerald-500 focus:ring-emerald-500/20'
                        : passwordsMismatch
                          ? 'border-rose-400 focus:ring-rose-500/20'
                          : 'border-slate-200 dark:border-slate-700 focus:ring-[var(--border)]/20 focus:border-[var(--border)]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }
                    aria-label={
                      showConfirmPassword
                        ? isVi
                          ? 'Ẩn mật khẩu'
                          : 'Hide password'
                        : isVi
                          ? 'Hiển thị mật khẩu'
                          : 'Show password'
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer transition focus:outline-none"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {passwordsMatch && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 mt-1.5 font-medium animate-fadeIn">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {isVi ? 'Mật khẩu trùng khớp' : 'Passwords match'}
                    </span>
                  </div>
                )}

                {passwordsMismatch && (
                  <div className="flex items-center gap-1.5 text-xs text-rose-500 dark:text-rose-400 mt-1.5 font-medium animate-fadeIn">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {isVi
                        ? 'Mật khẩu chưa khớp'
                        : 'Passwords do not match'}
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-0.5">
                <label className="flex items-start gap-2 cursor-pointer select-none text-xs text-slate-600 dark:text-slate-400 leading-normal">
                  <input
                    type="checkbox"
                    checked={agreedTerms}
                    onChange={(e) => {
                      setAgreedTerms(e.target.checked);
                      setError(null);
                    }}
                    className="w-4 h-4 mt-0.5 rounded border-slate-300 text-[var(--primary)] focus:ring-[var(--border)]/30 cursor-pointer shrink-0"
                  />
                  <span>
                    {isVi
                      ? 'Tôi đồng ý với việc xử lý thông tin đã cung cấp để tạo tài khoản và sử dụng chức năng tuyển dụng của MidCV.'
                      : 'I agree to processing the information provided to create an account and use MidCV recruitment features.'}
                  </span>
                </label>
              </div>

              <button
                id="register-submit-btn"
                type="submit"
                disabled={busy}
                className="w-full mt-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary)] active:scale-[0.99] shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>
                      {isVi
                        ? 'Đang tạo tài khoản...'
                        : 'Creating account...'}
                    </span>
                  </span>
                ) : (
                  <span>
                    {isVi ? 'Tạo tài khoản' : 'Create Account'}
                  </span>
                )}
              </button>
            </fieldset>
          </form>

          {/* Social authentication */}
          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800" />
            </div>
            <span className="relative px-3 bg-white dark:bg-[var(--surface)] text-xs text-slate-400 font-medium">
              {isVi ? '- Hoặc tiếp tục với -' : '- Or continue with -'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={() => handleOAuth('google')}
              disabled={busy}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[var(--surface)] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-600 transition cursor-pointer shadow-xs disabled:opacity-60"
            >
              {oauthLoading === 'google' ? (
                <RefreshCw className="w-4 h-4 animate-spin text-[var(--primary)]" />
              ) : (
                <GoogleIcon className="w-4 h-4 shrink-0" />
              )}
              <span className="truncate">Google</span>
            </button>

            <button
              type="button"
              onClick={() => handleOAuth('github')}
              disabled={busy}
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

          <div className="mt-8 text-center text-xs text-slate-500 dark:text-slate-400">
            {isVi ? 'Đã có tài khoản? ' : 'Already have an account? '}
            <Link
              href={`/login?role=${isCandidate ? 'candidate' : 'hr'}`}
              className="font-semibold text-[var(--primary)] hover:text-[var(--primary)] dark:text-[var(--retro-sky)] hover:underline"
            >
              {isCandidate
                ? isVi
                  ? 'Đăng nhập ngay'
                  : 'Sign in now'
                : isVi
                  ? 'Đăng nhập tại đây'
                  : 'Sign in here'}
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
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[var(--surface)]">
          <RefreshCw className="w-6 h-6 animate-spin text-[var(--primary)]" />
        </div>
      }
    >
      <RegisterFormContent />
    </Suspense>
  );
}