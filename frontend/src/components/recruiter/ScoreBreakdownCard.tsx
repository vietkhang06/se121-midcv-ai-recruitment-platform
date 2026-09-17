'use client';

import React from 'react';
import { MatchInspectionData } from '@/types';
import { Award, CheckCircle2, AlertCircle, Sparkles, GitBranch, ShieldCheck } from 'lucide-react';

interface ScoreBreakdownCardProps {
  data: MatchInspectionData;
}

export const ScoreBreakdownCard: React.FC<ScoreBreakdownCardProps> = ({ data }) => {
  return (
    <div className="space-y-6 font-sans">
      {/* 3-Tier Official Scores Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Overall Score */}
        <div className="bg-[#111C38] border border-[#1E293B] rounded-2xl p-6 text-white shadow-xs relative overflow-hidden space-y-2">
          <span className="text-xs font-bold text-[#3B82F6] uppercase tracking-wider block font-mono">Overall Match Score</span>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-white font-mono">{data.overallScore.toFixed(1)}%</span>
            <span className="text-xs text-blue-200/80 font-medium">/ 100%</span>
          </div>
          <p className="text-[11px] text-slate-300">
            {data.githubScoreActive ? 'Kết hợp: Core Score (85%) + GitHub Supporting (15%)' : 'Fallback: Core JD-CV Score (100%)'}
          </p>
        </div>

        {/* Core JD-CV Score */}
        <div className="bg-white dark:bg-[#111C38] border border-slate-200 dark:border-[#1E293B] rounded-2xl p-6 shadow-xs space-y-2 transition-colors">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-mono">Core JD-CV Score</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white font-mono">{data.coreScore.toFixed(1)}%</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Đánh giá trực tiếp CV so với yêu cầu JD (Primary Evidence)</p>
        </div>

        {/* GitHub Supporting Score */}
        <div className="bg-white dark:bg-[#111C38] border border-slate-200 dark:border-[#1E293B] rounded-2xl p-6 shadow-xs space-y-2 transition-colors">
          <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1 font-mono">
            <GitBranch className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#3B82F6]" />
            <span>GitHub Supporting Score</span>
          </span>
          <div className="flex items-baseline gap-2">
            {data.githubScoreActive && data.githubScore !== undefined ? (
              <span className="text-3xl font-bold text-slate-900 dark:text-white font-mono">{data.githubScore.toFixed(1)}%</span>
            ) : (
              <span className="text-sm font-semibold text-slate-400 dark:text-slate-500 italic">Not connected / Non-technical</span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Tín hiệu minh chứng mã nguồn bổ trợ (Secondary Signal)</p>
        </div>
      </div>

      {/* Semantic Skills Status Section: Required vs Preferred */}
      <div className="bg-white dark:bg-[#111C38] border border-slate-200 dark:border-[#1E293B] rounded-2xl p-6 sm:p-7 shadow-xs space-y-6 transition-colors">
        <div className="border-b border-slate-100 dark:border-[#1E293B] pb-4">
          <h3 className="text-base font-bold font-editorial text-slate-900 dark:text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#2563EB] dark:text-[#3B82F6]" />
            <span>Skills Proficiency Mapping Audit (Đánh giá Kỹ năng Bắt buộc vs Kỹ năng Ưu tiên)</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Audit comparing candidate demonstrated capabilities directly against job gating baselines.
          </p>
        </div>

        {/* Required Skills Grid */}
        <div className="space-y-3">
          <span className="text-xs font-bold text-[#2563EB] dark:text-[#3B82F6] uppercase tracking-wider block font-mono">
            1. Kỹ năng Bắt buộc (Required Skills - Gate Baseline)
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.requiredSkillsStatus.map((item, idx) => (
              <div
                key={idx}
                className={`p-3.5 rounded-xl border space-y-1 text-xs transition-colors ${
                  item.status === 'MATCH'
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200'
                    : 'bg-rose-50/70 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-950 dark:text-rose-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white font-mono">{item.skillName}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                    item.status === 'MATCH' ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200' : 'bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-200'
                  }`}>
                    {item.status === 'MATCH' ? 'MATCH ✓' : 'MISSING ✗'}
                  </span>
                </div>
                {item.evidenceText && (
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">{item.evidenceText}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Preferred Skills Grid */}
        {data.preferredSkillsStatus.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-[#1E293B]">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-mono">
              2. Kỹ năng Ưu tiên (Preferred Skills - Point Bonus Only)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.preferredSkillsStatus.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border space-y-1 text-xs transition-colors ${
                    item.status === 'MATCH'
                      ? 'bg-slate-50 dark:bg-[#13233F] border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300'
                      : 'bg-slate-50 dark:bg-[#13233F] border border-slate-200 dark:border-[#1E293B] text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 dark:text-white font-mono">{item.skillName}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-white dark:bg-[#111C38] border border-slate-200 dark:border-[#1E293B] text-slate-600 dark:text-slate-400 font-medium font-mono">
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
      <div className="bg-white dark:bg-[#111C38] border border-slate-200 dark:border-[#1E293B] rounded-2xl p-6 shadow-xs space-y-4 transition-colors">
        <h3 className="text-base font-bold font-editorial text-slate-900 dark:text-white border-b border-slate-100 dark:border-[#1E293B] pb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Chi tiết Các Thành phần Trọng số (Match Factors Breakdown)</span>
        </h3>

        <div className="space-y-3">
          {data.matchFactors.map((factor, idx) => (
            <div key={idx} className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#13233F] border border-slate-200 dark:border-[#1E293B] space-y-1.5 text-xs transition-colors">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white font-mono">{factor.factorName}</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{factor.score.toFixed(1)}%</span>
              </div>
              <p className="text-slate-600 dark:text-slate-300">{factor.explanation}</p>
              {factor.evidence && (
                <p className="text-[11px] text-slate-800 dark:text-slate-200 font-mono bg-white dark:bg-[#111C38] p-2 rounded-lg border border-slate-200 dark:border-[#1E293B]">
                  Minh chứng: {factor.evidence}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

