'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Industry } from '@/types';
import {
  CandidateOnboardingIllustration,
  CompanyVerificationIllustration
} from '@/components/illustrations/Illustrations';
import { UserCheck, Building2, FastForward, Sparkles, ArrowRight } from 'lucide-react';

export const FirstVisitModal: React.FC = () => {
  const { hasSeenFirstVisit, setFirstVisitChoice } = useAuth();
  const [step, setStep] = useState<'CHOICE' | 'QUICK_ONBOARDING'>('CHOICE');
  const [age, setAge] = useState<number>(24);
  const [targetIndustry, setTargetIndustry] = useState<Industry>('Technology');

  if (hasSeenFirstVisit) {
    return null; // Do not render if user has already completed or skipped onboarding
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
                <span>Chào mừng bạn đến với Nền tảng AI Recruitment</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Lựa Chọn Vai Trò Của Bạn
              </h2>
              <p className="text-xs sm:text-sm text-slate-300">
                Hệ thống sẽ tùy chỉnh giao diện và công cụ phù hợp nhất với nhu cầu của bạn
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
                    Tôi là Ứng viên
                  </span>
                  <span className="text-xs text-slate-400 mt-1 block">
                    Tạo CV chuẩn AI, đối sánh JD và nộp đơn Quick Apply
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
                    Tôi là Doanh nghiệp
                  </span>
                  <span className="text-xs text-slate-400 mt-1 block">
                    Đăng tin JD và xem Bảng xếp hạng ứng viên chuẩn AI
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
                <span>Bỏ qua & Xem trang chủ công khai</span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCompleteQuickOnboarding} className="space-y-6 relative z-10">
            <div className="space-y-2">
              <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
                Khảo sát nhanh ứng viên
              </span>
              <h3 className="text-xl font-bold text-white">Định hướng Nghề nghiệp của Bạn</h3>
              <p className="text-xs text-slate-400">
                Thông tin này sẽ được lưu vào hồ sơ cá nhân để AI Matching đề xuất việc làm chuẩn xác.
              </p>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-300 mb-1.5">Độ tuổi của bạn</label>
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
                <label className="block font-medium text-slate-300 mb-1.5">Ngành nghề định hướng chính</label>
                <select
                  value={targetIndustry}
                  onChange={(e) => setTargetIndustry(e.target.value as Industry)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500 font-semibold text-cyan-400"
                >
                  <option value="Technology">Công nghệ Thông tin (Technology)</option>
                  <option value="Marketing">Digital Marketing</option>
                  <option value="Design">UI/UX Product Design</option>
                  <option value="Finance">Tài chính - Kế toán</option>
                  <option value="HR">Quản trị Nhân sự (HR)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep('CHOICE')}
                className="text-xs text-slate-400 hover:text-white transition"
              >
                Quay lại
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition active:scale-95 shadow-md shadow-indigo-500/20"
              >
                <span>Tiếp tục Đăng ký</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
