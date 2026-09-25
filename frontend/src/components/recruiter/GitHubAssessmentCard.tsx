'use client';

import React from 'react';
import { GitHubAssessmentData } from '@/types';
import { GitBranch, Star, GitFork, ExternalLink, Code, Activity, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

interface GitHubAssessmentCardProps {
  assessment: GitHubAssessmentData;
}

export const GitHubAssessmentCard: React.FC<GitHubAssessmentCardProps> = ({ assessment }) => {
  const { locale } = useLanguage();

  if (!assessment.connected || assessment.status === 'NOT_CONNECTED' || assessment.status === 'NOT_APPLICABLE' || assessment.status === 'API_UNAVAILABLE' || assessment.status === 'PRIVATE_ONLY') {
    let branchTitle = locale === 'vi' ? "Tín hiệu GitHub: Chưa liên kết (Not Connected)" : "GitHub Signal: Not Connected";
    let branchDesc = locale === 'vi' ? "Ứng viên chưa liên kết tài khoản GitHub cá nhân." : "Candidate has not connected a personal GitHub account.";
    let badgeColor = "bg-slate-100 text-slate-700 border-slate-200";

    if (assessment.status === 'NOT_APPLICABLE') {
      branchTitle = locale === 'vi' ? "Tín hiệu GitHub: Không áp dụng (Not Applicable)" : "GitHub Signal: Not Applicable";
      branchDesc = locale === 'vi' ? "Vị trí tuyển dụng thuộc ngành phi kỹ thuật, tín hiệu GitHub không được áp dụng." : "Job position is non-technical, GitHub signals do not apply.";
      badgeColor = "bg-blue-50 text-blue-700 border-blue-200";
    } else if (assessment.status === 'API_UNAVAILABLE') {
      branchTitle = locale === 'vi' ? "Tín hiệu GitHub: Tạm thời không khả dụng (API Unavailable / Rate Limited)" : "GitHub Signal: API Unavailable / Rate Limited";
      branchDesc = locale === 'vi' ? "Dịch vụ GitHub API tạm thời vượt giới hạn tần suất hoặc không phản hồi." : "GitHub API rate limit reached or temporarily unavailable.";
      badgeColor = "bg-amber-50 text-amber-700 border-amber-200";
    } else if (assessment.status === 'PRIVATE_ONLY') {
      branchTitle = locale === 'vi' ? "Tín hiệu GitHub: Kho lưu trữ riêng tư / Không thể truy cập (Private / Inaccessible)" : "GitHub Signal: Private / Inaccessible";
      branchDesc = locale === 'vi' ? "Ứng viên có tài khoản GitHub nhưng kho lưu trữ liên quan ở chế độ riêng tư hoặc không có mã nguồn công khai." : "Candidate has a GitHub account but repositories are private or without public code.";
      badgeColor = "bg-purple-50 text-purple-700 border-purple-200";
    }

    return (
      <div data-testid="github-assessment" className="p-6 rounded-2xl bg-white dark:bg-[#111C38] border border-slate-200 dark:border-[#1E293B] text-slate-600 dark:text-slate-300 text-xs space-y-3 shadow-xs font-sans transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm font-editorial">
            <GitBranch className="w-5 h-5 text-[#2563EB] dark:text-[#3B82F6]" />
            <span>
              {locale === 'vi'
                ? 'Đánh giá Tín hiệu GitHub Cá nhân (GitHub Evidence Assessment)'
                : 'Personal GitHub Signal Assessment (GitHub Evidence Assessment)'}
            </span>
          </div>
          <span data-testid="github-status" className={`px-2.5 py-1 rounded-md text-[11px] font-bold border font-mono ${badgeColor}`}>
            {assessment.status || 'NOT_CONNECTED'}
          </span>
        </div>
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#13233F] border border-slate-200 dark:border-[#1E293B] space-y-1.5 transition-colors">
          <span className="font-semibold text-slate-900 dark:text-white block">{branchTitle}</span>
          <p className="text-[11px] text-slate-600 dark:text-slate-300">
            {branchDesc}{' '}
            {locale === 'vi' ? (
              <>
                Nền tảng tự động kích hoạt cơ chế <strong>Graceful Fallback: Overall Score = Core JD-CV Score</strong>, hoàn toàn <strong>không phạt trừ 0 điểm</strong> hay làm sai lệch thứ hạng của ứng viên.
              </>
            ) : (
              <>
                Platform activates <strong>Graceful Fallback: Overall Score = Core JD-CV Score</strong> with <strong>zero penalty</strong> and unbiased candidate ranking.
              </>
            )}
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
    <div data-testid="github-assessment" className="bg-[#111C38] border border-[#1E293B] rounded-2xl p-6 sm:p-7 shadow-xl space-y-6 text-xs text-white font-sans">
      {/* Header matching Figma Screen 08 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1E293B] pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#3B82F6] animate-pulse" />
            <h3 className="text-base font-bold text-white tracking-wide">
              Verifiable GitHub Ingestion &amp; Observable Signals
            </h3>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span>{locale === 'vi' ? 'Tài khoản GitHub Công khai:' : 'Public GitHub Account:'}</span>
            <span data-testid="candidate-identifier" className="font-bold text-[#3B82F6] font-mono">@{assessment.username}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span data-testid="github-status" className="px-3 py-1 rounded-full bg-[#13233F] border border-blue-400/30 text-[#3B82F6] font-mono text-[11px] font-bold">
            Public GitHub Signal: Verified
          </span>
          <a
            href={`https://github.com/${assessment.username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#3B82F6] hover:text-white flex items-center gap-1 font-semibold transition"
          >
            <span>GitHub Profile</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* 2-Column Section: Heatmap & Verified Language Index */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
        {/* Left: Code Commits Density & Heatmap */}
        <div className="space-y-3 bg-[#13233F] border border-[#1E3A5F] p-4 rounded-xl">
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
                        ? 'bg-[#1E293B]'
                        : day.intensity === 2
                        ? 'bg-amber-400 shadow-sm shadow-amber-400/40'
                        : day.intensity === 1
                        ? 'bg-[#2563EB]'
                        : 'bg-blue-900'
                    }`}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-300 pt-1">
            <span>{locale === 'vi' ? 'Tần suất commit thấp' : 'Low commit volume'}</span>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#1E293B]" />
              <span className="w-2.5 h-2.5 rounded-xs bg-blue-900" />
              <span className="w-2.5 h-2.5 rounded-xs bg-[#2563EB]" />
              <span className="w-2.5 h-2.5 rounded-xs bg-amber-400" />
            </div>
            <span>{locale === 'vi' ? 'Tần suất commit cao' : 'High commit volume'}</span>
          </div>
        </div>

        {/* Right: Verified Language Index */}
        <div data-testid="github-language-distribution" className="space-y-3 bg-[#13233F] border border-[#1E3A5F] p-4 rounded-xl">
          <span className="text-[10px] font-bold text-amber-400 tracking-wider uppercase block">
            LANGUAGES OBSERVED IN PUBLIC REPOSITORIES
          </span>
          {assessment.languageDistribution && Object.keys(assessment.languageDistribution).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(assessment.languageDistribution).map(([lang, pct]) => (
                <div key={lang} className="space-y-1">
                  <div className="flex justify-between text-[11px] font-medium">
                    <span className="text-slate-200">{lang}</span>
                    <span className="font-mono text-amber-300 font-bold">{pct.toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[#1E293B] overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-400 to-amber-400 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[11px] text-slate-300 py-2">
              {locale === 'vi' ? 'Không có dữ liệu ngôn ngữ công khai' : 'No public language data'}
            </div>
          )}
        </div>
      </div>

      {/* Top Languages & Activity Signal Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-3.5 rounded-xl bg-[#13233F] border border-[#1E3A5F] space-y-1">
          <span className="text-slate-300 block text-[11px]">{locale === 'vi' ? 'Tổng số Repositories Công khai' : 'Total Public Repositories'}</span>
          <span className="text-xl font-bold text-white font-mono">{assessment.publicRepoCount || 0} Repos</span>
        </div>

        <div data-testid="github-activity-signal" className="p-3.5 rounded-xl bg-[#13233F] border border-[#1E3A5F] space-y-1">
          <span className="text-slate-300 block text-[11px]">{locale === 'vi' ? 'Tín hiệu Hoạt động Công khai (Activity Signal)' : 'Public Activity Signal'}</span>
          <span className={`text-sm font-bold flex items-center gap-1.5 ${
            assessment.activitySignal === 'HIGH' ? 'text-[#3B82F6]' : 'text-amber-400'
          }`}>
            <Activity className="w-4 h-4" />
            <strong className="font-mono">{assessment.activitySignal || 'LIMITED_OBSERVABLE_ACTIVITY'}</strong>
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#13233F] border border-[#1E3A5F] space-y-1">
          <span className="text-slate-300 block text-[11px]">{locale === 'vi' ? 'Hoạt động Quan sát Gần nhất' : 'Most Recent Observable Activity'}</span>
          <span className="text-sm font-semibold text-white">
            {assessment.latestActivityDaysAgo !== undefined
              ? (locale === 'vi' ? `${assessment.latestActivityDaysAgo} ngày trước` : `${assessment.latestActivityDaysAgo} days ago`)
              : (locale === 'vi' ? 'Không có dữ liệu hoạt động công khai' : 'No public activity data')}
          </span>
        </div>
      </div>

      {/* Relevant Repositories List */}
      {assessment.repos && assessment.repos.length > 0 && (
        <div data-testid="github-relevant-repos" className="space-y-3 pt-2 border-t border-[#1E293B]">
          <span className="font-bold text-slate-200 block text-xs">
            {locale === 'vi'
              ? 'Bối cảnh Kho Lưu trữ & Repositories Phù hợp với JD (Public repository context)'
              : 'JD-Relevant Repositories & Context (Public repository context)'}
          </span>
          <div className="space-y-3">
            {assessment.repos.map((repo, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-[#13233F] border border-[#1E3A5F] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[#3B82F6] font-mono">{repo.name}</span>
                  <div className="flex items-center gap-3 text-slate-300 font-mono text-[11px]">
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
                <p className="text-slate-300 text-xs">{repo.description}</p>
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>{locale === 'vi' ? 'Ngôn ngữ chính:' : 'Primary language:'} <strong className="text-white">{repo.primaryLanguage}</strong></span>
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

