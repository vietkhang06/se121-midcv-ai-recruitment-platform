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
  const { t } = useLanguage();

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
        setLoginError('Email của bạn chưa được xác thực. Vui lòng xác thực tài khoản để đăng nhập.');
      } else {
        setLoginError(err.message || 'Tài khoản hoặc mật khẩu không chính xác.');
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
      setRegisterError('Mật khẩu xác nhận không khớp.');
      return;
    }

    if (regPassword.length < 6) {
      setRegisterError('Mật khẩu phải chứa ít nhất 6 ký tự.');
      return;
    }

    if (emailCheckStatus === 'ALREADY_EXISTS') {
      setRegisterError('Email này đã được sử dụng. Hãy đăng nhập hoặc sử dụng email khác.');
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
      setRegisterError(err.message || 'Đăng ký tài khoản thất bại. Vui lòng thử lại.');
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
        setResendMessage('Đã gửi lại email xác thực thành công.');
        setResendCooldown(60);
        if (res.devVerificationToken) {
          setDevVerificationToken(res.devVerificationToken);
        }
      } else {
        setResendMessage(res.message);
      }
    } catch (err: any) {
      setResendMessage(err.message || 'Lỗi gửi lại email xác thực.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-4xl bg-white dark:bg-[#0E241E] border border-[#E2E8F0] dark:border-[#1B3D34] rounded-2xl shadow-2xl text-slate-900 dark:text-slate-100 relative overflow-hidden max-h-[92vh] flex flex-col md:flex-row">
        
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 z-20 p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#133E34] transition"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* LEFT COLUMN: MatchJD Editorial Brand Visual & Hero Placeholder */}
        <div className="hidden md:flex md:w-5/12 bg-[#0C2B24] p-8 text-white flex-col justify-between relative overflow-hidden select-none">
          {/* Subtle background radial accent */}
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-[#10B981]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-[#D97706]/10 rounded-full blur-3xl pointer-events-none" />

          {/* Top Brand Identity */}
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#133E34] border border-[#10B981]/30 flex items-center justify-center text-[#10B981] shadow-xs">
                <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span className="font-editorial text-2xl tracking-normal text-white">MatchJD</span>
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                <Sparkles className="w-3 h-3" />
                Evidence-Based Recruitment
              </span>
              <h2 className="font-editorial text-2xl lg:text-3xl text-white leading-tight">
                Verifiable Credentials. Zero-Biased Hiring.
              </h2>
              <p className="text-xs text-slate-300/90 leading-relaxed">
                Connect candidate verified competencies with recruiter criteria through multi-dimensional vector embeddings and cryptographic evidence.
              </p>
            </div>
          </div>

          {/* Center Graphic: IMAGE_PLACEHOLDER_AUTH_HERO */}
          <div className="relative z-10 my-6 py-4 px-3 rounded-xl bg-[#081C15]/70 border border-[#133E34]/80">
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
                <svg className="w-full h-full text-[#10B981]" viewBox="0 0 300 120" fill="none">
                  {/* Background Grid Pattern */}
                  <line x1="20" y1="60" x2="280" y2="60" stroke="#133E34" strokeDasharray="3 3" />
                  <line x1="150" y1="10" x2="150" y2="110" stroke="#133E34" strokeDasharray="3 3" />
                  {/* Semantic Connection Arcs */}
                  <path d="M 50 60 Q 150 15 250 60" stroke="#10B981" strokeWidth="2" strokeOpacity="0.8" />
                  <path d="M 50 60 Q 150 105 250 60" stroke="#D97706" strokeWidth="1.5" strokeOpacity="0.7" strokeDasharray="4 2" />
                  {/* Nodes */}
                  <circle cx="50" cy="60" r="14" fill="#0C2B24" stroke="#10B981" strokeWidth="2" />
                  <circle cx="250" cy="60" r="14" fill="#0C2B24" stroke="#D97706" strokeWidth="2" />
                  <circle cx="150" cy="60" r="18" fill="#133E34" stroke="#10B981" strokeWidth="2.5" />
                  {/* Inner node symbols */}
                  <text x="50" y="64" fontSize="9" fill="#10B981" textAnchor="middle" fontWeight="bold">CV</text>
                  <text x="250" y="64" fontSize="9" fill="#D97706" textAnchor="middle" fontWeight="bold">JD</text>
                  <text x="150" y="64" fontSize="10" fill="#FFFFFF" textAnchor="middle" fontWeight="bold">94%</text>
                </svg>
                <div className="absolute bottom-1 text-[10px] font-mono text-emerald-400/80">
                  Semantic Vector Cosine Similarity
                </div>
              </div>
            )}
          </div>

          {/* Bottom Trust Indicators */}
          <div className="relative z-10 space-y-2 pt-2 border-t border-[#133E34]">
            <div className="flex items-center gap-2 text-[11px] text-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981] flex-shrink-0" />
              <span>Immutable snapshot on application submission</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981] flex-shrink-0" />
              <span>Supplementary objective GitHub telemetry</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Form Controls & Interactive States */}
        <div className="w-full md:w-7/12 p-6 sm:p-8 bg-[#FBF9F5] dark:bg-[#0A1A15] flex flex-col justify-between overflow-y-auto max-h-[92vh]">
          <div>
            {/* Header Title based on Active View */}
            <div className="mb-5 space-y-1">
              <h3 className="font-editorial text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                {activeTab === 'LOGIN'
                  ? 'Đăng Nhập Tài Khoản'
                  : activeTab === 'REGISTER'
                  ? 'Đăng Ký Tài Khoản Mới'
                  : 'Xác Thực Tài Khoản Email'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {activeTab === 'LOGIN'
                  ? 'Nhập email và mật khẩu của bạn để truy cập MatchJD.'
                  : activeTab === 'REGISTER'
                  ? 'Tạo tài khoản để đối sánh năng lực thực và ứng tuyển.'
                  : `Mã xác thực đã được gửi đến ${pendingVerificationEmail}`}
              </p>
            </div>

            {/* Tab Switcher (Visible on Login & Register) */}
            {activeTab !== 'VERIFICATION_PENDING' && (
              <div className="flex bg-[#EFECE6] dark:bg-[#0E241E] p-1 rounded-xl mb-5 border border-slate-200 dark:border-[#1B3D34]">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('LOGIN');
                    setLoginError(null);
                  }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
                    activeTab === 'LOGIN'
                      ? 'bg-[#0C2B24] dark:bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Đăng nhập
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('REGISTER');
                    setRegisterError(null);
                  }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
                    activeTab === 'REGISTER'
                      ? 'bg-[#0C2B24] dark:bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Đăng ký tài khoản
                </button>
              </div>
            )}

            {/* Intended Action Notice */}
            {intendedAction && activeTab !== 'VERIFICATION_PENDING' && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>Đăng nhập để tiếp tục thao tác nộp đơn ứng tuyển của bạn.</span>
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
                            className="text-emerald-700 dark:text-emerald-400 underline font-semibold hover:text-emerald-900 dark:hover:text-emerald-300"
                          >
                            {resendCooldown > 0
                              ? `Gửi lại sau ${resendCooldown}s`
                              : 'Bấm vào đây để gửi lại email xác thực'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    <span>Email đăng nhập</span>
                  </label>
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={loginEmail ?? ''}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#071410] border border-slate-300 dark:border-[#1B3D34] text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:border-[#0C2B24] dark:focus:border-emerald-500 focus:ring-1 focus:ring-[#0C2B24] dark:focus:ring-emerald-500 placeholder-slate-400 dark:placeholder-slate-500 transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    <span>Mật khẩu</span>
                  </label>
                  <input
                    type="password"
                    placeholder="Nhập mật khẩu..."
                    value={loginPassword ?? ''}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#071410] border border-slate-300 dark:border-[#1B3D34] text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:border-[#0C2B24] dark:focus:border-emerald-500 focus:ring-1 focus:ring-[#0C2B24] dark:focus:ring-emerald-500 placeholder-slate-400 dark:placeholder-slate-500 transition"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoginLoading}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-[#0C2B24] dark:bg-emerald-600 hover:bg-[#133E34] dark:hover:bg-emerald-700 shadow-sm transition active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{isLoginLoading ? 'Đang đăng nhập...' : 'Đăng nhập ngay'}</span>
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
                        ? 'border-[#0C2B24] dark:border-emerald-500 bg-[#0C2B24] dark:bg-emerald-600 text-white shadow-xs'
                        : 'border-slate-200 dark:border-[#1B3D34] bg-white dark:bg-[#071410] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Ứng viên tìm việc
                  </button>
                  <button
                    type="button"
                    onClick={() => setRegisterRole('RECRUITER')}
                    className={`p-2 rounded-xl border text-center font-semibold transition ${
                      registerRole === 'RECRUITER'
                        ? 'border-[#D97706] bg-[#D97706] text-white shadow-xs'
                        : 'border-slate-200 dark:border-[#1B3D34] bg-white dark:bg-[#071410] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Nhà tuyển dụng (HR)
                  </button>
                </div>

                {/* Full Name */}
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    <span>{registerRole === 'CANDIDATE' ? 'Họ và tên ứng viên' : 'Họ và tên người tuyển dụng'}</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Nguyễn Văn A"
                    value={regFullName ?? ''}
                    onChange={(e) => setRegFullName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#071410] border border-slate-300 dark:border-[#1B3D34] text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:border-[#0C2B24] dark:focus:border-emerald-500 placeholder-slate-400 dark:placeholder-slate-500"
                    required
                  />
                </div>

                {/* Email with Debounced Existence Check */}
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    <span>Email tài khoản</span>
                  </label>
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={regEmail ?? ''}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    className={`w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#071410] border text-slate-900 dark:text-slate-100 text-sm focus:outline-none placeholder-slate-400 dark:placeholder-slate-500 ${
                      emailCheckStatus === 'ALREADY_EXISTS'
                        ? 'border-rose-500'
                        : emailCheckStatus === 'AVAILABLE'
                        ? 'border-emerald-500'
                        : 'border-slate-300 dark:border-[#1B3D34] focus:border-[#0C2B24] dark:focus:border-emerald-500'
                    }`}
                    required
                  />
                  {/* Email Feedback Badge */}
                  <div className="pt-1 text-[11px]">
                    {emailCheckStatus === 'CHECKING' && (
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 animate-spin text-emerald-600 dark:text-emerald-400" />
                        <span>Đang kiểm tra email...</span>
                      </span>
                    )}
                    {emailCheckStatus === 'AVAILABLE' && (
                      <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        <span>Email có thể sử dụng.</span>
                      </span>
                    )}
                    {emailCheckStatus === 'ALREADY_EXISTS' && (
                      <span className="text-rose-700 dark:text-rose-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                        <span>Email đã tồn tại trong hệ thống.</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Role Specific Fields */}
                {registerRole === 'CANDIDATE' ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-xs">
                        {t('auth.ageLabel', 'Độ tuổi')}
                      </label>
                      <input
                        type="number"
                        min={18}
                        max={70}
                        value={regAge || ''}
                        onChange={(e) => setRegAge(parseInt(e.target.value) || 22)}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#071410] border border-slate-300 dark:border-[#1B3D34] text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:border-[#0C2B24] dark:focus:border-emerald-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5 text-xs">
                        {t('auth.targetIndustriesLabel', 'Ngành mục tiêu (Có thể chọn nhiều ngành)')}
                      </label>
                      <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto p-2 bg-slate-50 dark:bg-[#0A1E19] border border-slate-200 dark:border-[#1B3D34] rounded-xl">
                        {TARGET_INDUSTRIES_LIST.map((ind) => {
                          const isChecked = regTargetIndustries.includes(ind);
                          return (
                            <label
                              key={ind}
                              className={`flex items-center gap-2 p-1.5 rounded-lg text-xs cursor-pointer transition select-none ${
                                isChecked
                                  ? 'bg-[#0C2B24] dark:bg-emerald-900/60 text-white font-medium shadow-2xs'
                                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-[#14332B]'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleRegIndustry(ind)}
                                className="accent-emerald-600 rounded cursor-pointer"
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
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1 text-xs">
                        <Building2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                        <span>{t('auth.companyNameLabel', 'Tên công ty / Doanh nghiệp')}</span>
                      </label>
                      <input
                        type="text"
                        placeholder="CloudScale Systems Corp"
                        value={regCompanyName ?? ''}
                        onChange={(e) => setRegCompanyName(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#071410] border border-slate-300 dark:border-[#1B3D34] text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:border-[#0C2B24] dark:focus:border-emerald-500 placeholder-slate-400 dark:placeholder-slate-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-xs">
                        {t('auth.companyIndustryLabel', 'Lĩnh vực hoạt động')}
                      </label>
                      <select
                        value={regCompanyIndustry ?? 'Technology'}
                        onChange={(e) => setRegCompanyIndustry(e.target.value as Industry)}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#071410] border border-slate-300 dark:border-[#1B3D34] text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:border-[#0C2B24] dark:focus:border-emerald-500"
                      >
                        <option value="Technology">Công nghệ (IT)</option>
                        <option value="Finance">Tài chính - Fintech</option>
                        <option value="Marketing">Truyền thông - Quảng cáo</option>
                        <option value="Healthcare">Y tế</option>
                        <option value="General">Khác</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Password Fields */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1 text-xs">
                      <Lock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                      <span>{t('auth.passwordLabel', 'Mật khẩu')}</span>
                    </label>
                    <input
                      type="password"
                      placeholder="Ít nhất 8 ký tự"
                      value={regPassword ?? ''}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#071410] border border-slate-300 dark:border-[#1B3D34] text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:border-[#0C2B24] dark:focus:border-emerald-500 placeholder-slate-400 dark:placeholder-slate-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-xs">
                      {t('auth.confirmPasswordLabel', 'Nhập lại mật khẩu')}
                    </label>
                    <input
                      type="password"
                      placeholder="Xác nhận mật khẩu"
                      value={regConfirmPassword ?? ''}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#071410] border border-slate-300 dark:border-[#1B3D34] text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:border-[#0C2B24] dark:focus:border-emerald-500 placeholder-slate-400 dark:placeholder-slate-500"
                      required
                    />
                  </div>
                </div>

                {/* Password Strength Meter */}
                {regPassword && (
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0A1E19] border border-slate-200 dark:border-[#1B3D34]">
                    <PasswordStrengthMeter password={regPassword} />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isRegisterLoading || emailCheckStatus === 'ALREADY_EXISTS'}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-[#0C2B24] dark:bg-emerald-600 hover:bg-[#133E34] dark:hover:bg-emerald-700 shadow-sm transition active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{isRegisterLoading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản & nhận link xác thực'}</span>
                </button>
              </form>
            )}

            {/* 3. EMAIL VERIFICATION PENDING SCREEN */}
            {activeTab === 'VERIFICATION_PENDING' && (
              <div className="space-y-4 py-2">
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white flex-shrink-0">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-slate-900 dark:text-white">Kiểm tra hộp thư email của bạn</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        Một email xác thực tài khoản kèm liên kết bảo mật đã được gửi tới:
                      </p>
                      <strong className="text-xs text-emerald-800 dark:text-emerald-400 break-all">{pendingVerificationEmail}</strong>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 border-t border-emerald-200/60 dark:border-emerald-800/40 pt-2">
                    Vui lòng bấm vào liên kết trong email để kích hoạt tài khoản của bạn. Sau khi xác thực, bạn có thể đăng nhập bình thường.
                  </p>
                </div>

                {/* Dev Environment Direct Verification Link Helper */}
                {devVerificationToken && (
                  <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/40 text-amber-900 dark:text-amber-200 text-xs space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-[11px] text-amber-800 dark:text-amber-300 uppercase tracking-wide">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span>[Môi trường phát triển & Test] Mã Token Xác Thực</span>
                    </div>
                    <div className="font-mono text-[11px] bg-white dark:bg-[#071410] p-2 rounded border border-amber-200 dark:border-amber-800/40 break-all text-slate-800 dark:text-slate-100">
                      {devVerificationToken}
                    </div>
                    <Link
                      href={`/verify-email?token=${devVerificationToken}`}
                      onClick={closeAuthModal}
                      className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-300 underline pt-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Xác thực ngay (mở liên kết)</span>
                    </Link>
                  </div>
                )}

                {/* Resend Status Message */}
                {resendMessage && (
                  <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-[#0E241E] border border-slate-200 dark:border-[#1B3D34] text-xs text-slate-700 dark:text-slate-300">
                    {resendMessage}
                  </div>
                )}

                {/* Resend Action */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendCooldown > 0}
                    className="w-full sm:w-auto px-4 py-2 rounded-lg border border-slate-300 dark:border-[#1B3D34] bg-white dark:bg-[#071410] hover:bg-slate-50 dark:hover:bg-[#133E34] font-semibold text-slate-700 dark:text-slate-200 disabled:opacity-50 transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${resendCooldown > 0 ? 'animate-spin' : ''}`} />
                    <span>
                      {resendCooldown > 0
                        ? `Gửi lại sau ${resendCooldown}s`
                        : 'Gửi lại email xác thực'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('LOGIN');
                      setLoginError(null);
                    }}
                    className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-300 font-semibold underline"
                  >
                    Quay lại màn hình đăng nhập
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer Note */}
          <div className="mt-6 pt-3 border-t border-slate-200 dark:border-[#1B3D34] text-[11px] text-slate-500 dark:text-slate-400 text-center flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>MatchJD bảo vệ quyền riêng tư & chuẩn hóa đối sánh năng lực thực.</span>
          </div>
        </div>

      </div>
    </div>
  );
};
