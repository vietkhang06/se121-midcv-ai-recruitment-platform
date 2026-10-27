'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle, ArrowRight, BriefcaseBusiness, Building2, CheckCircle2,
  Eye, EyeOff, ExternalLink, Globe, Mail, RefreshCw, User, X,
} from 'lucide-react';
import { AnimatedModalShell } from '@/components/motion/AnimatedModalShell';
import { BrandLogo } from '@/components/common/BrandLogo';
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter';
import { GitHubIcon, GoogleIcon, LinkedInIcon } from '@/components/auth/SocialIcons';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import {
  checkEmailAvailability, registerCandidateAccount, registerRecruiterAccount, resendVerificationToken,
} from '@/lib/api';
import { EmailCheckStatus, Industry } from '@/types';
import { BASE_URL } from '@/lib/api';

const TARGET_INDUSTRIES_LIST = [
  'Information Technology', 'Marketing', 'Finance', 'Human Resources', 'Design',
  'Education', 'Sales', 'Engineering', 'Healthcare', 'Other',
];

type AuthView = 'LOGIN' | 'REGISTER' | 'VERIFICATION_PENDING';
type OAuthProvider = 'google' | 'github' | 'linkedin';

const inputClass = 'h-12 w-full rounded-xl border border-[var(--border-soft)] bg-white px-4 text-sm text-[var(--heading)] outline-none transition placeholder:text-[var(--primary)] hover:border-[var(--border-soft)] focus:border-[var(--border)] focus:ring-4 focus:ring-[var(--border)]/12 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-70';
const labelClass = 'mb-1.5 block text-xs font-semibold text-[var(--heading)]';

