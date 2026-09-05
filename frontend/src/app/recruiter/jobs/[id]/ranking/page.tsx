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

export default function CandidateRankingPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
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
      <div className="min-h-screen bg-[#F8FAF9] text-[#0C2B24]">
        <RecruiterNavbar />
        <div className="p-16 text-center text-[#64748B]">Đang tải Bảng Xếp Hạng AI Engine...</div>
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
    <div className="min-h-screen bg-[#F8FAF9] text-[#0C2B24] flex flex-col font-sans">
      <RecruiterNavbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10 w-full">
        {/* Top Breadcrumb & Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E2E8F0] pb-6">
          <div className="space-y-1.5">
            <Link href={`/recruiter/jobs/${job.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-[#64748B] hover:text-[#0C2B24] mb-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Quay lại bài đăng JD</span>
            </Link>
            <div className="flex items-center gap-2 text-xs font-bold text-[#10B981] uppercase tracking-wider">
              <Award className="w-4 h-4" />
              <span>Backend Sourced Candidate Ranking Engine</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#0C2B24] tracking-tight">
              Bảng Xếp Hạng Ứng Viên Chuẩn AI
            </h1>
            <p className="text-sm text-[#475569]">
              Match Report Evaluation • Vị trí: <strong className="text-[#0C2B24]">{job.title}</strong> • Candidate verification vector analysis vs. core systems requirement rubric
            </p>
          </div>

          {selectedCompareCandidates.length > 0 && (
            <button
              onClick={() => setIsCompareModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-[#0C2B24] hover:bg-[#164E41] shadow-md transition active:scale-95 flex-shrink-0"
            >
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>So Sánh ({selectedCompareCandidates.length} Ứng viên)</span>
            </button>
          )}
        </div>

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
                <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm space-y-4">
                  <h4 className="text-sm font-bold text-[#0C2B24] border-b border-[#F1F5F9] pb-3">
                    Professional Experience
                  </h4>
                  <div className="space-y-4 text-xs">
                    <div>
                      <div className="flex items-center justify-between font-bold text-[#0C2B24]">
                        <span>Systems Engineer — CloudScale Systems</span>
                        <span className="text-[#94A3B8] font-normal">2022 - Present</span>
                      </div>
                      <ul className="mt-1.5 space-y-1 text-[#475569] list-disc list-inside leading-relaxed">
                        <li>Architected core microservices writing low-latency production pipelines.</li>
                        <li>Configured container orchestration environments scaling multiple Kubernetes worker namespaces.</li>
                      </ul>
                    </div>

                    <div className="pt-2 border-t border-[#F1F5F9]">
                      <div className="flex items-center justify-between font-bold text-[#0C2B24]">
                        <span>Infrastructure Dev — SecurTech Labs</span>
                        <span className="text-[#94A3B8] font-normal">2020 - 2022</span>
                      </div>
                      <ul className="mt-1.5 space-y-1 text-[#475569] list-disc list-inside leading-relaxed">
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
                <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm space-y-4">
                  <h4 className="text-sm font-bold text-[#0C2B24] border-b border-[#F1F5F9] pb-3">
                    Verified Skill Comparison
                  </h4>
                  <div className="space-y-3.5 text-xs">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-[#0C2B24]">Go (Golang)</span>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Matched</span>
                      </div>
                      <div className="w-full h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                        <div className="bg-[#10B981] h-full rounded-full" style={{ width: '92%' }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-[#0C2B24]">Kubernetes</span>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Matched</span>
                      </div>
                      <div className="w-full h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                        <div className="bg-[#10B981] h-full rounded-full" style={{ width: '88%' }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-[#0C2B24]">AWS Infrastructure</span>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Matched</span>
                      </div>
                      <div className="w-full h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                        <div className="bg-[#10B981] h-full rounded-full" style={{ width: '82%' }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-[#0C2B24]">Prometheus / Monitoring</span>
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded">Partial Match</span>
                      </div>
                      <div className="w-full h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                        <div className="bg-amber-500 h-full rounded-full" style={{ width: '64%' }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rank Alignment Audit Card */}
                <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm space-y-3">
                  <h4 className="text-sm font-bold text-[#0C2B24] border-b border-[#F1F5F9] pb-3">
                    Rank Alignment Audit
                  </h4>
                  <span className="text-sm font-bold text-amber-700 block">
                    Ranked #{topCandidate.rank || 1} of {rankings.length} candidates
                  </span>
                  <p className="text-xs text-[#475569] leading-relaxed">
                    This match ranking is driven strictly by direct code execution indicators and multi-region deployment evidence. {topCandidate.candidateName} is highly optimized for Distributed Systems operations.
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Filter Bar & Ranking Overview */}
        <section className="space-y-4">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-[#64748B] font-semibold">Điểm Overall tối thiểu:</span>
                <select
                  value={minScoreFilter}
                  onChange={(e) => setMinScoreFilter(parseFloat(e.target.value) || 0)}
                  className="px-3 py-1.5 rounded-xl bg-white border border-[#CBD5E1] text-[#0C2B24] text-xs focus:outline-none focus:border-[#10B981] font-semibold"
                >
                  <option value={0}>Tất cả điểm số</option>
                  <option value={70}>≥ 70.0% (Tốt)</option>
                  <option value={80}>≥ 80.0% (Rất cao)</option>
                  <option value={85}>≥ 85.0% (Xuất sắc)</option>
                  <option value={90}>≥ 90.0% (Top 1%)</option>
                </select>
              </div>

              <label className="flex items-center gap-2 text-[#334155] cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={onlyFullRequired}
                  onChange={(e) => setOnlyFullRequired(e.target.checked)}
                  className="rounded text-[#0C2B24] focus:ring-[#10B981] border-[#CBD5E1]"
                />
                <span>Chỉ hiển thị ứng viên đáp ứng 100% Kỹ năng Bắt buộc (0 missing)</span>
              </label>
            </div>

            <span className="text-[#64748B] font-medium">
              Hiển thị <strong className="text-[#0C2B24]">{filteredRankings.length} / {rankings.length}</strong> ứng viên trong danh sách xếp hạng
            </span>
          </div>

          {/* Candidate Ranking Table or Empty State */}
          {filteredRankings.length > 0 ? (
            <CandidateRankingTable
              rankings={filteredRankings}
              onSelectCandidateForCompare={handleSelectCompare}
            />
          ) : (
            <div className="py-16 text-center bg-white border border-[#E2E8F0] rounded-2xl p-8 flex flex-col items-center justify-center space-y-4">
              <EmptyCandidatesIllustration className="w-32 h-32" />
              <div className="space-y-1 max-w-md">
                <h3 className="text-base font-bold text-[#0C2B24]">Không có ứng viên nào khớp với bộ lọc</h3>
                <p className="text-xs text-[#64748B]">
                  Hãy hạ mức điểm Overall tối thiểu hoặc bỏ chọn bộ lọc kỹ năng bắt buộc để xem danh sách đầy đủ.
                </p>
              </div>
              <button
                onClick={() => {
                  setMinScoreFilter(0);
                  setOnlyFullRequired(false);
                }}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-[#0C2B24] hover:bg-[#164E41] transition shadow-md"
              >
                Hiển thị toàn bộ bảng xếp hạng
              </button>
            </div>
          )}
        </section>

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

