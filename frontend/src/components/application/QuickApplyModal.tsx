'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Job, CV, Application } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { fetchCandidateCVs, submitApplication } from '@/lib/api';
import {
  X,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  ArrowRight
} from 'lucide-react';

interface QuickApplyModalProps {
  job: Job | null;
  isOpen: boolean;
  onClose: () => void;
  onApplySubmitted?: (application: Application) => void;
  onSuccess?: () => void;
}

export const QuickApplyModal: React.FC<QuickApplyModalProps> = ({
  job,
  isOpen,
  onClose,
  onApplySubmitted,
  onSuccess,
}) => {
  const { isAuthenticated, openAuthModal } = useAuth();
  const { t, locale } = useLanguage();
  const isVi = locale === 'vi';

  // Step 1: Select CV, Step 2: Review Match Grid (Figma 07), Step 3: Confirm & Send
  const [candidateCVs, setCandidateCVs] = useState<CV[] | null>(null);
  const [selectedCvId, setSelectedCvId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [cvLoadError, setCvLoadError] = useState<string | null>(null);

  const closeModal = () => {
    setIsSubmitted(false);
    setSubmitError(null);
    setCvLoadError(null);
    setCandidateCVs(null);
    setSelectedCvId('');
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    void fetchCandidateCVs().then((cvs) => {
        if (!active) return;
        const eligibleCvs = cvs.filter((cv) => cv.status?.toUpperCase() === 'CONFIRMED');
        setCandidateCVs(eligibleCvs);
        if (eligibleCvs.length > 0) {
          setSelectedCvId(eligibleCvs[0].id);
        }
      }).catch((error: unknown) => {
        if (active) setCvLoadError(error instanceof Error ? error.message : 'Could not load your CVs. / Không tải được CV.');
      });
    return () => { active = false; };
  }, [isOpen]);

  if (!isOpen || !job) return null;

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <div className="w-full max-w-md bg-white dark:bg-[#111C38] border border-slate-200 dark:border-[#1E293B] rounded-2xl p-6 text-slate-900 dark:text-slate-100 text-center space-y-4 shadow-2xl">
          <ShieldAlert className="w-12 h-12 mx-auto text-amber-500" />
          <h2 className="text-lg font-bold font-editorial text-slate-900 dark:text-white">
            {isVi ? 'Yêu cầu Đăng nhập để Ứng tuyển' : 'Sign In Required to Apply'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {isVi ? 'Đăng nhập tài khoản ứng viên để tiếp tục nộp hồ sơ.' : 'Sign in with a candidate account to continue your application.'}
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={closeModal}
              className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            >
              {t('common.cancel', isVi ? 'Hủy' : 'Cancel')}
            </button>
            <button
              onClick={() => {
                closeModal();
                openAuthModal('LOGIN', { type: 'NAVIGATE', target: `/jobs/${job.id}` });
              }}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] dark:bg-[#2563EB] dark:hover:bg-[#1D4ED8] rounded-lg transition"
            >
              {isVi ? 'Đăng nhập ngay' : 'Sign In Now'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const selectedCv = candidateCVs?.find((c) => c.id === selectedCvId) || candidateCVs?.[0];

  const retryLoadCandidateCvs = () => {
    setCandidateCVs(null);
    setCvLoadError(null);
    void fetchCandidateCVs().then((cvs) => {
      const eligibleCvs = cvs.filter((cv) => cv.status?.toUpperCase() === 'CONFIRMED');
      setCandidateCVs(eligibleCvs);
      setSelectedCvId(eligibleCvs[0]?.id || '');
    }).catch((error: unknown) => {
      setCvLoadError(error instanceof Error ? error.message : 'Could not load your CVs. / Không tải được CV.');
      setCandidateCVs([]);
    });
  };

  const handleConfirmApplication = async () => {
    if (!selectedCv) {
      setSubmitError('Bạn chưa có CV nào trong tài khoản. Vui lòng tải lên hoặc tạo CV trước.');
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const newApp = await submitApplication({
        id: `app-${Date.now()}`,
        job: job,
        appliedCvId: selectedCv.id,
        appliedCvTitle: selectedCv.title,
        appliedCvVersion: null,
        status: 'SUBMITTED',
        appliedDate: '',
      });
      setIsSubmitted(true);
      if (onApplySubmitted) onApplySubmitted(newApp);
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Nộp hồ sơ thất bại. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md overflow-y-auto">
      
      {/* 07 — Modal Card (Figma Screen 07: 1440x1332 node container) */}
      <div className="w-full max-w-2xl bg-white dark:bg-[#111C38] border border-slate-200 dark:border-[#1E293B] rounded-2xl shadow-2xl text-[#0F2A52] dark:text-[#F1F5F9] relative overflow-hidden my-8">
        
        {/* Modal Header */}
        <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-[#1E293B] relative">
          <button
            onClick={closeModal}
            className="absolute right-6 top-6 w-8 h-8 rounded-full border border-slate-200 dark:border-[#1E293B] flex items-center justify-center text-slate-400 hover:text-[#0F2A52] dark:hover:text-white hover:bg-slate-50 dark:hover:bg-[#18294E] transition"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold text-[#2563EB] dark:text-[#3B82F6] uppercase tracking-widest">
              {isVi ? 'Ứng tuyển' : 'Application'}
            </span>
            <h2 className="text-2xl font-editorial font-bold text-[#0F2A52] dark:text-[#F1F5F9]">
              {job.title}
            </h2>
            <div className="text-xs text-[#64748B] dark:text-[#94A3B8] font-mono">
              {job.companyName} — {job.location}
            </div>
          </div>

        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-6">
          
          {isSubmitted ? (
            <div className="text-center py-8 space-y-3">
              <CheckCircle2 className="w-12 h-12 text-[#00B14F] mx-auto" />
              <h3 className="text-xl font-editorial font-bold text-[#0F2A52] dark:text-[#F1F5F9]">{t('quickApply.successTitle', 'Nộp Hồ Sơ Thành Công!')}</h3>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8] max-w-md mx-auto">
                {isVi ? 'Đơn ứng tuyển và phiên bản CV đã chọn đã được lưu.' : 'Your application and selected CV version have been saved.'}
              </p>
              <div className="pt-4">
                <button
                  onClick={closeModal}
                  className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition shadow-xs"
                >
                  {t('common.close', 'Đóng cửa sổ')}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* CV Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#0F2A52] dark:text-[#E2E8F0] flex items-center justify-between">
                  <span>{isVi ? 'Bản CV ứng tuyển:' : 'Application CV:'}</span>
                  {candidateCVs?.length === 0 && !cvLoadError && (
                    <span className="text-rose-500 text-[11px]">
                      {isVi ? 'Cần CV đã xác nhận' : 'A confirmed CV is required'}
                    </span>
                  )}
                </label>
                {candidateCVs === null ? (
                  <p role="status" className="text-xs text-slate-500">{isVi ? 'Đang tải danh sách CV…' : 'Loading your CVs…'}</p>
                ) : cvLoadError ? (
                  <div className="space-y-2 text-xs text-rose-700 dark:text-rose-300"><p role="alert">{cvLoadError}</p><button type="button" onClick={retryLoadCandidateCvs} className="font-semibold underline">{isVi ? 'Thử tải lại' : 'Retry'}</button></div>
                ) : candidateCVs.length > 0 ? (
                  <select
                    value={selectedCvId}
                    onChange={(e) => setSelectedCvId(e.target.value)}
                    className="w-full text-xs bg-white dark:bg-[#13233F] border border-slate-200 dark:border-[#1E3A5F] rounded-xl px-3.5 py-2.5 text-[#0F2A52] dark:text-[#F1F5F9] focus:outline-none focus:border-[#2563EB]"
                  >
                    {candidateCVs.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title} ({c.creationPath === 'UPLOAD' ? (isVi ? 'File tải lên' : 'Uploaded file') : (isVi ? 'Tạo từ Builder' : 'CV Builder')}) {c.isDefault ? (isVi ? '— Mặc định' : '— Default') : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-xl text-xs text-rose-700 dark:text-rose-300">
                      {isVi
                        ? 'Bạn chưa có CV ở trạng thái đã xác nhận. Hãy hoàn tất rà soát và xác nhận CV trước khi ứng tuyển.'
                        : 'You do not have a confirmed CV yet. Review and confirm a CV before applying.'}
                  </div>
                )}
                {candidateCVs?.length === 0 && !cvLoadError && <Link href={`/candidate/cvs/builder?returnTo=${encodeURIComponent(`/jobs/${job.id}`)}`} onClick={closeModal} className="mt-2 inline-flex text-xs font-semibold text-blue-700 underline dark:text-blue-300">{isVi ? 'Tạo hoặc xác nhận CV' : 'Create or confirm a CV'}</Link>}
              </div>

              {submitError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 dark:border-[#1E293B] flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-[#1E293B] text-[#0F2A52] dark:text-[#94A3B8] hover:bg-slate-50 dark:hover:bg-[#18294E] transition"
                >
                  {t('quickApply.back', 'Quay lại')}
                </button>

                <button
                  type="button"
                  disabled={isSubmitting || !candidateCVs?.length || !selectedCv}
                  onClick={handleConfirmApplication}
                  className="px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] transition shadow-xs flex items-center gap-1.5 active:scale-[0.99] cursor-pointer"
                >
                  <span>{isSubmitting ? t('quickApply.submitting', 'Đang nộp hồ sơ...') : t('quickApply.submitApplication', 'Xác nhận & Nộp hồ sơ')}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}

        </div>

      </div>

    </div>
  );
};
