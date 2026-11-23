'use client';

import { AccountAvatar } from '@/components/account/AccountAvatar';
import { formatMatchScore } from '@/lib/matchPresentation';
import { MatchScoreBadge } from '@/components/recruiter/MatchScoreBadge';
import { statusLabel } from '@/lib/statusLabels';
import React, { useState, useEffect, use, useMemo, useRef } from 'react';
import Link from 'next/link';
import { Job, Application, CandidateRankingItem, MatchInspectionData } from '@/types';
import { fetchRecruiterJobById, fetchCandidateRankings, fetchMatchInspection, fetchJobApplications } from '@/lib/api';
import { CandidateRankingTable } from '@/components/recruiter/CandidateRankingTable';
import { CandidateCompareModal } from '@/components/recruiter/CandidateCompareModal';
import { Award, ArrowLeft, Layers, GitBranch } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { EmptyState } from '@/components/common/EmptyState';
import { Reveal } from '@/components/motion/Reveal';

export default function CandidateRankingPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { t, locale } = useLanguage();
  const [job, setJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [rankings, setRankings] = useState<CandidateRankingItem[]>([]);
  const [topInspectionResult, setTopInspectionResult] = useState<{
    applicationId: string;
    data: MatchInspectionData | null;
  } | null>(null);
  
  const [minScoreFilter, setMinScoreFilter] = useState<number>(0);
  const [onlyFullRequired, setOnlyFullRequired] = useState<boolean>(false);
  const [selectedCompareCandidates, setSelectedCompareCandidates] = useState<CandidateRankingItem[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [loadedJobId, setLoadedJobId] = useState<string | null>(null);
  const rankingRequestIdRef = useRef(0);
  const inspectionRequestIdRef = useRef(0);

  const loadData = () => {
    const requestId = ++rankingRequestIdRef.current;
    setIsLoading(true);
    setFetchError(null);
    Promise.all([
      fetchRecruiterJobById(resolvedParams.id),
      fetchCandidateRankings(resolvedParams.id),
      fetchJobApplications(resolvedParams.id),
    ])
      .then(([j, data, apps]) => {
        if (requestId !== rankingRequestIdRef.current) return;
        setJob(j);
        setRankings(data);
        setApplications(apps);
        setFetchError(null);
        setLoadedJobId(resolvedParams.id);
      })
      .catch((error: unknown) => {
        if (requestId !== rankingRequestIdRef.current) return;
        setFetchError(error instanceof Error ? error.message : 'Không thể tải Bảng Xếp Hạng AI.');
        setLoadedJobId(resolvedParams.id);
      })
      .finally(() => {
        if (requestId === rankingRequestIdRef.current) setIsLoading(false);
      });
  };

  useEffect(() => {
    const requestId = ++rankingRequestIdRef.current;
    Promise.all([
      fetchRecruiterJobById(resolvedParams.id),
      fetchCandidateRankings(resolvedParams.id),
      fetchJobApplications(resolvedParams.id),
    ])
      .then(([nextJob, nextRankings, apps]) => {
        if (requestId !== rankingRequestIdRef.current) return;
        setJob(nextJob);
        setRankings(nextRankings);
        setApplications(apps);
        setFetchError(null);
        setLoadedJobId(resolvedParams.id);
      })
      .catch((error: unknown) => {
        if (requestId !== rankingRequestIdRef.current) return;
        setFetchError(error instanceof Error ? error.message : 'Không thể tải Bảng Xếp Hạng AI.');
        setLoadedJobId(resolvedParams.id);
      })
      .finally(() => {
        if (requestId === rankingRequestIdRef.current) setIsLoading(false);
      });

    return () => {
      rankingRequestIdRef.current += 1;
    };
  }, [resolvedParams.id]);

  const verifiedRankings = useMemo(() => rankings.filter(row =>
    row.calculationStatus === 'PGVECTOR_READY' && row.overallMatchScore !== null), [rankings]);
  const topCandidate = verifiedRankings[0] ?? null;
  const unranked = useMemo(() => {
    const rankedIds = new Set(verifiedRankings.map(row => row.applicationId));
    const rankingById = new Map(rankings.map(row => [row.applicationId, row]));
    return applications.filter(app => !rankedIds.has(app.id)).map(app => {
      const ranking = rankingById.get(app.id);
      return { app, result: ranking
        ? { matchScore: ranking.overallMatchScore, matchStatus: ranking.calculationStatus, aiAnalysisConsent: app.aiAnalysisConsent }
        : app };
    });
  }, [applications, rankings, verifiedRankings]);
  const topApplicationId = topCandidate?.applicationId;

  useEffect(() => {
    if (!topApplicationId) return;

    const requestId = ++inspectionRequestIdRef.current;
    fetchMatchInspection(topApplicationId)
      .then((data) => {
        if (requestId === inspectionRequestIdRef.current) {
          setTopInspectionResult({ applicationId: topApplicationId, data });
        }
      })
      .catch(() => {
        if (requestId === inspectionRequestIdRef.current) {
          setTopInspectionResult({ applicationId: topApplicationId, data: null });
        }
      });

    return () => {
      inspectionRequestIdRef.current += 1;
    };
  }, [topApplicationId]);

  const filteredRankings = useMemo(() => {
    let result = verifiedRankings;
    if (minScoreFilter > 0) {
      result = result.filter((r) => r.overallMatchScore !== null && r.overallMatchScore >= minScoreFilter);
    }
    if (onlyFullRequired) {
      result = result.filter((r) => r.requiredSkillsTotal !== null && r.requiredSkillsMatched === r.requiredSkillsTotal);
    }
    return result;
  }, [minScoreFilter, onlyFullRequired, verifiedRankings]);

  const topInspection = topInspectionResult && topInspectionResult.applicationId === topApplicationId
    ? topInspectionResult.data
    : null;
  const pageIsLoading = isLoading || loadedJobId !== resolvedParams.id;

  if (pageIsLoading) {
    return (
      <div className="min-h-screen bg-[var(--surface)] dark:bg-[var(--surface)] text-slate-800 dark:text-slate-100 transition-colors flex items-center justify-center p-16">
        <EmptyState
          type="LOADING"
          title={locale === 'vi' ? 'Đang tải bảng xếp hạng…' : 'Loading rankings…'}
          description=""
        />
      </div>
    );
  }

  if (fetchError || !job) {
    return (
      <div className="min-h-screen bg-[var(--surface)] dark:bg-[var(--surface)] text-slate-800 dark:text-slate-100 transition-colors flex items-center justify-center p-16">
        <EmptyState
          type="ERROR"
          title={locale === 'vi' ? 'Không thể tải Bảng Xếp Hạng AI' : 'Failed to load AI Ranking'}
          description={fetchError || (locale === 'vi' ? 'Không tìm thấy vị trí tuyển dụng.' : 'Job opening not found.')}
          primaryCtaText={locale === 'vi' ? 'Thử lại' : 'Retry'}
          onPrimaryCtaClick={loadData}
        />
      </div>
    );
  }

  const handleSelectCompare = (item: CandidateRankingItem) => {
    if (!selectedCompareCandidates.find((c) => c.applicationId === item.applicationId)) {
      setSelectedCompareCandidates([...selectedCompareCandidates, item]);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--surface)] dark:bg-[var(--surface)] text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors w-full min-w-0">
      <main className="flex-1 w-full max-w-7xl min-w-0 mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        {/* Top Breadcrumb & Page Header */}
        <Reveal direction="up" delay={0}>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[var(--border-soft)] dark:border-[var(--border)] pb-6">
            <div className="space-y-1.5">
              <Link href={`/recruiter/jobs/${job.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-1 transition">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{locale === 'vi' ? 'Quay lại bài đăng JD' : 'Back to Job JD'}</span>
              </Link>
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider font-sans">
                <Award className="w-4 h-4" />
                <span>Backend Sourced Candidate Ranking Engine</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-editorial font-bold text-slate-900 dark:text-white tracking-tight">
                {locale === 'vi' ? 'Bảng Xếp Hạng Ứng Viên Chuẩn AI' : 'AI-Standard Candidate Ranking'}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {locale === 'vi' 
                  ? `Match Report Evaluation • Vị trí: ${job.title} • Phân tích tương thích hồ sơ ứng viên so với chuẩn yêu cầu công việc` 
                  : `Match Report Evaluation • Position: ${job.title} • Multi-signal candidate compatibility against job specifications`}
              </p>
            </div>

            {selectedCompareCandidates.length > 0 && (
              <button
                onClick={() => setIsCompareModalOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-[var(--primary)] hover:bg-[var(--primary)] shadow-md shadow-blue-500/20 transition active:scale-95 flex-shrink-0 cursor-pointer"
              >
                <Layers className="w-4 h-4 text-white" />
                <span>{locale === 'vi' ? `So Sánh (${selectedCompareCandidates.length} Ứng viên)` : `Compare (${selectedCompareCandidates.length} Candidates)`}</span>
              </button>
            )}
          </div>
        </Reveal>

        {verifiedRankings.length === 0 ? (
          <EmptyState
            type="EMPTY"
            title={t('emptyStates.candidates.emptyTitle', "Chưa có ứng viên trong bảng xếp hạng")}
            description={locale === 'vi' ? 'Chưa có hồ sơ với điểm hoàn tất mà bạn có quyền xem.' : 'No applications have a completed score available to you.'}
            primaryCtaText={locale === 'vi' ? "Xem ứng viên đã nộp đơn" : "View Applicants"}
            primaryCtaHref={`/recruiter/jobs/${job.id}/applications`}
            secondaryCtaText={locale === 'vi' ? "Quay lại quản lý bài đăng" : "Back to Job Management"}
            secondaryCtaHref="/recruiter/jobs"
          />
        ) : (
          <>
            {/* SCREEN 13 SPOTLIGHT: Candidate Detail & Ranking Evaluation Banner */}
            {topCandidate && (
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-[var(--heading)]">{locale === 'vi' ? 'Kết quả đối sánh' : 'Match results'}</h2>
                  </div>
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3 py-1 rounded-xl">
                    {locale === 'vi' ? 'Ứng viên xếp đầu' : 'Top-ranked candidate'}
                  </span>
                </div>

                {/* Candidate Spotlight Banner */}
                <div className="bg-gradient-to-r from-[var(--retro-deep)] via-[var(--retro-deep)] to-[var(--retro-deep)] border border-blue-900/30 rounded-xl p-6 sm:p-7 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                  <div className="flex items-center gap-4">
                    <AccountAvatar name={topCandidate.candidateName} avatarId={topCandidate.candidateAvatarId} className="size-14 text-xl" />
                    <div>
                      <h3 className="text-2xl font-bold text-white tracking-tight">
                        {topCandidate.candidateName}
                      </h3>
                      <p className="text-xs text-blue-200/90 font-medium">
                        {topCandidate.headline || (locale === 'vi' ? 'Chưa có chức danh' : 'Headline unavailable')}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <span className="shrink-0 whitespace-nowrap px-3.5 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-bold text-xs tracking-wider uppercase font-sans">
                      {formatMatchScore(topCandidate.overallMatchScore, locale)}
                    </span>
                    <Link
                      href={`/recruiter/applications/${topCandidate.applicationId}`}
                      className="px-4 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 font-bold text-xs shadow-md shadow-blue-500/20 transition active:scale-95"
                    >
                      {locale === 'vi' ? 'Xem Hồ Sơ & Đánh Giá Chi Tiết' : 'View Profile & Full Evaluation'}
                    </Link>
                  </div>
                </div>

                {/* Two-Column Figma Screen 13 Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column: Match Factors & GitHub Activity */}
                  <div className="space-y-6">
                    {/* Professional Experience & Match Factors Card */}
                    <div className="bg-white dark:bg-[var(--surface)] border border-slate-200 dark:border-[var(--border)] rounded-xl p-6 shadow-xs space-y-4 transition-colors">
                      <h4 className="text-sm font-bold font-editorial text-slate-900 dark:text-white border-b border-slate-100 dark:border-[var(--border)] pb-3">
                        {locale === 'vi' ? 'Đánh Giá Yếu Tố Hồ Sơ & Kinh Nghiệm' : 'Profile Factors & Experience Assessment'}
                      </h4>
                      <div className="space-y-4 text-xs">
                        {topInspection?.matchFactors && topInspection.matchFactors.length > 0 ? (
                          topInspection.matchFactors.map((factor, idx) => (
                            <div key={idx} className={idx > 0 ? "pt-2 border-t border-slate-100 dark:border-[var(--border)]" : ""}>
                              <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                                <span>{factor.factorName}</span>
                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                                  factor.status === 'HIGH' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                                  factor.status === 'MODERATE' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                                  'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                }`}>
                                  {factor.status === 'HIGH' ? (locale === 'vi' ? 'Xuất sắc' : 'Excellent') : factor.status === 'MODERATE' ? (locale === 'vi' ? 'Đạt' : 'Meets') : (locale === 'vi' ? 'Cần chú ý' : 'Attention')} ({factor.score}%)
                                </span>
                              </div>
                              <p className="mt-1 text-slate-600 dark:text-slate-300 leading-relaxed">
                                {factor.explanation}
                              </p>
                              {factor.evidence && (
                                <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500 italic">
                                  {locale === 'vi' ? 'Bằng chứng:' : 'Evidence:'} {factor.evidence}
                                </p>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="space-y-2 text-slate-600 dark:text-slate-300">
                            <p>{locale === 'vi' ? 'Số năm kinh nghiệm liên quan:' : 'Relevant experience years:'} <strong className="text-slate-900 dark:text-white">{topCandidate.relevantExperienceYears == null ? '—' : `${topCandidate.relevantExperienceYears} ${locale === 'vi' ? 'năm' : 'years'}`}</strong></p>
                            <p>{locale === 'vi' ? 'Điểm tương quan hồ sơ gốc (Core Match):' : 'Core JD-CV Match score:'} <strong className="text-slate-900 dark:text-white">{formatMatchScore(topCandidate.coreJdCvScore, locale)}</strong></p>
                            <p>{locale === 'vi' ? 'Trạng thái nộp đơn:' : 'Application status:'} <span className="font-semibold text-emerald-600 dark:text-emerald-400">{statusLabel(topCandidate.status, locale)}</span></p>
                            <p className="text-slate-400">{locale === 'vi' ? 'Thời gian ứng tuyển:' : 'Applied on:'} {new Date(topCandidate.appliedDate).toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US')}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* GitHub Activity Analytics Card */}
                    <div className="bg-gradient-to-br from-[var(--retro-deep)] to-[var(--retro-deep)] border border-slate-700 rounded-xl p-6 text-white shadow-md space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                          <GitBranch className="w-4 h-4 text-blue-400" />
                          <span>GitHub Activity Analytics</span>
                        </span>
                        <span className="text-[11px] font-sans text-emerald-300/80">
                          {topCandidate.gitHubConnected ? (locale === 'vi' ? 'Đã liên kết GitHub' : 'GitHub connected') : (locale === 'vi' ? 'Chưa liên kết' : 'Not connected')}
                        </span>
                      </div>

                      {topCandidate.gitHubConnected && topInspection?.githubAssessment?.connected ? (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 rounded-xl bg-[var(--retro-deep)] border border-[var(--border)]">
                              <span className="text-[10px] text-emerald-200/70 block uppercase font-bold">Public Repositories</span>
                              <span className="text-lg font-extrabold text-[var(--warning)] font-sans">
                                {topInspection.githubAssessment.publicRepoCount ?? '—'}
                              </span>
                            </div>

                            <div className="p-3 rounded-xl bg-[var(--retro-deep)] border border-[var(--border)]">
                              <span className="text-[10px] text-emerald-200/70 block uppercase font-bold">
                                {locale === 'vi' ? 'Tín hiệu hoạt động' : 'Activity Signal'}
                              </span>
                              <span className="text-lg font-extrabold text-[var(--warning)] font-sans">
                                {topInspection.githubAssessment.activitySignal || '—'}
                              </span>
                            </div>
                          </div>

                          {topInspection.githubAssessment.topLanguages && topInspection.githubAssessment.topLanguages.length > 0 && (
                            <div className="text-[11px] text-emerald-200/80">
                              <span className="font-semibold text-white">{locale === 'vi' ? 'Ngôn ngữ chính: ' : 'Primary Languages: '}</span>
                              {topInspection.githubAssessment.topLanguages.join(', ')}
                            </div>
                          )}

                          <p className="text-[11px] text-emerald-100/70 leading-relaxed">
                            {topInspection.githubAssessment.overallAssessment ||
                              (locale === 'vi' 
                                ? `Tài khoản GitHub @${topInspection.githubAssessment.username || ''} đã được tích hợp đối soát tự động vào hệ thống xếp hạng.` 
                                : `GitHub profile @${topInspection.githubAssessment.username || ''} was automatically ingested for signal analysis.`)}
                          </p>
                        </>
                      ) : (
                        <p className="text-[11px] text-emerald-100/70 leading-relaxed">
                          {locale === 'vi'
                            ? 'Chưa có dữ liệu GitHub hiển thị cho kết quả này.'
                            : 'GitHub data is unavailable for this result.'}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Verified Skill Comparison & Rank Alignment Audit */}
                  <div className="space-y-6">
                    {/* Verified Skill Comparison Card */}
                    <div className="bg-white dark:bg-[var(--surface)] border border-slate-200 dark:border-[var(--border)] rounded-xl p-6 shadow-xs space-y-4 transition-colors">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-[var(--border)] pb-3">
                        <h4 className="text-sm font-bold font-editorial text-slate-900 dark:text-white">
                          {locale === 'vi' ? 'Kỹ Năng Đối Sánh Với Yêu Cầu JD' : 'Skills Alignment with Job Criteria'}
                        </h4>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                          {topCandidate.requiredSkillsMatched ?? '—'} / {topCandidate.requiredSkillsTotal ?? '—'} {locale === 'vi' ? 'Kỹ năng bắt buộc' : 'Required skills'}
                        </span>
                      </div>

                      <div className="space-y-3.5 text-xs max-h-64 overflow-y-auto pr-1">
                        {topInspection?.requiredSkillsStatus && topInspection.requiredSkillsStatus.length > 0 ? (
                          topInspection.requiredSkillsStatus.map((skill, idx) => (
                            <div key={idx}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-slate-900 dark:text-white">{skill.skillName}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                  skill.status === 'MATCH'
                                    ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800'
                                    : skill.status === 'PARTIAL'
                                    ? 'text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800'
                                    : 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800'
                                }`}>
                                  {skill.status === 'MATCH' ? (locale === 'vi' ? 'Khớp 100%' : '100% Match') : skill.status === 'PARTIAL' ? (locale === 'vi' ? 'Khớp một phần' : 'Partial Match') : (locale === 'vi' ? 'Còn thiếu' : 'Missing')}
                                </span>
                              </div>
                              <div className="w-full h-2 bg-slate-100 dark:bg-[var(--surface)] rounded-xl overflow-hidden">
                                <div
                                  className={`h-full rounded-xl ${
                                    skill.status === 'MATCH' ? 'bg-emerald-500' : skill.status === 'PARTIAL' ? 'bg-amber-500' : 'bg-rose-400'
                                  }`}
                                  style={{ width: skill.status === 'MATCH' ? '100%' : skill.status === 'PARTIAL' ? '50%' : '15%' }}
                                />
                              </div>
                              {skill.evidenceText && (
                                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 italic">
                                  {skill.evidenceText}
                                </p>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="text-slate-500 dark:text-slate-400 py-2">
                            {topCandidate.requiredSkillsMissingNames.length > 0 ? (
                              <div>
                                <p className="text-amber-600 dark:text-amber-400 font-semibold mb-1">
                                  {locale === 'vi' ? 'Kỹ năng bắt buộc còn thiếu:' : 'Missing required skills:'}
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {topCandidate.requiredSkillsMissingNames.map((s, i) => (
                                    <span key={i} className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[11px]">
                                      {s}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <p className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                {locale === 'vi' ? 'Đã đáp ứng đầy đủ tất cả kỹ năng yêu cầu của bài đăng tuyển!' : 'All required skills for this job opening are fully met!'}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Rank Alignment Audit Card */}
                    <div className="bg-white dark:bg-[var(--surface)] border border-slate-200 dark:border-[var(--border)] rounded-xl p-6 shadow-xs space-y-3 transition-colors">
                      <h4 className="text-sm font-bold font-editorial text-slate-900 dark:text-white border-b border-slate-100 dark:border-[var(--border)] pb-3">
                        Rank Alignment Audit
                      </h4>
                      <span className="text-sm font-bold text-[var(--primary)] dark:text-blue-400 block font-sans">
                        {locale === 'vi' ? `Xếp hạng #${topCandidate.rank || 1} trên tổng số ${verifiedRankings.length} ứng viên` : `Rank #${topCandidate.rank || 1} of ${verifiedRankings.length} candidates`}
                      </span>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {topInspection?.humanReadableExplanation ||
                          (locale === 'vi' 
                            ? `Kết quả xếp hạng được tổng hợp tự động bởi thuật toán Matching Engine. Điểm số dựa trên sự tương thích giữa CV, yêu cầu JD (${formatMatchScore(topCandidate.coreJdCvScore, locale)}) và các chỉ số kỹ thuật bổ trợ.`
                            : `Ranking outcome synthesized by the Matching Engine algorithm. Score based on CV-JD correlation (${formatMatchScore(topCandidate.coreJdCvScore, locale)}) and auxiliary telemetry.`)}
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Filter Bar & Ranking Overview */}
            <section className="space-y-4">
              <div className="bg-white dark:bg-[var(--surface)] border border-slate-200 dark:border-[var(--border)] rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs transition-colors">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 dark:text-slate-400 font-semibold">
                      {locale === 'vi' ? 'Điểm Overall tối thiểu:' : 'Minimum Overall Score:'}
                    </span>
                    <select
                      value={minScoreFilter}
                      onChange={(e) => setMinScoreFilter(parseFloat(e.target.value) || 0)}
                      className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[var(--surface)] border border-slate-200 dark:border-[var(--border)] text-slate-900 dark:text-white text-xs focus:outline-none focus:border-[var(--border)] font-semibold"
                    >
                      <option value={0}>{locale === 'vi' ? 'Tất cả điểm số' : 'All scores'}</option>
                      <option value={70}>≥ 70.0% ({locale === 'vi' ? 'Tốt' : 'Good'})</option>
                      <option value={80}>≥ 80.0% ({locale === 'vi' ? 'Rất cao' : 'High'})</option>
                      <option value={85}>≥ 85.0% ({locale === 'vi' ? 'Xuất sắc' : 'Excellent'})</option>
                      <option value={90}>≥ 90.0%</option>
                    </select>
                  </div>

                  <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={onlyFullRequired}
                      onChange={(e) => setOnlyFullRequired(e.target.checked)}
                      className="rounded text-[var(--primary)] focus:ring-[var(--border)] border-slate-300 dark:border-[var(--border)]"
                    />
                    <span>{locale === 'vi' ? 'Chỉ hiển thị ứng viên đáp ứng 100% Kỹ năng Bắt buộc (0 missing)' : 'Only show candidates meeting 100% Required Skills (0 missing)'}</span>
                  </label>
                </div>

                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  {locale === 'vi' ? 'Hiển thị' : 'Showing'} <strong className="text-slate-900 dark:text-white">{filteredRankings.length} / {verifiedRankings.length}</strong> {locale === 'vi' ? 'ứng viên trong danh sách xếp hạng' : 'candidates in ranking list'}
                </span>
              </div>

              {/* Candidate Ranking Table or Empty State */}
              {filteredRankings.length > 0 ? (
                <CandidateRankingTable
                  rankings={filteredRankings}
                  onSelectCandidateForCompare={handleSelectCompare}
                />
              ) : (
                <EmptyState
                  type="NO_MATCH"
                  title={t('emptyStates.candidates.noMatchTitle', "Không có ứng viên nào khớp với bộ lọc")}
                  description={t('emptyStates.candidates.noMatchDesc', "Hãy hạ mức điểm Overall tối thiểu hoặc bỏ chọn bộ lọc kỹ năng bắt buộc để xem danh sách đầy đủ.")}
                  primaryCtaText={t('emptyStates.candidates.resetFilters', "Hiển thị toàn bộ bảng xếp hạng")}
                  onPrimaryCtaClick={() => {
                    setMinScoreFilter(0);
                    setOnlyFullRequired(false);
                  }}
                />
              )}
            </section>
          </>
        )}


        {unranked.length > 0 && <section className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6">
          <h2 className="text-lg font-semibold">{locale === 'vi' ? 'Hồ sơ ngoài bảng xếp hạng' : 'Applications outside the ranking'}</h2>
          <ul className="divide-y divide-[var(--border-soft)]">
            {unranked.map(({ app, result }) => <li key={app.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <Link className="flex min-w-0 items-center gap-2 break-words font-semibold text-[var(--primary)] underline" href={`/recruiter/applications/${app.id}`}>
                <AccountAvatar name={app.candidateName} avatarId={app.candidateAvatarId} className="size-8 text-xs" />
                {app.candidateName || (locale === 'vi' ? 'Ứng viên' : 'Candidate')}
              </Link>
              <MatchScoreBadge application={result} locale={locale} />
            </li>)}
          </ul>
        </section>}

        {/* Candidate Comparison Modal */}
        <CandidateCompareModal
          isOpen={isCompareModalOpen}
          onClose={() => setIsCompareModalOpen(false)}
          candidates={selectedCompareCandidates}
        />
      </main>
    </div>
  );
}

