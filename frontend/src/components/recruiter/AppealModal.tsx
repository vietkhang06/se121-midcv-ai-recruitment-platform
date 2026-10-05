'use client';

import React, { useState } from 'react';
import { X, Send, AlertCircle, CheckCircle, ShieldAlert } from 'lucide-react';
import { submitSuspensionAppeal } from '@/lib/api';

interface AppealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AppealModal: React.FC<AppealModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !content.trim()) {
      setErrorMessage('Vui lòng điền đầy đủ tiêu đề và nội dung giải trình.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await submitSuspensionAppeal({
        subject: subject.trim(),
        content: content.trim(),
      });
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setSubject('');
        setContent('');
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Không thể gửi khiếu nại. Vui lòng thử lại sau.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#0B1329] border border-[#E2E8F0] dark:border-[#1E293B] shadow-2xl overflow-hidden text-[#1E3A5F] dark:text-[#D6E4E1]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#E2E8F0] dark:border-[#1E293B]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0F2A52] dark:text-white">
                Gửi khiếu nại đình chỉ
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ban Quản trị sẽ tiếp nhận và thẩm định hồ sơ của bạn
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {isSuccess ? (
          <div className="p-8 text-center space-y-3">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
            <h3 className="text-base font-bold text-emerald-600 dark:text-emerald-400">
              Gửi khiếu nại thành công!
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Hồ sơ của bạn đã được ghi nhận và đang chờ Quản trị viên xem xét.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {errorMessage && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tiêu đề khiếu nại <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ví dụ: Khiếu nại khóa tài khoản doanh nghiệp nhầm lẫn..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#CBD5E1] dark:border-[#1E293B] bg-white dark:bg-[#111C38] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                maxLength={255}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nội dung giải trình chi tiết <span className="text-red-500">*</span>
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Trình bày rõ lý do, cung cấp thông tin đối chiếu hoặc liên kết minh chứng hoạt động hợp pháp của bạn..."
                rows={5}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#CBD5E1] dark:border-[#1E293B] bg-white dark:bg-[#111C38] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#E2E8F0] dark:border-[#1E293B]">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Đang gửi...' : 'Gửi khiếu nại'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
