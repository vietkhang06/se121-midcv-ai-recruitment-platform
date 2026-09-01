'use client';

import React from 'react';
import { CandidateRankingItem } from '@/types';
import { X, Award, CheckCircle2, AlertCircle, GitBranch, ArrowRight } from 'lucide-react';

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
  if (!isOpen || candidates.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 relative max-h-[90vh] overflow-y-auto space-y-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-1 border-b border-slate-800 pb-3">
          <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Candidate Comparison Tool</span>
          <h3 className="text-xl font-bold text-white">So Sánh Trực Tiếp Ứng Viên (Side-by-Side Comparison)</h3>
          <p className="text-xs text-slate-400">Đối sánh các chỉ số điểm, kỹ năng bắt buộc và minh chứng kinh nghiệm</p>
        </div>

        {/* Side-by-Side Grid */}
        <div className={`grid gap-4 ${candidates.length === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
          {candidates.map((cand, idx) => (
            <div key={cand.applicationId} className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Ứng viên #{idx + 1}</span>
                  <h4 className="text-base font-bold text-white">{cand.candidateName}</h4>
                  <p className="text-slate-400 text-[11px]">{cand.headline}</p>
                </div>
                <span className="px-2.5 py-1 rounded-xl text-xs font-extrabold bg-indigo-950 text-indigo-300 border border-indigo-500/40">
                  Hạng #{cand.rank}
                </span>
              </div>

              {/* Scores Grid */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Overall</span>
                  <span className="font-bold text-sm text-indigo-400">{cand.overallMatchScore.toFixed(1)}%</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Core JD-CV</span>
                  <span className="font-bold text-sm text-slate-200">{cand.coreJdCvScore.toFixed(1)}%</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">GitHub</span>
                  <span className="font-bold text-sm text-cyan-400">
                    {cand.githubSupportingScore ? `${cand.githubSupportingScore.toFixed(1)}%` : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Required Skills Match */}
              <div className="space-y-1.5 p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="font-bold text-slate-300 block">Kỹ năng Bắt buộc:</span>
                <span className="text-emerald-400 font-semibold block">
                  Khớp {cand.requiredSkillsMatched}/{cand.requiredSkillsTotal} kỹ năng
                </span>
                {cand.requiredSkillsMissingNames.length > 0 && (
                  <div className="pt-1 flex flex-wrap gap-1">
                    {cand.requiredSkillsMissingNames.map(m => (
                      <span key={m} className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 text-[10px] border border-rose-500/40">
                        Missing: {m}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Relevant Experience */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-slate-400 block">Kinh nghiệm Phù hợp:</span>
                <span className="font-bold text-white">{cand.relevantExperienceYears} năm kinh nghiệm thực tế</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
