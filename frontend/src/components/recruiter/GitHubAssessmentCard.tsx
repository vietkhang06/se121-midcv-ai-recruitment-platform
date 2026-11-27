'use client';

import { statusLabel } from '@/lib/statusLabels';
import React from 'react';
import { GitHubAssessmentData } from '@/types';
import { GitBranch, Star, GitFork, ExternalLink, Activity } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

interface GitHubAssessmentCardProps {
  assessment: GitHubAssessmentData;
}

export const GitHubAssessmentCard: React.FC<GitHubAssessmentCardProps> = ({ assessment }) => {
  const { locale } = useLanguage();

  if (!assessment.connected || assessment.status === 'NOT_CONNECTED' || assessment.status === 'NOT_APPLICABLE' || assessment.status === 'API_UNAVAILABLE' || (assessment.status === 'PRIVATE_ONLY' || assessment.status === 'NO_PUBLIC_REPOSITORIES') || assessment.status === 'RATE_LIMITED' || assessment.status === 'NOT_FOUND' || assessment.status === 'PENDING' || assessment.status === 'LEGACY_MISSING_DATA') {
    let branchTitle = locale === 'vi' ? "Tín hiệu GitHub: Chưa liên kết (Not Connected)" : "GitHub Signal: Not Connected";
    let branchDesc = locale === 'vi' ? "Ứng viên chưa liên kết tài khoản GitHub cá nhân." : "Candidate has not connected a personal GitHub account.";
    let badgeColor = "bg-slate-100 text-slate-700 border-slate-200";

    if (assessment.status === 'RATE_LIMITED' || assessment.status === 'NOT_FOUND' || assessment.status === 'PENDING' || assessment.status === 'LEGACY_MISSING_DATA') {
      branchTitle = statusLabel(assessment.status, locale);
      branchDesc = locale === 'vi' ? 'Chưa có minh chứng GitHub đủ điều kiện cho kết quả này.' : 'No eligible GitHub evidence for this result.';
    }
    if (assessment.status === 'PUBLIC_ONLY') {
      branchTitle = locale === 'vi' ? 'Hồ sơ GitHub công khai · chưa xác minh chủ sở hữu' : 'Public GitHub profile · ownership unverified';
      branchDesc = locale === 'vi' ? 'Thông tin công khai không được dùng làm năng lực đã xác minh.' : 'Public signals are not treated as verified competency.';
      badgeColor = 'bg-amber-50 text-amber-800 border-amber-200';
    }

    if (assessment.status === 'NOT_APPLICABLE') {
      branchTitle = locale === 'vi' ? "Tín hiệu GitHub: Không áp dụng (Not Applicable)" : "GitHub Signal: Not Applicable";
      branchDesc = locale === 'vi' ? "Vị trí tuyển dụng thuộc ngành phi kỹ thuật, tín hiệu GitHub không được áp dụng." : "Job position is non-technical, GitHub signals do not apply.";
      badgeColor = "bg-blue-50 text-blue-700 border-blue-200";
    } else if (assessment.status === 'API_UNAVAILABLE') {
      branchTitle = locale === 'vi' ? "Tín hiệu GitHub: Tạm thời không khả dụng (API Unavailable / Rate Limited)" : "GitHub Signal: API Unavailable / Rate Limited";
      branchDesc = locale === 'vi' ? "Dịch vụ GitHub API tạm thời vượt giới hạn tần suất hoặc không phản hồi." : "GitHub API rate limit reached or temporarily unavailable.";
      badgeColor = "bg-amber-50 text-amber-700 border-amber-200";
    } else if ((assessment.status === 'PRIVATE_ONLY' || assessment.status === 'NO_PUBLIC_REPOSITORIES')) {
      branchTitle = locale === 'vi' ? "Tín hiệu GitHub: Chưa có kho công khai trong lần quét" : "GitHub signal: No public repositories observed";
      branchDesc = locale === 'vi' ? "Lần quét không ghi nhận kho công khai đủ điều kiện để chấm điểm." : "The scan found no public repositories eligible for scoring.";
      badgeColor = "bg-purple-50 text-purple-700 border-purple-200";
    }

    return (
      <div data-testid="github-assessment" className="p-6 rounded-xl bg-white dark:bg-[var(--surface)] border border-slate-200 dark:border-[var(--border)] text-slate-600 dark:text-slate-300 text-xs space-y-3 shadow-xs font-sans transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm font-editorial">
            <GitBranch className="w-5 h-5 text-[var(--primary)] dark:text-[var(--retro-sky)]" />
            <span>
              {locale === 'vi'
                ? 'Đánh giá Tín hiệu GitHub Cá nhân (GitHub Evidence Assessment)'
                : 'Personal GitHub Signal Assessment (GitHub Evidence Assessment)'}
            </span>
          </div>
          <span data-testid="github-status" className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border font-sans ${badgeColor}`}>
            {statusLabel(assessment.status || 'NOT_CONNECTED', locale)}
          </span>
        </div>
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-[var(--surface)] border border-slate-200 dark:border-[var(--border)] space-y-1.5 transition-colors">
          <span className="font-semibold text-slate-900 dark:text-white block">{branchTitle}</span>
          <p className="text-[11px] text-slate-600 dark:text-slate-300">
            {branchDesc}{' '}
            {locale === 'vi' ? (
              <>
                Nền tảng tự động kích hoạt cơ chế <strong>Graceful Fallback: Overall Score = Core JD-CV Score</strong>, hoàn toàn <strong>không phạt trừ 0 điểm</strong> hay làm sai lệch thứ hạng của ứng viên.
              </>
            ) : (
              <>
                Platform activates <strong>Graceful Fallback: Overall Score = Core JD-CV Score</strong> with <strong>zero penalty</strong> for missing GitHub evidence.
              </>
            )}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="github-assessment" className="bg-[var(--retro-deep)] border border-[var(--border)] rounded-xl p-6 sm:p-7 shadow-xl space-y-6 text-xs text-white font-sans">
      {/* Header matching Figma Screen 08 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-xl bg-[var(--primary)] animate-pulse" />
            <h3 className="text-base font-bold text-white tracking-wide">
              Verifiable GitHub Ingestion &amp; Observable Signals
            </h3>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span>{locale === 'vi' ? 'Tài khoản GitHub Công khai:' : 'Public GitHub Account:'}</span>
            <span data-testid="candidate-identifier" className="font-bold text-[var(--primary)] font-sans">@{assessment.username}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span data-testid="github-status" className="px-3 py-1 rounded-xl bg-[var(--retro-deep)] border border-blue-400/30 text-[var(--primary)] font-sans text-[11px] font-bold">
            {assessment.ownershipStatus === 'OWNED'
              ? (locale === 'vi' ? 'Chủ sở hữu đã xác minh' : 'Ownership verified')
              : (locale === 'vi' ? 'Hồ sơ công khai chưa xác minh' : 'Public profile, ownership unverified')}
          </span>
          <a
            href={`https://github.com/${assessment.username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[var(--primary)] hover:text-white flex items-center gap-1 font-semibold transition"
          >
            <span>GitHub Profile</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-[11px] text-slate-200">
        <span>{locale === 'vi' ? 'Chủ sở hữu:' : 'Ownership:'} {statusLabel(assessment.ownershipStatus, locale)}</span>
        <span>{locale === 'vi' ? 'Đồng bộ:' : 'Sync:'} {statusLabel(assessment.status, locale)}</span>
        <span>{locale === 'vi' ? 'Đủ điều kiện chấm điểm:' : 'Scoring eligible:'} {assessment.scoringEligible ? (locale === 'vi' ? 'Có' : 'Yes') : (locale === 'vi' ? 'Không' : 'No')}</span>
      </div>

      {assessment.fetchedAt && <p className="text-xs text-slate-300">{locale === 'vi' ? 'Thời điểm thu thập:' : 'Collected at:'} {assessment.fetchedAt}</p>}
      {assessment.scanScope && <p className="text-xs text-slate-300">{assessment.scanScope}</p>}
      {assessment.overallAssessment && <p className="text-xs text-slate-300">{assessment.overallAssessment}</p>}
      {/* Public signals are reported only when supplied by the sync service. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
        <div className="space-y-3 bg-[var(--retro-deep)] border border-[var(--border)] p-4 rounded-xl">
          <span className="text-[10px] font-bold text-amber-400 tracking-wider uppercase block">
            {locale === 'vi' ? 'Trạng thái đồng bộ công khai' : 'Public sync status'}
          </span>
          <p className="text-sm text-slate-100">{statusLabel(assessment.status, locale)}</p>
          <p className="text-[11px] text-slate-300">{statusLabel(assessment.ownershipStatus, locale)}</p>
        </div>

        {/* Right: Verified Language Index */}
        <div data-testid="github-language-distribution" className="space-y-3 bg-[var(--retro-deep)] border border-[var(--border)] p-4 rounded-xl">
          <span className="text-[10px] font-bold text-amber-400 tracking-wider uppercase block">
            LANGUAGES OBSERVED IN PUBLIC REPOSITORIES
          </span>
          {assessment.languageDistribution && Object.keys(assessment.languageDistribution).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(assessment.languageDistribution).map(([lang, pct]) => (
                <div key={lang} className="space-y-1">
                  <div className="flex justify-between text-[11px] font-medium">
                    <span className="text-slate-200">{lang}</span>
                    <span className="font-sans text-amber-300 font-bold">{pct.toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-xl bg-[var(--retro-deep)] overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-400 to-amber-400 rounded-xl"
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
        <div className="p-3.5 rounded-xl bg-[var(--retro-deep)] border border-[var(--border)] space-y-1">
          <span className="text-slate-300 block text-[11px]">{locale === 'vi' ? 'Tổng số Repositories Công khai' : 'Total Public Repositories'}</span>
          <span className="text-xl font-bold text-white font-sans">{assessment.publicRepoCount ?? '—'} Repos</span>
        </div>

        <div data-testid="github-activity-signal" className="p-3.5 rounded-xl bg-[var(--retro-deep)] border border-[var(--border)] space-y-1">
          <span className="text-slate-300 block text-[11px]">{locale === 'vi' ? 'Tín hiệu Hoạt động Công khai (Activity Signal)' : 'Public Activity Signal'}</span>
          <span className={`text-sm font-bold flex items-center gap-1.5 ${
            assessment.activitySignal === 'HIGH' ? 'text-[var(--primary)]' : 'text-amber-400'
          }`}>
            <Activity className="w-4 h-4" />
            <strong className="font-sans">{assessment.activitySignal || (locale === 'vi' ? 'Chưa có dữ liệu' : 'No data reported')}</strong>
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-[var(--retro-deep)] border border-[var(--border)] space-y-1">
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
        <div data-testid="github-relevant-repos" className="space-y-3 pt-2 border-t border-[var(--border)]">
          <span className="font-bold text-slate-200 block text-xs">
            {locale === 'vi'
              ? 'Bối cảnh Kho Lưu trữ & Repositories Phù hợp với JD (Public repository context)'
              : 'JD-Relevant Repositories & Context (Public repository context)'}
          </span>
          <div className="space-y-3">
            {assessment.repos.map((repo, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-[var(--retro-deep)] border border-[var(--border)] space-y-2">
                <div className="flex items-center justify-between">
                  {repo.url && /^https:\/\/github\.com\/[A-Za-z0-9-]+\/[A-Za-z0-9_.-]+$/.test(repo.url)
                    ? <a href={repo.url} target="_blank" rel="noopener noreferrer" className="font-bold text-sm text-[var(--primary)] underline">{repo.name}</a>
                    : <span className="font-bold text-sm text-[var(--primary)] font-sans">{repo.name}</span>}
                  <div className="flex items-center gap-3 text-slate-300 font-sans text-[11px]">
                    <span className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-amber-400" />
                      {repo.stars ?? '—'}
                    </span>
                    <span className="flex items-center gap-1">
                      <GitFork className="w-3.5 h-3.5" />
                      {repo.forks ?? '—'}
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

