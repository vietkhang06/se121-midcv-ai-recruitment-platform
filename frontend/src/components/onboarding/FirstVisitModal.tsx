'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { translateIndustry } from '@/lib/i18n';
import { Industry } from '@/types';
import {
  CandidateOnboardingIllustration,
  CompanyVerificationIllustration
} from '@/components/illustrations/Illustrations';
import { UserCheck, Building2, FastForward, Sparkles, ArrowRight } from 'lucide-react';

export const FirstVisitModal: React.FC = () => {
  const pathname = usePathname();
  const { hasSeenFirstVisit, setFirstVisitChoice } = useAuth();
  const { t, locale } = useLanguage();
  const isVi = locale === 'vi';

  const [step, setStep] = useState<'CHOICE' | 'QUICK_ONBOARDING'>('CHOICE');
  const [age, setAge] = useState<number>(24);
  const [targetIndustry, setTargetIndustry] = useState<Industry>('Technology');

  if (hasSeenFirstVisit || pathname === '/login' || pathname === '/register' || pathname?.startsWith('/admin') || pathname?.startsWith('/recruiter')) {
    return null; // Do not render if user has already completed or skipped onboarding, or is on dedicated auth/portal routes
  }

  const handleSelectCandidate = () => {
    setStep('QUICK_ONBOARDING');
  };

  const handleSelectRecruiter = () => {
    setFirstVisitChoice('RECRUITER');
  };

  const handleSkip = () => {
    setFirstVisitChoice('SKIP');
  };

  const handleCompleteQuickOnboarding = (e: React.FormEvent) => {
    e.preventDefault();
    setFirstVisitChoice('CANDIDATE', { age, targetIndustry });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 text-slate-100 relative overflow-hidden">
        {step === 'CHOICE' ? (
          <div className="space-y-6 relative z-10 text-center">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-500/30 text-xs font-semibold text-cyan-300">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>{isVi ? 'Chào mừng bạn đến với Nền tảng AI Recruitment' : 'Welcome to the AI Recruitment Platform'}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {isVi ? 'Lựa Chọn Vai Trò Của Bạn' : 'Select Your Role'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300">
                {isVi ? 'Hệ thống sẽ tùy chỉnh giao diện và công cụ phù hợp nhất với nhu cầu của bạn' : 'The platform customizes tools and workflows based on your recruitment goals'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <button
                onClick={handleSelectCandidate}
                className="group relative flex flex-col items-center justify-center p-5 rounded-2xl border border-indigo-500/40 bg-slate-950 hover:bg-indigo-950/40 hover:border-indigo-400 transition text-center space-y-3 cursor-pointer"
              >
                <CandidateOnboardingIllustration className="w-20 h-20" />
                <div>
                  <span className="font-bold text-white text-base block group-hover:text-cyan-400 transition-colors">
                    {isVi ? 'Tôi là Ứng viên' : 'I am a Candidate'}
                  </span>
                  <span className="text-xs text-slate-400 mt-1 block">
                    {isVi ? 'Tạo CV chuẩn AI, đối sánh JD và nộp đơn Quick Apply' : 'Build AI-ready CV, match JDs, and submit Quick Apply'}
                  </span>
                </div>
              </button>

              <button
                onClick={handleSelectRecruiter}
                className="group relative flex flex-col items-center justify-center p-5 rounded-2xl border border-slate-800 bg-slate-950 hover:bg-amber-950/40 hover:border-amber-500/50 transition text-center space-y-3 cursor-pointer"
              >
                <CompanyVerificationIllustration className="w-20 h-20" />
                <div>
                  <span className="font-bold text-white text-base block group-hover:text-amber-400 transition-colors">
                    {isVi ? 'Tôi là Doanh nghiệp' : 'I am an Employer'}
                  </span>
                  <span className="text-xs text-slate-400 mt-1 block">
                    {isVi ? 'Đăng tin JD và xem Bảng xếp hạng ứng viên chuẩn AI' : 'Post verified JDs and view objective AI Candidate Rankings'}
                  </span>
                </div>
              </button>
            </div>

            <div className="pt-2 border-t border-slate-800">
              <button
                onClick={handleSkip}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition"
              >
                <FastForward className="w-3.5 h-3.5" />
                <span>{isVi ? 'Bỏ qua & Xem trang chủ công khai' : 'Skip & Explore Public Portal'}</span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCompleteQuickOnboarding} className="space-y-6 relative z-10">
            <div className="space-y-2">
              <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
                {isVi ? 'Khảo sát nhanh ứng viên' : 'Quick Candidate Survey'}
              </span>
              <h3 className="text-xl font-bold text-white">
                {isVi ? 'Định hướng Nghề nghiệp của Bạn' : 'Your Career Direction'}
              </h3>
              <p className="text-xs text-slate-400">
                {isVi ? 'Thông tin này sẽ được lưu vào hồ sơ cá nhân để AI Matching đề xuất việc làm chuẩn xác.' : 'This information is saved to your profile for precise semantic job recommendations.'}
              </p>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-300 mb-1.5">
                  {isVi ? 'Độ tuổi của bạn' : 'Your Age'}
                </label>
                <input
                  type="number"
                  min={18}
                  max={65}
                  value={age}
                  onChange={(e) => setAge(parseInt(e.target.value) || 24)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1.5">
                  {isVi ? 'Ngành nghề định hướng chính' : 'Primary Target Industry'}
                </label>
                <select
                  value={targetIndustry}
                  onChange={(e) => setTargetIndustry(e.target.value as Industry)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500 font-semibold text-cyan-400"
                >
                  <option value="Technology">{translateIndustry('Technology', locale)}</option>
                  <option value="Marketing">{translateIndustry('Marketing', locale)}</option>
                  <option value="Design">{translateIndustry('Design', locale)}</option>
                  <option value="Finance">{translateIndustry('Finance', locale)}</option>
                  <option value="HR">{translateIndustry('HR', locale)}</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep('CHOICE')}
                className="text-xs text-slate-400 hover:text-white transition"
              >
                {isVi ? 'Quay lại' : 'Back'}
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition active:scale-95 shadow-md shadow-indigo-500/20"
              >
                <span>{isVi ? 'Tiếp tục Đăng ký' : 'Continue to Register'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
