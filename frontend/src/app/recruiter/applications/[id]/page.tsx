'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { MatchInspectionData } from '@/types';
import { fetchMatchInspection } from '@/lib/api';
import { RecruiterNavbar } from '@/components/recruiter/RecruiterNavbar';
import { ScoreBreakdownCard } from '@/components/recruiter/ScoreBreakdownCard';
import { GitHubAssessmentCard } from '@/components/recruiter/GitHubAssessmentCard';
import { ArrowLeft, User, FileText, CheckCircle2, Award, GitBranch, Sparkles, Building2, Calendar } from 'lucide-react';

export default function CandidateMatchInspectionPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [data, setData] = useState<MatchInspectionData | null>(null);

  useEffect(() => {
    fetchMatchInspection(resolvedParams.id).then(setData);
  }, [resolvedParams.id]);

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <RecruiterNavbar />
        <div className="p-10 text-center text-slate-400">Đang tải phân tích đối sánh AI Engine...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <RecruiterNavbar />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 w-full">
        {/* Top Back Navigation */}
        <Link href="/recruiter/jobs" className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white mb-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Quay lại Bảng Xếp Hạng & Quản lý Đơn Nộp</span>
        </Link>

        {/* Header Candidate Summary */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-indigo-950 border border-indigo-500/30 text-indigo-300">
                  Application Inspection
                </span>
                <span className="text-xs text-slate-400 font-mono">ID: #{data.applicationId}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{data.candidateName}</h1>
              <p className="text-xs text-slate-300">Đơn ứng tuyển vị trí: <strong className="text-cyan-400">{data.jobTitle}</strong></p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-1">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Overall Score</span>
              <span className="text-3xl font-extrabold text-indigo-400">{data.overallScore.toFixed(1)}%</span>
            </div>
          </div>

          {/* Human-Readable Explanation Banner */}
          <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/30 space-y-1 text-xs">
            <span className="font-bold text-indigo-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              Giải thích Trí tuệ Nhân tạo (Grounded Evidence Explanation):
            </span>
            <p className="text-slate-200 leading-relaxed pt-1">{data.humanReadableExplanation}</p>
          </div>
        </div>

        {/* Match Scores & Semantic Skills Breakdown */}
        <ScoreBreakdownCard data={data} />

        {/* GitHub Assessment Card */}
        <GitHubAssessmentCard assessment={data.githubAssessment} />

        {/* Snapshot CV Inspection Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-400" />
              <h3 className="text-base font-bold text-white">Bản Ghi Snapshot CV Tại Thời Điểm Nộp Đơn</h3>
            </div>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-full">
              ✓ Immutable Snapshot Preserved
            </span>
          </div>

          <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-4 text-xs">
            <div className="space-y-1">
              <h4 className="font-bold text-cyan-400 uppercase text-[11px]">CV Tóm tắt Bản thân</h4>
              <p className="text-slate-300">Lập trình viên Backend với 3.5 năm kinh nghiệm Java 21, Spring Boot và PostgreSQL. Đam mê thiết kế hệ thống Microservices quy mô lớn.</p>
            </div>

            <div className="space-y-1 border-t border-slate-800 pt-3">
              <h4 className="font-bold text-cyan-400 uppercase text-[11px]">Kỹ năng Chuyên môn Trích xuất</h4>
              <p className="text-slate-300">Java 21, Spring Boot, PostgreSQL, Docker, Redis, REST API, Git</p>
            </div>

            <div className="space-y-1 border-t border-slate-800 pt-3">
              <h4 className="font-bold text-cyan-400 uppercase text-[11px]">Kinh nghiệm Làm việc Thực tế</h4>
              <p className="text-slate-300">2023 - Nay: Senior Java Backend Engineer tại FPT Software. Thiết kế Microservices xử lý 100,000+ request/ngày.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
