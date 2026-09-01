'use client';

import React from 'react';
import { MatchInspectionData } from '@/types';
import { Award, CheckCircle2, AlertCircle, Sparkles, GitBranch, ShieldCheck } from 'lucide-react';

interface ScoreBreakdownCardProps {
  data: MatchInspectionData;
}

export const ScoreBreakdownCard: React.FC<ScoreBreakdownCardProps> = ({ data }) => {
  return (
    <div className="space-y-6">
      {/* 3-Tier Official Scores Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Overall Score */}
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950/80 border border-indigo-500/40 rounded-2xl p-5 shadow-xl relative overflow-hidden space-y-2">
          <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider block">Overall Match Score</span>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-white">{data.overallScore.toFixed(1)}%</span>
            <span className="text-xs text-indigo-300 font-medium">/ 100%</span>
          </div>
          <p className="text-[11px] text-slate-400">
            {data.githubScoreActive ? 'Kết hợp: Core Score (85%) + GitHub Supporting (15%)' : 'Fallback: Core JD-CV Score (100%)'}
          </p>
        </div>

        {/* Core JD-CV Score */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Core JD-CV Score</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-100">{data.coreScore.toFixed(1)}%</span>
          </div>
          <p className="text-[11px] text-slate-400">Đánh giá trực tiếp CV so với yêu cầu JD (Primary Evidence)</p>
        </div>

        {/* GitHub Supporting Score */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-2">
          <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-1">
            <GitBranch className="w-3.5 h-3.5" />
            <span>GitHub Supporting Score</span>
          </span>
          <div className="flex items-baseline gap-2">
            {data.githubScoreActive && data.githubScore !== undefined ? (
              <span className="text-3xl font-bold text-cyan-400">{data.githubScore.toFixed(1)}%</span>
            ) : (
              <span className="text-sm font-semibold text-slate-400 italic">Not connected / Non-technical</span>
            )}
          </div>
          <p className="text-[11px] text-slate-400">Tín hiệu minh chứng mã nguồn bổ trợ (Secondary Signal)</p>
        </div>
      </div>

      {/* Semantic Skills Status Section: Required vs Preferred */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-cyan-400" />
          <span>Đánh giá Kỹ năng Bắt buộc vs Kỹ năng Ưu tiên</span>
        </h3>

        {/* Required Skills Grid */}
        <div className="space-y-3">
          <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider block">
            1. Kỹ năng Bắt buộc (Required Skills - Gate Baseline)
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.requiredSkillsStatus.map((item, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl border space-y-1 text-xs ${
                  item.status === 'MATCH'
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/50 border-rose-500/60 text-rose-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">{item.skillName}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    item.status === 'MATCH' ? 'bg-emerald-900 text-emerald-300' : 'bg-rose-900 text-rose-300'
                  }`}>
                    {item.status === 'MATCH' ? 'MATCH ✓' : 'MISSING ✗'}
                  </span>
                </div>
                {item.evidenceText && (
                  <p className="text-[11px] text-slate-300">{item.evidenceText}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Preferred Skills Grid */}
        {data.preferredSkillsStatus.length > 0 && (
          <div className="space-y-3 pt-2 border-t border-slate-800/80">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              2. Kỹ năng Ưu tiên (Preferred Skills - Point Bonus Only)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.preferredSkillsStatus.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border space-y-1 text-xs ${
                    item.status === 'MATCH'
                      ? 'bg-indigo-950/40 border-indigo-500/40 text-indigo-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200">{item.skillName}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {item.status === 'MATCH' ? '+ Point Bonus' : 'Not Provided'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Match Factor Breakdown List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Chi tiết Các Thành phần Trọng số (Match Factors Breakdown)</span>
        </h3>

        <div className="space-y-3">
          {data.matchFactors.map((factor, idx) => (
            <div key={idx} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200">{factor.factorName}</span>
                <span className="font-mono font-bold text-indigo-400">{factor.score.toFixed(1)}%</span>
              </div>
              <p className="text-slate-400">{factor.explanation}</p>
              {factor.evidence && (
                <p className="text-[11px] text-cyan-300 font-mono">Minh chứng: {factor.evidence}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
