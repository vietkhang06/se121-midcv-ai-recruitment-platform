'use client';

import React from 'react';
import { GitHubAssessmentData } from '@/types';
import { GitBranch, Star, GitFork, ExternalLink, Code, Activity, ShieldAlert } from 'lucide-react';

interface GitHubAssessmentCardProps {
  assessment: GitHubAssessmentData;
}

export const GitHubAssessmentCard: React.FC<GitHubAssessmentCardProps> = ({ assessment }) => {
  if (!assessment.connected) {
    return (
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 text-xs space-y-3">
        <div className="flex items-center gap-2 text-slate-300 font-bold text-sm">
          <GitBranch className="w-5 h-5 text-slate-400" />
          <span>Đánh giá GitHub Cá nhân (GitHub Assessment)</span>
        </div>
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
          <span className="font-semibold text-slate-200 block">Tín hiệu GitHub: Chưa liên kết (Not Connected) hoặc Không áp dụng</span>
          <p className="text-[11px] text-slate-400">
            Ứng viên chưa đính kèm tài khoản GitHub hoặc vị trí tuyển dụng thuộc ngành phi kỹ thuật. Nền tảng tự động chuyển sang chiến lược <strong>Fallback: Overall Score = Core JD-CV Score</strong>, tuyệt đối <strong>không phạt trừ 0 điểm</strong>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6 text-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-cyan-400" />
          <h3 className="text-base font-bold text-white">Đánh giá GitHub Cá nhân: <span className="text-cyan-400">@{assessment.username}</span></h3>
        </div>
        <a
          href={`https://github.com/${assessment.username}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
        >
          <span>Xem GitHub Profile</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Top Languages & Activity Signal */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
          <span className="text-slate-400 block text-[11px]">Tổng số Repositories Công khai</span>
          <span className="text-xl font-bold text-white">{assessment.publicRepoCount || 0} Repos</span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
          <span className="text-slate-400 block text-[11px]">Tín hiệu Hoạt động Công khai (Activity Signal)</span>
          <span className={`text-sm font-bold flex items-center gap-1 ${
            assessment.activitySignal === 'HIGH' ? 'text-emerald-400' : 'text-amber-400'
          }`}>
            <Activity className="w-4 h-4" />
            {assessment.activitySignal || 'LIMITED'}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
          <span className="text-slate-400 block text-[11px]">Hoạt động Quan sát Gần nhất</span>
          <span className="text-sm font-semibold text-slate-200">
            {assessment.latestActivityDaysAgo !== undefined ? `${assessment.latestActivityDaysAgo} ngày trước` : 'N/A'}
          </span>
        </div>
      </div>

      {/* Language Distribution */}
      {assessment.languageDistribution && (
        <div className="space-y-2">
          <span className="font-bold text-slate-200 block text-xs">Tỷ lệ Ngôn ngữ Lập trình Quan sát (Language Distribution)</span>
          <div className="space-y-1.5">
            {Object.entries(assessment.languageDistribution).map(([lang, pct]) => (
              <div key={lang} className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-300 font-medium">
                  <span>{lang}</span>
                  <span className="font-mono text-cyan-400">{pct.toFixed(1)}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Relevant Repositories List */}
      {assessment.repos && assessment.repos.length > 0 && (
        <div className="space-y-3 pt-3 border-t border-slate-800">
          <span className="font-bold text-slate-200 block text-xs">Mã nguồn & Repositories Phù hợp với JD</span>
          <div className="space-y-3">
            {assessment.repos.map((repo, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-cyan-400">{repo.name}</span>
                  <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px]">
                    <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-amber-400" />{repo.stars}</span>
                    <span className="flex items-center gap-1"><GitFork className="w-3.5 h-3.5" />{repo.forks}</span>
                  </div>
                </div>
                <p className="text-slate-300 text-xs">{repo.description}</p>
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>Ngôn ngữ chính: <strong className="text-slate-200">{repo.primaryLanguage}</strong></span>
                  <span className="text-indigo-300 italic">{repo.relevanceExplanation}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
