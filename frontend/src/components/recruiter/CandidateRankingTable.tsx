'use client';

import { AccountAvatar } from '@/components/account/AccountAvatar';
import React from 'react';
import { formatMatchScore } from '@/lib/matchPresentation';
import { MatchScoreBadge } from './MatchScoreBadge';
import Link from 'next/link';
import { CandidateRankingItem } from '@/types';
import { useLanguage } from '@/context/LanguageContext';
import { Award, CheckCircle2, AlertCircle, Eye, GitBranch, ArrowRight, ShieldCheck } from 'lucide-react';
import { staggerDelay } from '@/components/motion';

interface CandidateRankingTableProps {
  rankings: CandidateRankingItem[];
  applicationHref?: (id: string) => string;
  onSelectCandidateForCompare?: (item: CandidateRankingItem) => void;
}

export const CandidateRankingTable: React.FC<CandidateRankingTableProps> = ({
  rankings,
  applicationHref,
  onSelectCandidateForCompare
}) => {
  const { locale } = useLanguage();
  const isVi = locale === 'vi';

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xs overflow-hidden transition-colors">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[var(--surface-secondary)] border-b border-[var(--border)] text-[var(--heading)] font-bold text-[11px] font-sans">
              <th className="py-4 px-4 text-center w-16">{isVi ? 'Hạng' : 'Rank'}</th>
              <th className="py-4 px-4">{isVi ? 'Ứng viên & Chức danh' : 'Candidate & Headline'}</th>
              <th className="py-4 px-4 text-center w-48">{isVi ? 'Điểm tổng thể' : 'Overall score'}</th>
              <th className="py-4 px-4 text-center">Core JD-CV</th>
              <th className="py-4 px-4 text-center">{isVi ? 'Tín hiệu GitHub' : 'GitHub signal'}</th>
              <th className="py-4 px-4">{isVi ? 'Kỹ năng Bắt buộc (Gating)' : 'Required Skills (Gating)'}</th>
              <th className="py-4 px-4 text-center">{isVi ? 'Kinh nghiệm' : 'Experience'}</th>
              <th className="py-4 px-4 text-right">{isVi ? 'Thao tác' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-[var(--border)] text-slate-700 dark:text-slate-200">
            {rankings.map((item, index) => {
              const missing = item.requiredSkillsMatched !== null && item.requiredSkillsTotal !== null ? item.requiredSkillsTotal - item.requiredSkillsMatched : null;


              return (
                <tr
                  key={item.applicationId}
                  className="animate-fade-in hover:bg-slate-50/80 dark:hover:bg-[var(--surface)] transition-colors"
                  style={{ animationDelay: `${staggerDelay(index)}ms` }}
                >
                  {/* Rank Badge */}
                  <td className="py-4 px-4 text-center font-bold">
                    <span
                      className={`inline-flex items-center justify-center w-8 h-8 rounded-xl text-xs font-extrabold font-sans ${
                        item.rank === 1
                          ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 shadow-xs'
                          : item.rank === 2
                          ? 'bg-blue-50 dark:bg-blue-950/80 text-[var(--primary)] dark:text-blue-300 border border-blue-200 dark:border-blue-500/40'
                          : item.rank === 3
                          ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40'
                          : 'bg-slate-100 dark:bg-[var(--surface)] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[var(--border)]'
                      }`}
                    >
                      #{item.rank}
                    </span>
                  </td>

                  {/* Candidate Name & Headline */}
                  <td className="py-4 px-4">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <AccountAvatar name={item.candidateName} avatarId={item.candidateAvatarId} className="size-8 text-xs" />
                        <Link
                          href={applicationHref?.(item.applicationId) ?? `/recruiter/applications/${encodeURIComponent(item.applicationId)}`}
                          className="font-bold text-sm text-slate-900 dark:text-white hover:text-[var(--primary)] dark:hover:text-[var(--retro-sky)] transition"
                        >
                          {item.candidateName}
                        </Link>
                        {item.rank === 1 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 font-bold flex items-center gap-1">
                            <span>Top 1</span>
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{item.headline}</p>
                    </div>
                  </td>

                  {/* Overall Match Score with Progress Bar */}
                  <td className="py-4 px-4">
                    <MatchScoreBadge application={{ matchScore: item.overallMatchScore, matchStatus: item.calculationStatus }} locale={locale} />
                  </td>

                  {/* Core JD-CV Score */}
                  <td className="py-4 px-4 text-center font-sans font-bold text-slate-700 dark:text-slate-300">
                    {formatMatchScore(item.coreJdCvScore, locale)}
                  </td>

                  {/* GitHub Supporting Score */}
                  <td className="py-4 px-4 text-center">
                    {item.githubSupportingScore !== undefined ? (
                      <span className="font-sans text-slate-900 dark:text-white font-bold flex items-center justify-center gap-1">
                        <GitBranch className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        {item.githubSupportingScore.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500 text-[11px] italic">—</span>
                    )}
                  </td>

                  {/* Required Skill Gating Status */}
                  <td className="py-4 px-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        {missing === null ? '—' : missing === 0 ? (
                          <span className="text-[11px] font-semibold text-[var(--success)] dark:text-[var(--success)] flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[var(--success)]" />
                            {isVi
                              ? `Khớp ${item.requiredSkillsMatched}/${item.requiredSkillsTotal} bắt buộc`
                              : `Matched ${item.requiredSkillsMatched}/${item.requiredSkillsTotal} required`}
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                            {isVi
                              ? `Thiếu ${missing} bắt buộc (Gated)`
                              : `Missing ${missing} required (Gated)`}
                          </span>
                        )}
                      </div>
                      {item.requiredSkillsMissingNames.length > 0 && (
                        <p className="text-[10px] text-rose-500 dark:text-rose-400 line-clamp-1 font-sans">
                          {isVi ? 'Thiếu: ' : 'Missing: '}{item.requiredSkillsMissingNames.join(', ')}
                        </p>
                      )}
                    </div>
                  </td>

                  {/* Years of Experience */}
                  <td className="py-4 px-4 text-center text-slate-600 dark:text-slate-300 font-medium">
                    {item.relevantExperienceYears == null ? '—' : `${item.relevantExperienceYears} ${isVi ? 'năm' : 'yrs'}`}
                  </td>

                  {/* Actions */}
                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {onSelectCandidateForCompare && (
                        <button
                          onClick={() => onSelectCandidateForCompare(item)}
                          className="px-2.5 py-1 rounded-xl border border-slate-200 dark:border-[var(--border)] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[var(--surface)] font-semibold text-[11px] transition cursor-pointer"
                        >
                          {isVi ? 'So Sánh' : 'Compare'}
                        </button>
                      )}
                      <Link
                        href={applicationHref?.(item.applicationId) ?? `/recruiter/applications/${encodeURIComponent(item.applicationId)}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary)] text-white font-semibold text-[11px] shadow-xs transition"
                      >
                        <Eye className="w-3 h-3" />
                        <span>{isVi ? 'Xem Chi Tiết' : 'View Details'}</span>
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
