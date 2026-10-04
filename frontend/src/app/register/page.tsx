'use client';
import React, { useState, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { Industry, EmailCheckStatus } from '@/types';
import { checkEmailAvailability, registerCandidateAccount, registerRecruiterAccount } from '@/lib/api';
import { AuthHeroBanner, AuthRole } from '@/components/auth/AuthHeroBanner';
import { ThemeSwitch } from '@/components/common/ThemeSwitch';
import {
  User,
  Briefcase,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Mail,
  Building2,
  ChevronDown,
  Globe
} from 'lucide-react';

interface IndustryOption {
  labelVi: string;
  labelEn: string;
  value: string;
}

const CANDIDATE_INDUSTRIES: IndustryOption[] = [
  { labelVi: 'Công nghệ thông tin (IT)', labelEn: 'Information Technology (IT)', value: 'Information Technology' },
  { labelVi: 'Truyền thông & Marketing', labelEn: 'Marketing & Communications', value: 'Marketing' },
  { labelVi: 'Tài chính & Ngân hàng', labelEn: 'Finance & Banking', value: 'Finance' },
  { labelVi: 'Nhân sự (HR)', labelEn: 'Human Resources (HR)', value: 'Human Resources' },
  { labelVi: 'Thiết kế đồ họa & UI/UX', labelEn: 'Design & UI/UX', value: 'Design' },
  { labelVi: 'Giáo dục & Đào tạo', labelEn: 'Education & Training', value: 'Education' },
  { labelVi: 'Kinh doanh & Bán hàng', labelEn: 'Sales & Business', value: 'Sales' },
  { labelVi: 'Kỹ thuật / Cơ khí', labelEn: 'Engineering', value: 'Engineering' }
];

const RECRUITER_INDUSTRIES: { labelVi: string; labelEn: string; value: Industry }[] = [
  { labelVi: 'Công nghệ (IT)', labelEn: 'Information Technology (IT)', value: 'Technology' },
  { labelVi: 'Tài chính & Ngân hàng', labelEn: 'Finance & Banking', value: 'Finance' },
  { labelVi: 'Truyền thông & Marketing', labelEn: 'Marketing & Media', value: 'Marketing' },
  { labelVi: 'Thiết kế & Sáng tạo', labelEn: 'Design & Creative', value: 'Design' },
  { labelVi: 'Nhân sự (HR)', labelEn: 'Human Resources (HR)', value: 'HR' },
  { labelVi: 'Kinh doanh & Bán hàng', labelEn: 'Sales & Business', value: 'Sales' },
];

function RegisterFormContent() {
  const searchParams = useSearchParams();
  const { locale, toggleLocale } = useLanguage();
  const isVi = locale === 'vi';

  const roleParam = searchParams.get('role');
  const initialRole: AuthRole = roleParam === 'hr' || roleParam === 'recruiter' ? 'RECRUITER' : 'CANDIDATE';
  const [selectedRole, setSelectedRole] = useState<AuthRole | null>(null);
  const role = selectedRole ?? initialRole;

  // Candidate fields
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [targetTitle, setTargetTitle] = useState<string>('');
  const [targetIndustries, setTargetIndustries] = useState<string[]>(['Information Technology']);

  // Recruiter fields
  const [companyName, setCompanyName] = useState<string>('');
  const [companyAddress, setCompanyAddress] = useState<string>('');
  const [companyIndustry, setCompanyIndustry] = useState<Industry>('Technology');

  // Shared fields
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [agreedTerms, setAgreedTerms] = useState<boolean>(true);

  // States
  const [emailStatus, setEmailStatus] = useState<EmailCheckStatus>('UNKNOWN');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [devVerificationToken, setDevVerificationToken] = useState<string | null>(null);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const handleRoleChange = (newRole: AuthRole) => {
    setSelectedRole(newRole);
    setError(null);
    const newQuery = newRole === 'RECRUITER' ? '?role=hr' : '?role=candidate';
    window.history.replaceState(null, '', `/register${newQuery}`);
  };

  const toggleIndustry = (ind: string) => {
    if (targetIndustries.includes(ind)) {
      if (targetIndustries.length > 1) {
        setTargetIndustries(targetIndustries.filter((x) => x !== ind));
      }
    } else {
      setTargetIndustries([...targetIndustries, ind]);
    }
  };

  const handleEmailChange = (val: string) => {
    setEmail(val);
    setError(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = val.trim();
    if (!trimmed || !trimmed.includes('@') || !trimmed.includes('.')) {
      setEmailStatus('UNKNOWN');
      return;
    }

    setEmailStatus('CHECKING');
    debounceRef.current = setTimeout(async () => {
      try {
        const check = await checkEmailAvailability(trimmed);
        setEmailStatus(check.status);
        if (check.status === 'ALREADY_EXISTS') {
          setError(
            locale === 'vi'
              ? 'Email này đã được sử dụng. Hãy đăng nhập hoặc sử dụng email khác.'
              : 'This email is already in use. Please sign in or use another email.'
          );
        } else {
          setError(null);
        }
      } catch {
        setEmailStatus('UNKNOWN');
      }
    }, 400);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!agreedTerms) {
      setError(
        locale === 'vi'
          ? 'Vui lòng đồng ý với Điều khoản dịch vụ & Chính sách bảo mật.'
          : 'Please agree to the Terms of Service & Privacy Policy.'
      );
      return;
    }

    if (password !== confirmPassword) {
      setError(locale === 'vi' ? 'Mật khẩu xác nhận không khớp.' : 'Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError(
        locale === 'vi'
          ? 'Mật khẩu phải chứa ít nhất 6 ký tự.'
          : 'Password must be at least 6 characters.'
      );
      return;
    }

    if (emailStatus === 'ALREADY_EXISTS') {
      setError(
        locale === 'vi'
          ? 'Email này đã được sử dụng. Hãy đăng nhập hoặc sử dụng email khác.'
          : 'This email is already in use. Please sign in or use another email.'
      );
      return;
    }

    setIsLoading(true);
    try {
      if (role === 'CANDIDATE') {
        const res = await registerCandidateAccount({
          email: email.trim(),
          password,
          fullName: fullName.trim(),
          age: 22,
          targetIndustry: (targetIndustries[0] as Industry) || 'Technology',
          targetIndustries
        });
        setRegisteredEmail(res.email);
        if (res.devVerificationToken) {
          setDevVerificationToken(res.devVerificationToken);
        }
      } else {
        const res = await registerRecruiterAccount({
          email: email.trim(),
          password,
          fullName: fullName.trim(),
          companyName: companyName.trim(),
          companyIndustry
        });
        setRegisteredEmail(res.email);
        if (res.devVerificationToken) {
          setDevVerificationToken(res.devVerificationToken);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err || '');
      setError(
        msg ||
          (locale === 'vi' ? 'Đăng ký tài khoản thất bại.' : 'Account registration failed.')
      );
    } finally {
      setIsLoading(false);
    }
  };

  const isCandidate = role === 'CANDIDATE';

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-white dark:bg-[#0B1329] transition-colors">
      {/* Left Column: Hero Visual Banner synchronized with Role */}
      <div className="w-full md:w-1/2 lg:w-1/2 h-72 sm:h-96 md:h-auto md:min-h-screen relative shrink-0">
        <AuthHeroBanner role={role} />
      </div>

      {/* Right Column: Registration Form */}
      <div className="w-full md:w-1/2 lg:w-1/2 min-h-screen flex flex-col justify-center items-center px-6 py-10 sm:px-10 lg:px-16 overflow-y-auto">
        <div className="w-full max-w-[500px] my-auto">
          {/* Top Bar with "Already have account" and Language / Theme Switch */}
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-6">
            <div>
              <span>{locale === 'vi' ? 'Đã có tài khoản?' : 'Already have an account?'} </span>
              <Link
                href={`/login?role=${isCandidate ? 'candidate' : 'hr'}`}
                className="font-semibold text-[#2563EB] hover:text-[#1D4ED8] dark:text-[#38BDF8] hover:underline ml-0.5"
              >
                {locale === 'vi' ? 'Đăng nhập' : 'Sign in'}
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="register-lang-switch-btn"
                onClick={toggleLocale}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-[#111C38] text-slate-700 dark:text-slate-200 hover:border-[#2563EB] hover:text-[#2563EB] transition cursor-pointer shadow-xs"
                title={locale === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
              >
                <Globe className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>{locale.toUpperCase()}</span>
              </button>
              <ThemeSwitch />
            </div>
          </div>

          {registeredEmail ? (
            /* Registration Success Verification Pending View */
            <div className="space-y-5 py-6">
              <div className="w-14 h-14 rounded-2xl bg-[#E8F8EE] dark:bg-[#00B14F]/20 border border-[#00B14F]/30 flex items-center justify-center text-[#00B14F]">
                <Mail className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-white tracking-tight mb-2">
                  {isVi ? 'Kiểm tra hộp thư email của bạn' : 'Check your email inbox'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {isVi
                    ? 'Chúng tôi đã tạo tài khoản và gửi liên kết kích hoạt đến địa chỉ '
                    : 'We have created your account and sent a verification link to '}
                  <strong className="text-[#2563EB] dark:text-[#38BDF8]">{registeredEmail}</strong>.
                  {isVi
                    ? ' Tài khoản hiện đang ở trạng thái chưa xác thực.'
                    : ' Your account is currently in unverified status.'}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs leading-relaxed">
                {isVi
                  ? 'Vui lòng bấm vào liên kết trong email để xác thực tài khoản trước khi đăng nhập.'
                  : 'Please click the link in your email to verify your account before logging in.'}
              </div>

              {devVerificationToken && (
                <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-blue-800 dark:text-blue-300 text-xs flex items-center justify-between">
                  <span>{isVi ? 'Môi trường phát triển:' : 'Development Mode:'}</span>
                  <Link
                    href={`/verify-email?token=${devVerificationToken}`}
                    className="font-bold underline hover:text-[#1D4ED8]"
                  >
                    {isVi ? 'Xác thực ngay (mở liên kết)' : 'Verify Now (Open link)'}
                  </Link>
                </div>
              )}

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <Link
                  href={`/login?role=${isCandidate ? 'candidate' : 'hr'}`}
                  className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition cursor-pointer"
                >
                  {isVi ? 'Đến màn hình đăng nhập' : 'Go to Login'}
                </Link>
                <button
                  type="button"
                  onClick={() => alert(isVi ? 'Đã gửi lại email xác thực thành công.' : 'Verification email resent successfully.')}
                  className="inline-flex items-center justify-center px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111C38] text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  {isVi ? 'Gửi lại email xác thực' : 'Resend Verification Email'}
                </button>
              </div>
            </div>
          ) : (
            /* Main Registration Form View */
            <>
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

              {/* Role Switcher Tabs */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                  type="button"
                  id="register-role-candidate-btn"
                  onClick={() => handleRoleChange('CANDIDATE')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                    isCandidate
                      ? 'bg-[#2563EB] text-white shadow-md shadow-blue-500/20'
                      : 'bg-slate-100 hover:bg-slate-200/80 dark:bg-[#111C38] dark:hover:bg-[#1E293B] text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>{isVi ? 'Ứng viên tìm việc' : 'Job Seeker'}</span>
                </button>

                <button
                  type="button"
                  id="register-role-recruiter-btn"
                  onClick={() => handleRoleChange('RECRUITER')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                    !isCandidate
                      ? 'bg-[#2563EB] text-white shadow-md shadow-blue-500/20'
                      : 'bg-slate-100 hover:bg-slate-200/80 dark:bg-[#111C38] dark:hover:bg-[#1E293B] text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Briefcase className="w-4 h-4" />
                  <span>{isVi ? 'Nhà tuyển dụng (HR)' : 'Recruiter (HR)'}</span>
                </button>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="mb-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Registration Form */}
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {/* 1. Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isCandidate
                      ? (isVi ? 'Họ và tên ứng viên' : 'Candidate Full Name')
                      : (isVi ? 'Họ và tên người tuyển dụng' : 'Recruiter Full Name')}{' '}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="register-fullname-input"
                    type="text"
                    placeholder={isVi ? 'Nguyễn Văn A' : 'John Doe'}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#13233F] text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition"
                  />
                </div>

                {/* 2. Email Address */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {isVi ? 'Email tài khoản' : 'Account Email'} <span className="text-red-500">*</span>
                    </label>
                    {emailStatus === 'CHECKING' && (
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        {isVi ? 'Đang kiểm tra...' : 'Checking...'}
                      </span>
                    )}
                    {emailStatus === 'AVAILABLE' && (
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {isVi ? 'Email có thể sử dụng.' : 'Email is available.'}
                      </span>
                    )}
                  </div>
                  <input
                    id="register-email-input"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    required
                    className={`w-full px-3.5 py-2.5 rounded-xl border bg-white dark:bg-[#13233F] text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 transition ${
                      emailStatus === 'ALREADY_EXISTS'
                        ? 'border-rose-400 focus:ring-rose-500/20'
                        : 'border-slate-200 dark:border-slate-700 focus:ring-[#2563EB]/20 focus:border-[#2563EB]'
                    }`}
                  />
                </div>

                {/* 3. Phone Number */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isVi ? 'Số điện thoại' : 'Phone Number'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="register-phone-input"
                    type="tel"
                    placeholder="0901 234 567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#13233F] text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition"
                  />
                </div>

                {/* Candidate Specific Fields */}
                {isCandidate ? (
                  <>
                    {/* Position / Title */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        {isVi ? 'Vị trí / Chức danh' : 'Target Job Title'} <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="register-target-title-input"
                        type="text"
                        placeholder={isVi ? 'Ví dụ: Frontend Developer' : 'e.g. Frontend Developer'}
                        value={targetTitle}
                        onChange={(e) => setTargetTitle(e.target.value)}
                        required
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#13233F] text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition"
                      />
                    </div>

                    {/* Target Industries (2 Column Checkbox Grid) */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        {isVi ? 'Ngành mục tiêu (có thể chọn nhiều ngành)' : 'Target Industries (Multi-select)'}
                      </label>
                      <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-[#111C38]/60 grid grid-cols-2 gap-2.5">
                        {CANDIDATE_INDUSTRIES.map((ind) => {
                          const isSelected = targetIndustries.includes(ind.value);
                          return (
                            <label
                              key={ind.value}
                              className="flex items-center gap-2 text-[11px] sm:text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none"
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleIndustry(ind.value)}
                                className="w-3.5 h-3.5 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]/30 cursor-pointer"
                              />
                              <span className="truncate">{isVi ? ind.labelVi : ind.labelEn}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </>
                ) : (
                  /* Recruiter Specific Fields */
                  <>
                    {/* Company Name */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        {isVi ? 'Tên công ty / Doanh nghiệp' : 'Company Name'} <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="register-company-name-input"
                        type="text"
                        placeholder={isVi ? 'Công ty TNHH Công nghệ ABC' : 'Acme Corporation'}
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        required
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#13233F] text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition"
                      />
                    </div>

                    {/* Company Address */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        {isVi ? 'Địa chỉ doanh nghiệp' : 'Company Address'} <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="register-company-address-input"
                        type="text"
                        placeholder={isVi ? '123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh' : 'District 1, Ho Chi Minh City'}
                        value={companyAddress}
                        onChange={(e) => setCompanyAddress(e.target.value)}
                        required
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#13233F] text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition"
                      />
                    </div>

                    {/* Company Industry Select */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        {isVi ? 'Lĩnh vực hoạt động' : 'Industry / Domain'} <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          id="register-company-industry-select"
                          value={companyIndustry}
                          onChange={(e) => setCompanyIndustry(e.target.value as Industry)}
                          className="w-full appearance-none px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#13233F] text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition cursor-pointer"
                        >
                          {RECRUITER_INDUSTRIES.map((ind) => (
                            <option key={ind.value} value={ind.value}>
                              {isVi ? ind.labelVi : ind.labelEn}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                  </>
                )}

                {/* Password Fields Row (2 Columns) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {isVi ? 'Mật khẩu' : 'Password'} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="register-password-input"
                        type={showPassword ? 'text' : 'password'}
                        placeholder={isVi ? 'Ít nhất 8 ký tự' : 'At least 8 characters'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full pl-3.5 pr-9 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#13233F] text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? (isVi ? 'Ẩn mật khẩu' : 'Hide password') : (isVi ? 'Hiển thị mật khẩu' : 'Show password')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer transition"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {isVi ? 'Nhập lại mật khẩu' : 'Confirm Password'} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="register-confirm-password-input"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder={isVi ? 'Xác nhận mật khẩu' : 'Confirm password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="w-full pl-3.5 pr-9 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#13233F] text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label={showConfirmPassword ? (isVi ? 'Ẩn mật khẩu' : 'Hide password') : (isVi ? 'Hiển thị mật khẩu' : 'Show password')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer transition"
                      >
                        {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Terms of Service Checkbox */}
                <div className="pt-1">
                  <label className="flex items-start gap-2 cursor-pointer select-none text-[11px] text-slate-600 dark:text-slate-400 leading-normal">
                    <input
                      type="checkbox"
                      checked={agreedTerms}
                      onChange={(e) => setAgreedTerms(e.target.checked)}
                      className="w-3.5 h-3.5 mt-0.5 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]/30 cursor-pointer"
                    />
                    <span>
                      {isVi ? 'Tôi đồng ý với các ' : 'I agree to the '}
                      <Link href="/help" className="text-[#2563EB] dark:text-[#38BDF8] hover:underline font-semibold">
                        {isVi ? 'Điều khoản dịch vụ' : 'Terms of Service'}
                      </Link>
                      {isVi ? ' & ' : ' & '}
                      <Link href="/help" className="text-[#2563EB] dark:text-[#38BDF8] hover:underline font-semibold">
                        {isVi ? 'Chính sách bảo mật' : 'Privacy Policy'}
                      </Link>
                      {isVi ? ' của midCV.' : ' of midCV.'}
                    </span>
                  </label>
                </div>

                {/* Submit CTA Button */}
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
                    <span className="flex items-center gap-2">
                      {isCandidate ? <User className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                      <span>{isVi ? 'Tạo tài khoản & nhận link xác thực' : 'Create Account & Get Verification Link'}</span>
                    </span>
                  )}
                </button>
              </form>

              {/* Bottom Login Link for Recruiter (Figma Image 3) */}
              {!isCandidate && (
                <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
                  {isVi ? 'Đã có tài khoản? ' : 'Already have an account? '}
                  <Link
                    href="/login?role=hr"
                    className="font-semibold text-[#2563EB] hover:text-[#1D4ED8] dark:text-[#38BDF8] hover:underline"
                  >
                    {isVi ? 'Đăng nhập tại đây' : 'Sign in here'}
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
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
