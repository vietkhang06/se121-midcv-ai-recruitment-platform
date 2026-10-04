'use client';

import React from 'react';
import { MatchInspectionData } from '@/types';
import { CheckCircle2, Sparkles, GitBranch, ShieldCheck, HelpCircle, Calculator, FileCheck, Layers } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

interface ScoreBreakdownCardProps {
  data: MatchInspectionData;
}

export const ScoreBreakdownCard: React.FC<ScoreBreakdownCardProps> = ({ data }) => {
  const { locale } = useLanguage();

  return (
    <div className="space-y-6 font-sans">
      {/* Algorithm Version & Transparency Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-50 dark:bg-[#13233F] border border-slate-200 dark:border-[#1E293B] rounded-xl text-xs">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            {locale === 'vi' ? 'Mô hình Đánh giá Minh bạch:' : 'Explainable Audit Model:'}
          </span>
          <span className="font-mono px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold text-[11px]">
            {data.algorithmVersion || 'v2.0 Grounded'}
          </span>
          {data.calculationStatus && (
            <span className="font-mono px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-semibold text-[10px]">
              {data.calculationStatus}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px]">
          <Layers className="w-3.5 h-3.5" />
          <span>{locale === 'vi' ? 'Không dùng điểm giả • Dynamic Re-weighting' : 'Zero Fake Fallbacks • Dynamic Re-weighting'}</span>
        </div>
      </div>

      {/* 3-Tier Official Scores Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Overall Score */}
        <div className="bg-[#111C38] border border-[#1E293B] rounded-2xl p-6 text-white shadow-xs relative overflow-hidden space-y-2">
          <span className="text-xs font-bold text-[#3B82F6] uppercase tracking-wider block font-mono">Overall Match Score</span>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-white font-mono">
              {data.overallScore !== null && data.overallScore !== undefined ? `${data.overallScore.toFixed(1)}%` : 'N/A'}
            </span>
            <span className="text-xs text-blue-200/80 font-medium">/ 100%</span>
          </div>
          <p className="text-[11px] text-slate-300">
            {data.githubScoreActive
              ? (locale === 'vi' ? 'Kết hợp: Core Score (85%) + GitHub Supporting (15%)' : 'Combined: Core Score (85%) + GitHub Supporting (15%)')
              : (locale === 'vi' ? 'Dự phòng minh bạch: Core JD-CV Score (100% không phạt)' : 'Transparent Fallback: Core JD-CV Score (100% zero penalty)')}
          </p>
        </div>

        {/* Core JD-CV Score */}
        <div className="bg-white dark:bg-[#111C38] border border-slate-200 dark:border-[#1E293B] rounded-2xl p-6 shadow-xs space-y-2 transition-colors">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-mono">Core JD-CV Score</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white font-mono">
              {data.coreScore !== null && data.coreScore !== undefined ? `${data.coreScore.toFixed(1)}%` : 'N/A'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {locale === 'vi' ? 'Đánh giá trực tiếp CV so với yêu cầu JD (Primary Evidence)' : 'Direct evaluation of CV against JD requirements (Primary Evidence)'}
          </p>
        </div>

        {/* GitHub Supporting Score */}
        <div className="bg-white dark:bg-[#111C38] border border-slate-200 dark:border-[#1E293B] rounded-2xl p-6 shadow-xs space-y-2 transition-colors">
          <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1 font-mono">
            <GitBranch className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#3B82F6]" />
            <span>GitHub Supporting Score</span>
          </span>
          <div className="flex items-baseline gap-2">
            {data.githubScoreActive && data.githubScore !== null && data.githubScore !== undefined ? (
              <span className="text-3xl font-bold text-slate-900 dark:text-white font-mono">{data.githubScore.toFixed(1)}%</span>
            ) : (
              <span className="text-sm font-semibold text-slate-400 dark:text-slate-500 italic">
                {locale === 'vi' ? 'Chưa thể đánh giá (Not Connected / Optional)' : 'Not Available (Not Connected / Optional)'}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {locale === 'vi' ? 'Tín hiệu minh chứng mã nguồn bổ trợ (Secondary Signal)' : 'Supporting source code evidence signal (Secondary Signal)'}
          </p>
        </div>
      </div>

      {/* Semantic Skills Status Section: Required vs Preferred */}
      <div className="bg-white dark:bg-[#111C38] border border-slate-200 dark:border-[#1E293B] rounded-2xl p-6 sm:p-7 shadow-xs space-y-6 transition-colors">
        <div className="border-b border-slate-100 dark:border-[#1E293B] pb-4">
          <h3 className="text-base font-bold font-editorial text-slate-900 dark:text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#2563EB] dark:text-[#3B82F6]" />
            <span>
              {locale === 'vi'
                ? 'Skills Proficiency Mapping Audit (Đánh giá Kỹ năng Bắt buộc vs Kỹ năng Ưu tiên)'
                : 'Skills Proficiency Mapping Audit (Required vs. Preferred Skills)'}
            </span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {locale === 'vi'
              ? 'Kiểm toán so sánh năng lực đã chứng minh của ứng viên trực tiếp với ngưỡng yêu cầu công việc.'
              : 'Audit comparing candidate demonstrated capabilities directly against job gating baselines.'}
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
                {item.evidenceText ? (
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">{item.evidenceText}</p>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">
                    {locale === 'vi' ? 'Không tìm thấy bằng chứng trong CV snapshot đã nộp.' : 'No evidence found in submitted CV snapshot.'}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Preferred Skills Grid */}
        {data.preferredSkillsStatus.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-[#1E293B]">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-mono">
              {locale === 'vi' ? '2. Kỹ năng Ưu tiên (Preferred Skills - Point Bonus Only)' : '2. Preferred Skills (Point Bonus Only)'}
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
                      {item.status === 'MATCH' ? '+ Point Bonus' : (locale === 'vi' ? 'Không tìm thấy' : 'Not Provided')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Match Factor Breakdown List with Mathematical Explainability */}
      <div className="bg-white dark:bg-[#111C38] border border-slate-200 dark:border-[#1E293B] rounded-2xl p-6 shadow-xs space-y-4 transition-colors">
        <div className="border-b border-slate-100 dark:border-[#1E293B] pb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-bold font-editorial text-slate-900 dark:text-white flex items-center gap-2">
            <Calculator className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>{locale === 'vi' ? 'Chi tiết Thành phần & Tái dựng Điểm (Explainable Factor Breakdown)' : 'Explainable Match Factors Breakdown'}</span>
          </h3>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            {locale === 'vi' ? 'Công thức: Score = ∑(Score_i × EffectiveWeight_i)' : 'Formula: Score = ∑(Score_i × EffectiveWeight_i)'}
          </span>
        </div>

        <div className="space-y-3">
          {data.matchFactors.map((factor, idx) => {
            const isNotAvailable = factor.status === 'NOT_AVAILABLE' || factor.score === null;
            return (
              <div key={idx} className="p-4 rounded-xl bg-slate-50 dark:bg-[#13233F] border border-slate-200 dark:border-[#1E293B] space-y-2 text-xs transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white font-mono text-sm">{factor.factorName}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      isNotAvailable
                        ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                        : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                    }`}>
                      {factor.status || (isNotAvailable ? 'NOT_AVAILABLE' : 'AVAILABLE')}
                    </span>
                    {factor.calculationMethod && (
                      <span className="hidden sm:inline-block text-[10px] text-slate-500 dark:text-slate-400 font-mono bg-white dark:bg-[#111C38] px-1.5 py-0.5 rounded border border-slate-200 dark:border-[#1E293B]">
                        {factor.calculationMethod}
                      </span>
                    )}
                  </div>
                  
                  {/* Score & Weighted Contribution */}
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block font-mono">Điểm thô / Normalized</span>
                      {isNotAvailable ? (
                        <span className="font-mono text-xs font-semibold text-slate-400 italic">Chưa có dữ liệu</span>
                      ) : (
                        <span className="font-mono font-bold text-slate-900 dark:text-white">{factor.score?.toFixed(1)}%</span>
                      )}
                    </div>
                    {factor.weightedContribution !== undefined && (
                      <div className="text-right pl-3 border-l border-slate-200 dark:border-[#1E293B]">
                        <span className="text-[10px] text-slate-400 block font-mono">Đóng góp (+pts)</span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          +{factor.weightedContribution.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Weights info bar */}
                {(factor.configuredWeight !== undefined || factor.effectiveWeight !== undefined) && (
                  <div className="flex items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400 font-mono bg-white dark:bg-[#111C38] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#1E293B]">
                    <span>Trọng số chuẩn: <strong>{((factor.configuredWeight ?? 0) * 100).toFixed(1)}%</strong></span>
                    <span>•</span>
                    <span className="text-blue-600 dark:text-blue-400">
                      Trọng số hiệu dụng (Re-weighted): <strong>{((factor.effectiveWeight ?? 0) * 100).toFixed(1)}%</strong>
                    </span>
                  </div>
                )}

                <p className="text-slate-600 dark:text-slate-300">{factor.explanation}</p>
                {factor.evidence && (
                  <div className="text-[11px] text-slate-800 dark:text-slate-200 font-mono bg-white dark:bg-[#111C38] p-2.5 rounded-lg border border-slate-200 dark:border-[#1E293B] flex items-start gap-2">
                    <FileCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Minh chứng đã lưu:</strong> {factor.evidence}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

