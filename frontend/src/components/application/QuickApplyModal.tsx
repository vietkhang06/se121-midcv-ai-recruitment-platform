'use client';

import React, { useState, useEffect } from 'react';
import { Job, CV, Application } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { MOCK_CVS, MOCK_CANDIDATE } from '@/lib/api';
import { X, Send, CheckCircle2, FileText, Building2, MapPin, DollarSign, ShieldAlert, AlertCircle } from 'lucide-react';

interface QuickApplyModalProps {
  job: Job | null;
  isOpen: boolean;
  onClose: () => void;
  onApplySubmitted: (application: Application) => void;
}

export const QuickApplyModal: React.FC<QuickApplyModalProps> = ({ job, isOpen, onClose, onApplySubmitted }) => {
  const { user, isAuthenticated, openAuthModal } = useAuth();
  
  const [selectedCvId, setSelectedCvId] = useState<string>(MOCK_CVS[0].id);
  const [expectedSalary, setExpectedSalary] = useState<number>(2500);
  const [noticePeriodDays, setNoticePeriodDays] = useState<number>(30);
  const [portfolioUrl, setPortfolioUrl] = useState<string>(MOCK_CANDIDATE.portfolioUrl || '');
  const [githubUrl, setGithubUrl] = useState<string>(MOCK_CANDIDATE.githubUrl || '');
  const [javaExpAnswer, setJavaExpAnswer] = useState<string>('3.5'); // Job-specific question answer
  const [candidateNotes, setCandidateNotes] = useState<string>('Tôi rất hào hứng với vị trí này và sẵn sàng đi làm ngay.');
  
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (user) {
      setGithubUrl(MOCK_CANDIDATE.githubUrl || '');
      setPortfolioUrl(MOCK_CANDIDATE.portfolioUrl || '');
    }
  }, [user]);

  if (!isOpen || !job) return null;

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-100 text-center space-y-4">
          <ShieldAlert className="w-12 h-12 mx-auto text-amber-400" />
          <h3 className="text-lg font-bold text-white">Yêu cầu Đăng nhập để Ứng tuyển</h3>
          <p className="text-xs text-slate-400">Bạn cần đăng nhập tài khoản Ứng viên để thực hiện Nộp đơn Nhanh (Quick Apply).</p>
          <div className="flex justify-center gap-3 pt-2">
            <button onClick={onClose} className="px-4 py-2 text-xs text-slate-400 hover:text-white">Đóng</button>
            <button
              onClick={() => {
                onClose();
                openAuthModal('LOGIN');
              }}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-500"
            >
              Đăng nhập ngay
            </button>
          </div>
        </div>
      </div>
    );
  }

  const selectedCv = MOCK_CVS.find(c => c.id === selectedCvId) || MOCK_CVS[0];

  const handleSubmitApplication = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent duplicate submit

    setIsSubmitting(true);

    setTimeout(() => {
      const newApp: Application = {
        id: `app-${Date.now()}`,
        job: job,
        appliedCvId: selectedCv.id,
        appliedCvTitle: selectedCv.title,
        appliedCvVersion: selectedCv.currentVersionNumber,
        status: 'SUBMITTED',
        appliedDate: new Date().toISOString().split('T')[0]
      };

      setIsSubmitting(false);
      setIsSuccess(true);
      onApplySubmitted(newApp);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {!isSuccess ? (
          <form onSubmit={handleSubmitApplication} className="space-y-5">
            {/* Header Info */}
            <div className="space-y-1 border-b border-slate-800 pb-3">
              <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">JD-Aware Quick Apply Workflow</span>
              <h3 className="text-xl font-bold text-white">{job.title}</h3>
              <div className="flex items-center gap-3 text-xs text-slate-400 pt-1">
                <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{job.companyName}</span>
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{job.location}</span>
                <span className="flex items-center gap-1 text-emerald-400 font-medium"><DollarSign className="w-3.5 h-3.5" />${job.salaryMin} - ${job.salaryMax}</span>
              </div>
            </div>

            {/* Select CV */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">1. Chọn CV nộp đơn (Đã bảo tồn phiên bản snapshot)</label>
              <div className="space-y-2">
                {MOCK_CVS.map((cv) => (
                  <label
                    key={cv.id}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                      selectedCvId === cv.id ? 'border-indigo-500 bg-indigo-950/40 text-white' : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="selectedCv"
                        value={cv.id}
                        checked={selectedCvId === cv.id}
                        onChange={() => setSelectedCvId(cv.id)}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <span className="block font-semibold text-xs text-white">{cv.title}</span>
                        <span className="block text-[11px] text-slate-400">Phiên bản: v{cv.currentVersionNumber}.0 • Ngành {cv.targetIndustry}</span>
                      </div>
                    </div>
                    <FileText className="w-4 h-4 text-indigo-400" />
                  </label>
                ))}
              </div>
            </div>

            {/* JD Application Requirements Fields */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
              <h4 className="font-semibold text-slate-200 uppercase tracking-wider text-[11px] text-cyan-400">
                2. Thông tin Nộp đơn Theo Yêu cầu vị trí JD (JD Application Requirements)
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Mức lương mong muốn ($/tháng)</label>
                  <input
                    type="number"
                    value={expectedSalary}
                    onChange={(e) => setExpectedSalary(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Thời gian báo nghỉ (Notice Period)</label>
                  <select
                    value={noticePeriodDays}
                    onChange={(e) => setNoticePeriodDays(parseInt(e.target.value) || 30)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                  >
                    <option value={0}>Có thể bắt đầu ngay</option>
                    <option value={15}>15 Ngày</option>
                    <option value={30}>30 Ngày (Tiêu chuẩn)</option>
                  </select>
                </div>
              </div>

              {/* Candidate Proof URLs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">GitHub Profile URL</label>
                  <input
                    type="url"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Portfolio Website URL</label>
                  <input
                    type="url"
                    value={portfolioUrl}
                    onChange={(e) => setPortfolioUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Job Specific Question */}
              {job.industry === 'Technology' && (
                <div className="pt-2 border-t border-slate-800/80 space-y-1">
                  <label className="block font-medium text-indigo-300">
                    Câu hỏi JD: "Bạn có bao nhiêu năm kinh nghiệm thực tế làm việc với Java Backend?"
                  </label>
                  <input
                    type="text"
                    value={javaExpAnswer}
                    onChange={(e) => setJavaExpAnswer(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. 3.5 năm kinh nghiệm"
                    required
                  />
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">3. Ghi chú cho Nhà tuyển dụng (Không bắt buộc)</label>
              <textarea
                rows={2}
                value={candidateNotes}
                onChange={(e) => setCandidateNotes(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 disabled:opacity-50 shadow-lg shadow-indigo-500/25 transition active:scale-95 flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Đang gửi hồ sơ...' : 'Xác nhận Nộp đơn Ung tuyển'}</span>
            </button>
          </form>
        ) : (
          <div className="py-8 text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-400" />
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-white">Nộp đơn thành công!</h3>
              <p className="text-xs text-slate-300">
                Hồ sơ của bạn cho vị trí <strong>{job.title}</strong> tại <strong>{job.companyName}</strong> đã được ghi nhận an toàn.
              </p>
              <p className="text-[11px] text-slate-400 pt-2">
                CV được chọn: <strong>{selectedCv.title} (v{selectedCv.currentVersionNumber}.0)</strong>
              </p>
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 transition mt-4"
            >
              Hoàn tất & Đóng
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
