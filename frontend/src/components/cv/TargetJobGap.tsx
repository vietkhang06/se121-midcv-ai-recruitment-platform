'use client';
import React, { useEffect, useRef, useState } from 'react';
import { apiRequest, fetchCandidateCVs } from '@/lib/api';
import type { CV } from '@/types';
import { useLanguage } from '@/context/LanguageContext';

type Gap = {
  cv_version_id: string; job_id: string; evidence_assessment: string;
  gap_breakdown: { skill_name: string; category: string; reason?: string }[];
  tailored_roadmap: { milestone_number: number; title: string; target_skills: string[]; estimated_weeks: number; practice_project: string }[];
};
export function TargetJobGap({ jobId }: { jobId: string }) {
  const vi = useLanguage().locale === 'vi';
  const [cvs, setCvs] = useState<CV[]>([]);
  const [cvId, setCvId] = useState('');
  const [result, setResult] = useState<Gap | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const request = useRef<AbortController | null>(null);
  useEffect(() => {
    let active = true;
    fetchCandidateCVs().then(rows => { if (active) setCvs(rows.filter(row => row.status === 'CONFIRMED')); })
      .catch(() => { if (active) setError(vi ? 'Không tải được danh sách CV. Hãy tải lại trang.' : 'Could not load CVs. Reload this page.'); });
    return () => { active = false; request.current?.abort(); };
  }, [jobId, vi]);
  const analyze = async () => {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setBusy(true); setError(''); setResult(null);
    try {
      const response = await apiRequest<{ data: Gap }>(`/api/v1/candidate/match/${jobId}/gap-analysis?cvId=${encodeURIComponent(cvId)}`, { signal: controller.signal });
      if (!controller.signal.aborted) setResult(response.data);
    } catch (error) { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Could not analyze skill gaps.'); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  };
  const labels: Record<string, string> = vi ? {
    MET: 'Đã đáp ứng', MISSING_MANDATORY: 'Thiếu bắt buộc', MISSING_PREFERRED: 'Thiếu ưu tiên',
    RELATED_TO_LEARN: 'Liên quan nên học', EVIDENCE_MISSING: 'Thiếu minh chứng',
  } : { MET: 'Met', MISSING_MANDATORY: 'Missing required', MISSING_PREFERRED: 'Missing preferred', RELATED_TO_LEARN: 'Related to learn', EVIDENCE_MISSING: 'Missing evidence' };
  return <section aria-label={vi ? 'Khoảng cách kỹ năng theo JD' : 'Target job skill gaps'} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
    <h2 className="text-lg font-semibold">{vi ? 'Khoảng cách kỹ năng và lộ trình học' : 'Skill gaps and learning roadmap'}</h2>
    <p className="text-sm text-slate-600 dark:text-slate-300">{vi ? 'Chọn CV đã xác nhận để xem hướng cải thiện cho công việc này. Gợi ý không tự thêm vào CV.' : 'Select a confirmed CV to review guidance for this job. Guidance does not change your CV.'}</p>
    <div className="flex flex-wrap items-center gap-3">
      <label className="min-w-0 flex-1 text-sm">CV<select value={cvId} onChange={event => { request.current?.abort(); setBusy(false); setCvId(event.target.value); setResult(null); }} className="ml-2 max-w-full rounded-xl border border-slate-300 bg-white p-2 text-slate-900">
        <option value="">{vi ? 'Chọn CV đã xác nhận' : 'Select confirmed CV'}</option>{cvs.map(cv => <option key={cv.id} value={cv.id}>{cv.title}</option>)}
      </select></label>
      <button type="button" disabled={!cvId || busy} onClick={analyze} className="min-h-10 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? (vi ? 'Đang phân tích…' : 'Analyzing…') : (vi ? 'Phân tích / Thử lại' : 'Analyze / Retry')}</button>
    </div>
    {!cvs.length && <p className="text-sm">{vi ? 'Cần lưu và xác nhận CV trước khi phân tích.' : 'Save and confirm a CV before analyzing.'}</p>}
    {error && <p role="alert" className="break-words text-sm text-red-700 dark:text-red-300">{error}</p>}
    {result && <div className="space-y-4">
      <p className="break-all text-xs text-slate-500">{vi ? 'Phiên bản CV' : 'CV version'}: {result.cv_version_id}</p>
      {Object.entries(labels).map(([category, label]) => <div key={category}><h3 className="text-sm font-semibold">{label}</h3><p className="mt-1 break-words text-sm">{result.gap_breakdown.filter(item => item.category === category).map(item => item.skill_name).join(', ') || (vi ? 'Không có' : 'None')}</p></div>)}
      {result.evidence_assessment === 'NOT_REQUESTED' && <p className="text-xs text-slate-500">{vi ? 'Phân tích này chưa kiểm tra minh chứng độc lập.' : 'Independent evidence was not assessed in this analysis.'}</p>}
      {result.tailored_roadmap.map(item => <article key={item.milestone_number} className="border-t border-slate-200 pt-3"><h3 className="break-words text-sm font-semibold">{item.title}</h3><p className="mt-1 text-xs">{vi ? 'Ước tính' : 'Estimate'}: {item.estimated_weeks} {vi ? 'tuần' : 'weeks'}</p><p className="mt-2 break-words text-sm">{item.practice_project}</p></article>)}
    </div>}
  </section>;
}
