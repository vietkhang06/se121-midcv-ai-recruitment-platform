'use client';

import React from 'react';
import Link from 'next/link';
import { CandidateRankingItem } from '@/types';
import { useLanguage } from '@/context/LanguageContext';
import { Award, CheckCircle2, AlertCircle, Eye, GitBranch, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { staggerDelay } from '@/components/motion';

interface CandidateRankingTableProps {
  rankings: CandidateRankingItem[];
  onSelectCandidateForCompare?: (item: CandidateRankingItem) => void;
}

export const CandidateRankingTable: React.FC<CandidateRankingTableProps> = ({
  rankings,
  onSelectCandidateForCompare
}) => {
  const { locale } = useLanguage();
  const isVi = locale === 'vi';

  return (
    <div className="bg-white dark:bg-[#111C38] border border-slate-200 dark:border-[#1E293B] rounded-2xl shadow-xs overflow-hidden transition-colors">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-[#0B1528] border-b border-slate-200 dark:border-[#1E293B] text-slate-800 dark:text-slate-200 font-bold uppercase tracking-wider text-[11px] font-mono">
              <th className="py-4 px-4 text-center w-16">{isVi ? 'Hạng' : 'Rank'}</th>
              <th className="py-4 px-4">{isVi ? 'Ứng viên & Chức danh' : 'Candidate & Headline'}</th>
              <th className="py-4 px-4 text-center w-48">Overall Match (S_overall)</th>
              <th className="py-4 px-4 text-center">Core JD-CV</th>
              <th className="py-4 px-4 text-center">GitHub Signal</th>
              <th className="py-4 px-4">{isVi ? 'Kỹ năng Bắt buộc (Gating)' : 'Required Skills (Gating)'}</th>
              <th className="py-4 px-4 text-center">{isVi ? 'Kinh nghiệm' : 'Experience'}</th>
              <th className="py-4 px-4 text-right">{isVi ? 'Thao tác' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-[#1E293B] text-slate-700 dark:text-slate-200">
            {rankings.map((item, index) => {
              const hasMissingRequired = item.requiredSkillsMissingNames.length > 0;
              const isHighMatch = item.overallMatchScore >= 85;
              const isGoodMatch = item.overallMatchScore >= 70 && item.overallMatchScore < 85;

              return (
                <tr
                  key={item.applicationId}
                  className="animate-fade-in hover:bg-slate-50/80 dark:hover:bg-[#18294E] transition-colors"
                  style={{ animationDelay: `${staggerDelay(index)}ms` }}
                >
                  {/* Rank Badge */}
                  <td className="py-4 px-4 text-center font-bold">
                    <span
                      className={`inline-flex items-center justify-center w-8 h-8 rounded-xl text-xs font-extrabold font-mono ${
                        item.rank === 1
                          ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 shadow-xs'
                          : item.rank === 2
                          ? 'bg-blue-50 dark:bg-blue-950/80 text-[#2563EB] dark:text-blue-300 border border-blue-200 dark:border-blue-500/40'
                          : item.rank === 3
                          ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40'
                          : 'bg-slate-100 dark:bg-[#13233F] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#1E293B]'
                      }`}
                    >
                      #{item.rank}
                    </span>
                  </td>

                  {/* Candidate Name & Headline */}
                  <td className="py-4 px-4">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/recruiter/applications/${item.applicationId}`}
                          className="font-bold text-sm text-slate-900 dark:text-white hover:text-[#2563EB] dark:hover:text-[#3B82F6] transition"
                        >
                          {item.candidateName}
                        </Link>
                        {item.rank === 1 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 font-bold flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                            <span>Top 1</span>
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{item.headline}</p>
                    </div>
                  </td>

                  {/* Overall Match Score with Progress Bar */}
                  <td className="py-4 px-4">
                    <div className="space-y-1.5 w-40 mx-auto">
                      <div className="flex items-center justify-between font-mono text-xs">
                        <span className="font-extrabold text-slate-900 dark:text-white">{item.overallMatchScore.toFixed(1)}%</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          isHighMatch
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : isGoodMatch
                            ? 'bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] border border-blue-200 dark:border-blue-800'
                            : 'bg-slate-100 dark:bg-[#13233F] text-slate-600 dark:text-slate-400'
                        }`}>
                          {isHighMatch ? 'High' : isGoodMatch ? 'Good' : 'Moderate'}
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-[#13233F] overflow-hidden border border-slate-200 dark:border-[#1E293B]">
                        <div
                          className={`h-full rounded-full origin-left transition-transform ${
                            isHighMatch
                              ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                              : isGoodMatch
                              ? 'bg-gradient-to-r from-[#2563EB] to-blue-400'
                              : 'bg-slate-400'
                          }`}
                          style={{ transform: `scaleX(${Math.min(100, item.overallMatchScore) / 100})` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Core JD-CV Score */}
                  <td className="py-4 px-4 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                    {item.coreJdCvScore.toFixed(1)}%
                  </td>

                  {/* GitHub Supporting Score */}
                  <td className="py-4 px-4 text-center">
                    {item.githubSupportingScore !== undefined ? (
                      <span className="font-mono text-slate-900 dark:text-white font-bold flex items-center justify-center gap-1">
                        <GitBranch className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        {item.githubSupportingScore.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500 text-[11px] italic">Not connected / Non-tech</span>
                    )}
                  </td>

                  {/* Required Skill Gating Status */}
                  <td className="py-4 px-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        {!hasMissingRequired ? (
                          <span className="text-[11px] font-semibold text-[#00B14F] dark:text-[#00B14F] flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#00B14F]" />
                            {isVi
                              ? `Khớp ${item.requiredSkillsMatched}/${item.requiredSkillsTotal} bắt buộc`
                              : `Matched ${item.requiredSkillsMatched}/${item.requiredSkillsTotal} required`}
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                            {isVi
                              ? `Thiếu ${item.requiredSkillsMissingNames.length} bắt buộc (Gated)`
                              : `Missing ${item.requiredSkillsMissingNames.length} required (Gated)`}
                          </span>
                        )}
                      </div>
                      {hasMissingRequired && (
                        <p className="text-[10px] text-rose-500 dark:text-rose-400 line-clamp-1 font-mono">
                          {isVi ? 'Thiếu: ' : 'Missing: '}{item.requiredSkillsMissingNames.join(', ')}
                        </p>
                      )}
                    </div>
                  </td>

                  {/* Years of Experience */}
                  <td className="py-4 px-4 text-center text-slate-600 dark:text-slate-300 font-medium">
                    {item.relevantExperienceYears} {isVi ? 'năm' : 'yrs'}
                  </td>

                  {/* Actions */}
                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {onSelectCandidateForCompare && (
                        <button
                          onClick={() => onSelectCandidateForCompare(item)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-[#1E293B] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#18294E] font-semibold text-[11px] transition cursor-pointer"
                        >
                          {isVi ? 'So Sánh' : 'Compare'}
                        </button>
                      )}
                      <Link
                        href={`/recruiter/applications/${item.applicationId}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-[11px] shadow-xs transition"
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
