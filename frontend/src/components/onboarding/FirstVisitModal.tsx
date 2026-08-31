'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Industry } from '@/types';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 text-slate-100 relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl" />

        {step === 'CHOICE' ? (
          <div className="space-y-6 relative z-10 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-400 shadow-lg shadow-indigo-500/30 mb-2">
              <Sparkles className="w-6 h-6 text-white" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white tracking-tight">Chào mừng bạn đến với Nền tảng AI Recruitment</h2>
              <p className="text-sm text-slate-300">Bạn đang tìm việc hay đang tìm ứng viên?</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <button
                onClick={handleSelectCandidate}
                className="group relative flex flex-col items-center justify-center p-5 rounded-xl border border-indigo-500/40 bg-indigo-950/30 hover:bg-indigo-900/50 hover:border-indigo-400 transition text-left"
              >
                <UserCheck className="w-8 h-8 text-cyan-400 mb-2 group-hover:scale-110 transition-transform" />
                <span className="font-semibold text-white text-base">Tôi đang tìm việc</span>
                <span className="text-xs text-slate-400 mt-1 text-center">Tạo CV AI, đối sánh JD và nộp đơn việc làm ngay</span>
              </button>

              <button
                onClick={handleSelectRecruiter}
                className="group relative flex flex-col items-center justify-center p-5 rounded-xl border border-slate-700 bg-slate-800/40 hover:bg-slate-800 hover:border-slate-600 transition text-left"
              >
                <Building2 className="w-8 h-8 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
                <span className="font-semibold text-white text-base">Tôi tìm ứng viên</span>
                <span className="text-xs text-slate-400 mt-1 text-center">Đăng tin tuyển dụng và xếp hạng ứng viên bằng AI</span>
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
              <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Khảo sát nhanh ứng viên</span>
              <h3 className="text-xl font-bold text-white">Hãy chia sẻ thông tin định hướng của bạn</h3>
              <p className="text-xs text-slate-400">Thông tin này sẽ tự động prefill vào biểu mẫu đăng ký tài khoản của bạn.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Độ tuổi của bạn</label>
                <input
                  type="number"
                  min={18}
                  max={65}
                  value={age}
                  onChange={(e) => setAge(parseInt(e.target.value) || 22)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Ngành nghề định hướng chính</label>
                <select
                  value={targetIndustry}
                  onChange={(e) => setTargetIndustry(e.target.value as Industry)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="Technology">Công nghệ Thông tin (Technology)</option>
                  <option value="Marketing">Digital Marketing</option>
                  <option value="Design">UI/UX Product Design</option>
                  <option value="Finance">Tài chính - Kế toán</option>
                  <option value="HR">Quản trị Nhân sự (HR)</option>
                  <option value="Sales">Kinh doanh / Sales</option>
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
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 shadow-lg shadow-indigo-500/25 transition active:scale-95"
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
