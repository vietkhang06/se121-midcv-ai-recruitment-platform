'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Job, Application } from '@/types';
import { fetchJobById, fetchCandidateApplications } from '@/lib/api';
import {
  ArrowLeft,
  Users,
  Award,
  Filter,
  SlidersHorizontal,
  CheckCircle2,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

export default function JobApplicationsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [job, setJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  useEffect(() => {
    fetchJobById(resolvedParams.id).then(setJob);
    fetchCandidateApplications().then(setApplications);
  }, [resolvedParams.id]);

  if (!job) {
    return (
      <div className="min-h-screen bg-[#F8FAF9] p-12 text-center text-slate-500">
        Loading pipeline telemetry...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAF9] text-slate-800 flex flex-col py-8">
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 w-full">
        
        {/* Header Section */}
        <div className="border-b border-slate-200 pb-4 space-y-2">
          <Link
            href="/recruiter"
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại bài đăng JD</span>
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-editorial font-bold text-slate-900">
                Job Candidate Pipeline — Danh Sách Đơn Ứng Tuyển
              </h1>
              <p className="text-xs text-slate-500">
                Verify commits and match confidence curves across stages for {job.title}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href={`/recruiter/jobs/${job.id}/ranking`}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#0C2B24] hover:bg-[#133E34] transition shadow-xs flex items-center gap-1.5"
              >
                <Award className="w-4 h-4 text-emerald-400" />
                <span>Mở Bảng Xếp Hạng AI</span>
              </Link>
            </div>
          </div>
        </div>

        {/* 12 — Active Job Bar & Controls (Figma Screen 12) */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-800">
              Active Job: <strong className="text-slate-900">{job.title} (Java Backend)</strong>
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-amber-50 text-amber-800 border border-amber-300">
              18 Candidates matching &gt;80%
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 rounded-md text-xs font-medium border border-slate-200 bg-[#F8FAF9] text-slate-700 hover:bg-slate-100 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <span>Filter by Match</span>
            </button>
            <button className="px-3 py-1.5 rounded-md text-xs font-medium border border-slate-200 bg-[#F8FAF9] text-slate-700 hover:bg-slate-100">
              Bulk Actions
            </button>
          </div>
        </div>

        {/* 12 — 5-Stage Kanban Board (Figma Screen 12: New, Screening, Shortlisted, Interview, Offer) */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start overflow-x-auto pb-4">
          
          {/* Column 1: New (12) */}
          <div className="bg-[#F1F5F3]/70 border border-[#E2E8F0] rounded-xl p-3.5 space-y-3 min-w-[220px]">
            <div className="flex items-center justify-between font-semibold text-xs text-slate-800 px-1">
              <span>New</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white border border-slate-200">12</span>
            </div>

            <div className="space-y-3">
              <div className="bg-white border border-[#E2E8F0] rounded-lg p-3.5 space-y-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-slate-900">Marcus V.</span>
                  <span className="text-[10px] font-bold font-mono text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">94% MATCH</span>
                </div>
                <div className="text-[10px] text-slate-500">Go, K8s, Docker</div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
                    <span>Verified Skills Ratio</span>
                    <span>8/10</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1">
                    <div className="bg-[#0C2B24] h-1 rounded-full w-4/5" />
                  </div>
                </div>
                <Link
                  href="/recruiter/applications/app-001"
                  className="block text-center py-1 rounded text-[10px] font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  View Match Audit
                </Link>
              </div>

              <div className="bg-white border border-[#E2E8F0] rounded-lg p-3.5 space-y-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-slate-900">Elena R.</span>
                  <span className="text-[10px] font-bold font-mono text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">81% MATCH</span>
                </div>
                <div className="text-[10px] text-slate-500">AWS, Terraform</div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
                    <span>Verified Skills Ratio</span>
                    <span>8/10</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1">
                    <div className="bg-[#0C2B24] h-1 rounded-full w-4/5" />
                  </div>
                </div>
                <Link
                  href="/recruiter/applications/app-001"
                  className="block text-center py-1 rounded text-[10px] font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  View Match Audit
                </Link>
              </div>
            </div>
          </div>

          {/* Column 2: Screening (8) */}
          <div className="bg-[#F1F5F3]/70 border border-[#E2E8F0] rounded-xl p-3.5 space-y-3 min-w-[220px]">
            <div className="flex items-center justify-between font-semibold text-xs text-slate-800 px-1">
              <span>Screening</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white border border-slate-200">8</span>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-lg p-3.5 space-y-2 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-slate-900">Dr. Aris V.</span>
                <span className="text-[10px] font-bold font-mono text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">96% MATCH</span>
              </div>
              <div className="text-[10px] text-slate-500">Distributed Systems</div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
                  <span>Verified Skills Ratio</span>
                  <span>8/10</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1">
                  <div className="bg-[#0C2B24] h-1 rounded-full w-4/5" />
                </div>
              </div>
              <Link
                href="/recruiter/applications/app-001"
                className="block text-center py-1 rounded text-[10px] font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                View Match Audit
              </Link>
            </div>
          </div>

          {/* Column 3: Shortlisted (5) — Includes Candidate Andrew S. / Nguyễn Văn Java */}
          <div className="bg-[#F1F5F3]/70 border border-[#E2E8F0] rounded-xl p-3.5 space-y-3 min-w-[220px]">
            <div className="flex items-center justify-between font-semibold text-xs text-slate-800 px-1">
              <span>Shortlisted</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white border border-slate-200">5</span>
            </div>

            <div className="bg-white border border-[#0C2B24] rounded-lg p-3.5 space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-slate-900">
                  Andrew S. (Nguyễn Văn Java)
                </span>
                <span className="text-[10px] font-bold font-mono text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">96% MATCH</span>
              </div>
              <div className="text-[10px] text-slate-500">Go microservices, K8s (v1.0)</div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
                  <span>Verified Skills Ratio</span>
                  <span>8/10</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1">
                  <div className="bg-[#0C2B24] h-1 rounded-full w-4/5" />
                </div>
              </div>
              <Link
                href="/recruiter/applications/app-001"
                className="block text-center py-1 rounded text-[10px] font-semibold bg-[#0C2B24] text-white hover:bg-[#133E34]"
              >
                View Match Audit
              </Link>
            </div>
          </div>

          {/* Column 4: Interview (3) */}
          <div className="bg-[#F1F5F3]/70 border border-[#E2E8F0] rounded-xl p-3.5 space-y-3 min-w-[220px]">
            <div className="flex items-center justify-between font-semibold text-xs text-slate-800 px-1">
              <span>Interview</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white border border-slate-200">3</span>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-lg p-3.5 space-y-2 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-slate-900">Hana K.</span>
                <span className="text-[10px] font-bold font-mono text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">88% MATCH</span>
              </div>
              <div className="text-[10px] text-slate-500">Rust Systems, AWS</div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
                  <span>Verified Skills Ratio</span>
                  <span>8/10</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1">
                  <div className="bg-[#0C2B24] h-1 rounded-full w-4/5" />
                </div>
              </div>
              <Link
                href="/recruiter/applications/app-001"
                className="block text-center py-1 rounded text-[10px] font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                View Match Audit
              </Link>
            </div>
          </div>

          {/* Column 5: Offer (1) */}
          <div className="bg-[#F1F5F3]/70 border border-[#E2E8F0] rounded-xl p-3.5 space-y-3 min-w-[220px]">
            <div className="flex items-center justify-between font-semibold text-xs text-slate-800 px-1">
              <span>Offer</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white border border-slate-200">1</span>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-lg p-3.5 space-y-2 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-slate-900">Gavin B.</span>
                <span className="text-[10px] font-bold font-mono text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">91% MATCH</span>
              </div>
              <div className="text-[10px] text-slate-500">Go platform architect</div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
                  <span>Verified Skills Ratio</span>
                  <span>8/10</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1">
                  <div className="bg-[#0C2B24] h-1 rounded-full w-4/5" />
                </div>
              </div>
              <Link
                href="/recruiter/applications/app-001"
                className="block text-center py-1 rounded text-[10px] font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                View Match Audit
              </Link>
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
