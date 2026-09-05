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
        <div className="bg-[#0C2B24] border border-[#164E41] rounded-2xl p-6 text-white shadow-md relative overflow-hidden space-y-2">
          <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider block">Overall Match Score</span>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-white font-mono">{data.overallScore.toFixed(1)}%</span>
            <span className="text-xs text-emerald-200/80 font-medium">/ 100%</span>
          </div>
          <p className="text-[11px] text-emerald-100/70">
            {data.githubScoreActive ? 'Kết hợp: Core Score (85%) + GitHub Supporting (15%)' : 'Fallback: Core JD-CV Score (100%)'}
          </p>
        </div>

        {/* Core JD-CV Score */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm space-y-2">
          <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider block">Core JD-CV Score</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#0C2B24] font-mono">{data.coreScore.toFixed(1)}%</span>
          </div>
          <p className="text-[11px] text-[#64748B]">Đánh giá trực tiếp CV so với yêu cầu JD (Primary Evidence)</p>
        </div>

        {/* GitHub Supporting Score */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm space-y-2">
          <span className="text-xs font-bold text-[#0C2B24] uppercase tracking-wider flex items-center gap-1">
            <GitBranch className="w-3.5 h-3.5 text-[#10B981]" />
            <span>GitHub Supporting Score</span>
          </span>
          <div className="flex items-baseline gap-2">
            {data.githubScoreActive && data.githubScore !== undefined ? (
              <span className="text-3xl font-bold text-[#0C2B24] font-mono">{data.githubScore.toFixed(1)}%</span>
            ) : (
              <span className="text-sm font-semibold text-[#94A3B8] italic">Not connected / Non-technical</span>
            )}
          </div>
          <p className="text-[11px] text-[#64748B]">Tín hiệu minh chứng mã nguồn bổ trợ (Secondary Signal)</p>
        </div>
      </div>

      {/* Semantic Skills Status Section: Required vs Preferred */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 sm:p-7 shadow-sm space-y-6">
        <div className="border-b border-[#F1F5F9] pb-4">
          <h3 className="text-base font-bold text-[#0C2B24] flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#10B981]" />
            <span>Skills Proficiency Mapping Audit (Đánh giá Kỹ năng Bắt buộc vs Kỹ năng Ưu tiên)</span>
          </h3>
          <p className="text-xs text-[#64748B] mt-1">
            Audit comparing candidate demonstrated capabilities directly against job gating baselines.
          </p>
        </div>

        {/* Required Skills Grid */}
        <div className="space-y-3">
          <span className="text-xs font-bold text-[#0C2B24] uppercase tracking-wider block">
            1. Kỹ năng Bắt buộc (Required Skills - Gate Baseline)
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.requiredSkillsStatus.map((item, idx) => (
              <div
                key={idx}
                className={`p-3.5 rounded-xl border space-y-1 text-xs ${
                  item.status === 'MATCH'
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                    : 'bg-rose-50/70 border-rose-200 text-rose-950'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#0C2B24]">{item.skillName}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    item.status === 'MATCH' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {item.status === 'MATCH' ? 'MATCH ✓' : 'MISSING ✗'}
                  </span>
                </div>
                {item.evidenceText && (
                  <p className="text-[11px] text-[#475569]">{item.evidenceText}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Preferred Skills Grid */}
        {data.preferredSkillsStatus.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-[#F1F5F9]">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider block">
              2. Kỹ năng Ưu tiên (Preferred Skills - Point Bonus Only)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.preferredSkillsStatus.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border space-y-1 text-xs ${
                    item.status === 'MATCH'
                      ? 'bg-[#F8FAF9] border-emerald-200 text-emerald-900'
                      : 'bg-[#F8FAF9] border-[#E2E8F0] text-[#64748B]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#0C2B24]">{item.skillName}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-white border border-[#CBD5E1] text-[#475569] font-medium">
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
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-[#0C2B24] border-b border-[#F1F5F9] pb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Chi tiết Các Thành phần Trọng số (Match Factors Breakdown)</span>
        </h3>

        <div className="space-y-3">
          {data.matchFactors.map((factor, idx) => (
            <div key={idx} className="p-3.5 rounded-xl bg-[#F8FAF9] border border-[#E2E8F0] space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#0C2B24]">{factor.factorName}</span>
                <span className="font-mono font-bold text-[#10B981]">{factor.score.toFixed(1)}%</span>
              </div>
              <p className="text-[#475569]">{factor.explanation}</p>
              {factor.evidence && (
                <p className="text-[11px] text-[#0C2B24] font-mono bg-white p-2 rounded-lg border border-[#E2E8F0]">
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

