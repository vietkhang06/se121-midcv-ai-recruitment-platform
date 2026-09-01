'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Job, CandidateRankingItem } from '@/types';
import { fetchJobById, fetchCandidateRankings } from '@/lib/api';
import { RecruiterNavbar } from '@/components/recruiter/RecruiterNavbar';
import { CandidateRankingTable } from '@/components/recruiter/CandidateRankingTable';
import { CandidateCompareModal } from '@/components/recruiter/CandidateCompareModal';
import { Award, ArrowLeft, Filter, Search, ShieldCheck, Sparkles, Layers } from 'lucide-react';

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
    fetchCandidateRankings(resolvedParams.id).then(data => {
      setRankings(data);
      setFilteredRankings(data);
    });
  }, [resolvedParams.id]);

  useEffect(() => {
    let result = [...rankings];
    if (minScoreFilter > 0) {
      result = result.filter(r => r.overallMatchScore >= minScoreFilter);
    }
    if (onlyFullRequired) {
      result = result.filter(r => r.requiredSkillsMissingNames.length === 0);
    }
    setFilteredRankings(result);
  }, [minScoreFilter, onlyFullRequired, rankings]);

  if (!job) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <RecruiterNavbar />
        <div className="p-10 text-center text-slate-400">Đang tải Bảng Xếp Hạng AI Engine...</div>
      </div>
    );
  }

  const handleSelectCompare = (item: CandidateRankingItem) => {
    if (!selectedCompareCandidates.find(c => c.applicationId === item.applicationId)) {
      setSelectedCompareCandidates([...selectedCompareCandidates, item]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <RecruiterNavbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 w-full">
        {/* Header Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <Link href={`/recruiter/jobs/${job.id}`} className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white mb-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Quay lại bài đăng JD</span>
            </Link>
            <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider">
              <Award className="w-4 h-4" />
              <span>Backend Sourced Candidate Ranking Engine</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Bảng Xếp Hạng Ứng Viên Chuẩn AI</h1>
            <p className="text-sm text-slate-400">
              Vị trí: <strong className="text-white">{job.title}</strong> • Thứ tự ưu tiên theo quy tắc Ranking Safety Phase 4
            </p>
          </div>

          {selectedCompareCandidates.length > 0 && (
            <button
              onClick={() => setIsCompareModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 shadow-md shadow-amber-500/20 transition active:scale-95 flex-shrink-0"
            >
              <Layers className="w-4 h-4" />
              <span>So Sánh ({selectedCompareCandidates.length} Ứng viên)</span>
            </button>
          )}
        </div>

        {/* Filter Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Điểm Overall tối thiểu:</span>
              <select
                value={minScoreFilter}
                onChange={(e) => setMinScoreFilter(parseFloat(e.target.value) || 0)}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-cyan-500 font-semibold"
              >
                <option value={0}>Tất cả điểm số</option>
                <option value={80}>≥ 80.0% (Xuất sắc)</option>
                <option value={85}>≥ 85.0% (Rất cao)</option>
                <option value={90}>≥ 90.0% (Top 1%)</option>
              </select>
            </div>

            <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={onlyFullRequired}
                onChange={(e) => setOnlyFullRequired(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 bg-slate-950 border-slate-800"
              />
              <span>Chỉ hiển thị ứng viên đáp ứng 100% Kỹ năng Bắt buộc</span>
            </label>
          </div>

          <span className="text-slate-400">
            Hiển thị <strong>{filteredRankings.length} / {rankings.length}</strong> ứng viên trong danh sách xếp hạng
          </span>
        </div>

        {/* Candidate Ranking Table */}
        <CandidateRankingTable
          rankings={filteredRankings}
          onSelectCandidateForCompare={handleSelectCompare}
        />

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
