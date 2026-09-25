'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Industry, EmailCheckStatus } from '@/types';
import {
  checkEmailAvailability,
  registerCandidateAccount,
  registerRecruiterAccount,
  resendVerificationToken
} from '@/lib/api';
import { getImageSlot } from '@/config/imageConfig';
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter';
import { useLanguage } from '@/context/LanguageContext';
import { BrandLogo } from '@/components/common/BrandLogo';
import {
  X,
  LogIn,
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Mail,
  Lock,
  Building2,
  User,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  Sparkles,
  Award,
  Layers,
  Check
} from 'lucide-react';

const TARGET_INDUSTRIES_LIST = [
  'Information Technology',
  'Marketing',
  'Finance',
  'Human Resources',
  'Design',
  'Education',
  'Sales',
  'Engineering',
  'Healthcare',
  'Other'
];

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, authModalMode, closeAuthModal, login, quickOnboardingData, intendedAction } = useAuth();
  const { t, locale } = useLanguage();

  // Active view: LOGIN | REGISTER | VERIFICATION_PENDING
  const [activeTab, setActiveTab] = useState<'LOGIN' | 'REGISTER' | 'VERIFICATION_PENDING'>('LOGIN');
  const [registerRole, setRegisterRole] = useState<'CANDIDATE' | 'RECRUITER'>('CANDIDATE');

  // Login Form States (strictly controlled)
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoginLoading, setIsLoginLoading] = useState<boolean>(false);
  const [isEmailUnverified, setIsEmailUnverified] = useState<boolean>(false);

  // Register Form States (strictly controlled)
  const [regFullName, setRegFullName] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');
  const [regConfirmPassword, setRegConfirmPassword] = useState<string>('');
  const [regAge, setRegAge] = useState<number>(22);
  const [regTargetIndustries, setRegTargetIndustries] = useState<string[]>(['Information Technology']);
  
  const toggleRegIndustry = (ind: string) => {
    if (regTargetIndustries.includes(ind)) {
      if (regTargetIndustries.length > 1) {
        setRegTargetIndustries(regTargetIndustries.filter(x => x !== ind));
      }
    } else {
      setRegTargetIndustries([...regTargetIndustries, ind]);
    }
  };

  // Recruiter fields
  const [regCompanyName, setRegCompanyName] = useState<string>('');
  const [regCompanyIndustry, setRegCompanyIndustry] = useState<Industry>('Technology');

  // Validation & UX States
  const [emailCheckStatus, setEmailCheckStatus] = useState<EmailCheckStatus>('UNKNOWN');
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [isRegisterLoading, setIsRegisterLoading] = useState<boolean>(false);

  // Verification Screen States
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string>('');
  const [devVerificationToken, setDevVerificationToken] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auth hero slot from image architecture
  const authHeroSlot = getImageSlot('IMAGE_PLACEHOLDER_AUTH_HERO');

  useEffect(() => {
    setActiveTab(authModalMode);
    setLoginError(null);
    setRegisterError(null);
    setIsEmailUnverified(false);
  }, [authModalMode, isAuthModalOpen]);

  // Prefill quick onboarding data from FirstVisitModal
  useEffect(() => {
    if (quickOnboardingData) {
      if (typeof quickOnboardingData.age === 'number') {
        setRegAge(quickOnboardingData.age);
      }
      if (quickOnboardingData.targetIndustry) {
        setRegTargetIndustries([quickOnboardingData.targetIndustry]);
      }
    }
  }, [quickOnboardingData]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Debounced Email Existence Check on registration
  const handleEmailChange = (val: string) => {
    setRegEmail(val);
    setRegisterError(null);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmed = val.trim();
    if (!trimmed || !trimmed.includes('@') || !trimmed.includes('.')) {
      setEmailCheckStatus('UNKNOWN');
      return;
    }

    setEmailCheckStatus('CHECKING');
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const check = await checkEmailAvailability(trimmed);
        setEmailCheckStatus(check.status);
        if (check.status === 'ALREADY_EXISTS') {
          setRegisterError('Email này đã được sử dụng. Hãy đăng nhập hoặc sử dụng email khác.');
        } else {
          setRegisterError(null);
        }
      } catch {
        setEmailCheckStatus('UNKNOWN');
      }
    }, 450);
  };

  if (!isAuthModalOpen) return null;

  // Handle Login Submission
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsEmailUnverified(false);
    setIsLoginLoading(true);

    try {
      await login(loginEmail, loginPassword);
    } catch (err: any) {
      if (err.code === 'EMAIL_NOT_VERIFIED' || err.message?.includes('EMAIL_NOT_VERIFIED') || err.message?.toLowerCase().includes('not verified')) {
        setIsEmailUnverified(true);
        setPendingVerificationEmail(loginEmail.trim());
        setLoginError(locale === 'vi' ? 'Email của bạn chưa được xác thực. Vui lòng xác thực tài khoản để đăng nhập.' : 'Your email is not verified yet. Please verify your email before signing in.');
      } else {
        setLoginError(err.message || (locale === 'vi' ? 'Tài khoản hoặc mật khẩu không chính xác.' : 'Invalid email or password.'));
      }
    } finally {
      setIsLoginLoading(false);
    }
  };

  // Handle Registration Submission
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError(null);

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
        const res = await registerCandidateAccount({
          email: regEmail.trim(),
          password: regPassword,
          fullName: regFullName.trim(),
          age: regAge,
          targetIndustry: (regTargetIndustries[0] as Industry) || 'Technology',
          targetIndustries: regTargetIndustries
        });
        setPendingVerificationEmail(res.email);
        if (res.devVerificationToken) {
          setDevVerificationToken(res.devVerificationToken);
        }
      } else {
        const res = await registerRecruiterAccount({
          email: regEmail.trim(),
          password: regPassword,
          fullName: regFullName.trim(),
          companyName: regCompanyName.trim(),
          companyIndustry: regCompanyIndustry
        });
        setPendingVerificationEmail(res.email);
        if (res.devVerificationToken) {
          setDevVerificationToken(res.devVerificationToken);
        }
      }

      setResendCooldown(60);
      setActiveTab('VERIFICATION_PENDING');
    } catch (err: any) {
      setRegisterError(err.message || (locale === 'vi' ? 'Đăng ký tài khoản thất bại. Vui lòng thử lại.' : 'Registration failed. Please try again.'));
    } finally {
      setIsRegisterLoading(false);
    }
  };

  // Handle Resend Verification Email
  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setResendMessage(null);

    const emailToSend = pendingVerificationEmail || loginEmail.trim() || regEmail.trim();
    if (!emailToSend) return;

    try {
      const res = await resendVerificationToken(emailToSend);
      if (res.success) {
        setResendMessage(locale === 'vi' ? 'Đã gửi lại email xác thực thành công.' : 'Verification email resent successfully.');
        setResendCooldown(60);
        if (res.devVerificationToken) {
          setDevVerificationToken(res.devVerificationToken);
        }
      } else {
        setResendMessage(res.message);
      }
    } catch (err: any) {
      setResendMessage(err.message || (locale === 'vi' ? 'Lỗi gửi lại email xác thực.' : 'Failed to resend verification email.'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-4xl bg-white dark:bg-[#111C38] border border-slate-200 dark:border-[#1E293B] rounded-2xl shadow-2xl text-[#0F2A52] dark:text-[#F1F5F9] relative overflow-hidden max-h-[92vh] flex flex-col md:flex-row">
        
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 z-20 p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#18294E] transition"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* LEFT COLUMN: midCV® Editorial Brand Visual & Hero Placeholder */}
        <div className="hidden md:flex md:w-5/12 bg-gradient-to-br from-[#0F2A52] to-[#1E3A5F] dark:from-[#0F172A] dark:to-[#1E293B] p-8 text-white flex-col justify-between relative overflow-hidden select-none">
          {/* Subtle background radial accent */}
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-[#2563EB]/25 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-[#00B14F]/15 rounded-full blur-3xl pointer-events-none" />

          {/* Top Brand Identity */}
          <div className="relative z-10 space-y-6">
            <BrandLogo size="md" />

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-[#2563EB]/25 text-[#D7F9FA] border border-[#2563EB]/40">
                <Sparkles className="w-3 h-3 text-[#D7F9FA]" />
                Evidence-Based Recruitment
              </span>
              <h2 className="font-editorial text-2xl lg:text-3xl text-white leading-tight">
                {locale === 'vi' ? 'Hồ Sơ Xác Thực. Tuyển Dụng Không Thiên Vị.' : 'Verified Profiles. Unbiased Hiring.'}
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                {locale === 'vi'
                  ? 'Đối sánh chuẩn xác năng lực thực của ứng viên với tiêu chí tuyển dụng thông qua vector embeddings đa chiều và minh chứng số.'
                  : 'Accurate matching of candidate skills with job criteria via multidimensional vector embeddings and digital evidence.'}
              </p>
            </div>
          </div>

          {/* Center Graphic: IMAGE_PLACEHOLDER_AUTH_HERO */}
          <div className="relative z-10 my-6 py-4 px-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs">
            {authHeroSlot.placeholderUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={authHeroSlot.placeholderUrl}
                alt={authHeroSlot.label}
                className="w-full h-36 object-cover rounded-lg"
              />
            ) : (
              /* Vector Geometric Match Graph Illustration */
              <div className="h-32 w-full flex flex-col justify-center items-center relative">
                <svg className="w-full h-full text-[#00B14F]" viewBox="0 0 300 120" fill="none">
                  {/* Background Grid Pattern */}
                  <line x1="20" y1="60" x2="280" y2="60" stroke="#2563EB" strokeOpacity="0.25" strokeDasharray="3 3" />
                  <line x1="150" y1="10" x2="150" y2="110" stroke="#2563EB" strokeOpacity="0.25" strokeDasharray="3 3" />
                  {/* Semantic Connection Arcs */}
                  <path d="M 50 60 Q 150 15 250 60" stroke="#00B14F" strokeWidth="2" strokeOpacity="0.9" />
                  <path d="M 50 60 Q 150 105 250 60" stroke="#2563EB" strokeWidth="1.5" strokeOpacity="0.8" strokeDasharray="4 2" />
                  {/* Nodes */}
                  <circle cx="50" cy="60" r="14" fill="#0F2A52" stroke="#00B14F" strokeWidth="2" />
                  <circle cx="250" cy="60" r="14" fill="#0F2A52" stroke="#2563EB" strokeWidth="2" />
                  <circle cx="150" cy="60" r="18" fill="#1E3A5F" stroke="#00B14F" strokeWidth="2.5" />
                  {/* Inner node symbols */}
                  <text x="50" y="64" fontSize="9" fill="#00B14F" textAnchor="middle" fontWeight="bold">CV</text>
                  <text x="250" y="64" fontSize="9" fill="#93C5FD" textAnchor="middle" fontWeight="bold">JD</text>
                  <text x="150" y="64" fontSize="10" fill="#FFFFFF" textAnchor="middle" fontWeight="bold">94%</text>
                </svg>
                <div className="absolute bottom-1 text-[10px] font-mono text-[#D7F9FA]">
                  Semantic Vector Cosine Similarity
                </div>
              </div>
            )}
          </div>

          {/* Bottom Trust Indicators */}
          <div className="relative z-10 space-y-2 pt-2 border-t border-white/10">
            <div className="flex items-center gap-2 text-[11px] text-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#00B14F] flex-shrink-0" />
              <span>{locale === 'vi' ? 'Bản lưu CV bất biến (Immutable Snapshot)' : 'Immutable CV Snapshot'}</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#00B14F] flex-shrink-0" />
              <span>{locale === 'vi' ? 'Đối soát khách quan, bảo vệ quyền riêng tư' : 'Objective audit, privacy protected'}</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Form Controls & Interactive States */}
        <div className="w-full md:w-7/12 p-6 sm:p-8 bg-white dark:bg-[#111C38] flex flex-col justify-between overflow-y-auto max-h-[92vh]">
          <div>
            {/* Header Title based on Active View */}
            <div className="mb-5 space-y-1">
              <h3 className="font-editorial text-2xl font-bold text-[#0F2A52] dark:text-[#F1F5F9] tracking-tight">
                {activeTab === 'LOGIN'
                  ? (locale === 'vi' ? 'Đăng Nhập Tài Khoản' : 'Account Sign In')
                  : activeTab === 'REGISTER'
                  ? (locale === 'vi' ? 'Đăng Ký Tài Khoản Mới' : 'Create New Account')
                  : (locale === 'vi' ? 'Xác Thực Tài Khoản Email' : 'Email Account Verification')}
              </h3>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                {activeTab === 'LOGIN'
                  ? (locale === 'vi' ? 'Nhập email và mật khẩu của bạn để truy cập midCV®.' : 'Enter your email and password to access midCV®.')
                  : activeTab === 'REGISTER'
                  ? (locale === 'vi' ? 'Tạo tài khoản để đối sánh năng lực thực và ứng tuyển.' : 'Create an account to match real competencies and apply.')
                  : (locale === 'vi' ? `Mã xác thực đã được gửi đến ${pendingVerificationEmail}` : `Verification token sent to ${pendingVerificationEmail}`)}
              </p>
            </div>

            {/* Tab Switcher (Visible on Login & Register) */}
            {activeTab !== 'VERIFICATION_PENDING' && (
              <div className="flex bg-slate-100 dark:bg-[#13233F] p-1 rounded-xl mb-5 border border-slate-200 dark:border-[#1E3A5F]">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('LOGIN');
                    setLoginError(null);
                  }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
                    activeTab === 'LOGIN'
                      ? 'bg-[#2563EB] text-white shadow-xs'
                      : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F2A52] dark:hover:text-white'
                  }`}
                >
                  {locale === 'vi' ? 'Đăng nhập' : 'Sign in'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('REGISTER');
                    setRegisterError(null);
                  }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
                    activeTab === 'REGISTER'
                      ? 'bg-[#2563EB] text-white shadow-xs'
                      : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F2A52] dark:hover:text-white'
                  }`}
                >
                  {locale === 'vi' ? 'Đăng ký tài khoản' : 'Register'}
                </button>
              </div>
            )}

            {/* Intended Action Notice */}
            {intendedAction && activeTab !== 'VERIFICATION_PENDING' && (
              <div className="mb-4 p-3 rounded-xl bg-[#EFF6FF] dark:bg-[#2563EB]/15 border border-[#2563EB]/30 text-xs text-[#1E40AF] dark:text-[#93C5FD] flex items-center gap-2">
                <Sparkles className="w-4 h-4 flex-shrink-0 text-[#2563EB]" />
                <span>{locale === 'vi' ? 'Đăng nhập để tiếp tục thao tác nộp đơn ứng tuyển của bạn.' : 'Sign in to proceed with your job application.'}</span>
              </div>
            )}

            {/* 1. LOGIN FORM */}
            {activeTab === 'LOGIN' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {loginError && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <span>{loginError}</span>
                      {isEmailUnverified && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={handleResend}
                            disabled={resendCooldown > 0}
                            className="text-[#2563EB] dark:text-[#60A5FA] underline font-semibold hover:text-[#1D4ED8]"
                          >
                            {resendCooldown > 0
                              ? (locale === 'vi' ? `Gửi lại sau ${resendCooldown}s` : `Resend in ${resendCooldown}s`)
                              : (locale === 'vi' ? 'Bấm vào đây để gửi lại email xác thực' : 'Click here to resend verification email')}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-[#0F2A52] dark:text-[#E2E8F0] mb-1 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-[#64748B] dark:text-[#94A3B8]" />
                    <span>{locale === 'vi' ? 'Email đăng nhập' : 'Login Email'}</span>
                  </label>
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={loginEmail ?? ''}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/50 dark:bg-[#13233F] border border-slate-200 dark:border-[#1E3A5F] text-[#0F2A52] dark:text-[#F1F5F9] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 placeholder-slate-400 dark:placeholder-slate-500 transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F2A52] dark:text-[#E2E8F0] mb-1 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-[#64748B] dark:text-[#94A3B8]" />
                    <span>{locale === 'vi' ? 'Mật khẩu' : 'Password'}</span>
                  </label>
                  <input
                    type="password"
                    placeholder={locale === 'vi' ? 'Nhập mật khẩu...' : 'Enter your password...'}
                    value={loginPassword ?? ''}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/50 dark:bg-[#13233F] border border-slate-200 dark:border-[#1E3A5F] text-[#0F2A52] dark:text-[#F1F5F9] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 placeholder-slate-400 dark:placeholder-slate-500 transition"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoginLoading}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] shadow-sm transition active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{isLoginLoading 
                    ? (locale === 'vi' ? 'Đang đăng nhập...' : 'Signing in...') 
                    : (locale === 'vi' ? 'Đăng nhập ngay' : 'Sign In Now')}</span>
                </button>
              </form>
            )}

            {/* 2. REGISTER FORM */}
            {activeTab === 'REGISTER' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-3.5 text-xs">
                {registerError && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                    <span>{registerError}</span>
                  </div>
                )}

                {/* Role Switcher */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRegisterRole('CANDIDATE')}
                    className={`p-2 rounded-xl border text-center font-semibold transition ${
                      registerRole === 'CANDIDATE'
                        ? 'border-[#2563EB] bg-[#2563EB] text-white shadow-xs'
                        : 'border-slate-200 dark:border-[#1E3A5F] bg-white dark:bg-[#13233F] text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F2A52] dark:hover:text-white'
                    }`}
                  >
                    {locale === 'vi' ? 'Ứng viên tìm việc' : 'Job Candidate'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRegisterRole('RECRUITER')}
                    className={`p-2 rounded-xl border text-center font-semibold transition ${
                      registerRole === 'RECRUITER'
                        ? 'border-[#2563EB] bg-[#2563EB] text-white shadow-xs'
                        : 'border-slate-200 dark:border-[#1E3A5F] bg-white dark:bg-[#13233F] text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F2A52] dark:hover:text-white'
                    }`}
                  >
                    {locale === 'vi' ? 'Nhà tuyển dụng (HR)' : 'Recruiter (HR)'}
                  </button>
                </div>

                {/* Full Name */}
                <div>
                  <label className="block font-semibold text-[#0F2A52] dark:text-[#E2E8F0] mb-1 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-[#64748B] dark:text-[#94A3B8]" />
                    <span>{registerRole === 'CANDIDATE' 
                      ? (locale === 'vi' ? 'Họ và tên ứng viên' : 'Candidate Full Name') 
                      : (locale === 'vi' ? 'Họ và tên người tuyển dụng' : 'Recruiter Full Name')}</span>
                  </label>
                  <input
                    type="text"
                    placeholder={locale === 'vi' ? 'Nguyễn Văn A' : 'Alex Sterling'}
                    value={regFullName ?? ''}
                    onChange={(e) => setRegFullName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50/50 dark:bg-[#13233F] border border-slate-200 dark:border-[#1E3A5F] text-[#0F2A52] dark:text-[#F1F5F9] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 placeholder-slate-400 dark:placeholder-slate-500"
                    required
                  />
                </div>

                {/* Email with Debounced Existence Check */}
                <div>
                  <label className="block font-semibold text-[#0F2A52] dark:text-[#E2E8F0] mb-1 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-[#64748B] dark:text-[#94A3B8]" />
                    <span>{locale === 'vi' ? 'Email tài khoản' : 'Account Email'}</span>
                  </label>
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={regEmail ?? ''}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    className={`w-full px-3.5 py-2 rounded-xl bg-slate-50/50 dark:bg-[#13233F] border text-[#0F2A52] dark:text-[#F1F5F9] text-sm focus:outline-none placeholder-slate-400 dark:placeholder-slate-500 ${
                      emailCheckStatus === 'ALREADY_EXISTS'
                        ? 'border-rose-500'
                        : emailCheckStatus === 'AVAILABLE'
                        ? 'border-[#00B14F]'
                        : 'border-slate-200 dark:border-[#1E3A5F] focus:border-[#2563EB]'
                    }`}
                    required
                  />
                  {/* Email Feedback Badge */}
                  <div className="pt-1 text-[11px]">
                    {emailCheckStatus === 'CHECKING' && (
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 animate-spin text-[#2563EB]" />
                        <span>{locale === 'vi' ? 'Đang kiểm tra email...' : 'Checking email...'}</span>
                      </span>
                    )}
                    {emailCheckStatus === 'AVAILABLE' && (
                      <span className="text-[#00B14F] dark:text-[#10B981] flex items-center gap-1 font-medium">
                        <CheckCircle2 className="w-3 h-3 text-[#00B14F]" />
                        <span>{locale === 'vi' ? 'Email có thể sử dụng.' : 'Email is available.'}</span>
                      </span>
                    )}
                    {emailCheckStatus === 'ALREADY_EXISTS' && (
                      <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3 h-3 text-rose-600" />
                        <span>{locale === 'vi' ? 'Email đã tồn tại trong hệ thống.' : 'Email already exists.'}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Role Specific Fields */}
                {registerRole === 'CANDIDATE' ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block font-semibold text-[#0F2A52] dark:text-[#E2E8F0] mb-1 text-xs">
                        {locale === 'vi' ? 'Độ tuổi' : 'Age'}
                      </label>
                      <input
                        type="number"
                        min={18}
                        max={70}
                        value={regAge || ''}
                        onChange={(e) => setRegAge(parseInt(e.target.value) || 22)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50/50 dark:bg-[#13233F] border border-slate-200 dark:border-[#1E3A5F] text-[#0F2A52] dark:text-[#F1F5F9] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-[#0F2A52] dark:text-[#E2E8F0] mb-1.5 text-xs">
                        {locale === 'vi' ? 'Ngành mục tiêu (Có thể chọn nhiều ngành)' : 'Target Industries (Multiple selection)'}
                      </label>
                      <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto p-2 bg-slate-50 dark:bg-[#13233F] border border-slate-200 dark:border-[#1E3A5F] rounded-xl">
                        {TARGET_INDUSTRIES_LIST.map((ind) => {
                          const isChecked = regTargetIndustries.includes(ind);
                          return (
                            <label
                              key={ind}
                              className={`flex items-center gap-2 p-1.5 rounded-lg text-xs cursor-pointer transition select-none ${
                                isChecked
                                  ? 'bg-[#2563EB] text-white font-medium shadow-xs'
                                  : 'text-[#64748B] dark:text-[#94A3B8] hover:bg-slate-200/60 dark:hover:bg-[#18294E]'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleRegIndustry(ind)}
                                className="accent-[#2563EB] rounded cursor-pointer"
                              />
                              <span className="truncate">{ind}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div>
                      <label className="block font-semibold text-[#0F2A52] dark:text-[#E2E8F0] mb-1 flex items-center gap-1 text-xs">
                        <Building2 className="w-3.5 h-3.5 text-[#64748B] dark:text-[#94A3B8]" />
                        <span>{locale === 'vi' ? 'Tên công ty / Doanh nghiệp' : 'Company / Organization Name'}</span>
                      </label>
                      <input
                        type="text"
                        placeholder="CloudScale Systems Corp"
                        value={regCompanyName ?? ''}
                        onChange={(e) => setRegCompanyName(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50/50 dark:bg-[#13233F] border border-slate-200 dark:border-[#1E3A5F] text-[#0F2A52] dark:text-[#F1F5F9] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 placeholder-slate-400 dark:placeholder-slate-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-[#0F2A52] dark:text-[#E2E8F0] mb-1 text-xs">
                        {locale === 'vi' ? 'Lĩnh vực hoạt động' : 'Industry Sector'}
                      </label>
                      <select
                        value={regCompanyIndustry ?? 'Technology'}
                        onChange={(e) => setRegCompanyIndustry(e.target.value as Industry)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50/50 dark:bg-[#13233F] border border-slate-200 dark:border-[#1E3A5F] text-[#0F2A52] dark:text-[#F1F5F9] text-sm focus:outline-none focus:border-[#2563EB]"
                      >
                        <option value="Technology">{locale === 'vi' ? 'Công nghệ (IT)' : 'Technology (IT)'}</option>
                        <option value="Finance">{locale === 'vi' ? 'Tài chính - Fintech' : 'Finance - Fintech'}</option>
                        <option value="Marketing">{locale === 'vi' ? 'Truyền thông - Quảng cáo' : 'Marketing & Ads'}</option>
                        <option value="Healthcare">{locale === 'vi' ? 'Y tế' : 'Healthcare'}</option>
                        <option value="General">{locale === 'vi' ? 'Khác' : 'Other'}</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Password Fields */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-[#0F2A52] dark:text-[#E2E8F0] mb-1 flex items-center gap-1 text-xs">
                      <Lock className="w-3.5 h-3.5 text-[#64748B] dark:text-[#94A3B8]" />
                      <span>{locale === 'vi' ? 'Mật khẩu' : 'Password'}</span>
                    </label>
                    <input
                      type="password"
                      placeholder={locale === 'vi' ? 'Ít nhất 8 ký tự' : 'At least 8 chars'}
                      value={regPassword ?? ''}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50/50 dark:bg-[#13233F] border border-slate-200 dark:border-[#1E3A5F] text-[#0F2A52] dark:text-[#F1F5F9] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 placeholder-slate-400 dark:placeholder-slate-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#0F2A52] dark:text-[#E2E8F0] mb-1 text-xs">
                      {locale === 'vi' ? 'Nhập lại mật khẩu' : 'Confirm Password'}
                    </label>
                    <input
                      type="password"
                      placeholder={locale === 'vi' ? 'Xác nhận mật khẩu' : 'Confirm password'}
                      value={regConfirmPassword ?? ''}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50/50 dark:bg-[#13233F] border border-slate-200 dark:border-[#1E3A5F] text-[#0F2A52] dark:text-[#F1F5F9] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 placeholder-slate-400 dark:placeholder-slate-500"
                      required
                    />
                  </div>
                </div>

                {/* Password Strength Meter */}
                {regPassword && (
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#13233F] border border-slate-200 dark:border-[#1E3A5F]">
                    <PasswordStrengthMeter password={regPassword} />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isRegisterLoading || emailCheckStatus === 'ALREADY_EXISTS'}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] shadow-sm transition active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{isRegisterLoading 
                    ? (locale === 'vi' ? 'Đang tạo tài khoản...' : 'Creating account...') 
                    : (locale === 'vi' ? 'Tạo tài khoản & nhận link xác thực' : 'Create account & get verification link')}</span>
                </button>
              </form>
            )}

            {/* 3. EMAIL VERIFICATION PENDING SCREEN */}
            {activeTab === 'VERIFICATION_PENDING' && (
              <div className="space-y-4 py-2">
                <div className="p-4 rounded-xl bg-[#E8F8EE] dark:bg-[#00B14F]/15 border border-[#00B14F]/30 text-[#00873D] dark:text-[#10B981] space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#00B14F] flex items-center justify-center text-white flex-shrink-0">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-[#0F2A52] dark:text-white">
                        {locale === 'vi' ? 'Kiểm tra hộp thư email của bạn' : 'Check your email inbox'}
                      </h4>
                      <p className="text-xs text-[#64748B] dark:text-slate-300">
                        {locale === 'vi' 
                          ? 'Một email xác thực tài khoản kèm liên kết bảo mật đã được gửi tới:' 
                          : 'A verification email with a secure link was sent to:'}
                      </p>
                      <strong className="text-xs text-[#00B14F] dark:text-[#10B981] break-all">{pendingVerificationEmail}</strong>
                    </div>
                  </div>

                  <p className="text-xs text-[#64748B] dark:text-slate-300 border-t border-[#00B14F]/20 dark:border-[#00B14F]/30 pt-2">
                    {locale === 'vi'
                      ? 'Vui lòng bấm vào liên kết trong email để kích hoạt tài khoản của bạn. Sau khi xác thực, bạn có thể đăng nhập bình thường.'
                      : 'Please click the link in your email to activate your account. Once verified, you can sign in normally.'}
                  </p>
                </div>

                {/* Dev Environment Direct Verification Link Helper */}
                {devVerificationToken && (
                  <div className="p-3.5 rounded-xl bg-[#FEF9C3] dark:bg-[#FACC15]/15 border border-[#FACC15]/40 text-[#92400E] dark:text-[#FACC15] text-xs space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-[11px] text-[#92400E] dark:text-[#FACC15] uppercase tracking-wide">
                      <Sparkles className="w-3.5 h-3.5 text-[#FACC15]" />
                      <span>{locale === 'vi' ? '[Môi trường phát triển & Test] Mã Token Xác Thực' : '[Development & Test] Verification Token'}</span>
                    </div>
                    <div className="font-mono text-[11px] bg-white dark:bg-[#13233F] p-2 rounded border border-[#FACC15]/40 break-all text-[#0F2A52] dark:text-slate-100">
                      {devVerificationToken}
                    </div>
                    <Link
                      href={`/verify-email?token=${devVerificationToken}`}
                      onClick={closeAuthModal}
                      className="inline-flex items-center gap-1.5 font-semibold text-[#2563EB] hover:text-[#1D4ED8] dark:text-[#60A5FA] underline pt-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>{locale === 'vi' ? 'Xác thực ngay (mở liên kết)' : 'Verify immediately (open link)'}</span>
                    </Link>
                  </div>
                )}

                {/* Resend Status Message */}
                {resendMessage && (
                  <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-[#13233F] border border-slate-200 dark:border-[#1E293B] text-xs text-[#64748B] dark:text-[#94A3B8]">
                    {resendMessage}
                  </div>
                )}

                {/* Resend Action */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendCooldown > 0}
                    className="w-full sm:w-auto px-4 py-2 rounded-lg border border-slate-300 dark:border-[#1E293B] bg-white dark:bg-[#13233F] hover:bg-slate-50 dark:hover:bg-[#18294E] font-semibold text-[#0F2A52] dark:text-slate-200 disabled:opacity-50 transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${resendCooldown > 0 ? 'animate-spin' : ''}`} />
                    <span>
                      {resendCooldown > 0
                        ? (locale === 'vi' ? `Gửi lại sau ${resendCooldown}s` : `Resend in ${resendCooldown}s`)
                        : (locale === 'vi' ? 'Gửi lại email xác thực' : 'Resend verification email')}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('LOGIN');
                      setLoginError(null);
                    }}
                    className="text-[#2563EB] dark:text-[#60A5FA] hover:text-[#1D4ED8] font-semibold underline"
                  >
                    {locale === 'vi' ? 'Quay lại màn hình đăng nhập' : 'Back to sign in'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer Note */}
          <div className="mt-6 pt-3 border-t border-slate-200 dark:border-[#1E293B] text-[11px] text-[#64748B] dark:text-[#94A3B8] text-center flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#00B14F]" />
            <span>{locale === 'vi' ? 'midCV® bảo vệ quyền riêng tư & chuẩn hóa đối sánh năng lực thực.' : 'midCV® protects privacy & standardizes competency matching.'}</span>
          </div>
        </div>

      </div>
    </div>
  );
};
