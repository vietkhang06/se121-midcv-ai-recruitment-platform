'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Job, CandidateRankingItem, MatchInspectionData } from '@/types';
import { fetchJobById, fetchCandidateRankings, fetchMatchInspection } from '@/lib/api';
import { RecruiterNavbar } from '@/components/recruiter/RecruiterNavbar';
import { CandidateRankingTable } from '@/components/recruiter/CandidateRankingTable';
import { CandidateCompareModal } from '@/components/recruiter/CandidateCompareModal';
import { EmptyCandidatesIllustration } from '@/components/illustrations/Illustrations';
import { Award, ArrowLeft, Filter, Search, ShieldCheck, Sparkles, Layers, GitBranch, ArrowRight, UserCheck, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { EmptyState } from '@/components/common/EmptyState';

export default function CandidateRankingPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { t, locale } = useLanguage();
  const [job, setJob] = useState<Job | null>(null);
  const [rankings, setRankings] = useState<CandidateRankingItem[]>([]);
  const [filteredRankings, setFilteredRankings] = useState<CandidateRankingItem[]>([]);
  const [topInspection, setTopInspection] = useState<MatchInspectionData | null>(null);
  
  const [minScoreFilter, setMinScoreFilter] = useState<number>(0);
  const [onlyFullRequired, setOnlyFullRequired] = useState<boolean>(false);
  const [selectedCompareCandidates, setSelectedCompareCandidates] = useState<CandidateRankingItem[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const loadData = () => {
    setIsLoading(true);
    setFetchError(null);
    Promise.all([
      fetchJobById(resolvedParams.id),
      fetchCandidateRankings(resolvedParams.id),
    ])
      .then(([j, data]) => {
        setJob(j);
        setRankings(data);
        setFilteredRankings(data);
      })
      .catch((err) => {
        setFetchError(err.message || 'Không thể tải Bảng Xếp Hạng AI.');
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [resolvedParams.id]);

  const topCandidate = rankings.length > 0 ? rankings[0] : null;

  useEffect(() => {
    if (topCandidate?.applicationId) {
      fetchMatchInspection(topCandidate.applicationId)
        .then(setTopInspection)
        .catch(() => setTopInspection(null));
    } else {
      setTopInspection(null);
    }
  }, [topCandidate?.applicationId]);

  useEffect(() => {
    let result = [...rankings];
    if (minScoreFilter > 0) {
      result = result.filter((r) => r.overallMatchScore >= minScoreFilter);
    }
    if (onlyFullRequired) {
      result = result.filter((r) => r.requiredSkillsMissingNames.length === 0);
    }
    setFilteredRankings(result);
  }, [minScoreFilter, onlyFullRequired, rankings]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAF9] dark:bg-[#0B1329] text-slate-800 dark:text-slate-100 transition-colors flex items-center justify-center p-16">
        <EmptyState
          type="LOADING"
          title={locale === 'vi' ? 'Đang tải Bảng Xếp Hạng AI Engine...' : 'Loading AI Ranking Engine...'}
          description={locale === 'vi' ? 'Hệ thống đang truy vấn các vector điểm số đối sánh...' : 'Querying match vector scores...'}
        />
      </div>
    );
  }

  if (fetchError || !job) {
    return (
      <div className="min-h-screen bg-[#F8FAF9] dark:bg-[#0B1329] text-slate-800 dark:text-slate-100 transition-colors flex items-center justify-center p-16">
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
    <div className="min-h-screen bg-[#F8FAF9] dark:bg-[#0B1329] text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors">
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10 w-full">
        {/* Top Breadcrumb & Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E2E8F0] dark:border-[#1E293B] pb-6">
          <div className="space-y-1.5">
            <Link href={`/recruiter/jobs/${job.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-1 transition">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{locale === 'vi' ? 'Quay lại bài đăng JD' : 'Back to Job JD'}</span>
            </Link>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider font-mono">
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
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-[#2563EB] hover:bg-[#1D4ED8] shadow-md shadow-blue-500/20 transition active:scale-95 flex-shrink-0 cursor-pointer"
            >
              <Layers className="w-4 h-4 text-white" />
              <span>{locale === 'vi' ? `So Sánh (${selectedCompareCandidates.length} Ứng viên)` : `Compare (${selectedCompareCandidates.length} Candidates)`}</span>
            </button>
          )}
        </div>

        {rankings.length === 0 ? (
          <EmptyState
            type="EMPTY"
            title={t('emptyStates.candidates.emptyTitle', "Chưa có ứng viên trong bảng xếp hạng")}
            description={t('emptyStates.candidates.emptyDesc', "Vị trí tuyển dụng này chưa có ứng viên nào nộp hồ sơ để đối sánh và xếp hạng AI.")}
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
                    <h2 className="text-xl font-serif font-bold text-slate-900 dark:text-white">Match Report Evaluation</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {locale === 'vi' ? 'Đánh giá đa chiều dựa trên mô hình đối sánh ngữ nghĩa và năng lực kỹ thuật' : 'Multidimensional evaluation based on semantic matching and technical skills'}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-[#00B14F] dark:text-[#00B14F] bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3 py-1 rounded-full">
                    {locale === 'vi' ? 'Ứng viên dẫn đầu (Spotlight)' : 'Top Candidate (Spotlight)'}
                  </span>
                </div>

                {/* Candidate Dark Forest Banner */}
                <div className="bg-gradient-to-r from-[#0F2A52] via-[#1E3A5F] to-[#0F2A52] border border-blue-900/30 rounded-2xl p-6 sm:p-7 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-white/10 border-2 border-[#00B14F] flex items-center justify-center font-serif text-xl font-bold text-white shadow-inner">
                      {topCandidate.candidateName.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-2xl font-serif font-bold text-white tracking-wide">
                        {topCandidate.candidateName}
                      </h3>
                      <p className="text-xs text-blue-200/90 font-medium">
                        {topCandidate.headline || topInspection?.candidateName || (locale === 'vi' ? 'Ứng viên tiềm năng' : 'Qualified Candidate')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="px-3.5 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-[#00B14F] font-bold text-xs tracking-wider uppercase">
                      {topCandidate.overallMatchScore.toFixed(1)}% MATCH
                    </span>
                    <Link
                      href={`/recruiter/applications/${topCandidate.applicationId}`}
                      className="px-4 py-2 rounded-xl bg-[#00B14F] text-white hover:bg-[#009643] font-bold text-xs shadow-md shadow-emerald-500/20 transition active:scale-95"
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
                    <div className="bg-white dark:bg-[#111C38] border border-slate-200 dark:border-[#1E293B] rounded-2xl p-6 shadow-xs space-y-4 transition-colors">
                      <h4 className="text-sm font-bold font-editorial text-slate-900 dark:text-white border-b border-slate-100 dark:border-[#1E293B] pb-3">
                        {locale === 'vi' ? 'Đánh Giá Yếu Tố Hồ Sơ & Kinh Nghiệm' : 'Profile Factors & Experience Assessment'}
                      </h4>
                      <div className="space-y-4 text-xs">
                        {topInspection?.matchFactors && topInspection.matchFactors.length > 0 ? (
                          topInspection.matchFactors.map((factor, idx) => (
                            <div key={idx} className={idx > 0 ? "pt-2 border-t border-slate-100 dark:border-[#1E293B]" : ""}>
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
                            <p>{locale === 'vi' ? 'Số năm kinh nghiệm liên quan:' : 'Relevant experience years:'} <strong className="text-slate-900 dark:text-white">{topCandidate.relevantExperienceYears} {locale === 'vi' ? 'năm' : 'years'}</strong></p>
                            <p>{locale === 'vi' ? 'Điểm tương quan hồ sơ gốc (Core Match):' : 'Core JD-CV Match score:'} <strong className="text-slate-900 dark:text-white">{topCandidate.coreJdCvScore.toFixed(1)}%</strong></p>
                            <p>{locale === 'vi' ? 'Trạng thái nộp đơn:' : 'Application status:'} <span className="font-semibold text-[#00B14F]">{topCandidate.status}</span></p>
                            <p className="text-slate-400">{locale === 'vi' ? 'Thời gian ứng tuyển:' : 'Applied on:'} {new Date(topCandidate.appliedDate).toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US')}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Dark Forest GitHub Activity Analytics Card */}
                    <div className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] border border-[#1F4A40] rounded-2xl p-6 text-white shadow-md space-y-4">
                      <div className="flex items-center justify-between border-b border-[#1F4A40] pb-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#00B14F] flex items-center gap-1.5">
                          <GitBranch className="w-4 h-4 text-[#00B14F]" />
                          <span>GitHub Activity Analytics</span>
                        </span>
                        <span className="text-[11px] font-mono text-emerald-300/80">
                          {topCandidate.gitHubConnected ? (locale === 'vi' ? 'Đã liên kết GitHub' : 'GitHub connected') : (locale === 'vi' ? 'Chưa liên kết' : 'Not connected')}
                        </span>
                      </div>

                      {topCandidate.gitHubConnected && topInspection?.githubAssessment?.connected ? (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 rounded-xl bg-[#13233F] border border-[#1F4A40]">
                              <span className="text-[10px] text-emerald-200/70 block uppercase font-bold">Public Repositories</span>
                              <span className="text-lg font-extrabold text-[#FACC15] font-mono">
                                {topInspection.githubAssessment.publicRepoCount ?? 0} repos
                              </span>
                            </div>

                            <div className="p-3 rounded-xl bg-[#13233F] border border-[#1F4A40]">
                              <span className="text-[10px] text-emerald-200/70 block uppercase font-bold">
                                {locale === 'vi' ? 'Tín hiệu hoạt động' : 'Activity Signal'}
                              </span>
                              <span className="text-lg font-extrabold text-[#FACC15] font-mono">
                                {topInspection.githubAssessment.activitySignal || 'ACTIVE'}
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
                            ? 'Ứng viên này chưa liên kết tài khoản GitHub công khai. Điểm xếp hạng được tính toán dựa hoàn toàn trên kinh nghiệm thực tế và kỹ năng đối sánh trong hồ sơ CV.'
                            : 'This candidate has not connected a public GitHub account. Scores are calculated strictly from verified resume experience and competencies.'}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Verified Skill Comparison & Rank Alignment Audit */}
                  <div className="space-y-6">
                    {/* Verified Skill Comparison Card */}
                    <div className="bg-white dark:bg-[#111C38] border border-slate-200 dark:border-[#1E293B] rounded-2xl p-6 shadow-xs space-y-4 transition-colors">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1E293B] pb-3">
                        <h4 className="text-sm font-bold font-editorial text-slate-900 dark:text-white">
                          {locale === 'vi' ? 'Kỹ Năng Đối Sánh Với Yêu Cầu JD' : 'Skills Alignment with Job Criteria'}
                        </h4>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                          {topCandidate.requiredSkillsMatched} / {topCandidate.requiredSkillsTotal} {locale === 'vi' ? 'Kỹ năng bắt buộc' : 'Required skills'}
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
                                    ? 'text-[#00B14F] bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800'
                                    : skill.status === 'PARTIAL'
                                    ? 'text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800'
                                    : 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800'
                                }`}>
                                  {skill.status === 'MATCH' ? (locale === 'vi' ? 'Khớp 100%' : '100% Match') : skill.status === 'PARTIAL' ? (locale === 'vi' ? 'Khớp một phần' : 'Partial Match') : (locale === 'vi' ? 'Còn thiếu' : 'Missing')}
                                </span>
                              </div>
                              <div className="w-full h-2 bg-slate-100 dark:bg-[#0B1329] rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    skill.status === 'MATCH' ? 'bg-[#00B14F]' : skill.status === 'PARTIAL' ? 'bg-amber-500' : 'bg-rose-400'
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
                              <p className="text-[#00B14F] font-semibold">
                                {locale === 'vi' ? 'Đã đáp ứng đầy đủ tất cả kỹ năng yêu cầu của bài đăng tuyển!' : 'All required skills for this job opening are fully met!'}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Rank Alignment Audit Card */}
                    <div className="bg-white dark:bg-[#111C38] border border-slate-200 dark:border-[#1E293B] rounded-2xl p-6 shadow-xs space-y-3 transition-colors">
                      <h4 className="text-sm font-bold font-editorial text-slate-900 dark:text-white border-b border-slate-100 dark:border-[#1E293B] pb-3">
                        Rank Alignment Audit
                      </h4>
                      <span className="text-sm font-bold text-[#2563EB] dark:text-blue-400 block font-mono">
                        {locale === 'vi' ? `Xếp hạng #${topCandidate.rank || 1} trên tổng số ${rankings.length} ứng viên` : `Rank #${topCandidate.rank || 1} of ${rankings.length} candidates`}
                      </span>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {topInspection?.humanReadableExplanation ||
                          (locale === 'vi' 
                            ? `Kết quả xếp hạng được tổng hợp tự động bởi thuật toán Matching Engine. Điểm số dựa trên sự tương thích giữa CV, yêu cầu JD (${topCandidate.coreJdCvScore.toFixed(1)}%) và các chỉ số kỹ thuật bổ trợ.`
                            : `Ranking outcome synthesized by the Matching Engine algorithm. Score based on CV-JD correlation (${topCandidate.coreJdCvScore.toFixed(1)}%) and auxiliary telemetry.`)}
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Filter Bar & Ranking Overview */}
            <section className="space-y-4">
              <div className="bg-white dark:bg-[#111C38] border border-slate-200 dark:border-[#1E293B] rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs transition-colors">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 dark:text-slate-400 font-semibold">
                      {locale === 'vi' ? 'Điểm Overall tối thiểu:' : 'Minimum Overall Score:'}
                    </span>
                    <select
                      value={minScoreFilter}
                      onChange={(e) => setMinScoreFilter(parseFloat(e.target.value) || 0)}
                      className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#13233F] border border-slate-200 dark:border-[#1E293B] text-slate-900 dark:text-white text-xs focus:outline-none focus:border-[#2563EB] font-semibold"
                    >
                      <option value={0}>{locale === 'vi' ? 'Tất cả điểm số' : 'All scores'}</option>
                      <option value={70}>≥ 70.0% ({locale === 'vi' ? 'Tốt' : 'Good'})</option>
                      <option value={80}>≥ 80.0% ({locale === 'vi' ? 'Rất cao' : 'High'})</option>
                      <option value={85}>≥ 85.0% ({locale === 'vi' ? 'Xuất sắc' : 'Excellent'})</option>
                      <option value={90}>≥ 90.0% ({locale === 'vi' ? 'Top 1%' : 'Top 1%'})</option>
                    </select>
                  </div>

                  <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={onlyFullRequired}
                      onChange={(e) => setOnlyFullRequired(e.target.checked)}
                      className="rounded text-[#2563EB] focus:ring-[#2563EB] border-slate-300 dark:border-[#1E293B]"
                    />
                    <span>{locale === 'vi' ? 'Chỉ hiển thị ứng viên đáp ứng 100% Kỹ năng Bắt buộc (0 missing)' : 'Only show candidates meeting 100% Required Skills (0 missing)'}</span>
                  </label>
                </div>

                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  {locale === 'vi' ? 'Hiển thị' : 'Showing'} <strong className="text-slate-900 dark:text-white">{filteredRankings.length} / {rankings.length}</strong> {locale === 'vi' ? 'ứng viên trong danh sách xếp hạng' : 'candidates in ranking list'}
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

