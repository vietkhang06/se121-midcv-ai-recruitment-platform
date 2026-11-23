'use client';

import { AccountAvatar } from '@/components/account/AccountAvatar';
import { formatMatchScore } from '@/lib/matchPresentation';
import React from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { CandidateRankingItem } from '@/types';
import { X } from 'lucide-react';
import { AnimatedModalShell, staggerDelay } from '@/components/motion';

interface CandidateCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: CandidateRankingItem[];
}

export const CandidateCompareModal: React.FC<CandidateCompareModalProps> = ({
  isOpen,
  onClose,
  candidates
}) => {
  const { locale } = useLanguage();
  const vi = locale === 'vi';
  if (candidates.length === 0) return null;

  return (
    <AnimatedModalShell
      isOpen={isOpen}
      onRequestClose={onClose}
      titleId="candidate-compare-title"
      descriptionId="candidate-compare-description"
      testId="candidate-compare-modal"
      panelClassName="relative max-h-[90dvh] w-full max-w-4xl space-y-5 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-[var(--heading)] shadow-xl sm:p-6"
    >
        <button
          onClick={onClose}
          data-autofocus="true"
          aria-label={vi ? 'Đóng so sánh ứng viên' : 'Close candidate comparison'}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-[var(--text-secondary)] hover:text-[var(--heading)] hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-1 border-b border-[var(--border)] pb-3 pr-9">
          <h3 id="candidate-compare-title" className="text-xl font-bold text-[var(--heading)]">{vi ? 'So sánh ứng viên' : 'Compare candidates'}</h3>
          <p id="candidate-compare-description" className="text-xs text-[var(--text-secondary)]">{vi ? 'Điểm đối sánh, kỹ năng bắt buộc và kinh nghiệm liên quan.' : 'Match scores, required skills and relevant experience.'}</p>
        </div>

        {/* Side-by-Side Grid */}
        <div className={`grid gap-4 ${candidates.length === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
          {candidates.map((cand, idx) => (
            <div key={cand.applicationId} className="animate-fade-in bg-[var(--surface-secondary)] border border-[var(--border)] rounded-xl p-5 space-y-4 text-xs" style={{ animationDelay: `${staggerDelay(idx)}ms` }}>
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                <AccountAvatar name={cand.candidateName} avatarId={cand.candidateAvatarId} className="size-9 text-xs" />
                <div className="mr-auto min-w-0 px-2">
                  <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)]">{vi ? 'Ứng viên' : 'Candidate'} #{idx + 1}</span>
                  <h4 className="text-base font-bold text-[var(--heading)]">{cand.candidateName}</h4>
                  <p className="text-[var(--text-secondary)] text-[11px]">{cand.headline}</p>
                </div>
                <span className="px-2.5 py-1 rounded-xl text-xs font-extrabold bg-indigo-950 text-indigo-300 border border-indigo-500/40">
                  {vi ? 'Hạng' : 'Rank'} #{cand.rank}
                </span>
              </div>

              {/* Scores Grid */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
                  <span className="text-[10px] text-[var(--text-secondary)] block">{vi ? 'Tổng thể' : 'Overall'}</span>
                  <span className="font-bold text-sm text-[var(--primary)]">{formatMatchScore(cand.overallMatchScore, locale)}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
                  <span className="text-[10px] text-[var(--text-secondary)] block">Core JD-CV</span>
                  <span className="font-bold text-sm text-[var(--heading)]">{formatMatchScore(cand.coreJdCvScore, locale)}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
                  <span className="text-[10px] text-[var(--text-secondary)] block">GitHub</span>
                  <span className="font-bold text-sm text-[var(--primary)]">
                    {formatMatchScore(cand.githubSupportingScore ?? null, locale)}
                  </span>
                </div>
              </div>

              {/* Required Skills Match */}
              <div className="space-y-1.5 p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
                <span className="font-bold text-[var(--heading)] block">{vi ? 'Kỹ năng bắt buộc' : 'Required skills'}</span>
                <span className="text-[var(--success)] font-semibold block">
                  {vi ? 'Khớp' : 'Matched'} {cand.requiredSkillsMatched ?? '—'}/{cand.requiredSkillsTotal ?? '—'}
                </span>
                {cand.requiredSkillsMissingNames.length > 0 && (
                  <div className="pt-1 flex flex-wrap gap-1">
                    {cand.requiredSkillsMissingNames.map(m => (
                      <span key={m} className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 text-[10px] border border-rose-500/40">
                        {vi ? 'Thiếu' : 'Missing'} · {m}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Relevant Experience */}
              <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] space-y-1">
                <span className="text-[var(--text-secondary)] block">{vi ? 'Kinh nghiệm liên quan' : 'Relevant experience'}</span>
                <span className="font-bold text-[var(--heading)]">{cand.relevantExperienceYears == null ? '—' : `${cand.relevantExperienceYears} ${vi ? 'năm' : 'years'}`}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold text-[var(--heading)] bg-[var(--surface-secondary)] border border-[var(--border)] focus-visible:outline-2 focus-visible:outline-[var(--primary)] transition"
          >
            {vi ? 'Đóng' : 'Close'}
          </button>
        </div>
    </AnimatedModalShell>
  );
};
