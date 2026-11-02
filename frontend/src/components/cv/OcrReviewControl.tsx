'use client';

import React, { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import type { CVDraftData } from '@/types';

type Proposal = { source_sha256: string; provider: string; model: string; edits: { start: number; end: number; before: string; after: string }[] };
export function OcrReviewControl({ cvId, draft, disabled, onRevision, onApplied }: {
  cvId: string; draft: CVDraftData; disabled: boolean;
  onRevision: (revision: string) => void; onApplied: () => Promise<void>;
}) {
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const active = React.useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const propose = async () => {
    setBusy(true); setError(''); setProposal(null);
    try {
      const result = await apiRequest<{ data: { proposal: Proposal; revision: string } }>(`/api/v1/candidate/cvs/${cvId}/ocr-review`, {
        method: 'POST', body: JSON.stringify({ version_id: draft.version_id, expected_revision: draft.revision }),
      });
      if (!active.current) return;
      setProposal(result.data.proposal); setSelected([]); onRevision(result.data.revision);
    } catch (error) { if (active.current) setError(error instanceof Error ? error.message : 'Không thể lấy đề xuất OCR.'); }
    finally { if (active.current) setBusy(false); }
  };
  const apply = async () => {
    if (!window.confirm('Áp dụng các sửa OCR đã chọn vào phần mô tả trong bản nháp? CV gốc, văn bản thô, thẻ thông tin và dữ liệu liên hệ được giữ nguyên.')) return;
    setBusy(true); setError('');
    try {
      await apiRequest(`/api/v1/candidate/cvs/${cvId}/ocr-review/apply`, { method: 'POST', body: JSON.stringify({
        version_id: draft.version_id, expected_revision: draft.revision, accepted_indices: selected, confirmed: true,
      }) });
      if (active.current) { setProposal(null); await onApplied(); }
    } catch (error) { if (active.current) setError(error instanceof Error ? error.message : 'Không thể áp dụng đề xuất.'); }
    finally { if (active.current) setBusy(false); }
  };
  return <section aria-label="Rà soát lỗi OCR" className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-[var(--border)] dark:bg-[var(--surface)]">
    <p className="text-sm">Đề xuất sửa lỗi OCR cần bạn duyệt từng thay đổi. Văn bản trích xuất gốc luôn được giữ nguyên.</p>
    <button type="button" disabled={disabled || busy} onClick={propose} className="min-h-10 rounded-xl border border-slate-300 px-3 py-2 text-sm disabled:opacity-50">{busy ? 'Đang xử lý…' : 'Đề xuất sửa lỗi OCR'}</button>
    {error && <p role="alert" className="break-words text-sm text-red-700 dark:text-red-300">{error}</p>}
    {proposal && <>
      <p className="break-all text-xs text-slate-500">{proposal.provider} · {proposal.model} · SHA-256: {proposal.source_sha256}</p>
      {proposal.edits.length === 0 && <p role="status" className="text-sm">Không có sửa đổi đủ chắc chắn để đề xuất.</p>}
      {proposal.edits.map((edit, index) => <label key={index} className="flex items-start gap-3 break-words text-sm">
        <input type="checkbox" disabled={busy || disabled} checked={selected.includes(index)} onChange={event => setSelected(values => event.target.checked ? [...values, index] : values.filter(value => value !== index))}/>
        <span><del>{edit.before}</del> → <ins>{edit.after}</ins> <span className="text-xs text-slate-500">[{edit.start}, {edit.end})</span></span>
      </label>)}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={apply} disabled={busy || disabled || !selected.length} className="min-h-10 rounded-xl bg-blue-700 px-3 py-2 text-sm text-white disabled:opacity-50">Xác nhận và dùng các sửa đã chọn</button>
        <button type="button" disabled={busy} onClick={() => { setProposal(null); setSelected([]); }} className="min-h-10 rounded-xl border border-slate-300 px-3 py-2 text-sm">Bỏ qua đề xuất</button>
      </div>
    </>}
  </section>;
}
