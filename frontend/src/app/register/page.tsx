'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Industry, EmailCheckStatus } from '@/types';
import { checkEmailAvailability, registerCandidateAccount, registerRecruiterAccount } from '@/lib/api';
import { getImageSlot } from '@/config/imageConfig';
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter';
import { BrandLogo } from '@/components/common/BrandLogo';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Mail,
  Lock,
  User,
  Building2,
  UserPlus,
  RefreshCw,
  Sparkles,
  ArrowRight
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

export default function RegisterPage() {
  const router = useRouter();
  const { openAuthModal } = useAuth();

  const [role, setRole] = useState<'CANDIDATE' | 'RECRUITER'>('CANDIDATE');
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [age, setAge] = useState<number>(22);
  const [targetIndustries, setTargetIndustries] = useState<string[]>(['Information Technology']);
  const [companyName, setCompanyName] = useState<string>('');
  const [companyIndustry, setCompanyIndustry] = useState<Industry>('Technology');

  const toggleIndustry = (ind: string) => {
    if (targetIndustries.includes(ind)) {
      if (targetIndustries.length > 1) {
        setTargetIndustries(targetIndustries.filter(x => x !== ind));
      }
    } else {
      setTargetIndustries([...targetIndustries, ind]);
    }
  };

  const [emailStatus, setEmailStatus] = useState<EmailCheckStatus>('UNKNOWN');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const authHeroSlot = getImageSlot('IMAGE_PLACEHOLDER_AUTH_HERO');

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
          setError('Email này đã được sử dụng. Hãy đăng nhập hoặc sử dụng email khác.');
        } else {
          setError(null);
        }
      } catch {
        setEmailStatus('UNKNOWN');
      }
    }, 450);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    if (password.length < 6) {
      setError('Mật khẩu phải chứa ít nhất 6 ký tự.');
      return;
    }

    if (emailStatus === 'ALREADY_EXISTS') {
      setError('Email này đã được sử dụng. Hãy đăng nhập hoặc sử dụng email khác.');
      return;
    }

    setIsLoading(true);
    try {
      if (role === 'CANDIDATE') {
        const res = await registerCandidateAccount({
          email: email.trim(),
          password,
          fullName: fullName.trim(),
          age,
          targetIndustry: (targetIndustries[0] as Industry) || 'Technology',
          targetIndustries
        });
        setRegisteredEmail(res.email);
      } else {
        const res = await registerRecruiterAccount({
          email: email.trim(),
          password,
          fullName: fullName.trim(),
          companyName: companyName.trim(),
          companyIndustry
        });
        setRegisteredEmail(res.email);
      }
    } catch (err: any) {
      setError(err.message || 'Đăng ký tài khoản thất bại.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F8FAF9] dark:bg-[#0B1329] flex items-center justify-center p-4 sm:p-6 lg:p-8 transition-colors">
      <div className="w-full max-w-4xl bg-white dark:bg-[#111C38] border border-[#E2E8F0] dark:border-[#1E293B] rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Column: midCV® Editorial Branding */}
        <div className="hidden md:flex md:w-5/12 bg-gradient-to-br from-[#0F2A52] to-[#1E3A5F] dark:from-[#0F172A] dark:to-[#1E293B] p-8 text-white flex-col justify-between relative overflow-hidden">
          <div className="relative z-10 space-y-6">
            <BrandLogo size="md" />

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-[#2563EB]/20 text-[#D7F9FA] border border-[#2563EB]/40">
                <Sparkles className="w-3 h-3 text-[#D7F9FA]" />
                Join the Network
              </span>
              <h1 className="font-editorial text-3xl text-white leading-tight">
                Tạo Hồ Sơ midCV® Xác Thực
              </h1>
              <p className="text-xs text-slate-300 leading-relaxed">
                Khởi tạo hồ sơ năng lực số hóa nơi từng kỹ năng đều được chứng thực rõ ràng và đối sánh đa chiều.
              </p>
            </div>
          </div>

          <div className="relative z-10 space-y-2 pt-4 border-t border-white/10">
            <div className="flex items-center gap-2 text-[11px] text-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#00B14F]" />
              <span>Bản lưu CV bất biến (Immutable Snapshot)</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#00B14F]" />
              <span>Đối sánh chuẩn xác, không thiên vị</span>
            </div>
          </div>
        </div>

        {/* Right Column: Register Form or Success Screen */}
        <div className="w-full md:w-7/12 p-6 sm:p-10 bg-white dark:bg-[#111C38] flex flex-col justify-between">
          <div>
            {registeredEmail ? (
              <div className="space-y-4 py-4">
                <div className="w-12 h-12 rounded-full bg-[#E8F8EE] dark:bg-[#00B14F]/20 flex items-center justify-center text-[#00B14F]">
                  <Mail className="w-6 h-6" />
                </div>
                <h2 className="font-editorial text-2xl font-bold text-[#0F2A52] dark:text-[#F1F5F9]">
                  Kiểm tra hộp thư email của bạn
                </h2>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
                  Chúng tôi đã tạo tài khoản và gửi liên kết kích hoạt đến địa chỉ <strong className="text-[#00B14F]">{registeredEmail}</strong>.
                  Tài khoản hiện đang ở trạng thái chưa xác thực.
                </p>
                <div className="p-4 rounded-xl bg-[#FEF9C3] dark:bg-[#FACC15]/15 border border-[#FACC15]/40 text-[#92400E] dark:text-[#FACC15] text-xs">
                  Vui lòng bấm vào liên kết trong email để xác thực tài khoản trước khi đăng nhập.
                </div>
                <div className="pt-2">
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold shadow-sm transition"
                  >
                    Đến màn hình đăng nhập
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-5 space-y-1">
                  <h2 className="font-editorial text-2xl font-bold text-[#0F2A52] dark:text-[#F1F5F9] tracking-tight">
                    Đăng Ký Tài Khoản Mới
                  </h2>
                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                    Tạo tài khoản để đối sánh năng lực thực và ứng tuyển.
                  </p>
                </div>

                {error && (
                  <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Role Switcher */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => setRole('CANDIDATE')}
                    className={`p-2.5 rounded-xl border text-center text-xs font-semibold transition ${
                      role === 'CANDIDATE'
                        ? 'border-[#2563EB] bg-[#2563EB] text-white shadow-xs'
                        : 'border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111C38] text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F2A52] dark:hover:text-white'
                    }`}
                  >
                    Ứng viên tìm việc
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('RECRUITER')}
                    className={`p-2.5 rounded-xl border text-center text-xs font-semibold transition ${
                      role === 'RECRUITER'
                        ? 'border-[#2563EB] bg-[#2563EB] text-white shadow-xs'
                        : 'border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111C38] text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F2A52] dark:hover:text-white'
                    }`}
                  >
                    Nhà tuyển dụng (HR)
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-[#0F2A52] dark:text-[#E2E8F0] mb-1">
                      {role === 'CANDIDATE' ? 'Họ và tên ứng viên' : 'Họ và tên người tuyển dụng'}
                    </label>
                    <input
                      type="text"
                      placeholder="Nguyễn Văn A"
                      value={fullName || ''}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/50 dark:bg-[#13233F] border border-slate-200 dark:border-[#1E3A5F] text-[#0F2A52] dark:text-[#F1F5F9] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#0F2A52] dark:text-[#E2E8F0] mb-1">Email tài khoản</label>
                    <input
                      type="email"
                      placeholder="name@example.com"
                      value={email || ''}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/50 dark:bg-[#13233F] border border-slate-200 dark:border-[#1E3A5F] text-[#0F2A52] dark:text-[#F1F5F9] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition"
                      required
                    />
                    {emailStatus === 'AVAILABLE' && (
                      <span className="text-[#00B14F] dark:text-[#10B981] text-[11px] pt-1 block font-medium">Email có thể sử dụng.</span>
                    )}
                    {emailStatus === 'ALREADY_EXISTS' && (
                      <span className="text-rose-600 dark:text-rose-400 text-[11px] pt-1 block font-medium">Email này đã được sử dụng.</span>
                    )}
                  </div>

                  {role === 'CANDIDATE' ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block font-semibold text-[#0F2A52] dark:text-[#E2E8F0] mb-1 text-xs">Độ tuổi</label>
                        <input
                          type="number"
                          min={18}
                          max={70}
                          value={age || ''}
                          onChange={(e) => setAge(parseInt(e.target.value) || 22)}
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-50/50 dark:bg-[#13233F] border border-slate-200 dark:border-[#1E3A5F] text-[#0F2A52] dark:text-[#F1F5F9] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition"
                          required
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-[#0F2A52] dark:text-[#E2E8F0] mb-1.5 text-xs">
                          Ngành mục tiêu (Có thể chọn nhiều ngành)
                        </label>
                        <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto p-2 bg-slate-50 dark:bg-[#13233F] border border-slate-200 dark:border-[#1E3A5F] rounded-xl">
                          {TARGET_INDUSTRIES_LIST.map((ind) => {
                            const isChecked = targetIndustries.includes(ind);
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
                                  onChange={() => toggleIndustry(ind)}
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
                    <div>
                      <label className="block font-semibold text-[#0F2A52] dark:text-[#E2E8F0] mb-1 text-xs">Tên công ty / Doanh nghiệp</label>
                      <input
                        type="text"
                        placeholder="CloudScale Systems Corp"
                        value={companyName || ''}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/50 dark:bg-[#13233F] border border-slate-200 dark:border-[#1E3A5F] text-[#0F2A52] dark:text-[#F1F5F9] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition"
                        required
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-[#0F2A52] dark:text-[#E2E8F0] mb-1 text-xs">Mật khẩu</label>
                      <input
                        type="password"
                        placeholder="Ít nhất 8 ký tự"
                        value={password || ''}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50/50 dark:bg-[#13233F] border border-slate-200 dark:border-[#1E3A5F] text-[#0F2A52] dark:text-[#F1F5F9] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-[#0F2A52] dark:text-[#E2E8F0] mb-1 text-xs">Nhập lại mật khẩu</label>
                      <input
                        type="password"
                        placeholder="Xác nhận"
                        value={confirmPassword || ''}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50/50 dark:bg-[#13233F] border border-slate-200 dark:border-[#1E3A5F] text-[#0F2A52] dark:text-[#F1F5F9] text-sm focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition"
                        required
                      />
                    </div>
                  </div>

                  {password && (
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#13233F] border border-slate-200 dark:border-[#1E3A5F]">
                      <PasswordStrengthMeter password={password} />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading || emailStatus === 'ALREADY_EXISTS'}
                    className="w-full py-2.5 rounded-xl text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] shadow-sm transition active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>{isLoading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản & nhận link xác thực'}</span>
                  </button>
                </form>
              </>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-[#1E293B] text-xs text-[#64748B] dark:text-[#94A3B8] flex items-center justify-between">
            <span>Đã có tài khoản?</span>
            <Link
              href="/login"
              className="font-semibold text-[#2563EB] hover:text-[#1D4ED8] dark:text-[#60A5FA] flex items-center gap-1 transition"
            >
              <span>Đăng nhập</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
