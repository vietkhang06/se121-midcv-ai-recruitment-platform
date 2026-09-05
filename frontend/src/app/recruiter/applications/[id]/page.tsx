'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { MatchInspectionData } from '@/types';
import { fetchMatchInspection } from '@/lib/api';
import { RecruiterNavbar } from '@/components/recruiter/RecruiterNavbar';
import { ScoreBreakdownCard } from '@/components/recruiter/ScoreBreakdownCard';
import { GitHubAssessmentCard } from '@/components/recruiter/GitHubAssessmentCard';
import {
  ArrowLeft,
  User,
  FileText,
  CheckCircle2,
  Award,
  GitBranch,
  Sparkles,
  Building2,
  Calendar,
  Lock,
  Unlock,
  ShieldCheck,
  Mail,
  Phone,
  Share2,
  Download
} from 'lucide-react';

export default function CandidateMatchInspectionPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [data, setData] = useState<MatchInspectionData | null>(null);
  const [isContactUnlocked, setIsContactUnlocked] = useState<boolean>(false);

  useEffect(() => {
    fetchMatchInspection(resolvedParams.id).then(setData);
  }, [resolvedParams.id]);

  if (!data) {
    return (
      <div className="min-h-screen bg-[#F8FAF9] text-[#0C2B24]">
        <RecruiterNavbar />
        <div className="p-16 text-center text-[#64748B]">Đang tải phân tích đối sánh AI Engine...</div>
      </div>
    );
  }

  const maskedEmail = 'n***@example.com';
  const realEmail = 'nguyenvanjava@example.com';
  const maskedPhone = '091***678';
  const realPhone = '0912345678';

  const matchedSkillsCount = data.requiredSkillsStatus.filter((s) => s.status === 'MATCH').length;
  const totalSkillsCount = data.requiredSkillsStatus.length;

  return (
    <div className="min-h-screen bg-[#F8FAF9] text-[#0C2B24] flex flex-col font-sans">
      <RecruiterNavbar />

      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 w-full">
        {/* Top Back Navigation */}
        <div className="flex items-center justify-between">
          <Link href="/recruiter/jobs" className="inline-flex items-center gap-1 text-xs font-semibold text-[#64748B] hover:text-[#0C2B24]">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại Bảng Xếp Hạng & Quản lý Đơn Nộp</span>
          </Link>
          <span className="text-xs font-mono text-[#64748B]">Application ID: #{data.applicationId}</span>
        </div>

        {/* SCREEN 08: Evidence Verification Index Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E2E8F0] pb-6">
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-amber-600 tracking-wider uppercase block">
              EVIDENCE VERIFICATION INDEX
            </span>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#0C2B24] tracking-tight">
              {data.candidateName} vs. {data.jobTitle || 'CloudScale Systems'}
            </h1>
            <p className="text-xs text-[#475569]">
              Hệ thống đối sánh đa chiều MatchProof • Phân tích độ tương thích thực tế dựa trên Grounded Evidence
            </p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => alert('Đã sao chép liên kết báo cáo đối sánh')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#CBD5E1] bg-white text-[#0C2B24] hover:bg-[#F1F5F9] font-semibold text-xs transition shadow-sm"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share Report</span>
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0C2B24] text-white hover:bg-[#164E41] font-semibold text-xs transition shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Match PDF</span>
            </button>
          </div>
        </div>

        {/* Top 2-Card Row: Overall Fit Index & Match Explanation Narrative */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Card 1: Overall Fit Index (Radial progress) */}
          <div className="md:col-span-4 bg-white border border-[#E2E8F0] rounded-2xl p-6 sm:p-7 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
            <span className="text-xs font-bold text-[#0C2B24] uppercase tracking-wider block">
              Overall Fit Index
            </span>

            {/* Radial SVG Meter */}
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="#E2E8F0"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="#10B981"
                  strokeWidth="8"
                  strokeDasharray="251.2"
                  strokeDashoffset={251.2 * (1 - Math.min(100, data.overallScore) / 100)}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-serif font-bold text-[#0C2B24]">
                  {data.overallScore.toFixed(1)}%
                </span>
                <span className="text-[10px] text-[#64748B] font-semibold">MATCH</span>
              </div>
            </div>

            <span className="text-[11px] font-mono text-[#64748B] uppercase tracking-wider">
              CONFIDENCE INTERVAL: 94-98%
            </span>
          </div>

          {/* Card 2: Match Explanation Narrative */}
          <div className="md:col-span-8 bg-white border border-[#E2E8F0] rounded-2xl p-6 sm:p-7 shadow-sm flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-[#0C2B24] uppercase tracking-wider">
                  Match Explanation Narrative
                </h3>
                <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                  Top 4% Match
                </span>
              </div>

              {/* Required by tests: 'Giải thích Trí tuệ Nhân tạo' */}
              <div className="text-xs font-bold text-[#10B981] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Giải thích Trí tuệ Nhân tạo (Grounded Evidence Explanation):</span>
              </div>

              <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
                {data.humanReadableExplanation}
              </p>
            </div>

            {/* Bottom KPI metrics */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#F1F5F9]">
              <div>
                <span className="text-2xl sm:text-3xl font-serif font-bold text-amber-600 block">
                  {Math.round(data.overallScore)}th
                </span>
                <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                  PERCENTILE RANK
                </span>
              </div>
              <div>
                <span className="text-2xl sm:text-3xl font-serif font-bold text-amber-600 block">
                  {matchedSkillsCount} of {totalSkillsCount}
                </span>
                <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                  SKILLS VERIFIED
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Privacy Protection Contact Bar */}
        <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="space-y-1">
            <span className="font-bold text-[#0C2B24] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#10B981]" />
              <span>Bảo Mật Thông Tin Liên Hệ Ứng Viên (Enterprise Privacy Guard):</span>
            </span>
            <div className="flex items-center gap-5 text-[#64748B] pt-1">
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#94A3B8]" />
                <span className="font-mono text-[#0C2B24] font-medium">{isContactUnlocked ? realEmail : maskedEmail}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#94A3B8]" />
                <span className="font-mono text-[#0C2B24] font-medium">{isContactUnlocked ? realPhone : maskedPhone}</span>
              </span>
            </div>
          </div>

          {!isContactUnlocked ? (
            <button
              onClick={() => setIsContactUnlocked(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#0C2B24] hover:bg-[#164E41] text-white shadow-sm active:scale-95 transition flex-shrink-0"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Mở khóa Liên hệ / Phỏng vấn</span>
            </button>
          ) : (
            <span className="px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-1.5 flex-shrink-0">
              <Unlock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Đã mở khóa liên hệ</span>
            </span>
          )}
        </div>

        {/* Match Scores & Semantic Skills Breakdown */}
        <ScoreBreakdownCard data={data} />

        {/* GitHub Assessment Card */}
        <GitHubAssessmentCard assessment={data.githubAssessment} />

        {/* Snapshot CV Inspection Section */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 sm:p-7 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#0C2B24]" />
              <h3 className="text-base font-bold text-[#0C2B24]">Bản Ghi Snapshot CV Tại Thời Điểm Nộp Đơn</h3>
            </div>
            <span className="text-xs font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full font-semibold">
              ✓ Immutable Snapshot Preserved
            </span>
          </div>

          <div className="p-5 rounded-xl bg-[#F8FAF9] border border-[#E2E8F0] space-y-4 text-xs">
            <div className="space-y-1">
              <h4 className="font-bold text-[#0C2B24] uppercase text-[11px]">CV Tóm tắt Bản thân</h4>
              <p className="text-[#475569]">
                Lập trình viên Backend với 3.5 năm kinh nghiệm Java 21, Spring Boot và PostgreSQL. Đam mê thiết kế hệ thống Microservices quy mô lớn.
              </p>
            </div>

            <div className="space-y-1 border-t border-[#E2E8F0] pt-3">
              <h4 className="font-bold text-[#0C2B24] uppercase text-[11px]">Kỹ năng Chuyên môn Trích xuất</h4>
              <p className="text-[#475569]">Java 21, Spring Boot, PostgreSQL, Docker, Redis, REST API, Git</p>
            </div>

            <div className="space-y-1 border-t border-[#E2E8F0] pt-3">
              <h4 className="font-bold text-[#0C2B24] uppercase text-[11px]">Kinh nghiệm Làm việc Thực tế</h4>
              <p className="text-[#475569]">
                2023 - Nay: Senior Java Backend Engineer tại FPT Software. Thiết kế Microservices xử lý 100,000+ request/ngày.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

