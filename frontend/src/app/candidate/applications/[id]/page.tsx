'use client';

import Link from 'next/link';
import { use, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { formatMatchScore, matchPhaseLabels, matchPresentation } from '@/lib/matchPresentation';
import { statusLabel } from '@/lib/statusLabels';
import { ApiError } from '@/lib/api';
import {
  fetchCandidateApplicationDetail, fetchCandidateApplicationHistory, fetchCandidateSkillGap,
  type CandidateApplicationDetail, type CandidateApplicationHistory, type CandidateSkillGap,
} from '@/lib/candidateApplication';

const surface = 'min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6';
const button = 'inline-flex rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-semibold text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-[var(--primary)]';
const muted = 'text-sm text-[var(--text-secondary)]';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className={`${surface} space-y-3`}><h2 className="text-xl font-semibold">{title}</h2>{children}</section>;
}

const gapLabels: Record<string, readonly [string, string]> = {
  MET: ['Có trong danh sách CV', 'Listed in the CV'],
  MISSING_MANDATORY: ['Thiếu kỹ năng bắt buộc', 'Missing required skill'],
  MISSING_PREFERRED: ['Thiếu kỹ năng ưu tiên', 'Missing preferred skill'],
  RELATED_TO_LEARN: ['Kỹ năng liên quan nên học', 'Related skill to learn'],
  EVIDENCE_MISSING: ['Chưa có minh chứng', 'Evidence unavailable'],
};

export default function CandidateApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  return <ApplicationDetail key={JSON.stringify([id, user?.id])} id={id} />;
}

