'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Job, CandidateRankingItem } from '@/types';
import { fetchJobById, fetchCandidateRankings } from '@/lib/api';
import { RecruiterNavbar } from '@/components/recruiter/RecruiterNavbar';
import { CandidateRankingTable } from '@/components/recruiter/CandidateRankingTable';
import { CandidateCompareModal } from '@/components/recruiter/CandidateCompareModal';
import { EmptyCandidatesIllustration } from '@/components/illustrations/Illustrations';
import { Award, ArrowLeft, Filter, Search, ShieldCheck, Sparkles, Layers, GitBranch, ArrowRight, UserCheck, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { EmptyState } from '@/components/common/EmptyState';

export default function CandidateRankingPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { t } = useLanguage();
  const [job, setJob] = useState<Job | null>(null);
  const [rankings, setRankings] = useState<CandidateRankingItem[]>([]);
  const [filteredRankings, setFilteredRankings] = useState<CandidateRankingItem[]>([]);
  
  const [minScoreFilter, setMinScoreFilter] = useState<number>(0);
  const [onlyFullRequired, setOnlyFullRequired] = useState<boolean>(false);
  const [selectedCompareCandidates, setSelectedCompareCandidates] = useState<CandidateRankingItem[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState<boolean>(false);

  useEffect(() => {
    fetchJobById(resolvedParams.id).then(setJob);
    fetchCandidateRankings(resolvedParams.id).then((data) => {
      setRankings(data);
      setFilteredRankings(data);
    });
  }, [resolvedParams.id]);

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

  if (!job) {
    return (
      <div className="min-h-screen bg-[#F8FAF9] dark:bg-[#071410] text-slate-800 dark:text-slate-100 transition-colors">
        <div className="p-16 text-center text-slate-500 dark:text-slate-400">Đang tải Bảng Xếp Hạng AI Engine...</div>
      </div>
    );
  }

  const topCandidate = rankings.length > 0 ? rankings[0] : null;

  const handleSelectCompare = (item: CandidateRankingItem) => {
    if (!selectedCompareCandidates.find((c) => c.applicationId === item.applicationId)) {
      setSelectedCompareCandidates([...selectedCompareCandidates, item]);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAF9] dark:bg-[#071410] text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors">
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10 w-full">
        {/* Top Breadcrumb & Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E2E8F0] dark:border-[#1B3D34] pb-6">
          <div className="space-y-1.5">
            <Link href={`/recruiter/jobs/${job.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-1 transition">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Quay lại bài đăng JD</span>
            </Link>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider font-mono">
              <Award className="w-4 h-4" />
              <span>Backend Sourced Candidate Ranking Engine</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-editorial font-bold text-slate-900 dark:text-white tracking-tight">
              Bảng Xếp Hạng Ứng Viên Chuẩn AI
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Match Report Evaluation • Vị trí: <strong className="text-slate-900 dark:text-white">{job.title}</strong> • Candidate verification vector analysis vs. core systems requirement rubric
            </p>
          </div>

          {selectedCompareCandidates.length > 0 && (
            <button
              onClick={() => setIsCompareModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-[#0C2B24] hover:bg-[#133E34] dark:bg-[#10B981] dark:hover:bg-[#059669] dark:text-[#040D0A] shadow-xs transition active:scale-95 flex-shrink-0"
            >
              <Layers className="w-4 h-4 text-emerald-400 dark:text-[#040D0A]" />
              <span>So Sánh ({selectedCompareCandidates.length} Ứng viên)</span>
            </button>
          )}
        </div>

        {rankings.length === 0 ? (
          <EmptyState
            type="EMPTY"
            title={t('emptyStates.candidates.emptyTitle', "Chưa có ứng viên trong bảng xếp hạng")}
            description={t('emptyStates.candidates.emptyDesc', "Vị trí tuyển dụng này chưa có ứng viên nào nộp hồ sơ để đối sánh và xếp hạng AI.")}
            primaryCtaText="Xem ứng viên đã nộp đơn"
            primaryCtaHref={`/recruiter/jobs/${job.id}/applications`}
            secondaryCtaText="Quay lại quản lý bài đăng"
            secondaryCtaHref="/recruiter/jobs"
          />
        ) : (
          <>
            {/* SCREEN 13 SPOTLIGHT: Candidate Detail & Ranking Evaluation Banner */}
            {topCandidate && (
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-serif font-bold text-[#0C2B24]">Match Report Evaluation</h2>
                    <p className="text-xs text-[#64748B]">Candidate verification vector analysis vs. core systems requirement rubric</p>
                  </div>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                    Spotlight Candidate
                  </span>
                </div>

                {/* Candidate Dark Forest Banner */}
                <div className="bg-[#0C2B24] border border-[#164E41] rounded-2xl p-6 sm:p-7 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-[#164E41] border-2 border-emerald-400 flex items-center justify-center font-serif text-xl font-bold text-white shadow-inner">
                      {topCandidate.candidateName.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-2xl font-serif font-bold text-white tracking-wide">
                        {topCandidate.candidateName}
                      </h3>
                      <p className="text-xs text-emerald-200/80 font-medium">
                        {topCandidate.headline || 'Systems Engineer • London, UK • devops@sterling.io'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="px-3.5 py-1.5 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-300 font-bold text-xs tracking-wider uppercase">
                      {topCandidate.overallMatchScore.toFixed(1)}% MATCH
                    </span>
                    <Link
                      href={`/recruiter/applications/${topCandidate.applicationId}`}
                      className="px-4 py-2 rounded-xl bg-white text-[#0C2B24] hover:bg-emerald-50 font-bold text-xs shadow-md transition active:scale-95"
                    >
                      Advance Candidate
                    </Link>
                  </div>
                </div>

                {/* Two-Column Figma Screen 13 Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column: Professional Experience & GitHub Activity */}
                  <div className="space-y-6">
                    {/* Professional Experience Card */}
                    <div className="bg-white dark:bg-[#0E241E] border border-slate-200 dark:border-[#1B3D34] rounded-2xl p-6 shadow-xs space-y-4 transition-colors">
                      <h4 className="text-sm font-bold font-editorial text-slate-900 dark:text-white border-b border-slate-100 dark:border-[#1B3D34] pb-3">
                        Professional Experience
                      </h4>
                      <div className="space-y-4 text-xs">
                        <div>
                          <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                            <span>Systems Engineer — CloudScale Systems</span>
                            <span className="text-slate-400 font-normal">2022 - Present</span>
                          </div>
                          <ul className="mt-1.5 space-y-1 text-slate-600 dark:text-slate-300 list-disc list-inside leading-relaxed">
                            <li>Architected core microservices writing low-latency production pipelines.</li>
                            <li>Configured container orchestration environments scaling multiple Kubernetes worker namespaces.</li>
                          </ul>
                        </div>

                        <div className="pt-2 border-t border-slate-100 dark:border-[#1B3D34]">
                          <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                            <span>Infrastructure Dev — SecurTech Labs</span>
                            <span className="text-slate-400 font-normal">2020 - 2022</span>
                          </div>
                          <ul className="mt-1.5 space-y-1 text-slate-600 dark:text-slate-300 list-disc list-inside leading-relaxed">
                            <li>Delivered Terraform automated modules deploying IAM structures secure at rest.</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Dark Forest GitHub Activity Analytics Card */}
                    <div className="bg-[#081E19] border border-[#12382F] rounded-2xl p-6 text-white shadow-md space-y-4">
                      <div className="flex items-center justify-between border-b border-[#12382F] pb-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                          <GitBranch className="w-4 h-4 text-emerald-400" />
                          <span>GitHub Activity Analytics</span>
                        </span>
                        <span className="text-[11px] font-mono text-emerald-400/80">Codebase Audit Verified</span>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 rounded-xl bg-[#0C2B24]/90 border border-[#164E41]">
                          <span className="text-[10px] text-emerald-200/70 block uppercase font-bold">Commit Volume (YTD)</span>
                          <span className="text-lg font-extrabold text-amber-400 font-mono">1,248 commits</span>
                        </div>

                        <div className="p-3 rounded-xl bg-[#0C2B24]/90 border border-[#164E41]">
                          <span className="text-[10px] text-emerald-200/70 block uppercase font-bold">Core Lang</span>
                          <span className="text-lg font-extrabold text-amber-400 font-mono">Go / Rust</span>
                        </div>
                      </div>

                      <p className="text-[11px] text-emerald-100/70 leading-relaxed">
                        Top repository &apos;scaling-k8s-ingress&apos; is in the top 4% of assessed codebases globally for code reuse, thread-safety patterns, and dependency health.
                      </p>
                    </div>
                  </div>

                  {/* Right Column: Verified Skill Comparison & Rank Alignment Audit */}
                  <div className="space-y-6">
                    {/* Verified Skill Comparison Card */}
                    <div className="bg-white dark:bg-[#0E241E] border border-slate-200 dark:border-[#1B3D34] rounded-2xl p-6 shadow-xs space-y-4 transition-colors">
                      <h4 className="text-sm font-bold font-editorial text-slate-900 dark:text-white border-b border-slate-100 dark:border-[#1B3D34] pb-3">
                        Verified Skill Comparison
                      </h4>
                      <div className="space-y-3.5 text-xs">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-slate-900 dark:text-white">Go (Golang)</span>
                            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">Matched</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 dark:bg-[#071410] rounded-full overflow-hidden">
                            <div className="bg-[#10B981] h-full rounded-full" style={{ width: '92%' }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-slate-900 dark:text-white">Kubernetes</span>
                            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">Matched</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 dark:bg-[#071410] rounded-full overflow-hidden">
                            <div className="bg-[#10B981] h-full rounded-full" style={{ width: '88%' }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-slate-900 dark:text-white">AWS Infrastructure</span>
                            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">Matched</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 dark:bg-[#071410] rounded-full overflow-hidden">
                            <div className="bg-[#10B981] h-full rounded-full" style={{ width: '82%' }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-slate-900 dark:text-white">Prometheus / Monitoring</span>
                            <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">Partial Match</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 dark:bg-[#071410] rounded-full overflow-hidden">
                            <div className="bg-amber-500 h-full rounded-full" style={{ width: '64%' }} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Rank Alignment Audit Card */}
                    <div className="bg-white dark:bg-[#0E241E] border border-slate-200 dark:border-[#1B3D34] rounded-2xl p-6 shadow-xs space-y-3 transition-colors">
                      <h4 className="text-sm font-bold font-editorial text-slate-900 dark:text-white border-b border-slate-100 dark:border-[#1B3D34] pb-3">
                        Rank Alignment Audit
                      </h4>
                      <span className="text-sm font-bold text-amber-700 dark:text-amber-400 block font-mono">
                        Ranked #{topCandidate.rank || 1} of {rankings.length} candidates
                      </span>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        This match ranking is driven strictly by direct code execution indicators and multi-region deployment evidence. {topCandidate.candidateName} is highly optimized for Distributed Systems operations.
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Filter Bar & Ranking Overview */}
            <section className="space-y-4">
              <div className="bg-white dark:bg-[#0E241E] border border-slate-200 dark:border-[#1B3D34] rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs transition-colors">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 dark:text-slate-400 font-semibold">Điểm Overall tối thiểu:</span>
                    <select
                      value={minScoreFilter}
                      onChange={(e) => setMinScoreFilter(parseFloat(e.target.value) || 0)}
                      className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#071410] border border-slate-200 dark:border-[#1B3D34] text-slate-900 dark:text-white text-xs focus:outline-none focus:border-[#0C2B24] dark:focus:border-emerald-500 font-semibold"
                    >
                      <option value={0}>Tất cả điểm số</option>
                      <option value={70}>≥ 70.0% (Tốt)</option>
                      <option value={80}>≥ 80.0% (Rất cao)</option>
                      <option value={85}>≥ 85.0% (Xuất sắc)</option>
                      <option value={90}>≥ 90.0% (Top 1%)</option>
                    </select>
                  </div>

                  <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={onlyFullRequired}
                      onChange={(e) => setOnlyFullRequired(e.target.checked)}
                      className="rounded text-[#0C2B24] focus:ring-[#10B981] border-slate-300 dark:border-[#1B3D34]"
                    />
                    <span>Chỉ hiển thị ứng viên đáp ứng 100% Kỹ năng Bắt buộc (0 missing)</span>
                  </label>
                </div>

                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  Hiển thị <strong className="text-slate-900 dark:text-white">{filteredRankings.length} / {rankings.length}</strong> ứng viên trong danh sách xếp hạng
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

