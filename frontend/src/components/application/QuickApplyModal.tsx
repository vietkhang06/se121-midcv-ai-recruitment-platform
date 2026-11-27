'use client';

import { applyPath, cvLibraryPath, takeCvChoice } from '@/lib/navigationIntent';
import { isJobExpired } from '@/lib/jobDeadline';
import { statusLabel } from '@/lib/statusLabels';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Job, CV, Application } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { fetchCandidateCVs, fetchCandidateApplications, getAuthUser, ApiError, isApplicationRevisionConflict, submitApplication, previewQuickApply, QuickApplyPreview } from '@/lib/api';
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

export const QuickApplyModal: React.FC<QuickApplyModalProps> = (props) => {
  const { user, authState } = useAuth();
  if (!props.isOpen || !props.job || authState === 'INITIALIZING') return null;
  return <QuickApplySession key={JSON.stringify([user?.id, user?.role, props.job.id, props.job.applicationRevision])} {...props} />;
};

const QuickApplySession: React.FC<QuickApplyModalProps> = ({
  job,
  isOpen,
  onClose,
  onApplySubmitted,
  onSuccess,
}) => {
  const { user, isAuthenticated, openAuthModal } = useAuth();
  const { t, locale } = useLanguage();
  const isVi = locale === 'vi';

  // Step 1: Select CV, Step 2: Review Match Grid (Figma 07), Step 3: Confirm & Send
  const [candidateCVs, setCandidateCVs] = useState<CV[] | null>(null);
  const [selectedCvId, setSelectedCvId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<Application | null>(null);
  const [cvRevision, setCvRevision] = useState(0);
  const [outcomeUnknown, setOutcomeUnknown] = useState(false);
  const [revisionConflict, setRevisionConflict] = useState(false);
  const activeRef = useRef(true);
  const submittingRef = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<() => void>(() => {});
  const sessionCurrent = () => activeRef.current && getAuthUser()?.id === user?.id;
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [cvLoadError, setCvLoadError] = useState<string | null>(null);
  const [aiAnalysisConsent, setAiAnalysisConsent] = useState(false);
  const [preview, setPreview] = useState<QuickApplyPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const previewRequestRef = useRef(0);

  const closeModal = () => {
    if (submittingRef.current) return;
    activeRef.current = false;
    previewRequestRef.current += 1;
    onClose();
  };

  useEffect(() => {
    activeRef.current = true;
    return () => { activeRef.current = false; previewRequestRef.current += 1; };
  }, []);

  useEffect(() => { closeRef.current = closeModal; });
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel?.focus({ preventScroll: true });
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); return; }
      if (event.key !== 'Tab' || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), select:not([disabled]), input:not([disabled])'));
      const first = items[0]; const last = items[items.length - 1];
      if (!first || !last) { event.preventDefault(); panel.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = previousOverflow; if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, []);

  const userId = user?.id;
  const role = user?.role;
  const jobId = job?.id;
  useEffect(() => {
    if (!isOpen || role !== 'CANDIDATE' || !userId || !jobId) return;
    let active = true;
    void fetchCandidateCVs().then(cvs => {
      if (!active || !activeRef.current || getAuthUser()?.id !== userId) return;
      const eligible = cvs.filter(cv => cv.status?.toUpperCase() === 'CONFIRMED');
      setCandidateCVs(eligible);
      const preferred = takeCvChoice(userId, jobId);
      setSelectedCvId((eligible.find(cv => cv.id === preferred) ?? eligible.find(cv => cv.isDefault) ?? eligible[0])?.id ?? '');
    }).catch(() => {
      if (active && activeRef.current && getAuthUser()?.id === userId) {
        setCvLoadError('Không tải được CV. / Could not load your CVs.');
      }
    });
    return () => { active = false; };
  }, [isOpen, role, userId, jobId, cvRevision]);

  if (!isOpen || !job) return null;

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <div ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={isVi ? 'Yêu cầu đăng nhập' : 'Sign in required'} className="w-full max-w-md bg-white dark:bg-[var(--surface)] border border-slate-200 dark:border-[var(--border)] rounded-xl p-6 text-slate-900 dark:text-slate-100 text-center space-y-4 shadow-2xl">
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
                openAuthModal('LOGIN', { type: 'NAVIGATE', target: applyPath(job.id) });
              }}
              className="px-4 py-2 text-xs font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary)] dark:bg-[var(--primary)] dark:hover:bg-[var(--primary)] rounded-xl transition"
            >
              {isVi ? 'Đăng nhập ngay' : 'Sign In Now'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (user?.role !== 'CANDIDATE') return (
    <div ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={isVi ? 'Ứng tuyển' : 'Application'} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="rounded-xl bg-white p-6 text-slate-900 dark:bg-slate-900 dark:text-white">
        <p role="alert">{isVi ? 'Chỉ tài khoản ứng viên có thể nộp đơn.' : 'Only candidate accounts can apply.'}</p>
        <button type="button" onClick={closeModal} className="mt-4 underline">{isVi ? 'Đóng' : 'Close'}</button>
      </div>
    </div>
  );

  const selectedCv = candidateCVs?.find(c => c.id === selectedCvId);

  const retryLoadCandidateCvs = () => {
    setCandidateCVs(null);
    setSelectedCvId('');
    setCvLoadError(null);
    setCvRevision(value => value + 1);
  };

  const handlePreview = async () => {
    if (!selectedCv || !aiAnalysisConsent || !sessionCurrent() || submittingRef.current || revisionConflict || isPreviewing) return;
    const requestId = ++previewRequestRef.current;
    setIsPreviewing(true);
    setPreview(null);
    setPreviewError(null);
    try {
      const result = await previewQuickApply(job.id, selectedCv.id, selectedCv.confirmedVersionId, job.applicationRevision);
      if (sessionCurrent() && requestId === previewRequestRef.current) setPreview(result);
    } catch (err: unknown) {
      if (sessionCurrent() && requestId === previewRequestRef.current) {
        if (isApplicationRevisionConflict(err)) {
          setRevisionConflict(true);
          setPreviewError(isVi ? 'CV hoặc JD đã thay đổi. Hãy tải lại và xác nhận lựa chọn.' : 'CV or job changed. Reload and confirm your selection.');
        } else setPreviewError(err instanceof Error ? err.message : 'Không thể xem đối sánh lúc này.');
      }
    } finally {
      if (sessionCurrent() && requestId === previewRequestRef.current) setIsPreviewing(false);
    }
  };

  const finish = (application: Application) => {
    if (!sessionCurrent()) return;
    setOutcomeUnknown(false);
    setSubmitError(null);
    setSubmitted(application);
    onApplySubmitted?.(application);
    onSuccess?.();
  };

  const reconcileSubmission = async () => {
    if (!sessionCurrent() || !job) return;
    try {
      const existing = (await fetchCandidateApplications()).find(app => app.job.id === job.id);
      if (!sessionCurrent()) return;
      if (existing) { finish(existing); return; }
      setOutcomeUnknown(false);
      setSubmitError(isVi ? 'Chưa tìm thấy đơn trên máy chủ. Bạn có thể thử nộp lại.' : 'No application was found on the server. You can try submitting again.');
    } catch {
      if (!sessionCurrent()) return;
      setOutcomeUnknown(true);
      setSubmitError(isVi ? 'Chưa xác nhận được kết quả nộp. Hãy kiểm tra lại danh sách đơn trước khi thử lại.' : 'Submission outcome is unknown. Check your applications before retrying.');
    }
  };

  const checkSubmission = async () => {
    if (submittingRef.current || !sessionCurrent()) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    try { await reconcileSubmission(); }
    finally { submittingRef.current = false; if (sessionCurrent()) setIsSubmitting(false); }
  };

  const handleConfirmApplication = async () => {
    if (submittingRef.current || !sessionCurrent() || submitted || outcomeUnknown || revisionConflict || isPreviewing) return;
    if (job.status !== 'PUBLISHED' || isJobExpired(job.applicationDeadline)) {
      setSubmitError(isVi ? 'Tin tuyển dụng không còn nhận hồ sơ.' : 'This job is no longer accepting applications.');
      return;
    }
    if (!selectedCv) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const newApp = await submitApplication({
        id: '', // server assigns the actual application ID
        job,
        appliedCvId: selectedCv.id,
        appliedCvTitle: selectedCv.title,
        appliedCvVersion: selectedCv.confirmedVersionNumber ?? null,
        expectedCvVersionId: preview?.cvVersionId ?? selectedCv.confirmedVersionId ?? undefined,
        expectedJobRevision: preview?.jobRevision ?? job.applicationRevision,
        aiAnalysisConsent,
        status: 'SUBMITTED',
        appliedDate: '',
      });
      finish(newApp);
    } catch (err: unknown) {
      if (!sessionCurrent()) return;
      if (isApplicationRevisionConflict(err)) {
        setRevisionConflict(true);
        setPreview(null);
        setSubmitError(isVi ? 'CV hoặc JD đã thay đổi. Hãy tải lại trang, chọn CV và xác nhận lại.' : 'CV or job changed. Reload the page and confirm your selection again.');
        return;
      }
      // A timeout, conflict or 5xx can occur after the server committed the application.
      // Read the authoritative list before allowing another submission.
      if (!(err instanceof ApiError) || err.status === 0 || err.status === 409 || err.status >= 500) {
        setOutcomeUnknown(true);
        await reconcileSubmission();
        if (sessionCurrent() && err instanceof ApiError && err.status === 409) {
          setSubmitError(isVi
            ? 'CV hoặc công việc đã thay đổi, hoặc đã có đơn ứng tuyển. Kiểm tra đơn đã nộp rồi tải lại JD trước khi thử lại.'
            : 'The CV or job may have changed, or you may already have applied. Check your applications and reload the job before retrying.');
        }
      } else if (sessionCurrent()) setSubmitError(err.message);
    } finally {
      submittingRef.current = false;
      if (sessionCurrent()) setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md overflow-y-auto">

      {/* 07 — Modal Card (Figma Screen 07: 1440x1332 node container) */}
      <div ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={isVi ? 'Ứng tuyển' : 'Application'} className="w-full max-w-2xl max-h-[90dvh] overflow-y-auto bg-white dark:bg-[var(--surface)] border border-slate-200 dark:border-[var(--border)] rounded-xl shadow-2xl text-[var(--heading)] dark:text-[var(--retro-cream)] relative my-8">

        {/* Modal Header */}
        <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-[var(--border)] relative">
          <button
            onClick={closeModal}
            disabled={isSubmitting}
            aria-label={isVi ? 'Đóng' : 'Close'}
            className="absolute right-6 top-6 w-8 h-8 rounded-xl border border-slate-200 dark:border-[var(--border)] flex items-center justify-center text-slate-400 hover:text-[var(--heading)] dark:hover:text-white hover:bg-slate-50 dark:hover:bg-[var(--surface)] transition"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="space-y-1">
            <span className="text-[10px] font-sans font-bold text-[var(--primary)] dark:text-[var(--retro-sky)] uppercase tracking-widest">
              {isVi ? 'Ứng tuyển' : 'Application'}
            </span>
            <h2 className="text-2xl font-editorial font-bold text-[var(--heading)] dark:text-[var(--retro-cream)]">
              {job.title}
            </h2>
            <div className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-sans">
              {job.companyName} — {job.location}
            </div>
          </div>

        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-6">

          {submitted ? (
            <div className="text-center py-8 space-y-3">
              <CheckCircle2 className="w-12 h-12 text-[var(--success)] mx-auto" />
              <h3 className="text-xl font-editorial font-bold text-[var(--heading)] dark:text-[var(--retro-cream)]">{t('quickApply.successTitle', 'Nộp Hồ Sơ Thành Công!')}</h3>
              <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-secondary)] max-w-md mx-auto">
                {submitted.aiAnalysisConsent === true
                  ? (isVi ? 'Đã lưu đơn và CV đã chọn. Điểm đối sánh sẽ cập nhật khi vector sẵn sàng.' : 'Application and CV saved. The match may update when vectors become ready.')
                  : submitted.aiAnalysisConsent === false
                    ? (isVi ? 'Đã lưu đơn và CV đã chọn; bạn chưa cho phép phân tích AI.' : 'Application and CV saved without AI analysis consent.')
                    : (isVi ? 'Đã lưu đơn. Xem chi tiết để kiểm tra trạng thái phân tích.' : 'Application saved. Open the details to check analysis status.')}
              </p>
              <Link href={`/candidate/applications/${encodeURIComponent(submitted.id)}`} onClick={closeModal} className="inline-block text-sm font-semibold text-blue-700 underline">
                {isVi ? 'Xem đơn và báo cáo' : 'View application and report'}
              </Link>
              <div className="pt-4">
                <button
                  onClick={closeModal}
                  className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-[var(--primary)] text-white hover:bg-[var(--primary)] transition shadow-xs"
                >
                  {t('common.close', 'Đóng cửa sổ')}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* CV Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--heading)] dark:text-[var(--retro-cream)] flex items-center justify-between">
                  <span>{isVi ? 'Bản CV ứng tuyển:' : 'Application CV:'}</span>
                  {candidateCVs?.length === 0 && !cvLoadError && (
                    <span className="text-rose-500 text-[11px]">
                      {isVi ? 'Cần CV đã xác nhận' : 'A confirmed CV is required'}
                    </span>
                  )}
                </label>
                {candidateCVs === null && !cvLoadError ? (
                  <p role="status" className="text-xs text-slate-500">{isVi ? 'Đang tải danh sách CV…' : 'Loading your CVs…'}</p>
                ) : cvLoadError ? (
                  <div className="space-y-2 text-xs text-rose-700 dark:text-rose-300"><p role="alert">{cvLoadError}</p><button type="button" onClick={retryLoadCandidateCvs} className="font-semibold underline">{isVi ? 'Thử tải lại' : 'Retry'}</button></div>
                ) : (candidateCVs?.length ?? 0) > 0 ? (
                  <select
                    aria-label={isVi ? 'Bản CV ứng tuyển' : 'Application CV'}
                    disabled={isSubmitting || outcomeUnknown}
                    value={selectedCvId}
                    onChange={(e) => { previewRequestRef.current += 1; setIsPreviewing(false); setSelectedCvId(e.target.value); setPreview(null); setPreviewError(null); }}
                    className="w-full text-xs bg-white dark:bg-[var(--surface)] border border-slate-200 dark:border-[var(--border)] rounded-xl px-3.5 py-2.5 text-[var(--heading)] dark:text-[var(--retro-cream)] focus:outline-none focus:border-[var(--border)]"
                  >
                    {candidateCVs?.map((c) => (
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
                {candidateCVs?.length === 0 && !cvLoadError && <Link href={cvLibraryPath(`/jobs/${job.id}`)} onClick={closeModal} className="mt-2 inline-flex text-xs font-semibold text-blue-700 underline dark:text-blue-300">{isVi ? 'Tải lên, tạo hoặc xác nhận CV' : 'Upload, create or confirm a CV'}</Link>}
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-[var(--border)] p-4 space-y-3 text-xs">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" disabled={isSubmitting || outcomeUnknown} checked={aiAnalysisConsent} onChange={(e) => {
                    previewRequestRef.current += 1; setIsPreviewing(false); setAiAnalysisConsent(e.target.checked); setPreview(null); setPreviewError(null);
                  }} className="mt-0.5" />
                  <span>{isVi
                    ? 'Tôi đồng ý cho midCV phân tích CV đã chọn và JD này bằng AI để tạo báo cáo đối sánh. Tôi vẫn có thể nộp đơn nếu không đồng ý.'
                    : 'I agree to AI analysis of this CV against this job. I can still apply without consent.'}</span>
                </label>
                {aiAnalysisConsent && selectedCv && (
                  <button type="button" disabled={isPreviewing || isSubmitting || outcomeUnknown || revisionConflict} onClick={handlePreview}
                    className="rounded-lg border border-blue-300 px-3 py-2 font-semibold text-blue-700 disabled:opacity-50">
                    {isPreviewing ? (isVi ? 'Đang đối sánh...' : 'Matching...') : (isVi ? 'Xem đối sánh tạm trước khi nộp' : 'Preview match before applying')}
                  </button>
                )}
                {previewError && <p role="alert" className="text-rose-700">{previewError}</p>}
                {preview && <div role="status" className="space-y-1 text-slate-700 dark:text-slate-200">
                  <p>{isVi ? 'Điểm Core tạm tính (không gồm GitHub): ' : 'Provisional Core score (excludes GitHub): '}
                    <strong>{(preview.coreScore ?? preview.overallScore) != null && preview.status !== 'INSUFFICIENT_DATA' ? `${Number(preview.coreScore ?? preview.overallScore).toFixed(1)}%` : 'N/A'}</strong></p>
                  <p>{isVi ? 'Trạng thái: ' : 'Status: '}{statusLabel(preview.status, locale)}</p>
                  <p>{isVi ? 'Phương pháp: ' : 'Method: '}{preview.semanticMethod || 'N/A'}</p>
                  {preview.scoringPolicyVersion != null && <p>{isVi ? 'Phiên bản chính sách: ' : 'Policy version: '}{preview.scoringPolicyVersion}</p>}
                  <p>{isVi ? 'Không tạo đơn và không chấm GitHub. Điểm tổng chính thức có thể khác do vector, GitHub và chính sách chấm điểm.' : 'No application or GitHub assessment is created. The final overall score may differ because of vectors, GitHub and scoring policy.'}</p>
                </div>}
              </div>

              {submitError && (
                <div role="alert" className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{submitError}</span>
                </div>
              )}

              {revisionConflict && <button type="button" className="text-sm font-semibold underline" onClick={() => window.location.reload()}>{isVi ? 'Tải lại CV và JD' : 'Reload CV and job'}</button>}
              {outcomeUnknown && <div className="flex flex-wrap gap-3 text-xs">
                <button type="button" disabled={isSubmitting} onClick={() => void checkSubmission()} className="font-semibold underline">{isVi ? 'Kiểm tra lại kết quả nộp' : 'Check submission again'}</button>
                <Link href="/candidate/applications" className="underline">{isVi ? 'Mở danh sách đơn' : 'Open applications'}</Link>
              </div>}
              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 dark:border-[var(--border)] flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-[var(--border)] text-[var(--heading)] dark:text-[var(--text-secondary)] hover:bg-slate-50 dark:hover:bg-[var(--surface)] transition"
                >
                  {t('quickApply.back', 'Quay lại')}
                </button>

                <button
                  type="button"
                  disabled={isSubmitting || isPreviewing || revisionConflict || outcomeUnknown || !candidateCVs?.length || !selectedCv || job.status !== 'PUBLISHED' || isJobExpired(job.applicationDeadline)}
                  onClick={handleConfirmApplication}
                  className="px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary)] transition shadow-xs flex items-center gap-1.5 active:scale-[0.99] cursor-pointer"
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
