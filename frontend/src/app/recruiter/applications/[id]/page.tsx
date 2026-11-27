'use client';

import { statusLabel as aiStateLabel } from '@/lib/statusLabels';

import { AccountAvatar } from '@/components/account/AccountAvatar';
import { APPLICATION_STATUS_LABELS, APPLICATION_TRANSITIONS } from '@/lib/applicationWorkflow';

import React, { Suspense, useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { rankingReturnPath } from '@/lib/navigationIntent';
import {
  MatchInspectionData,
  Application,
  ApplicationStatus,
  ApplicationAuditLogItem
} from '@/types';
import {
  fetchMatchInspection,
  fetchApplicationById,
  updateApplicationStatus,
  fetchApplicationAuditLogs,
  ApiError
} from '@/lib/api';
import { AnimatedModalShell } from '@/components/motion';
import { formatMatchScore, matchPhaseLabels, matchPresentation } from '@/lib/matchPresentation';

import { SubmittedCvViewer } from '@/components/recruiter/SubmittedCvViewer';
import { ScoreBreakdownCard } from '@/components/recruiter/ScoreBreakdownCard';
import { GitHubAssessmentCard } from '@/components/recruiter/GitHubAssessmentCard';
import {
  ArrowLeft,
  ArrowRight,
  Copy,
  Printer,
  FileText,
  GitBranch,
  ShieldCheck,
  Mail,
  Phone,
  ExternalLink,
  History
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { EmptyState } from '@/components/common/EmptyState';

const STATUS_CONFIG: Record<
  ApplicationStatus,
  {
    labelVi: string;
    labelEn: string;
    bg: string;
    text: string;
    border: string;
  }
> = {
  SUBMITTED: {
    labelVi: 'Mới nộp',
    labelEn: 'Submitted',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800'
  },
  REVIEWED: {
    labelVi: 'Đã xem',
    labelEn: 'Reviewed',
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-200 dark:border-indigo-800'
  },
  MATCHED: {
    labelVi: 'Đã đối sánh AI',
    labelEn: 'AI Matched',
    bg: 'bg-cyan-50 dark:bg-cyan-950/40',
    text: 'text-cyan-700 dark:text-cyan-300',
    border: 'border-cyan-200 dark:border-cyan-800'
  },
  SHORTLISTED: {
    labelVi: 'Phù hợp hồ sơ',
    labelEn: 'Shortlisted',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800'
  },
  INTERVIEWING: {
    labelVi: 'Đang phỏng vấn',
    labelEn: 'Interviewing',
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800'
  },
  HIRED: {
    labelVi: 'Đã tuyển dụng',
    labelEn: 'Hired',
    bg: 'bg-green-100 dark:bg-green-950/50',
    text: 'text-green-800 dark:text-green-300',
    border: 'border-green-300 dark:border-green-700'
  },
  REJECTED: {
    labelVi: 'Từ chối',
    labelEn: 'Rejected',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-800'
  },
  UNKNOWN: {
    labelVi: 'Trạng thái chưa xác định',
    labelEn: 'Unknown status',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800'
  }
};

const decisionLabels: Partial<Record<ApplicationStatus, readonly [string, string]>> = {
  REVIEWED: ['Đánh dấu đã xem', 'Mark as reviewed'],
  SHORTLISTED: ['Đưa vào danh sách chọn', 'Shortlist'],
  INTERVIEWING: ['Chuyển sang phỏng vấn', 'Move to interview'],
  HIRED: ['Đánh dấu đã tuyển', 'Mark as hired'],
  REJECTED: ['Từ chối hồ sơ', 'Reject application'],
};

export default function CandidateMatchInspectionPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <Suspense fallback={<p role="status">Loading application…</p>}><CandidateMatchInspection key={id} id={id} /></Suspense>;
}

function CandidateMatchInspection({ id }: { id: string }) {
  const { t, locale } = useLanguage();
  const searchParams = useSearchParams();
  const vi = locale === 'vi';
  const language = vi ? 0 : 1;
  const statusLabel = (status: ApplicationStatus) => APPLICATION_STATUS_LABELS[status][language];

  const [data, setData] = useState<MatchInspectionData | null>(null);
  const [application, setApplication] = useState<Application | null>(null);
  const [decisionError, setDecisionError] = useState<'conflict' | 'failed' | null>(null);
  const [copyState, setCopyState] = useState<'copied' | 'failed' | null>(null);
  const [auditState, setAuditState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [auditRevision, setAuditRevision] = useState(0);
  const [auditLogs, setAuditLogs] = useState<ApplicationAuditLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [inspectionError, setInspectionError] = useState<number | null>(null);
  const [inspectionRevision, setInspectionRevision] = useState(0);
  const [inspectionRetrying, setInspectionRetrying] = useState(false);

  // Decision Modal State
  const [selectedDecision, setSelectedDecision] =
    useState<ApplicationStatus | null>(null);
  const [decisionNote, setDecisionNote] = useState<string>('');
  const [isSubmittingDecision, setIsSubmittingDecision] =
    useState<boolean>(false);

  useEffect(() => {
    let active = true;
    fetchApplicationById(id)
      .then(value => { if (active) setApplication(value); })
      .catch(error => {
        if (active && inspectionRevision === 0) setFetchError(error instanceof Error ? error.message : 'Không tải được hồ sơ.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, inspectionRevision]);

  useEffect(() => {
    let active = true;
    fetchMatchInspection(id)
      .then(value => {
        if (!active) return;
        setData(value);
        setInspectionError(null);
      })
      .catch(error => {
        if (!active) return;
        setData(null);
        setInspectionError(error instanceof ApiError ? error.status : 0);
      })
      .finally(() => { if (active) setInspectionRetrying(false); });
    return () => { active = false; };
  }, [id, inspectionRevision]);

  useEffect(() => {
    let active = true;
    fetchApplicationAuditLogs(id).then(logs => {
      if (!active) return;
      setAuditLogs(logs);
      setAuditState('ready');
    }).catch(() => {
      if (active) setAuditState('error');
    });
    return () => { active = false; };
  }, [id, auditRevision]);

  function reloadAudit() {
    setAuditState('loading');
    setAuditRevision(revision => revision + 1);
  }

  const handleApplyDecision = async (status: ApplicationStatus) => {
    if (!application || isSubmittingDecision || decisionError === 'conflict'
      || !APPLICATION_TRANSITIONS[application.status].includes(status)
      || (application.status === 'REJECTED' && !decisionNote.trim())) return;

    setDecisionError(null);
    setIsSubmittingDecision(true);

    try {
      const updated = await updateApplicationStatus(
        application.id,
        status,
        decisionNote.trim(),
        application.status
      );

      setApplication(current => current ? { ...current, status: updated.status } : current);
      setSelectedDecision(null);
      setDecisionNote('');

      // Reload audit logs
      reloadAudit();
    } catch (err: unknown) {
      setDecisionError(err instanceof ApiError && err.status === 409 ? 'conflict' : 'failed');
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[var(--surface)] text-slate-800 dark:text-slate-100 transition-colors flex items-center justify-center">
        <EmptyState
          type="LOADING"
          title={t(
            'common.loading',
            locale === 'vi'
              ? 'Đang tải dữ liệu hồ sơ...'
              : 'Loading candidate data...'
          )}
          description={
            locale === 'vi'
              ? 'Đang kết nối AI telemetry và trích xuất điểm số đối sánh...'
              : 'Connecting AI telemetry and extracting match scores...'
          }
        />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[var(--surface)] text-slate-800 dark:text-slate-100 transition-colors py-12 px-4 sm:px-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <Link
            href="/recruiter/jobs"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-600 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>
              {locale === 'vi'
                ? 'Quay lại Bảng Xếp Hạng & Quản lý Đơn Nộp'
                : 'Back to Ranking & Applications'}
            </span>
          </Link>
        </div>
        <EmptyState
          type="ERROR"
          title={
            locale === 'vi'
              ? 'Lỗi khi tải báo cáo đối sánh'
              : 'Error loading match report'
          }
          description={fetchError}
          primaryCtaText={locale === 'vi' ? 'Thử lại' : 'Retry'}
          onPrimaryCtaClick={() => window.location.reload()}
        />
      </div>
    );
  }

  if (!data && !application) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[var(--surface)] text-slate-800 dark:text-slate-100 transition-colors py-12 px-4 sm:px-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <Link
            href="/recruiter/jobs"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-600 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>
              {locale === 'vi'
                ? 'Quay lại Bảng Xếp Hạng & Quản lý Đơn Nộp'
                : 'Back to Ranking & Applications'}
            </span>
          </Link>
        </div>
        <EmptyState
          type="EMPTY"
          title={t(
            'emptyStates.match.noMatchDataTitle',
            locale === 'vi'
              ? 'Không tìm thấy dữ liệu đối sánh'
              : 'No match data found'
          )}
          description={t(
            'emptyStates.match.noMatchDataDesc',
            locale === 'vi'
              ? 'Đơn ứng tuyển này chưa được tính toán đối sánh hoặc không tồn tại trong hệ thống.'
              : 'This application has not been evaluated or does not exist.'
          )}
          primaryCtaText={
            locale === 'vi'
              ? 'Quay lại Bảng Xếp Hạng Tuyển Dụng'
              : 'Back to Recruiter Ranking'
          }
          primaryCtaHref="/recruiter/jobs"
        />
      </div>
    );
  }

  const candidateDisplayName = application?.appliedCvFullName ||
    (locale === 'vi' ? 'Không ghi trong CV đã nộp' : 'Not provided in submitted CV');
  const detailAccess = data?.detailAccess === true && application?.proDetailAvailable !== false;
  const classification = data?.matchClassification ?? application?.matchClassification;
  const classificationOnly = !detailAccess && !!classification;
  const classificationLabels: Record<string, string> = locale === 'vi'
    ? { PHU_HOP: 'Phù hợp', CAN_NHAC: 'Cân nhắc', KHONG_PHU_HOP: 'Không phù hợp', CHUA_KHA_DUNG: 'Chưa khả dụng' }
    : { PHU_HOP: 'Suitable', CAN_NHAC: 'Consider', KHONG_PHU_HOP: 'Not suitable', CHUA_KHA_DUNG: 'Unavailable' };

  const currentStatus =
    application?.status ?? 'UNKNOWN';

  const statusCfg =
    STATUS_CONFIG[currentStatus] || STATUS_CONFIG.UNKNOWN;

  const actions = application ? APPLICATION_TRANSITIONS[currentStatus] : [];
  const needsReason = currentStatus === 'REJECTED';
  const decisionLabel = (status: ApplicationStatus) => needsReason && status === 'REVIEWED'
    ? (vi ? 'Mở lại hồ sơ' : 'Reopen application')
    : (decisionLabels[status]?.[language] ?? statusLabel(status));
  const closeDecision = () => {
    if (isSubmittingDecision) return;
    setSelectedDecision(null);
    setDecisionNote('');
    if (decisionError !== 'conflict') setDecisionError(null);
  };

  const { phase, score } = matchPresentation({
    matchScore: detailAccess ? data?.overallScore : null,
    matchStatus: data?.calculationStatus ?? application?.matchStatus,
    aiAnalysisConsent: application?.aiAnalysisConsent,
  });
  const aiNotEligible = application?.aiAnalysisConsent === false || application?.aiProcessingStatus === 'PACKAGE_NOT_ELIGIBLE';
  const inspectionFailed = inspectionError !== null && !aiNotEligible;
  const reportFailed = inspectionFailed;
  const inspectionMessage = inspectionError === 403
    ? (vi ? 'Bạn chưa có quyền xem báo cáo AI này.' : 'You do not have access to this AI report.')
    : inspectionError === 404
      ? (vi ? 'Chưa tìm thấy báo cáo AI cho đơn này.' : 'The AI report was not found for this application.')
      : (vi ? 'Không tải được báo cáo AI. Bạn có thể thử lại.' : 'The AI report could not be loaded. Try again.');
  const matchTitle = aiNotEligible ? (application?.aiAnalysisConsent === false ? (vi ? 'Không đồng ý AI' : 'AI consent declined') : (vi ? 'Không đủ điều kiện AI' : 'AI not eligible')) : reportFailed ? (vi ? 'Chưa tải được báo cáo AI' : 'AI report could not be loaded') : score !== null ? formatMatchScore(score, locale)
    : classificationOnly && classification ? (classificationLabels[classification] ?? classification)
    : matchPhaseLabels[phase][language];
  const matchNote = score !== null ? matchPhaseLabels[phase][language]
    : classificationOnly
      ? (vi ? 'Gói Standard hiển thị phân loại đối sánh.' : 'The Standard plan shows the match classification.')
      : phase === 'FINAL' ? (vi ? 'Điểm chi tiết chưa khả dụng.' : 'The detailed score is unavailable.') : null;
  const requiredSkills = data?.requiredSkillsStatus ?? [];
  const matchedSkillsCount = requiredSkills.filter(skill => skill.status === 'MATCH').length;
  const hasDetailedScore = data && detailAccess && score !== null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[var(--surface)] text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors pb-20 w-full min-w-0">
      <main className="flex-1 w-full max-w-6xl min-w-0 mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        <div className="space-y-5 border-b border-[var(--border-soft)] pb-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href={application?.job?.id ? rankingReturnPath(searchParams.get('returnTo'), application.job.id) ?? `/recruiter/jobs/${application.job.id}/applications` : '/recruiter/jobs'}
              className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] hover:underline"
            >
              <ArrowLeft className="size-4 shrink-0" />
              {application?.job?.id && rankingReturnPath(searchParams.get('returnTo'), application.job.id) ? (vi ? 'Quay lại bảng xếp hạng' : 'Back to ranking') : (vi ? 'Danh sách hồ sơ ứng tuyển' : 'Job applications')}
            </Link>
            <span className="text-xs text-[var(--text-secondary)]">{vi ? 'Hồ sơ' : 'Application'} #{id.slice(0, 8)}</span>
          </div>

          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div className="flex min-w-0 items-center gap-3">
              <AccountAvatar name={candidateDisplayName} avatarId={application?.candidateAvatarId} className="size-12 text-base sm:size-14" />
              <div className="min-w-0 space-y-1">
              <h1 className="break-words text-2xl font-bold text-[var(--heading)] sm:text-3xl">{candidateDisplayName}</h1>
              <p className="break-words text-sm text-[var(--text-secondary)] sm:text-base">
                {application?.submittedJobTitle || data?.jobTitle || application?.job?.title || (vi ? 'Vị trí tuyển dụng' : 'Job opening')}
              </p>
              </div>
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-2 print:hidden">
              {application?.snapshot && <a href="#submitted-cv" className="inline-flex min-h-10 items-center gap-2 px-2 text-sm font-semibold text-[var(--primary)] hover:underline">
                <FileText className="size-4 shrink-0" /> {vi ? 'Xem CV' : 'View CV'}
              </a>}
              <button type="button" onClick={async () => {
                try {
                  await navigator.clipboard.writeText(window.location.href);
                  setCopyState('copied');
                } catch {
                  setCopyState('failed');
                }
              }} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--border)] px-3 text-sm font-semibold text-[var(--heading)]">
                <Copy className="size-4 shrink-0" /> {vi ? 'Sao chép liên kết' : 'Copy link'}
              </button>
              <button type="button" onClick={() => window.print()} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--border)] px-3 text-sm font-semibold text-[var(--heading)]">
                <Printer className="size-4 shrink-0" /> {vi ? 'In hồ sơ' : 'Print application'}
              </button>
            </div>
          </div>
          {copyState && <p role="status" className="text-sm text-[var(--text-secondary)] print:hidden">
            {copyState === 'copied'
              ? (vi ? 'Đã sao chép. Người nhận cần quyền xem hồ sơ.' : 'Link copied. The recipient needs access to this application.')
              : (vi ? 'Hãy sao chép liên kết trên thanh địa chỉ.' : 'Copy the link from the address bar.')}
          </p>}
        </div>

        <div className="grid min-w-0 gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <section className="min-w-0 space-y-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-[var(--text-secondary)]">{vi ? 'Đối sánh với vị trí' : 'Job match'}</h2>
            <p className="break-words text-xl font-bold text-[var(--heading)] sm:text-2xl">{matchTitle}</p>
            {reportFailed && <p role="alert" className="text-sm text-amber-700 dark:text-amber-300">{inspectionMessage} {inspectionError !== 403 && <button type="button" disabled={inspectionRetrying} className="underline disabled:opacity-50" onClick={() => { setInspectionRetrying(true); setInspectionRevision(value => value + 1); }}>{inspectionRetrying ? (vi ? 'Đang tải…' : 'Loading…') : (vi ? 'Thử lại' : 'Retry')}</button>}</p>}
            {!reportFailed && !aiNotEligible && matchNote && <p className="text-sm text-[var(--text-secondary)]">{matchNote}</p>}
            {!aiNotEligible && application?.aiProcessingStatus?.startsWith('AI_') && <p className="text-sm text-[var(--text-secondary)]" role="status">{aiStateLabel(application.aiProcessingStatus, locale)} <button type="button" className="underline" disabled={inspectionRetrying} onClick={() => { setInspectionRetrying(true); setInspectionRevision(value => value + 1); }}>{vi ? 'Cập nhật báo cáo' : 'Refresh report'}</button></p>}
            {hasDetailedScore && score !== null && (
              <meter className="block h-2 w-full accent-[var(--primary)]" min={0} max={100}
                value={Math.min(100, Math.max(0, score))} aria-label={vi ? 'Điểm đối sánh' : 'Match score'} />
            )}
          </section>

          <section className="min-w-0 space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-[var(--text-secondary)]">{vi ? 'Trạng thái hồ sơ' : 'Application status'}</h2>
              <span role="status" className={`rounded-lg border px-2.5 py-1 text-xs font-bold ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}>
                {statusLabel(currentStatus)}
              </span>
            </div>

            <div className="print:hidden">
              {actions.length > 0 ? (
                <>
                  <p className="mb-2 text-sm text-[var(--text-secondary)]">{vi ? 'Bước xử lý tiếp theo' : 'Next actions'}</p>
                  <div className="flex flex-wrap gap-2">
                    {actions.map((status, index) => (
                      <button key={status} type="button"
                        onClick={() => {
                          setDecisionError(null);
                          setDecisionNote('');
                          setSelectedDecision(status);
                        }}
                        disabled={decisionError === 'conflict'}
                        className={`inline-flex min-h-10 max-w-full items-center gap-1.5 rounded-lg border px-3 py-2 text-left text-sm font-semibold disabled:opacity-60 ${status === 'REJECTED'
                          ? 'border-[var(--border-soft)] text-[var(--danger)]'
                          : index === 0 ? 'border-[var(--primary)] bg-[var(--primary)] text-white' : 'border-[var(--border-soft)] text-[var(--heading)]'}`}
                      >
                        {decisionLabel(status)}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-[var(--text-secondary)]">
                  {application ? (vi ? 'Hồ sơ hiện không có bước chuyển tiếp.' : 'No next action is available for this status.')
                    : (vi ? 'Chưa có dữ liệu hồ sơ để chuyển vòng.' : 'Application data is unavailable for stage changes.')}
                </p>
              )}
              {decisionError === 'conflict' && !selectedDecision && (
                <button type="button" className="mt-2 text-sm font-semibold underline" onClick={() => window.location.reload()}>
                  {vi ? 'Tải lại hồ sơ để tiếp tục' : 'Reload the application to continue'}
                </button>
              )}
            </div>
          </section>
        </div>

        <AnimatedModalShell isOpen={selectedDecision !== null} onRequestClose={closeDecision}
          titleId="recruiter-decision-title" descriptionId="recruiter-decision-description"
          overlayClassName="print:hidden"
          panelClassName="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xl sm:p-6">
          {selectedDecision && (
            <form className="space-y-4" onSubmit={event => {
              event.preventDefault();
              void handleApplyDecision(selectedDecision);
            }}>
              <div className="space-y-2">
                <h2 id="recruiter-decision-title" className="text-xl font-bold text-[var(--heading)]">
                  {decisionLabel(selectedDecision)}
                </h2>
                <p id="recruiter-decision-description" className="break-words text-sm text-[var(--text-secondary)]">{candidateDisplayName}</p>
                <p className="flex flex-wrap items-center gap-2 rounded-lg bg-[var(--surface-secondary)] p-3 text-sm text-[var(--heading)]">
                  <span>{statusLabel(currentStatus)}</span>
                  <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
                  <strong>{statusLabel(selectedDecision)}</strong>
                </p>
              </div>

              <label className="block space-y-2 text-sm font-semibold text-[var(--heading)]">
                <span>{needsReason ? (vi ? 'Lý do mở lại hồ sơ' : 'Reason for reopening')
                  : (vi ? 'Ghi chú nội bộ (tùy chọn)' : 'Internal note (optional)')}</span>
                <textarea rows={3} data-autofocus="true" required={needsReason} value={decisionNote}
                  disabled={isSubmittingDecision || decisionError === 'conflict'}
                  onChange={event => setDecisionNote(event.target.value)}
                  className="block w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm"
                />
              </label>

              {decisionError && (
                <div role="alert" className="space-y-2 rounded-lg bg-[var(--danger-bg)] p-3 text-sm text-[var(--heading)]">
                  <p>{decisionError === 'conflict'
                    ? (vi ? 'Trạng thái đã thay đổi ở nơi khác. Hãy tải lại hồ sơ trước khi tiếp tục.' : 'The status changed elsewhere. Reload the application before continuing.')
                    : (vi ? 'Chưa lưu được quyết định. Bạn có thể thử lại.' : 'Could not save the decision. Try again.')}</p>
                  {decisionError === 'conflict' && <button type="button" className="font-semibold underline" onClick={() => window.location.reload()}>
                    {vi ? 'Tải lại hồ sơ' : 'Reload application'}
                  </button>}
                </div>
              )}

              <div className="flex flex-wrap justify-end gap-2">
                <button type="button" onClick={closeDecision} disabled={isSubmittingDecision}
                  className="min-h-10 rounded-lg border border-[var(--border-soft)] px-4 py-2 text-sm font-semibold text-[var(--heading)]">
                  {vi ? 'Hủy' : 'Cancel'}
                </button>
                <button type="submit" disabled={isSubmittingDecision || decisionError === 'conflict' || (needsReason && !decisionNote.trim())}
                  className={`min-h-10 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${selectedDecision === 'REJECTED' ? 'bg-rose-700' : 'bg-[var(--primary)]'}`}>
                  {isSubmittingDecision ? (vi ? 'Đang lưu…' : 'Saving…') : (vi ? 'Xác nhận' : 'Confirm')}
                </button>
              </div>
            </form>
          )}
        </AnimatedModalShell>

        {/* Real Candidate Contact & Profile Card */}
        <div className="bg-white dark:bg-[var(--surface)] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {locale === 'vi'
                  ? 'Thông tin từ CV đã nộp'
                  : 'Submitted CV contact information'}
              </h3>
            </div>
            <span className="text-[11px] font-sans text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-2.5 py-0.5 rounded-xl font-semibold">
              {locale === 'vi'
                ? 'Snapshot CV tại thời điểm ứng tuyển'
                : 'CV snapshot at application time'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-slate-400 block mb-0.5">
                {locale === 'vi' ? 'Họ và tên:' : 'Full Name:'}
              </span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {candidateDisplayName}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">
                {locale === 'vi' ? 'Email liên hệ:' : 'Email Address:'}
              </span>
              <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 shrink-0 text-blue-500" />
                <span className="min-w-0 break-all font-sans">
                  {application?.appliedCvEmail ||
                    (locale === 'vi'
                      ? 'Chưa cung cấp email'
                      : 'Email not provided')}
                </span>
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">
                {locale === 'vi' ? 'Số điện thoại:' : 'Phone Number:'}
              </span>
              <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-emerald-500" />
                <span className="font-sans">
                  {application?.appliedCvPhone ||
                    (locale === 'vi'
                      ? 'Chưa cập nhật SĐT'
                      : 'Not provided')}
                </span>
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">
                {locale === 'vi'
                  ? 'Tài khoản GitHub:'
                  : 'GitHub Profile:'}
              </span>
              {application?.appliedCvGithubUrl ? (
                <a
                  href={
                    application.appliedCvGithubUrl.startsWith('http')
                      ? application.appliedCvGithubUrl
                      : `https://${application.appliedCvGithubUrl}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <GitBranch className="w-3.5 h-3.5" />
                  <span>
                    {application.appliedCvGithubUrl.replace('https://github.com/', '')}
                  </span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <span className="text-slate-400 italic">
                  {locale === 'vi' ? 'Chưa liên kết' : 'Not connected'}
                </span>
              )}
            </div>
          </div>
        </div>

        {hasDetailedScore && (
          <>
            <section className="min-w-0 space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6">
              <h2 className="text-base font-bold text-[var(--heading)]">{vi ? 'Giải thích kết quả đối sánh' : 'Match explanation'}</h2>
              {data.humanReadableExplanation && <p className="break-words whitespace-pre-line text-sm leading-relaxed text-[var(--text-secondary)]">{data.humanReadableExplanation}</p>}
              {requiredSkills.length > 0 && <p className="text-sm text-[var(--text-secondary)]">
                <strong className="text-[var(--heading)]">{matchedSkillsCount}/{requiredSkills.length}</strong>{' '}
                {vi ? 'kỹ năng bắt buộc phù hợp' : 'required skills matched'}
              </p>}
            </section>
            <ScoreBreakdownCard data={data} />
            <GitHubAssessmentCard assessment={data.githubAssessment} />
          </>
        )}

        {/* Audit Log / Lịch sử Xét duyệt */}
        <div className="bg-white dark:bg-[var(--surface)] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <History className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {locale === 'vi'
                ? 'Lịch sử xét duyệt'
                : 'Application Decision History & Audit Trail'}
            </h3>
          </div>

          {auditState === 'loading' ? (
            <p>{locale === 'vi' ? 'Đang tải lịch sử…' : 'Loading history…'}</p>
          ) : auditState === 'error' ? (
            <div role="alert">
              {locale === 'vi' ? 'Chưa tải được lịch sử.' : 'Could not load decision history.'}{' '}
              <button type="button" className="underline" onClick={reloadAudit}>{locale === 'vi' ? 'Thử lại' : 'Retry'}</button>
            </div>
          ) : auditLogs.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-2">
              {locale === 'vi'
                ? 'Chưa có lượt chuyển trạng thái nào được ghi nhận.'
                : 'No status transitions recorded yet.'}
            </p>
          ) : (
            <div className="space-y-3">
              {auditLogs.map((log) => {
                const prevCfg =
                  STATUS_CONFIG[log.previousStatus] || STATUS_CONFIG.UNKNOWN;
                const newCfg =
                  STATUS_CONFIG[log.newStatus] || STATUS_CONFIG.UNKNOWN;

                return (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-sans font-semibold ${prevCfg.bg} ${prevCfg.text}`}
                        >
                          {locale === 'vi'
                            ? prevCfg.labelVi
                            : prevCfg.labelEn}
                        </span>
                        <span className="text-slate-400">→</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-sans font-bold ${newCfg.bg} ${newCfg.text}`}
                        >
                          {locale === 'vi'
                            ? newCfg.labelVi
                            : newCfg.labelEn}
                        </span>
                      </div>
                      {log.decisionNote && (
                        <p className="text-slate-700 dark:text-slate-300 italic pt-0.5">
                          &ldquo;{log.decisionNote}&rdquo;
                        </p>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 font-sans flex-shrink-0">
                      {log.createdAt
                        ? new Date(log.createdAt).toLocaleString(
                            locale === 'vi' ? 'vi-VN' : 'en-US'
                          )
                        : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {application?.snapshot && (
          <SubmittedCvViewer applicationId={id} snapshot={application.snapshot} locale={locale} />
        )}
      </main>
    </div>
  );
}
