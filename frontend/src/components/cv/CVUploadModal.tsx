'use client';

import React, { useState, useEffect, useRef } from 'react';
import { CV, CVQuota } from '@/types';
import { useLanguage } from '@/context/LanguageContext';
import { SkillAutocomplete } from '@/components/common/SkillAutocomplete';
import { AnimatedModalShell, AnimatedStatus } from '@/components/motion';
import { uploadCandidateCV, fetchCVProcessingStatus, retryCVExtraction, subscribeCVProcessingEvents, type CVProcessingEvent } from '@/lib/api';
import { CVProcessingStatus } from '@/types';
import {
  X,
  UploadCloud,
  FileText,
  CheckCircle2,
  Loader2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';

interface CVUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess?: (cv: CV) => void;
  onSuccess?: () => void;
  quota?: CVQuota | null;
}

type ProcessingStatus = 'IDLE' | 'UPLOADING' | 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'REVIEW' | 'FAILED';

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;

export const CVUploadModal: React.FC<CVUploadModalProps> = ({ isOpen, onClose, onUploadSuccess, onSuccess, quota }) => {
  const { t } = useLanguage();
  const [file, setFile] = useState<File | null>(null);
  const [uploadedCv, setUploadedCv] = useState<CV | null>(null);
  const [status, setStatus] = useState<ProcessingStatus>('IDLE');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [processingProgress, setProcessingProgress] = useState<number>(5);
  const [processingStageMessage, setProcessingStageMessage] = useState<string>('');

  const abortControllerRef = useRef<AbortController | null>(null);

  // Extracted fields editable
  const [cvTitle, setCvTitle] = useState<string>('');
  const [extractedSkills, setExtractedSkills] = useState<string[]>([]);
  const [extractedSummary, setExtractedSummary] = useState<string>('');
  const [extractedExp, setExtractedExp] = useState<string>('');

  const handleClose = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    onClose();
  };

  const wasOpenRef = useRef(false);

  useEffect(() => {
    let resetFrame = 0;
    if (isOpen && !wasOpenRef.current) {
      resetFrame = window.requestAnimationFrame(() => {
        setStatus('IDLE');
        setErrorMessage('');
        setProcessingProgress(5);
        setProcessingStageMessage('');
        setFile(null);
        setUploadedCv(null);
      });
    }
    wasOpenRef.current = isOpen;

    return () => {
      if (resetFrame) window.cancelAnimationFrame(resetFrame);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      const validExtensions = ['.pdf', '.docx', '.doc', '.png', '.jpg', '.jpeg', '.webp'];
      const hasValidExt = validExtensions.some(ext => selected.name.toLowerCase().endsWith(ext));
      
      if (!hasValidExt && !selected.type.startsWith('image/') && selected.type !== 'application/pdf') {
        setErrorMessage(t('cvUpload.errors.invalidFileType', 'Định dạng tệp không được hỗ trợ. Vui lòng tải lên PDF, DOCX, DOC hoặc ảnh PNG/JPG.'));
        return;
      }

      if (selected.size > 10 * 1024 * 1024) {
        setErrorMessage(t('cvUpload.errors.fileTooLarge', 'Dung lượng tệp vượt quá giới hạn tối đa 10MB.'));
        return;
      }

      setFile(selected);
      setUploadedCv(null);
      setCvTitle(selected.name.replace(/\.[^/.]+$/, ''));
      setErrorMessage('');
    }
  };

  const mapErrorMessage = (err: unknown): string => {
    const errorRecord = asRecord(err) || {};
    const responseBody = asRecord(errorRecord.responseBody) || {};
    const code = String(responseBody.code || errorRecord.code || '');
    const reqId = typeof responseBody.requestId === 'string' ? responseBody.requestId : '';
    const responseMessage = typeof responseBody.message === 'string' ? responseBody.message : '';

    let msg = '';
    if (code === 'INVALID_FILE' || code === 'INVALID_FILE_TYPE') {
      msg = t('cvUpload.errors.invalidFileType', 'Định dạng tệp không được hỗ trợ. Vui lòng tải lên PDF, DOCX, DOC hoặc ảnh PNG/JPG.');
    } else if (code === 'CV_QUOTA_EXCEEDED') {
      msg = responseMessage || t('cvUpload.errors.quotaExceeded', 'Tài khoản của bạn đã đạt giới hạn tối đa số lượng CV cho phép.');
    } else if (code === 'FILE_SIZE_EXCEEDED' || code === 'FILE_TOO_LARGE') {
      msg = t('cvUpload.errors.fileTooLarge', 'Dung lượng tệp vượt quá giới hạn tối đa 10MB.');
    } else if (code === 'FILE_STORAGE_FAILED') {
      msg = t('cvUpload.errors.fileStorageFailed', 'Hệ thống không thể lưu trữ tệp CV lúc này. Vui lòng thử lại.');
    } else if (code === 'CV_TEXT_EXTRACTION_FAILED') {
      msg = t('cvUpload.errors.cvTextExtractionFailed', 'Không thể trích xuất nội dung văn bản từ tệp CV đã tải lên.');
    } else if (code === 'CV_STRUCTURING_FAILED') {
      msg = t('cvUpload.errors.cvStructuringFailed', 'Không thể chuẩn hóa cấu trúc dữ liệu CV bằng AI. Vui lòng thử lại.');
    } else if (code === 'CV_PROCESSING_FAILED') {
      msg = t('cvUpload.errors.cvProcessingFailed', 'Quá trình xử lý CV gặp sự cố kỹ thuật. Vui lòng thử lại.');
    } else if (responseMessage && !responseMessage.includes('C:\\') && !responseMessage.includes('/')) {
      msg = responseMessage;
    } else {
      msg = t('cvUpload.errors.generic', 'Đã xảy ra lỗi trong quá trình xử lý CV. Vui lòng thử lại sau.');
    }

    if (reqId) {
      msg += ` (${t('common.requestId', 'Mã yêu cầu')}: ${reqId})`;
    }
    return msg;
  };

  const pollProcessingStatus = async (cvId: string, cvEntity: CV, signal: AbortSignal) => {
    let isDone = false;
    const jobId = (cvEntity as CV & { jobId?: string }).jobId;

    // 1. Subscribe to real-time SSE event stream for immediate stage progression
    // Assign the unsubscribe callback before the event handler can use it.
    // This also avoids a TypeScript self-reference error in the initializer.
    let unsubscribe: () => void = () => {};
    unsubscribe = subscribeCVProcessingEvents(
      { cvId, jobId },
      (eventData: CVProcessingEvent) => {
        if (signal.aborted || isDone) return;
        if (eventData.progress !== undefined && eventData.progress !== null) {
          setProcessingProgress(Math.max(eventData.progress, 10));
        }
        if (eventData.message) {
          setProcessingStageMessage(eventData.message);
        }

        const step = (eventData.step || '').toUpperCase();
        const code = (eventData.code || '').toUpperCase();

        if (step.includes('FAILED') || code.includes('FAILED')) {
          isDone = true;
          unsubscribe();
          setStatus('FAILED');
          setErrorMessage(eventData.message || 'Quá trình trích xuất hồ sơ gặp sự cố.');
        } else if (
          step.includes('SUCCEEDED') ||
          step.includes('COMPLETED') ||
          step.includes('NEEDS_REVIEW') ||
          code.includes('JOB_SUCCEEDED')
        ) {
          isDone = true;
          unsubscribe();
          setProcessingProgress(100);
          setStatus('COMPLETED');
          if (onUploadSuccess) onUploadSuccess(cvEntity);
          if (onSuccess) onSuccess();
          setTimeout(() => {
            if (!signal.aborted) {
              onClose();
              setStatus('IDLE');
              setFile(null);
              setUploadedCv(null);
            }
          }, 600);
        }
      },
      (err) => {
        console.warn('SSE stream notice, continuing background check:', err);
      }
    );

    // 2. Periodic status check fallback in case SSE connection drops
    const maxAttempts = 60; // 60s timeout for safety
    let attempts = 0;

    while (!isDone && attempts < maxAttempts) {
      if (signal.aborted) {
        unsubscribe();
        return;
      }
      await new Promise((r) => setTimeout(r, 1000));
      if (signal.aborted || isDone) {
        unsubscribe();
        return;
      }
      attempts++;

      try {
        const statusResp: CVProcessingStatus = await fetchCVProcessingStatus(cvId);
        if (signal.aborted || isDone) return;
        if (statusResp) {
          setProcessingProgress(Math.max(statusResp.progress || 10, 10));
          if (statusResp.message) {
            setProcessingStageMessage(statusResp.message);
          }

          if (statusResp.status === 'FAILED') {
            isDone = true;
            unsubscribe();
            setStatus('FAILED');
            const errDetail = statusResp.message || 'Quá trình trích xuất hồ sơ gặp sự cố.';
            const codeDetail = statusResp.errorCode ? ` [${statusResp.errorCode}]` : '';
            const corrDetail = statusResp.correlationId ? ` (Mã theo dõi: ${statusResp.correlationId})` : '';
            setErrorMessage(`${errDetail}${codeDetail}${corrDetail}`);
            return;
          } else if (
            statusResp.status === 'SUCCEEDED' ||
            statusResp.status === 'COMPLETED' ||
            statusResp.stage === 'NEEDS_REVIEW' ||
            statusResp.status === 'CONFIRMED'
          ) {
            // Chỉ chuyển sang mở review khi processing-status trả về SUCCEEDED hoặc NEEDS_REVIEW hợp lệ
            if (statusResp.progress && statusResp.progress >= 100) {
              isDone = true;
              unsubscribe();
              setProcessingProgress(100);
              setStatus('COMPLETED');
              if (onUploadSuccess) onUploadSuccess(cvEntity);
              if (onSuccess) onSuccess();
              onClose();
              return;
            }
          }
        }
      } catch (pollError: unknown) {
        if (signal.aborted || isDone) return;
        const pollErr = asRecord(pollError) || {};
        const responseBody = asRecord(pollErr.responseBody) || {};
        const pollMessage = typeof pollErr.message === 'string' ? pollErr.message : '';
        const pollCode = String(pollErr.code || responseBody.code || '');
        // Nếu polling gặp 404: dừng polling ngay lập tức và báo lỗi tính nhất quán ID/dữ liệu
        const statusCode = pollErr.statusCode || pollErr.status || responseBody.code;
        if (
          statusCode === 404 ||
          pollMessage.includes('404') ||
          pollCode === 'RESOURCE_NOT_FOUND' ||
          pollCode === 'CV_NOT_FOUND'
        ) {
          isDone = true;
          unsubscribe();
          setStatus('FAILED');
          setErrorMessage('Lỗi tính nhất quán dữ liệu: Không tìm thấy phiên bản xử lý CV (ID không khớp giữa upload và processing). Vui lòng thử lại hoặc tải lại tệp.');
          return;
        }
        console.warn('Polling processing status warning:', pollErr);
      }
    }

    // Timeout tuyệt đối không được tự động chuyển sang COMPLETED hay mở review
    if (!isDone && attempts >= maxAttempts) {
      unsubscribe();
      if (signal.aborted) return;
      setStatus('FAILED');
      setErrorMessage('Quá trình xử lý CV quá thời gian quy định (Timeout). Hệ thống chưa thể hoàn tất trích xuất. Vui lòng bấm Thử lại.');
    }
  };

  const handleStartProcessing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    if (quota && !quota.canUpload) {
      setErrorMessage(t('cvUpload.errors.quotaExceeded', 'Tài khoản của bạn đã đạt giới hạn tối đa số lượng CV cho phép. Vui lòng xóa bớt CV cũ hoặc nâng cấp gói PRO.'));
      return;
    }

    setStatus('UPLOADING');
    setErrorMessage('');
    setProcessingProgress(5);
    setProcessingStageMessage('Đang tải tệp an toàn lên máy chủ...');

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      const savedCv = await uploadCandidateCV(
        file,
        cvTitle || file.name.replace(/\.[^/.]+$/, ''),
        undefined,
        false
      );

      if (signal.aborted) return;

      setUploadedCv(savedCv);
      setStatus('PROCESSING');
      setProcessingProgress(15);
      setProcessingStageMessage('Đang kiểm tra và trích xuất tệp...');

      await pollProcessingStatus(savedCv.id, savedCv, signal);
    } catch (err: unknown) {
      if (signal.aborted) return;
      setStatus('FAILED');
      setErrorMessage(mapErrorMessage(err));
    }
  };

  const handleRetry = async () => {
    if (uploadedCv?.id) {
      setStatus('PROCESSING');
      setErrorMessage('');
      setProcessingProgress(20);
      setProcessingStageMessage('Đang thử lại bước trích xuất dữ liệu...');

      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      try {
        await retryCVExtraction(uploadedCv.id);
        if (signal.aborted) return;
        await pollProcessingStatus(uploadedCv.id, uploadedCv, signal);
      } catch (err: unknown) {
        if (signal.aborted) return;
        setStatus('FAILED');
        setErrorMessage(mapErrorMessage(err));
      }
    } else {
      setStatus('IDLE');
      setErrorMessage('');
    }
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSaveParsedCV = async () => {
    if (!file && !uploadedCv) return;
    setIsSaving(true);
    setErrorMessage('');
    try {
      const targetCv = uploadedCv || await uploadCandidateCV(
        file!,
        cvTitle || file!.name.replace(/\.[^/.]+$/, ''),
        undefined,
        false
      );
      if (onUploadSuccess) onUploadSuccess(targetCv);
      if (onSuccess) onSuccess();
      handleClose();
      setStatus('IDLE');
      setFile(null);
      setUploadedCv(null);
    } catch (err: unknown) {
      setErrorMessage(mapErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatedModalShell
      isOpen={isOpen}
      onRequestClose={handleClose}
      titleId="cv-upload-modal-title"
      descriptionId="cv-upload-modal-description"
      id="cv-upload-modal"
      testId="cv-upload-modal"
      panelClassName="w-full max-w-xl bg-white dark:bg-[#111C38] border border-[#E2E8F0] dark:border-[#1E293B] rounded-2xl shadow-2xl p-6 sm:p-7 text-slate-800 dark:text-slate-100 relative transition-colors max-h-[90vh] overflow-y-auto"
    >
      <div aria-busy={status === 'UPLOADING' || status === 'QUEUED' || status === 'PROCESSING'}>
        
        {/* Close Button */}
        <button
          id="close-cv-upload-modal-btn"
          onClick={handleClose}
          data-autofocus="true"
          aria-label={t('common.close', 'Đóng')}
          className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#18294E] transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-[#13233F] border border-blue-200 dark:border-blue-900/50 flex items-center justify-center text-[#2563EB] dark:text-[#3B82F6] shadow-sm flex-shrink-0">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#2563EB] dark:text-[#3B82F6] block">
            </span>
            <h3 id="cv-upload-modal-title" className="text-xl font-editorial font-bold text-slate-900 dark:text-white">
              {t('cvUpload.title', 'Tải Lên & Phân Tích CV (PDF / DOCX)')}
            </h3>
          </div>
        </div>

        {errorMessage && status !== 'FAILED' && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* STEP: IDLE */}
        {status === 'IDLE' && (
          <form onSubmit={handleStartProcessing} className="space-y-5">
            {quota && !quota.canUpload && (
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <div className="space-y-1">
                  <p className="font-semibold">
                    {t('cvUpload.quotaExhaustedTitle', 'Đã đạt giới hạn số lượng CV')} ({quota.currentCount}/{quota.maxLimit} CV — Gói {quota.plan})
                  </p>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                    {quota.plan === 'STANDARD'
                      ? t('cvUpload.quotaExhaustedStandard', 'Gói STANDARD hỗ trợ tối đa 3 CV. Vui lòng nâng cấp gói PRO (5 CV) hoặc xóa bớt CV cũ để giải phóng dung lượng trước khi tải lên CV mới.')
                      : t('cvUpload.quotaExhaustedPro', 'Gói PRO đã đạt mức tối đa 5 CV. Vui lòng xóa bớt CV cũ để giải phóng dung lượng trước khi tải lên CV mới.')}
                  </p>
                </div>
              </div>
            )}
            {/* Drag & Drop Zone */}
            <div className="border-2 border-dashed border-slate-300 dark:border-[#1E3A5F] hover:border-[#2563EB] dark:hover:border-[#3B82F6] rounded-2xl p-8 text-center bg-slate-50/50 dark:bg-[#13233F]/40 transition cursor-pointer group">
              <input
                type="file"
                accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,image/*"
                onChange={handleFileChange}
                className="hidden"
                id="cv-file-modal-input"
              />
              <label htmlFor="cv-file-modal-input" className="cursor-pointer block space-y-2.5">
                <div className="w-12 h-12 mx-auto rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-[#2563EB] dark:text-[#3B82F6] group-hover:scale-110 transition">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <span className="block text-sm font-semibold text-slate-800 dark:text-white">
                    {file ? file.name : t('cvUpload.dropzoneText', 'Nhấp hoặc kéo thả file CV tại đây')}
                  </span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Hỗ trợ PDF (văn bản & scan), DOCX, DOC hoặc ảnh PNG/JPG/WEBP (Tối đa 10MB)
                  </span>
                </div>
                {file && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2563EB] dark:text-[#3B82F6] bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 px-2.5 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" />
                    {t('cvUpload.fileReady', 'Đã chọn sẵn sàng')}: {(file.size / 1024).toFixed(1)} KB
                  </span>
                )}
              </label>
            </div>

            <button
              type="submit"
              disabled={!file || Boolean(quota && !quota.canUpload)}
              className="w-full py-3 rounded-xl text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 disabled:cursor-not-allowed transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{t('cvUpload.startParse', 'Tải CV lên')}</span>
            </button>
          </form>
        )}

        {/* STEP: PROCESSING PIPELINE STATES */}
        {(status === 'UPLOADING' || status === 'QUEUED' || status === 'PROCESSING' || status === 'COMPLETED') && (
          <div className="py-10 text-center space-y-5 animate-fade-in">
            <div className="relative w-16 h-16 mx-auto">
              {status === 'COMPLETED' ? (
                <CheckCircle2 className="w-16 h-16 text-emerald-500 animate-scale-in" aria-hidden="true" />
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full border-4 border-slate-200 dark:border-[#1E293B] border-t-[#2563EB] animate-spin motion-reduce:animate-none" />
                </>
              )}
            </div>

            <div className="space-y-3 max-w-md mx-auto">
              <div className="flex items-center justify-between px-2">
                <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 text-[#2563EB] dark:text-[#3B82F6] text-[10px] font-mono font-bold uppercase tracking-wider">
                  TIẾN ĐỘ: {processingProgress}%
                </span>
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  {status === 'COMPLETED' ? 'HOÀN TẤT' : 'ĐANG XỬ LÝ'}
                </span>
              </div>

              {/* Real Progress Bar */}
              <div className="w-full bg-slate-100 dark:bg-[#18294E] rounded-full h-2.5 overflow-hidden border border-slate-200 dark:border-[#1E3A5F]">
                <div
                  className="bg-blue-600 h-2.5 rounded-full origin-left transition-transform duration-300 ease-out motion-reduce:transition-none"
                  style={{ transform: `scaleX(${Math.min(Math.max(processingProgress, 5), 100) / 100})` }}
                  role="progressbar"
                  aria-label={t('cvUpload.progressLabel', 'Tiến độ xử lý CV')}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={processingProgress}
                />
              </div>

              <AnimatedStatus stateKey={status} isBusy={status !== 'COMPLETED'}>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white pt-1">
                  {processingStageMessage || (
                    status === 'UPLOADING' ? 'Đang tải file an toàn lên máy chủ...' :
                    status === 'COMPLETED' ? 'Trích xuất hoàn tất! Chuẩn bị chuyển sang màn hình Đánh giá...' :
                    'Đang xử lý và trích xuất hồ sơ...'
                  )}
                </h4>
              </AnimatedStatus>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-light">
                {t('cvUpload.normalizationHint', 'Chuẩn hóa các kỹ năng đồng nghĩa (JS → JavaScript, Postgres → PostgreSQL) và vector embedding.')}
              </p>
            </div>
          </div>
        )}

        {/* STEP: REVIEW & REFINEMENT */}
        {status === 'REVIEW' && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-300 flex items-center justify-between">
              <span className="font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#2563EB] dark:text-[#3B82F6] flex-shrink-0" />
                {t('cvUpload.reviewSuccess', 'Trích xuất thành công! Kiểm tra và tinh chỉnh thông tin trước khi lưu.')}
              </span>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  {t('cvUpload.cvTitleLabel', 'Tên hiển thị CV')}
                </label>
                <input
                  type="text"
                  value={cvTitle}
                  onChange={(e) => setCvTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#13233F] border border-slate-200 dark:border-[#1E3A5F] text-slate-800 dark:text-white text-xs focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  {t('cvUpload.summaryLabel', 'Tóm tắt bản thân (Extracted Professional Summary)')}
                </label>
                <textarea
                  rows={2}
                  value={extractedSummary}
                  onChange={(e) => setExtractedSummary(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#13233F] border border-slate-200 dark:border-[#1E3A5F] text-slate-800 dark:text-white text-xs focus:outline-none focus:border-[#2563EB] leading-relaxed"
                />
              </div>

              {/* Autocomplete Skill Selector */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  {t('cvUpload.skillsLabel', 'Kỹ năng chuyên môn trích xuất (Technical Skills Index)')}
                </label>
                <SkillAutocomplete
                  skills={extractedSkills}
                  onSkillsChange={setExtractedSkills}
                  placeholder={t('cvUpload.skillsPlaceholder', 'Gõ để tìm kiếm và bổ sung kỹ năng (ví dụ: Spring Boot, Docker, React)...')}
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  {t('cvUpload.experienceLabel', 'Kinh nghiệm làm việc trích xuất')}
                </label>
                <textarea
                  rows={3}
                  value={extractedExp}
                  onChange={(e) => setExtractedExp(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#13233F] border border-slate-200 dark:border-[#1E3A5F] text-slate-800 dark:text-white text-xs focus:outline-none focus:border-[#2563EB] font-mono text-[11px] leading-relaxed"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-[#1E293B]">
              <button
                type="button"
                onClick={() => setStatus('IDLE')}
                className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white flex items-center gap-1.5 transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{t('cvUpload.uploadAnother', 'Tải file khác')}</span>
              </button>

              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveParsedCV}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 transition shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isSaving ? 'Đang tải lên...' : t('cvUpload.confirmSave', 'Xác Nhận & Lưu Thư Viện CV')}</span>
                {!isSaving && <ArrowRight className="w-3.5 h-3.5 text-white" />}
              </button>
            </div>
          </div>
        )}

        {/* STEP: FAILED */}
        {status === 'FAILED' && (
          <AnimatedStatus stateKey="FAILED" isError className="py-8 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-editorial font-bold text-slate-900 dark:text-white">
                {t('cvUpload.failedTitle', 'Phân Tích Thất Bại')}
              </h4>
              <p className="text-xs text-rose-600 dark:text-rose-400 max-w-md mx-auto">
                {errorMessage || t('cvUpload.failedDesc', 'Định dạng tệp tin hoặc nội dung văn bản không thể nhận diện. Vui lòng kiểm tra lại file.')}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleRetry}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] transition cursor-pointer"
              >
                {t('cvUpload.retry', 'Thử Lại (Retry)')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatus('IDLE');
                  setErrorMessage('');
                  setUploadedCv(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                {t('cvUpload.uploadAnother', 'Tải tệp khác')}
              </button>
            </div>
          </AnimatedStatus>
        )}

      </div>
    </AnimatedModalShell>
  );
};
