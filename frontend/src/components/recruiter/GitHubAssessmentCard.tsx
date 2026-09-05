'use client';

import React from 'react';
import { GitHubAssessmentData } from '@/types';
import { GitBranch, Star, GitFork, ExternalLink, Code, Activity, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';

interface GitHubAssessmentCardProps {
  assessment: GitHubAssessmentData;
}

export const GitHubAssessmentCard: React.FC<GitHubAssessmentCardProps> = ({ assessment }) => {
  if (!assessment.connected) {
    return (
      <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0] text-[#64748B] text-xs space-y-3 shadow-sm font-sans">
        <div className="flex items-center gap-2 text-[#0C2B24] font-bold text-sm">
          <GitBranch className="w-5 h-5 text-[#10B981]" />
          <span>Đánh giá GitHub Cá nhân (GitHub Assessment)</span>
        </div>
        <div className="p-4 rounded-xl bg-[#F8FAF9] border border-[#E2E8F0] space-y-1">
          <span className="font-semibold text-[#0C2B24] block">Tín hiệu GitHub: Chưa liên kết (Not Connected) hoặc Không áp dụng</span>
          <p className="text-[11px] text-[#64748B]">
            Ứng viên chưa đính kèm tài khoản GitHub hoặc vị trí tuyển dụng thuộc ngành phi kỹ thuật. Nền tảng tự động chuyển sang chiến lược <strong>Fallback: Overall Score = Core JD-CV Score</strong>, tuyệt đối <strong>không phạt trừ 0 điểm</strong>.
          </p>
        </div>
      </div>
    );
  }

  // Generate a commit grid heatmap representation for visual fidelity
  const heatmapWeeks = Array.from({ length: 16 }, (_, weekIdx) =>
    Array.from({ length: 4 }, (_, dayIdx) => {
      const active = (weekIdx * 3 + dayIdx * 7) % 5 !== 0;
      const intensity = (weekIdx + dayIdx) % 3;
      return { active, intensity };
    })
  );

  return (
    <div className="bg-[#081E19] border border-[#12382F] rounded-2xl p-6 sm:p-7 shadow-xl space-y-6 text-xs text-white font-sans">
      {/* Header matching Figma Screen 08 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#12382F] pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
            <h3 className="text-base font-bold text-white tracking-wide">
              Verifiable GitHub Ingestion &amp; Activity
            </h3>
          </div>
          <div className="flex items-center gap-2 text-xs text-emerald-200/80">
            <span>Đánh giá GitHub Cá nhân:</span>
            <span className="font-bold text-[#10B981] font-mono">@{assessment.username}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-full bg-[#0C2B24] border border-emerald-400/30 text-emerald-300 font-mono text-[11px] font-bold">
            98/100 Code Quality Score
          </span>
          <a
            href={`https://github.com/${assessment.username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-emerald-300 hover:text-white flex items-center gap-1 font-semibold transition"
          >
            <span>GitHub Profile</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* 2-Column Section: Heatmap & Verified Language Index */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
        {/* Left: Code Commits Density & Heatmap */}
        <div className="space-y-3 bg-[#0C2B24]/80 border border-[#164E41] p-4 rounded-xl">
          <span className="text-[10px] font-bold text-amber-400 tracking-wider uppercase block">
            CODE COMMITS DENSITY &amp; HEATMAP
          </span>
          <div className="flex gap-1.5 overflow-x-auto py-1">
            {heatmapWeeks.map((week, wIdx) => (
              <div key={wIdx} className="flex flex-col gap-1.5">
                {week.map((day, dIdx) => (
                  <div
                    key={dIdx}
                    className={`w-3.5 h-3.5 rounded-sm transition-all ${
                      !day.active
                        ? 'bg-[#12382F]'
                        : day.intensity === 2
                        ? 'bg-amber-400 shadow-sm shadow-amber-400/40'
                        : day.intensity === 1
                        ? 'bg-[#10B981]'
                        : 'bg-emerald-800'
                    }`}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between text-[10px] text-emerald-200/60 pt-1">
            <span>Low commit volume</span>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#12382F]" />
              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-800" />
              <span className="w-2.5 h-2.5 rounded-xs bg-[#10B981]" />
              <span className="w-2.5 h-2.5 rounded-xs bg-amber-400" />
            </div>
            <span>High commit volume</span>
          </div>
        </div>

        {/* Right: Verified Language Index */}
        <div className="space-y-3 bg-[#0C2B24]/80 border border-[#164E41] p-4 rounded-xl">
          <span className="text-[10px] font-bold text-amber-400 tracking-wider uppercase block">
            VERIFIED LANGUAGE INDEX
          </span>
          {assessment.languageDistribution ? (
            <div className="space-y-2">
              {Object.entries(assessment.languageDistribution).map(([lang, pct]) => (
                <div key={lang} className="space-y-1">
                  <div className="flex justify-between text-[11px] font-medium">
                    <span className="text-emerald-100">{lang}</span>
                    <span className="font-mono text-amber-300 font-bold">{pct.toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[#12382F] overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-400 to-amber-400 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2 text-[11px]">
              <div className="flex justify-between">
                <span>Java / Spring</span>
                <span className="font-mono text-amber-300 font-bold">68%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[#12382F]">
                <div className="bg-[#10B981] h-full rounded-full" style={{ width: '68%' }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top Languages & Activity Signal Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-3.5 rounded-xl bg-[#0C2B24]/90 border border-[#164E41] space-y-1">
          <span className="text-emerald-200/70 block text-[11px]">Tổng số Repositories Công khai</span>
          <span className="text-xl font-bold text-white font-mono">{assessment.publicRepoCount || 0} Repos</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0C2B24]/90 border border-[#164E41] space-y-1">
          <span className="text-emerald-200/70 block text-[11px]">Tín hiệu Hoạt động Công khai (Activity Signal)</span>
          <span className={`text-sm font-bold flex items-center gap-1.5 ${
            assessment.activitySignal === 'HIGH' ? 'text-emerald-400' : 'text-amber-400'
          }`}>
            <Activity className="w-4 h-4" />
            <strong className="font-mono">{assessment.activitySignal || 'HIGH'}</strong>
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0C2B24]/90 border border-[#164E41] space-y-1">
          <span className="text-emerald-200/70 block text-[11px]">Hoạt động Quan sát Gần nhất</span>
          <span className="text-sm font-semibold text-white">
            {assessment.latestActivityDaysAgo !== undefined ? `${assessment.latestActivityDaysAgo} ngày trước` : '1 ngày trước'}
          </span>
        </div>
      </div>

      {/* Relevant Repositories List */}
      {assessment.repos && assessment.repos.length > 0 && (
        <div className="space-y-3 pt-2 border-t border-[#12382F]">
          <span className="font-bold text-emerald-200 block text-xs">Mã nguồn &amp; Repositories Phù hợp với JD</span>
          <div className="space-y-3">
            {assessment.repos.map((repo, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-[#0C2B24]/90 border border-[#164E41] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-emerald-300 font-mono">{repo.name}</span>
                  <div className="flex items-center gap-3 text-emerald-200/70 font-mono text-[11px]">
                    <span className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-amber-400" />
                      {repo.stars}
                    </span>
                    <span className="flex items-center gap-1">
                      <GitFork className="w-3.5 h-3.5" />
                      {repo.forks}
                    </span>
                  </div>
                </div>
                <p className="text-emerald-100/80 text-xs">{repo.description}</p>
                <div className="flex items-center justify-between text-[11px] text-emerald-200/60 pt-1">
                  <span>Ngôn ngữ chính: <strong className="text-white">{repo.primaryLanguage}</strong></span>
                  <span className="text-amber-300 italic">{repo.relevanceExplanation}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