function ApplicationDetail({ id }: { id: string }) {
  const { locale } = useLanguage();
  const vi = locale === 'vi';
  const copy = (a: string, b: string) => vi ? a : b;
  const [detail, setDetail] = useState<CandidateApplicationDetail | null>(null);
  const [detailError, setDetailError] = useState<number | null>(null);
  const [detailAttempt, setDetailAttempt] = useState(0);
  const [history, setHistory] = useState<CandidateApplicationHistory | null>(null);
  const [historyFailed, setHistoryFailed] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyPage, setHistoryPage] = useState(0);
  const [historyAttempt, setHistoryAttempt] = useState(0);
  const [gapByLocale, setGapByLocale] = useState<Partial<Record<typeof locale, CandidateSkillGap | 'loading' | 'error'>>>({});
  const gapRequests = useRef<Partial<Record<'vi' | 'en', number>>>({});
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const gap = gapByLocale[locale];
  const gapState = gap === undefined ? 'idle' : typeof gap === 'string' ? gap : 'ready';

  useEffect(() => {
    let active = true;
    fetchCandidateApplicationDetail(id).then(value => { if (active) setDetail(value); })
      .catch(error => { if (active) setDetailError(error instanceof ApiError ? error.status : 0); });
    return () => { active = false; };
  }, [id, detailAttempt]);

  useEffect(() => {
    if (!detail) return;
    let active = true;
    fetchCandidateApplicationHistory(id, historyPage).then(value => {
      if (active) setHistory(value);
    }).catch(() => { if (active) setHistoryFailed(true); })
      .finally(() => { if (active) setHistoryLoading(false); });
    return () => { active = false; };
  }, [detail, id, historyPage, historyAttempt]);

  const loadGap = async () => {
    const generation = (gapRequests.current[locale] ?? 0) + 1;
    gapRequests.current[locale] = generation;
    setGapByLocale(previous => ({ ...previous, [locale]: 'loading' }));
    try {
      const result = await fetchCandidateSkillGap(id, locale);
      if (mounted.current && gapRequests.current[locale] === generation) setGapByLocale(previous => ({ ...previous, [locale]: result }));
    } catch {
      if (mounted.current && gapRequests.current[locale] === generation) setGapByLocale(previous => ({ ...previous, [locale]: 'error' }));
    }
  };

  const date = (value: string) => new Intl.DateTimeFormat(vi ? 'vi-VN' : 'en-US', {
    dateStyle: 'medium', timeStyle: 'short',
  }).format(new Date(value));
  const match = detail && matchPresentation({
    matchScore: detail.matchScore, matchStatus: detail.matchStatus, aiAnalysisConsent: detail.aiConsent,
  });
  const retry = copy('Thử lại', 'Retry');

  return (
    <main className="mx-auto w-full max-w-5xl space-y-5 px-4 py-8 text-[var(--heading)]">
      <Link href="/candidate/applications" className={button}>{copy('Về danh sách đơn', 'Back to applications')}</Link>
      {detailError !== null && <div role="alert" className={surface}>
        <p>{detailError === 404 ? copy('Không tìm thấy đơn ứng tuyển.', 'Application not found.') : copy('Chưa tải được đơn ứng tuyển.', 'Could not load the application.')}</p>
        {detailError !== 404 && <button className={`${button} mt-3`} onClick={() => {
          setDetailError(null); setDetailAttempt(previous => previous + 1);
        }}>{retry}</button>}
      </div>}
      {!detail && detailError === null && <p role="status">{copy('Đang tải đơn ứng tuyển…', 'Loading application…')}</p>}
      {detail && <>
        <header className={`${surface} space-y-2`}>
          <h1 className="break-words text-2xl font-bold sm:text-3xl">{detail.job.title || copy('Đơn ứng tuyển', 'Application')}</h1>
          {detail.job.companyName && <p>{detail.job.companyName}</p>}
          <p className={`${muted} break-all`}>{copy('Mã đơn', 'Application ID')} · {detail.id}</p>
          <p>{copy('Ngày nộp', 'Submitted on')} · {date(detail.appliedAt)}</p>
          <p>{copy('Trạng thái hiện tại', 'Current status')} · <strong>{statusLabel(detail.status, locale)}</strong></p>
        </header>

        <Section title={copy('CV đã nộp', 'Submitted CV')}>
          {detail.cv ? <>
            <p className="break-words font-semibold">{detail.cv.title}{detail.cv.version !== null && ` · v${detail.cv.version}`}</p>
            <p className={muted}>{copy('Bản lưu khi nộp đơn', 'Snapshot saved when you applied')}
              {detail.cv.capturedAt && ` · ${date(detail.cv.capturedAt)}`}</p>
            {detail.cv.skillListAvailable && <p className="break-words text-sm">
              {copy('Kỹ năng đã khai báo', 'Declared skills')} · {detail.cv.declaredSkills.join(', ') || copy('Chưa có', 'None')}
            </p>}
            {detail.cv.reviewedText && <details>
              <summary className="cursor-pointer text-[var(--primary)]">{copy('Xem nội dung chuyên môn đã xác nhận', 'View confirmed professional content')}</summary>
              <pre className={`${muted} mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-words font-sans`}>{detail.cv.reviewedText}</pre>
            </details>}
            {detail.cv.rawText && <details>
              <summary className="cursor-pointer text-[var(--primary)]">{copy('Xem văn bản CV gốc đã lưu', 'View saved original CV text')}</summary>
              <pre className={`${muted} mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-words font-sans`}>{detail.cv.rawText}</pre>
            </details>}
          </> : <p className={muted}>{copy('Đơn này thiếu bản lưu CV.', 'The CV snapshot is unavailable.')}</p>}
          {detail.coverLetter && <details><summary className="cursor-pointer">{copy('Thư ứng tuyển đã nộp', 'Submitted cover letter')}</summary>
            <p className="mt-2 whitespace-pre-wrap break-words">{detail.coverLetter}</p></details>}
        </Section>

        <Section title={copy('Lịch sử trạng thái', 'Status history')}>
          {historyLoading && <p role="status">{copy('Đang tải lịch sử…', 'Loading history…')}</p>}
          {historyFailed && <div role="alert">
            <p>{copy('Chưa tải được lịch sử.', 'Could not load the history.')}</p>
            <button className={button} onClick={() => {
              setHistoryFailed(false); setHistoryLoading(true); setHistoryAttempt(previous => previous + 1);
            }}>{retry}</button>
          </div>}
          {history && !historyFailed && !historyLoading && <>
            <ol className="space-y-2 text-sm">
              {history.items.map((row, index) => <li key={`${row.at}-${index}`}>
                <time>{date(row.at)}</time> · {row.from && `${statusLabel(row.from, locale)} → `}{statusLabel(row.to, locale)}
              </li>)}
              {!history.hasNext && <li><time>{date(detail.appliedAt)}</time> · {statusLabel('SUBMITTED', locale)}</li>}
            </ol>
            <div className="flex flex-wrap gap-2">
              {history.page > 0 && <button className={button} onClick={() => {
                setHistoryLoading(true); setHistoryPage(history.page - 1);
              }}>{copy('Trang mới hơn', 'Newer')}</button>}
              {history.hasNext && <button className={button} onClick={() => {
                setHistoryLoading(true); setHistoryPage(history.page + 1);
              }}>{copy('Trang cũ hơn', 'Older')}</button>}
            </div>
          </>}
        </Section>

        <Section title={copy('Đối sánh và lộ trình kỹ năng', 'Match and skills roadmap')}>
          <p>{detail.aiConsent === true ? copy('Bạn đã đồng ý phân tích bằng AI.', 'You consented to AI analysis.')
            : detail.aiConsent === false ? copy('Bạn đã nộp đơn với lựa chọn không phân tích AI.', 'You applied without AI analysis.')
              : copy('Chưa có thông tin về lựa chọn AI.', 'Your AI preference is unavailable.')}</p>
          {detail.aiConsent === true && match && <p className={muted}>
            {matchPhaseLabels[match.phase][vi ? 0 : 1]}
            {match.score !== null && ` · ${formatMatchScore(match.score, locale)}`}
          </p>}
          {detail.pinnedJd && <p className={muted}>{copy('JD tại thời điểm nộp', 'JD used at submission')} · {detail.pinnedJd.title} · v{detail.pinnedJd.version}</p>}
          {detail.skillGapAvailable ? <>
            <p className={muted}>{copy(
              'Nguồn đối chiếu gồm kỹ năng khai báo trong bản CV đã nộp và yêu cầu của JD đã lưu. Lộ trình mang tính tham khảo. Số năm kinh nghiệm, chứng chỉ và GitHub nằm ngoài phạm vi đánh giá này.',
              'This comparison uses skills declared in the submitted CV and the saved JD requirements. The roadmap is guidance. Experience duration, certificates and GitHub are outside its scope.',
            )}</p>
            {gapState !== 'ready' && <button className={button} disabled={gapState === 'loading'} onClick={loadGap}>
              {gapState === 'loading' ? copy('Đang tải lộ trình…', 'Loading roadmap…') : gapState === 'error' ? retry : copy('Xem chênh lệch kỹ năng và lộ trình', 'View skill gaps and roadmap')}
            </button>}
            {gapState === 'error' && <p role="alert">{copy('Chưa tải được lộ trình. Bạn có thể thử lại.', 'Could not load the roadmap. You can retry.')}</p>}
            {gap && typeof gap !== 'string' && <>
              <ul className="divide-y divide-[var(--border)]">
                {gap.gap_breakdown.map((item, index) => <li className="flex flex-wrap justify-between gap-2 py-2 text-sm" key={`${item.skill_name}-${index}`}>
                  <strong>{item.skill_name}</strong><span>{gapLabels[item.category]?.[vi ? 0 : 1] || copy('Chưa phân loại', 'Unclassified')}</span>
                </li>)}
              </ul>
              {gap.tailored_roadmap.length === 0 && <p className={muted}>{copy('Chưa có bước học được đề xuất.', 'No learning steps were suggested.')}</p>}
              <ol className="space-y-3">
                {gap.tailored_roadmap.map(step => <li key={step.milestone_number} className={surface}>
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className={muted}>{step.target_skills.join(', ')} · {step.estimated_weeks} {copy('tuần (ước tính)', 'weeks (estimated)')}</p>
                  <ul className="ml-5 list-disc text-sm">{step.learning_objectives.map((objective, index) => <li key={index}>{objective}</li>)}</ul>
                  <p className="mt-2 text-sm">{step.practice_project}</p>
                </li>)}
              </ol>
            </>}
          </> : detail.aiConsent === true && <p className={muted}>{copy('Bản CV hoặc JD đã lưu thiếu dữ liệu kỹ năng để tạo lộ trình.', 'The saved CV or JD lacks the skill data needed for a roadmap.')}</p>}
        </Section>
      </>}
    </main>
  );
}