function SocialButtons({
  oauthLoading,
  onOAuth,
}: {
  oauthLoading: OAuthProvider | null;
  onOAuth: (provider: OAuthProvider) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
      {(['google', 'github'] as OAuthProvider[]).map((provider) => {
        const icon = provider === 'google'
          ? <GoogleIcon className="h-4 w-4 shrink-0" />
          : provider === 'github'
            ? <GitHubIcon className="h-4 w-4 shrink-0" />
            : <LinkedInIcon className="h-4 w-4 shrink-0 text-[var(--primary)]" />;
        const label = provider === 'google' ? 'Google' : provider === 'github' ? 'GitHub' : 'LinkedIn';
        return (
          <button key={provider} type="button" onClick={() => onOAuth(provider)} disabled={oauthLoading !== null}
            className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border-soft)] bg-white px-3 text-xs font-semibold text-[var(--heading)] shadow-lg transition hover:-translate-y-0.5 hover:border-[var(--border-soft)] hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--border)]/15 disabled:translate-y-0 disabled:opacity-60">
            {oauthLoading === provider ? <RefreshCw className="h-4 w-4 animate-spin text-[var(--primary)]" /> : icon}
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, authModalMode, closeAuthModal, login, quickOnboardingData, intendedAction } = useAuth();
  const { locale, toggleLocale } = useLanguage();
  const [activeTab, setActiveTab] = useState<AuthView>('LOGIN');
  const [registerRole, setRegisterRole] = useState<'CANDIDATE' | 'RECRUITER'>('CANDIDATE');

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [isEmailUnverified, setIsEmailUnverified] = useState(false);

  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [regAge, setRegAge] = useState(22);
  const [regTargetIndustries, setRegTargetIndustries] = useState<string[]>(['Information Technology']);
  const [regCompanyName, setRegCompanyName] = useState('');
  const [regCompanyIndustry, setRegCompanyIndustry] = useState<Industry>('Technology');
  const [acceptedTerms, setAcceptedTerms] = useState(true);
  const [emailCheckStatus, setEmailCheckStatus] = useState<EmailCheckStatus>('UNKNOWN');
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [isRegisterLoading, setIsRegisterLoading] = useState(false);

  const [pendingVerificationEmail, setPendingVerificationEmail] = useState('');
  const [devVerificationToken, setDevVerificationToken] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [oauthNotice, setOauthNotice] = useState<string | null>(null);
  const [oauthLoading, setOauthLoading] = useState<OAuthProvider | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isAuthModalOpen) return;
    // The global auth trigger is the source of truth whenever a new modal session opens.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveTab(authModalMode);
    setLoginError(null);
    setRegisterError(null);
    setOauthNotice(null);
    setIsEmailUnverified(false);
  }, [authModalMode, isAuthModalOpen]);

  useEffect(() => {
    // First-visit onboarding intentionally pre-fills the registration form.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (quickOnboardingData?.age) setRegAge(quickOnboardingData.age);
    if (quickOnboardingData?.targetIndustry) setRegTargetIndustries([quickOnboardingData.targetIndustry]);
  }, [quickOnboardingData]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((current) => current - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  useEffect(() => () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
  }, []);

  const switchView = (view: 'LOGIN' | 'REGISTER') => {
    setActiveTab(view);
    setLoginError(null);
    setRegisterError(null);
    setOauthNotice(null);
  };

  const toggleRegIndustry = (industry: string) => {
    setRegTargetIndustries((current) => {
      if (current.includes(industry)) return current.length > 1 ? current.filter((item) => item !== industry) : current;
      return [...current, industry];
    });
  };

  const handleEmailChange = (value: string) => {
    setRegEmail(value);
    setRegisterError(null);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    const trimmed = value.trim();
    if (!trimmed || !trimmed.includes('@') || !trimmed.includes('.')) {
      setEmailCheckStatus('UNKNOWN');
      return;
    }
    setEmailCheckStatus('CHECKING');
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const check = await checkEmailAvailability(trimmed);
        setEmailCheckStatus(check.status);
        setRegisterError(check.status === 'ALREADY_EXISTS'
          ? locale === 'vi' ? 'Email này đã được sử dụng. Hãy đăng nhập hoặc sử dụng email khác.' : 'This email is already in use. Please sign in or use another email.'
          : null);
      } catch {
        setEmailCheckStatus('UNKNOWN');
      }
    }, 450);
  };

  const handleLoginSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoginError(null);
    setOauthNotice(null);
    setIsEmailUnverified(false);
    setIsLoginLoading(true);
    try {
      await login(loginEmail.trim(), loginPassword);
    } catch (error: unknown) {
      const authError = error as { code?: string; message?: string } | undefined;
      const message = authError?.message ?? '';
      if (authError?.code === 'EMAIL_NOT_VERIFIED' || message.includes('EMAIL_NOT_VERIFIED') || message.toLowerCase().includes('not verified')) {
        setIsEmailUnverified(true);
        setPendingVerificationEmail(loginEmail.trim());
        setLoginError(locale === 'vi' ? 'Email của bạn chưa được xác thực. Vui lòng xác thực tài khoản để đăng nhập.' : 'Your email is not verified yet. Please verify your email before signing in.');
      } else {
        setLoginError(message || (locale === 'vi' ? 'Tài khoản hoặc mật khẩu không chính xác.' : 'Invalid email or password.'));
      }
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleRegisterSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setRegisterError(null);
    setOauthNotice(null);
    if (!acceptedTerms) {
      setRegisterError(locale === 'vi' ? 'Vui lòng đồng ý với Điều khoản dịch vụ và Chính sách bảo mật.' : 'Please accept the Terms of Service and Privacy Policy.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setRegisterError(locale === 'vi' ? 'Mật khẩu xác nhận không khớp.' : 'Passwords do not match.');
      return;
    }
    if (regPassword.length < 6) {
      setRegisterError(locale === 'vi' ? 'Mật khẩu phải chứa ít nhất 6 ký tự.' : 'Password must be at least 6 characters.');
      return;
    }
    if (emailCheckStatus === 'ALREADY_EXISTS') {
      setRegisterError(locale === 'vi' ? 'Email này đã được sử dụng. Hãy đăng nhập hoặc sử dụng email khác.' : 'This email is already in use. Please sign in or use another email.');
      return;
    }

    setIsRegisterLoading(true);
    try {
      if (registerRole === 'CANDIDATE') {
        const response = await registerCandidateAccount({
          email: regEmail.trim(), password: regPassword, fullName: regFullName.trim(), age: regAge,
          targetIndustry: (regTargetIndustries[0] as Industry) || 'Technology', targetIndustries: regTargetIndustries,
        });
        setPendingVerificationEmail(response.email);
        if (response.devVerificationToken) setDevVerificationToken(response.devVerificationToken);
      } else {
        const response = await registerRecruiterAccount({
          email: regEmail.trim(), password: regPassword, fullName: regFullName.trim(),
          companyName: regCompanyName.trim(), companyIndustry: regCompanyIndustry,
        });
        setPendingVerificationEmail(response.email);
        if (response.devVerificationToken) setDevVerificationToken(response.devVerificationToken);
      }
      setResendCooldown(60);
      setActiveTab('VERIFICATION_PENDING');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      setRegisterError(message || (locale === 'vi' ? 'Đăng ký tài khoản thất bại. Vui lòng thử lại.' : 'Registration failed. Please try again.'));
    } finally {
      setIsRegisterLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setResendMessage(null);
    const email = pendingVerificationEmail || loginEmail.trim() || regEmail.trim();
    if (!email) return;
    try {
      const response = await resendVerificationToken(email);
      if (response.success) {
        setResendMessage(locale === 'vi' ? 'Đã gửi lại email xác thực thành công.' : 'Verification email resent successfully.');
        setResendCooldown(60);
        if (response.devVerificationToken) setDevVerificationToken(response.devVerificationToken);
      } else setResendMessage(response.message);
    } catch (error: unknown) {
      setResendMessage(error instanceof Error ? error.message : locale === 'vi' ? 'Lỗi gửi lại email xác thực.' : 'Failed to resend verification email.');
    }
  };

  const handleOAuth = (provider: OAuthProvider) => {
    if (provider === 'linkedin') return;
    setOauthLoading(provider);
    setOauthNotice(null);
    setLoginError(null);
    setRegisterError(null);
    const currentPath = `${window.location.pathname}${window.location.search}`;
    const safeNext = currentPath.startsWith('/') && !currentPath.startsWith('//') && !currentPath.includes('\\') ? currentPath : '/candidate';
    window.location.replace(`${BASE_URL}/api/v1/auth/oauth/${provider}/start?next=${encodeURIComponent(safeNext)}`);
  };

  const title = activeTab === 'LOGIN'
    ? locale === 'vi' ? 'Chào mừng quay trở lại!' : 'Welcome back!'
    : activeTab === 'REGISTER'
      ? locale === 'vi' ? 'Tạo tài khoản midCV' : 'Create your midCV account'
      : locale === 'vi' ? 'Xác thực tài khoản email' : 'Verify your email';
  const subtitle = activeTab === 'LOGIN'
    ? locale === 'vi' ? 'Đăng nhập để tiếp tục hành trình nghề nghiệp của bạn cùng midCV' : 'Sign in to continue your career journey with midCV'
    : activeTab === 'REGISTER'
      ? locale === 'vi' ? 'Tạo hồ sơ miễn phí và bắt đầu hành trình nghề nghiệp thông minh.' : 'Create a free profile and begin a smarter career journey.'
      : locale === 'vi' ? `Liên kết xác thực đã được gửi đến ${pendingVerificationEmail}` : `A verification link was sent to ${pendingVerificationEmail}`;

  return (
    <AnimatedModalShell isOpen={isAuthModalOpen} onRequestClose={closeAuthModal}
      titleId="auth-modal-title" descriptionId="auth-modal-description" testId="auth-modal"
      overlayClassName="auth-modal-overlay"
      panelClassName="auth-modal-panel relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-[820px] flex-col overflow-hidden rounded-xl bg-[var(--surface)] text-[var(--heading)] shadow-lg sm:max-h-[calc(100dvh-2.5rem)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_50%_0%,rgba(14,165,233,0.12),transparent_68%)]" />
      <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-5 pb-6 pt-5 sm:px-10 sm:pb-7 sm:pt-7 md:px-14">
        <header className="relative grid min-h-12 grid-cols-[1fr_auto_1fr] items-start">
          <div aria-hidden="true" />
          <div className="auth-modal-brand justify-self-center"><BrandLogo size="lg" onClick={closeAuthModal} /></div>
          <div className="flex items-center justify-end gap-2">
            <button type="button" onClick={toggleLocale}
              className="flex h-10 items-center gap-1.5 rounded-xl border border-[var(--border-soft)] bg-white/85 px-3 text-xs font-bold text-[var(--primary)] shadow-sm transition hover:border-[var(--border-soft)] hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--border)]/15"
              aria-label={locale === 'vi' ? 'Chuyển sang tiếng Anh' : 'Switch to Vietnamese'} title={locale === 'vi' ? 'Chuyển sang English' : 'Chuyển sang Tiếng Việt'}>
              <Globe className="h-4 w-4" /><span>{locale.toUpperCase()}</span>
            </button>
            <button type="button" onClick={closeAuthModal}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-soft)] bg-white/90 text-[var(--heading)] shadow-sm transition hover:rotate-6 hover:border-[var(--border-soft)] hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--border)]/15"
              aria-label={locale === 'vi' ? 'Đóng cửa sổ đăng nhập' : 'Close authentication dialog'}>
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <section className="mx-auto mt-3 w-full max-w-[635px]">
          <div className="text-center">
            <h2 id="auth-modal-title" className="font-editorial text-[clamp(1.8rem,4vw,2.35rem)] font-bold leading-tight tracking-[-0.025em] text-[var(--heading)]">{title}</h2>
            <p id="auth-modal-description" className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[var(--primary)]">{subtitle}</p>
          </div>

          {intendedAction && activeTab !== 'VERIFICATION_PENDING' && (
            <div className="mt-4 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-secondary)] px-4 py-2.5 text-xs text-[var(--primary)]">
              {locale === 'vi' ? 'Vui lòng đăng nhập để tiếp tục thao tác đang thực hiện.' : 'Please sign in to continue your current action.'}
            </div>
          )}

          {activeTab === 'LOGIN' && (
            <div className="mt-6">
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {loginError && (
                  <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs text-rose-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div><p>{loginError}</p>{isEmailUnverified && (
                      <button type="button" onClick={handleResend} disabled={resendCooldown > 0} className="mt-1 font-semibold text-[var(--primary)] underline disabled:opacity-60">
                        {resendCooldown > 0 ? (locale === 'vi' ? `Gửi lại sau ${resendCooldown}s` : `Resend in ${resendCooldown}s`) : (locale === 'vi' ? 'Gửi lại email xác thực' : 'Resend verification email')}
                      </button>
                    )}</div>
                  </div>
                )}
                <div>
                  <label htmlFor="auth-login-email" className={labelClass}>{locale === 'vi' ? 'Email / Số điện thoại' : 'Email / Phone number'} <span className="text-rose-500">*</span></label>
                  <input id="auth-login-email" data-autofocus="true" type="email" inputMode="email" autoComplete="username"
                    value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)}
                    placeholder={locale === 'vi' ? 'you@example.com hoặc 0901234567' : 'you@example.com or 0901234567'} className={inputClass} required />
                </div>
                <div>
                  <label htmlFor="auth-login-password" className={labelClass}>{locale === 'vi' ? 'Mật khẩu' : 'Password'} <span className="text-rose-500">*</span></label>
                  <div className="relative">
                    <input id="auth-login-password" type={showLoginPassword ? 'text' : 'password'} autoComplete="current-password"
                      value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)}
                      placeholder={locale === 'vi' ? 'Nhập mật khẩu...' : 'Enter your password...'} className={`${inputClass} pr-12`} required />
                    <button type="button" onClick={() => setShowLoginPassword((current) => !current)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-1.5 text-[var(--primary)] transition hover:bg-[var(--surface-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border)]/30"
                      aria-label={showLoginPassword ? (locale === 'vi' ? 'Ẩn mật khẩu' : 'Hide password') : (locale === 'vi' ? 'Hiện mật khẩu' : 'Show password')}>
                      {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                  <label className="flex cursor-pointer items-center gap-2 text-[var(--primary)]">
                    <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} className="h-4 w-4 cursor-pointer rounded border-[var(--border-soft)] accent-[var(--primary)]" />
                    <span>{locale === 'vi' ? 'Ghi nhớ đăng nhập' : 'Remember me'}</span>
                  </label>
                  <button type="button" onClick={() => setLoginError(locale === 'vi' ? 'Tính năng cấp lại mật khẩu đang được nâng cấp.' : 'Password reset is currently being updated.')}
                    className="font-semibold text-[var(--primary)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border)]/30">
                    {locale === 'vi' ? 'Quên mật khẩu?' : 'Forgot password?'}
                  </button>
                </div>
                <button id="auth-login-submit" type="submit" disabled={isLoginLoading}
                  className="flex h-13 w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary)] px-5 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--border)]/25 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60">
                  {isLoginLoading && <RefreshCw className="h-4 w-4 animate-spin" />}
                  <span>{isLoginLoading ? (locale === 'vi' ? 'Đang đăng nhập...' : 'Signing in...') : (locale === 'vi' ? 'Đăng nhập ngay' : 'Sign in now')}</span>
                  {!isLoginLoading && <ArrowRight className="h-5 w-5" />}
                </button>
              </form>
              <div className="my-5 flex items-center gap-4 text-xs text-[var(--primary)]"><span className="h-px flex-1 bg-[var(--surface-secondary)]" /><span>{locale === 'vi' ? 'Hoặc tiếp tục với' : 'Or continue with'}</span><span className="h-px flex-1 bg-[var(--surface-secondary)]" /></div>
              <SocialButtons oauthLoading={oauthLoading} onOAuth={handleOAuth} />
              {oauthNotice && <p role="status" className="mt-3 text-center text-xs text-[var(--primary)]">{oauthNotice}</p>}
              <p className="mt-5 text-center text-xs text-[var(--text-secondary)]">
                {locale === 'vi' ? 'Chưa có tài khoản?' : "Don't have an account?"}{' '}
                <button type="button" onClick={() => switchView('REGISTER')} className="font-bold text-[var(--primary)] hover:underline">{locale === 'vi' ? 'Đăng ký ngay' : 'Register now'}</button>
              </p>
            </div>
          )}

          {activeTab === 'REGISTER' && (
            <div className="mt-5">
              <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                {registerError && <div role="alert" className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs text-rose-700"><AlertCircle className="h-4 w-4 shrink-0" /><span>{registerError}</span></div>}
                <div className="grid grid-cols-2 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-secondary)] p-1">
                  <button type="button" onClick={() => setRegisterRole('CANDIDATE')}
                    aria-pressed={registerRole === 'CANDIDATE'}
                    className={`flex h-10 items-center justify-center gap-2 rounded-xl text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border)]/30 ${registerRole === 'CANDIDATE' ? 'bg-white text-[var(--primary)] shadow-sm ring-1 ring-[var(--border-soft)]' : 'text-[var(--text-secondary)] hover:text-[var(--heading)]'}`}>
                    <User className="h-4 w-4" />{locale === 'vi' ? 'Ứng viên' : 'Candidate'}
                  </button>
                  <button type="button" onClick={() => setRegisterRole('RECRUITER')}
                    aria-pressed={registerRole === 'RECRUITER'}
                    className={`flex h-10 items-center justify-center gap-2 rounded-xl text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border)]/30 ${registerRole === 'RECRUITER' ? 'bg-white text-[var(--primary)] shadow-sm ring-1 ring-[var(--border-soft)]' : 'text-[var(--text-secondary)] hover:text-[var(--heading)]'}`}>
                    <BriefcaseBusiness className="h-4 w-4" />{locale === 'vi' ? 'Nhà tuyển dụng' : 'Recruiter'}
                  </button>
                </div>
                <div className="grid gap-3.5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="auth-register-name" className={labelClass}>{locale === 'vi' ? 'Họ và tên' : 'Full name'} <span className="text-rose-500">*</span></label>
                    <input id="auth-register-name" data-autofocus="true" type="text" autoComplete="name" value={regFullName} onChange={(event) => setRegFullName(event.target.value)} placeholder={locale === 'vi' ? 'Nguyễn Văn A' : 'Alex Sterling'} className={inputClass} required />
                  </div>
                  <div>
                    <label htmlFor="auth-register-email" className={labelClass}>Email <span className="text-rose-500">*</span></label>
                    <input id="auth-register-email" type="email" autoComplete="email" value={regEmail} onChange={(event) => handleEmailChange(event.target.value)} placeholder="name@example.com"
                      className={`${inputClass} ${emailCheckStatus === 'AVAILABLE' ? 'border-emerald-400' : emailCheckStatus === 'ALREADY_EXISTS' ? 'border-rose-400' : ''}`} required />
                    {emailCheckStatus !== 'UNKNOWN' && (
                      <p className={`mt-1 flex items-center gap-1 text-[11px] ${emailCheckStatus === 'AVAILABLE' ? 'text-emerald-600' : emailCheckStatus === 'ALREADY_EXISTS' ? 'text-rose-600' : 'text-[var(--text-secondary)]'}`}>
                        {emailCheckStatus === 'CHECKING' && <RefreshCw className="h-3 w-3 animate-spin" />}
                        {emailCheckStatus === 'AVAILABLE' && <CheckCircle2 className="h-3 w-3" />}
                        {emailCheckStatus === 'ALREADY_EXISTS' && <AlertCircle className="h-3 w-3" />}
                        {emailCheckStatus === 'CHECKING' ? (locale === 'vi' ? 'Đang kiểm tra email...' : 'Checking email...') : emailCheckStatus === 'AVAILABLE' ? (locale === 'vi' ? 'Email có thể sử dụng.' : 'Email is available.') : (locale === 'vi' ? 'Email đã tồn tại.' : 'Email already exists.')}
                      </p>
                    )}
                  </div>
                </div>
                {registerRole === 'CANDIDATE' ? (
                  <div className="space-y-3">
                    <div className="flex items-start gap-2.5 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-secondary)] px-3.5 py-2.5 text-[11px] leading-5 text-[var(--primary)]">
                      <User className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />
                      <p>
                        <strong className="text-[var(--heading)]">{locale === 'vi' ? 'Hồ sơ ứng viên' : 'Candidate profile'}:</strong>{' '}
                        {locale === 'vi' ? 'chọn ngành nghề mục tiêu để midCV cá nhân hóa cơ hội phù hợp.' : 'choose target industries so midCV can personalize relevant opportunities.'}
                      </p>
                    </div>
                    <div className="grid gap-3.5 sm:grid-cols-[140px_1fr]">
                      <div>
                        <label htmlFor="auth-register-age" className={labelClass}>{locale === 'vi' ? 'Độ tuổi' : 'Age'} <span className="text-rose-500">*</span></label>
                        <input id="auth-register-age" type="number" min={18} max={70} value={regAge} onChange={(event) => setRegAge(Number.parseInt(event.target.value, 10) || 22)} className={inputClass} required />
                      </div>
                      <fieldset>
                        <legend className={labelClass}>{locale === 'vi' ? 'Ngành nghề mục tiêu' : 'Target industries'}</legend>
                        <div className="flex max-h-[104px] flex-wrap gap-1.5 overflow-y-auto rounded-xl border border-[var(--border-soft)] bg-white p-2.5">
                          {TARGET_INDUSTRIES_LIST.map((industry) => {
                            const selected = regTargetIndustries.includes(industry);
                            return <label key={industry} className={`cursor-pointer rounded-xl border px-2.5 py-1 text-[11px] font-medium transition ${selected ? 'border-[var(--border)] bg-[var(--primary)] text-white' : 'border-[var(--border-soft)] text-[var(--primary)] hover:border-[var(--border-soft)]'}`}>
                              <input type="checkbox" checked={selected} onChange={() => toggleRegIndustry(industry)} className="sr-only" />{industry}
                            </label>;
                          })}
                        </div>
                      </fieldset>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-start gap-2.5 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-secondary)] px-3.5 py-2.5 text-[11px] leading-5 text-[var(--text-primary)]">
                      <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--heading)]" />
                      <p>
                        <strong className="text-[var(--heading)]">{locale === 'vi' ? 'Tài khoản nhà tuyển dụng' : 'Recruiter account'}:</strong>{' '}
                        {locale === 'vi' ? 'thông tin doanh nghiệp giúp xác minh hồ sơ và xây dựng độ tin cậy với ứng viên.' : 'company details support profile verification and build candidate trust.'}
                      </p>
                    </div>
                    <div className="grid gap-3.5 sm:grid-cols-2">
                      <div>
                        <label htmlFor="auth-company-name" className={labelClass}>{locale === 'vi' ? 'Tên công ty / Doanh nghiệp' : 'Company name'} <span className="text-rose-500">*</span></label>
                        <div className="relative"><Building2 className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--primary)]" />
                          <input id="auth-company-name" type="text" autoComplete="organization" value={regCompanyName} onChange={(event) => setRegCompanyName(event.target.value)} placeholder="CloudScale Systems Corp" className={`${inputClass} pl-11`} required />
                        </div>
                      </div>
                      <div>
                        <label htmlFor="auth-company-industry" className={labelClass}>{locale === 'vi' ? 'Lĩnh vực hoạt động' : 'Industry sector'}</label>
                        <select id="auth-company-industry" value={regCompanyIndustry} onChange={(event) => setRegCompanyIndustry(event.target.value as Industry)} className={inputClass}>
                          <option value="Technology">{locale === 'vi' ? 'Công nghệ (IT)' : 'Technology (IT)'}</option><option value="Finance">{locale === 'vi' ? 'Tài chính - Fintech' : 'Finance - Fintech'}</option><option value="Marketing">{locale === 'vi' ? 'Truyền thông - Quảng cáo' : 'Marketing & Ads'}</option><option value="Healthcare">{locale === 'vi' ? 'Y tế' : 'Healthcare'}</option><option value="General">{locale === 'vi' ? 'Khác' : 'Other'}</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
                <div className="grid gap-3.5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="auth-register-password" className={labelClass}>{locale === 'vi' ? 'Mật khẩu' : 'Password'} <span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <input id="auth-register-password" type={showRegisterPassword ? 'text' : 'password'} autoComplete="new-password" value={regPassword} onChange={(event) => setRegPassword(event.target.value)} placeholder={locale === 'vi' ? 'Tối thiểu 6 ký tự' : 'At least 6 characters'} className={`${inputClass} pr-11`} required />
                      <button type="button" onClick={() => setShowRegisterPassword((current) => !current)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-1 text-[var(--primary)]" aria-label={showRegisterPassword ? 'Hide password' : 'Show password'}>{showRegisterPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="auth-register-confirm" className={labelClass}>{locale === 'vi' ? 'Nhập lại mật khẩu' : 'Confirm password'} <span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <input id="auth-register-confirm" type={showConfirmPassword ? 'text' : 'password'} autoComplete="new-password" value={regConfirmPassword} onChange={(event) => setRegConfirmPassword(event.target.value)} placeholder={locale === 'vi' ? 'Xác nhận lại mật khẩu' : 'Confirm your password'} className={`${inputClass} pr-11`} required />
                      <button type="button" onClick={() => setShowConfirmPassword((current) => !current)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-1 text-[var(--primary)]" aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}>{showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                    </div>
                  </div>
                </div>
                {regPassword && <PasswordStrengthMeter password={regPassword} />}
                <label className="flex cursor-pointer items-start gap-2 text-[11px] leading-5 text-[var(--primary)]">
                  <input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--primary)]" />
                  <span>{locale === 'vi' ? 'Tôi đồng ý với Điều khoản dịch vụ và Chính sách bảo mật của midCV.' : 'I agree to the midCV Terms of Service and Privacy Policy.'}</span>
                </label>
                <button type="submit" disabled={isRegisterLoading || emailCheckStatus === 'ALREADY_EXISTS'}
                  className="flex h-13 w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary)] px-5 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:brightness-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--border)]/25 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60">
                  {isRegisterLoading && <RefreshCw className="h-4 w-4 animate-spin" />}<span>{isRegisterLoading ? (locale === 'vi' ? 'Đang tạo tài khoản...' : 'Creating account...') : (locale === 'vi' ? 'Tạo tài khoản & nhận link xác thực' : 'Create account & get verification link')}</span>{!isRegisterLoading && <ArrowRight className="h-5 w-5" />}
                </button>
              </form>
              <div className="my-4 flex items-center gap-4 text-xs text-[var(--primary)]"><span className="h-px flex-1 bg-[var(--surface-secondary)]" /><span>{locale === 'vi' ? 'Hoặc đăng ký với' : 'Or register with'}</span><span className="h-px flex-1 bg-[var(--surface-secondary)]" /></div>
              <SocialButtons oauthLoading={oauthLoading} onOAuth={handleOAuth} />
              {oauthNotice && <p role="status" className="mt-3 text-center text-xs text-[var(--primary)]">{oauthNotice}</p>}
              <p className="mt-4 text-center text-xs text-[var(--text-secondary)]">{locale === 'vi' ? 'Đã có tài khoản?' : 'Already have an account?'}{' '}<button type="button" onClick={() => switchView('LOGIN')} className="font-bold text-[var(--primary)] hover:underline">{locale === 'vi' ? 'Đăng nhập ngay' : 'Sign in now'}</button></p>
            </div>
          )}

          {activeTab === 'VERIFICATION_PENDING' && (
            <div className="mt-7 space-y-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-800">
                <div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white"><Mail className="h-5 w-5" /></div><div><h3 className="font-bold text-[var(--heading)]">{locale === 'vi' ? 'Kiểm tra hộp thư của bạn' : 'Check your inbox'}</h3><p className="mt-1 text-xs leading-5 text-emerald-700">{locale === 'vi' ? 'Nhấn liên kết bảo mật trong email để kích hoạt tài khoản.' : 'Use the secure link in the email to activate your account.'}</p><strong className="mt-1 block break-all text-xs">{pendingVerificationEmail}</strong></div></div>
              </div>
              {devVerificationToken && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900"><p className="font-bold">{locale === 'vi' ? 'Môi trường phát triển: mã xác thực' : 'Development verification token'}</p><code className="mt-2 block break-all rounded-xl bg-white p-2 text-[var(--heading)]">{devVerificationToken}</code><Link href={`/verify-email?token=${devVerificationToken}`} onClick={closeAuthModal} className="mt-2 inline-flex items-center gap-1 font-semibold text-[var(--primary)] underline"><ExternalLink className="h-3.5 w-3.5" />{locale === 'vi' ? 'Xác thực ngay (mở liên kết)' : 'Verify now (open link)'}</Link></div>}
              {resendMessage && <p role="status" className="rounded-xl bg-[var(--surface-secondary)] p-3 text-xs text-[var(--primary)]">{resendMessage}</p>}
              <div className="flex flex-col-reverse items-stretch justify-between gap-3 sm:flex-row sm:items-center">
                <button type="button" onClick={() => switchView('LOGIN')} className="text-xs font-semibold text-[var(--primary)] hover:underline">{locale === 'vi' ? 'Quay lại đăng nhập' : 'Back to sign in'}</button>
                <button type="button" onClick={handleResend} disabled={resendCooldown > 0} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border-soft)] bg-white px-4 text-xs font-semibold text-[var(--heading)] hover:border-[var(--border-soft)] disabled:opacity-60"><RefreshCw className={`h-3.5 w-3.5 ${resendCooldown > 0 ? 'animate-spin' : ''}`} />{resendCooldown > 0 ? (locale === 'vi' ? `Gửi lại sau ${resendCooldown}s` : `Resend in ${resendCooldown}s`) : (locale === 'vi' ? 'Gửi lại email xác thực' : 'Resend verification email')}</button>
              </div>
            </div>
          )}
        </section>
      </div>
    </AnimatedModalShell>
  );
};
