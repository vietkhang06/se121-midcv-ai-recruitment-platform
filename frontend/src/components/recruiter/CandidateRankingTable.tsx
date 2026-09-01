'use client';

import React from 'react';
import Link from 'next/link';
import { CandidateRankingItem } from '@/types';
import { Award, CheckCircle2, AlertCircle, Eye, GitBranch, ArrowRight, ShieldCheck } from 'lucide-react';

interface CandidateRankingTableProps {
  rankings: CandidateRankingItem[];
  onSelectCandidateForCompare?: (item: CandidateRankingItem) => void;
}

export const CandidateRankingTable: React.FC<CandidateRankingTableProps> = ({
  rankings,
  onSelectCandidateForCompare
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-3.5 px-4 text-center w-16">Hạng</th>
              <th className="py-3.5 px-4">Ứng viên & Chức danh</th>
              <th className="py-3.5 px-4 text-center">Overall Match (S_overall)</th>
              <th className="py-3.5 px-4 text-center">Core JD-CV (S_core)</th>
              <th className="py-3.5 px-4 text-center">GitHub Score (S_github)</th>
              <th className="py-3.5 px-4">Kỹ năng Bắt buộc (Required)</th>
              <th className="py-3.5 px-4 text-center">Kinh nghiệm</th>
              <th className="py-3.5 px-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 text-slate-200">
            {rankings.map((item) => {
              const hasMissingRequired = item.requiredSkillsMissingNames.length > 0;

              return (
                <tr key={item.applicationId} className="hover:bg-slate-800/50 transition">
                  {/* Rank Badge */}
                  <td className="py-4 px-4 text-center font-bold">
                    <span
                      className={`inline-flex items-center justify-center w-8 h-8 rounded-xl text-xs font-extrabold ${
                        item.rank === 1
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/20'
                          : item.rank === 2
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      #{item.rank}
                    </span>
                  </td>

                  {/* Candidate Name & Headline */}
                  <td className="py-4 px-4">
                    <div>
                      <Link
                        href={`/recruiter/applications/${item.applicationId}`}
                        className="font-bold text-sm text-white hover:text-cyan-400 transition"
                      >
                        {item.candidateName}
                      </Link>
                      <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{item.headline}</p>
                    </div>
                  </td>

                  {/* Overall Match Score */}
                  <td className="py-4 px-4 text-center font-mono font-extrabold text-sm">
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-950/80 border border-indigo-500/40 text-indigo-300">
                      {item.overallMatchScore.toFixed(1)}%
                    </span>
                  </td>

                  {/* Core JD-CV Score */}
                  <td className="py-4 px-4 text-center font-mono font-semibold text-slate-300">
                    {item.coreJdCvScore.toFixed(1)}%
                  </td>

                  {/* GitHub Supporting Score */}
                  <td className="py-4 px-4 text-center">
                    {item.githubSupportingScore !== undefined ? (
                      <span className="font-mono text-cyan-400 font-semibold flex items-center justify-center gap-1">
                        <GitBranch className="w-3 h-3 text-cyan-400" />
                        {item.githubSupportingScore.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px] italic">Not connected / Non-tech</span>
                    )}
                  </td>

                  {/* Required Skill Status */}
                  <td className="py-4 px-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        {!hasMissingRequired ? (
                          <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Khớp {item.requiredSkillsMatched}/{item.requiredSkillsTotal} kỹ năng
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-rose-400 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Thiếu {item.requiredSkillsMissingNames.length} kỹ năng
                          </span>
                        )}
                      </div>
                      {hasMissingRequired && (
                        <div className="flex flex-wrap gap-1">
                          {item.requiredSkillsMissingNames.map((name) => (
                            <span key={name} className="px-1.5 py-0.5 rounded bg-rose-950 border border-rose-500/40 text-rose-300 text-[10px]">
                              Missing: {name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Relevant Experience */}
                  <td className="py-4 px-4 text-center font-medium text-slate-300">
                    {item.relevantExperienceYears} năm
                  </td>

                  {/* CTAs */}
                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {onSelectCandidateForCompare && (
                        <button
                          onClick={() => onSelectCandidateForCompare(item)}
                          className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                        >
                          So sánh
                        </button>
                      )}

                      <Link
                        href={`/recruiter/applications/${item.applicationId}`}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1 transition active:scale-95 shadow-sm"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Xem Chi tiết</span>
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
