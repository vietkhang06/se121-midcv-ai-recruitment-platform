'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Job } from '@/types';
import { fetchJobs } from '@/lib/api';
import { EmptyState } from '@/components/common/EmptyState';
import { QuickApplyModal } from '@/components/application/QuickApplyModal';
import {
  ShieldCheck,
  Search,
  ArrowRight,
  GitBranch,
  Cpu,
  Layers,
  FileCheck2,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Database,
  LineChart
} from 'lucide-react';

export default function Home() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [applyJob, setApplyJob] = useState<Job | null>(null);

  const loadJobs = () => {
    setIsLoading(true);
    fetchJobs()
      .then((allJobs) => {
        setJobs(allJobs.filter((j) => j.status === 'PUBLISHED'));
        setFetchError(null);
      })
      .catch((err) => {
        setFetchError(err.message || 'Không thể tải danh sách việc làm.');
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    window.location.href = `/jobs?keyword=${encodeURIComponent(searchKeyword)}`;
  };

  return (
    <div className="space-y-0 text-slate-800 dark:text-slate-100 bg-[#F8FAF9] dark:bg-[#071410] transition-colors">
      
      {/* 01 — HERO SECTION (Figma: Dark Forest Green #0C2B24) */}
      <section className="bg-[#0C2B24] text-white pt-14 pb-20 px-4 sm:px-6 lg:px-8 border-b border-[#133E34]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Heading & Value Prop */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#133E34]/80 border border-emerald-500/30 text-xs font-semibold text-emerald-300">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Vector Embedding 1536D • AI Evidence Pipeline</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-normal font-editorial tracking-tight text-white leading-[1.1]">
              Hire with verified evidence, not resume claims.
              <span className="block text-2xl sm:text-3xl font-sans font-medium text-emerald-200/90 pt-3">
                Đối Sánh JD & Hồ Sơ Tuyển Dụng
              </span>
            </h1>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-xl font-light">
              MatchJD maps code vectors, code repositories, and work histories directly to Job Descriptions. No black-box filtering, just transparent, explainable matches.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href="/recruiter/jobs/new"
                className="px-6 py-3 rounded-lg text-sm font-medium bg-[#10B981] hover:bg-[#059669] text-[#081C15] font-semibold transition shadow-md shadow-emerald-950/30"
              >
                For Employers — Post Talent
              </Link>
              <Link
                href="/jobs"
                className="px-6 py-3 rounded-lg text-sm font-medium border border-slate-400/40 text-white hover:bg-white/10 transition"
              >
                For Candidates — Explore Matches
              </Link>
            </div>

            {/* Quick Search */}
            <form onSubmit={handleSearchSubmit} className="pt-4 max-w-xl">
              <div className="relative flex items-center bg-[#081C15]/90 border border-[#1B4D41] rounded-xl p-1.5 shadow-xl">
                <Search className="w-4 h-4 text-emerald-400 ml-3 mr-2 shrink-0" />
                <input
                  type="text"
                  placeholder="Search roles: Senior Infrastructure Engineer, Go, Kubernetes..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  suppressHydrationWarning
                  className="w-full bg-transparent border-none text-white text-xs sm:text-sm focus:outline-none placeholder-slate-400 py-1.5"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#10B981]/90 hover:bg-[#10B981] text-[#081C15] transition shrink-0"
                >
                  Search
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Semantic Matching Vector Map Widget (Figma Screen 01) */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-md bg-[#081E17] border border-[#1B4D41] rounded-2xl p-6 shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#1B4D41]/80 pb-3 mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></div>
                  <span className="text-[11px] font-mono uppercase tracking-widest text-slate-300">
                    SEMANTIC MATCHING VECTOR MAP
                  </span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400">cosine: 0.946</span>
              </div>

              {/* Job Requirements Profile */}
              <div className="bg-[#0C2B24] border border-[#133E34] rounded-xl p-4 mb-4">
                <div className="text-[11px] font-mono text-slate-400 mb-2 uppercase">Job Requirements Profile</div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded bg-[#133E34] text-emerald-300 border border-emerald-500/20">Go</span>
                  <span className="px-2.5 py-1 rounded bg-[#133E34] text-emerald-300 border border-emerald-500/20">Kubernetes</span>
                  <span className="px-2.5 py-1 rounded bg-[#133E34] text-emerald-300 border border-emerald-500/20">gRPC</span>
                  <span className="px-2.5 py-1 rounded bg-[#133E34] text-emerald-300 border border-emerald-500/20">AWS</span>
                </div>
              </div>

              {/* Candidate Evidence Vector */}
              <div className="bg-[#0C2B24] border border-[#133E34] rounded-xl p-4 mb-4">
                <div className="text-[11px] font-mono text-slate-400 mb-2 uppercase">Candidate Evidence Vector</div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded bg-[#133E34] text-emerald-300 border border-emerald-500/20">Go (Production)</span>
                  <span className="px-2.5 py-1 rounded bg-[#133E34] text-emerald-300 border border-emerald-500/20">Docker</span>
                  <span className="px-2.5 py-1 rounded bg-[#133E34] text-emerald-300 border border-emerald-500/20">gRPC APIs</span>
                  <span className="px-2.5 py-1 rounded bg-[#133E34] text-emerald-300 border border-emerald-500/20">Terraform</span>
                </div>
              </div>

              {/* Bottom Match Pill */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-400 font-mono">Multi-region Ingress Rubric</span>
                <span className="px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/50 text-amber-300 text-xs font-bold font-mono">
                  94% MATCH
                </span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* KPI ARCHITECTURE BANNER (Transparent System Attributes) */}
      <section className="bg-white dark:bg-[#0E241E] border-b border-[#E2E8F0] dark:border-[#1B3D34] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-[#1B3D34]">
          <div className="pt-2 md:pt-0">
            <div className="text-3xl sm:text-4xl font-editorial font-bold text-slate-900 dark:text-white font-mono">1536D</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">Vector Embedding Space</div>
          </div>
          <div className="pt-2 md:pt-0">
            <div className="text-3xl sm:text-4xl font-editorial font-bold text-slate-900 dark:text-white font-mono">3-Tier</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">Multi-factor Scoring Engine</div>
          </div>
          <div className="pt-2 md:pt-0">
            <div className="text-3xl sm:text-4xl font-editorial font-bold text-slate-900 dark:text-white font-mono">Deep AST</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">Code Repository Parsing</div>
          </div>
          <div className="pt-2 md:pt-0">
            <div className="text-3xl sm:text-4xl font-editorial font-bold text-slate-900 dark:text-white font-mono">0-Penalty</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">Grounded GitHub Fallback</div>
          </div>
        </div>
      </section>

      {/* 01 — THE MATCHJD EVIDENCE PIPELINE (4 Steps) */}
      <section id="pipeline" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <span className="text-xs font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-400">EMPIRICAL PROCESS</span>
          <h2 className="text-3xl sm:text-4xl font-editorial text-slate-900 dark:text-white mt-2">The MatchJD Evidence Pipeline</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-[#0E241E] p-6 rounded-xl border border-[#E2E8F0] dark:border-[#1B3D34] shadow-xs relative">
            <div className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 mb-3">01</div>
            <h3 className="font-semibold text-slate-900 dark:text-white text-base mb-2">Upload & Ingest</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Candidate paper resume, GitHub repository, or direct commit ledger integration.
            </p>
          </div>

          <div className="bg-white dark:bg-[#0E241E] p-6 rounded-xl border border-[#E2E8F0] dark:border-[#1B3D34] shadow-xs relative">
            <div className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 mb-3">02</div>
            <h3 className="font-semibold text-slate-900 dark:text-white text-base mb-2">Evidence Parsing</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Deep AST parsing: Go public repos, commit history, and Pull Request reviews without subjective bias.
            </p>
          </div>

          <div className="bg-white dark:bg-[#0E241E] p-6 rounded-xl border border-[#E2E8F0] dark:border-[#1B3D34] shadow-xs relative">
            <div className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 mb-3">03</div>
            <h3 className="font-semibold text-slate-900 dark:text-white text-base mb-2">Semantic Matching</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              AI maps candidate verified skills against employer technical rubrics using 1536D embedding vectors.
            </p>
          </div>

          <div className="bg-white dark:bg-[#0E241E] p-6 rounded-xl border border-[#E2E8F0] dark:border-[#1B3D34] shadow-xs relative">
            <div className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 mb-3">04</div>
            <h3 className="font-semibold text-slate-900 dark:text-white text-base mb-2">Explainable Report</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              A detailed comparison report is generated detailing exact match evidence and confidence levels.
            </p>
          </div>
        </div>
      </section>

      {/* 01 — ENGINEERED FOR VERIFIED EVALUATION (4 Feature Cards) */}
      <section className="py-16 bg-[#F1F5F3] dark:bg-[#091C16] border-y border-[#E2E8F0] dark:border-[#1B3D34]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">ARCHITECTED FOR TRUTH</span>
            <h2 className="text-3xl sm:text-4xl font-editorial text-slate-900 dark:text-white mt-2">Engineered for verified evaluation</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-[#0E241E] p-8 rounded-xl border border-[#E2E8F0] dark:border-[#1B3D34] shadow-xs flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-[#0C2B24] dark:bg-[#133E34] text-emerald-400 flex items-center justify-center shrink-0">
                <GitBranch className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Deep GitHub Assessment</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Inspecting code quality, commit density, code reuse, and test coverage directly to verify authentic technical claims.
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-[#0E241E] p-8 rounded-xl border border-[#E2E8F0] dark:border-[#1B3D34] shadow-xs flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-[#0C2B24] dark:bg-[#133E34] text-emerald-400 flex items-center justify-center shrink-0">
                <LineChart className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Explainable Ranking System</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Transparent matching matrix separating required skills, bonus skills, and repo telemetry without opaque black-boxes.
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-[#0E241E] p-8 rounded-xl border border-[#E2E8F0] dark:border-[#1B3D34] shadow-xs flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-[#0C2B24] dark:bg-[#133E34] text-emerald-400 flex items-center justify-center shrink-0">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Structured CV Builder</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Translate prior project work into structured evidence containers tailored for multi-industry technical matching.
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-[#0E241E] p-8 rounded-xl border border-[#E2E8F0] dark:border-[#1B3D34] shadow-xs flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-[#0C2B24] dark:bg-[#133E34] text-emerald-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Instant Verification</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Unified candidate credential validation, company verification checks, and snapshot data integrity guaranteed.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 01 — SPECIALISED MATCHING INDEXES */}
      <section id="indexes" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">SECTOR COVERAGE</span>
            <h2 className="text-3xl font-editorial text-slate-900 dark:text-white mt-1">Specialised matching indexes</h2>
          </div>
          <Link href="/jobs" className="text-xs font-semibold text-[#0C2B24] dark:text-emerald-400 hover:underline flex items-center gap-1">
            <span>Explore All Sectors</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { title: 'Distributed Systems', sector: 'Technology', href: '/jobs?sector=Technology' },
            { title: 'Artificial Intelligence', sector: 'Technology', href: '/jobs?sector=Technology' },
            { title: 'Cloud & DevOps', sector: 'Technology', href: '/jobs?sector=Technology' },
            { title: 'Quantitative Finance', sector: 'Finance', href: '/jobs?sector=Finance' },
            { title: 'Growth Marketing', sector: 'Marketing', href: '/jobs?sector=Marketing' },
            { title: 'UI/UX Design Systems', sector: 'Design', href: '/jobs?sector=Design' },
          ].map((item, idx) => (
            <Link
              key={idx}
              href={item.href}
              className="bg-white dark:bg-[#0E241E] p-4 rounded-xl border border-[#E2E8F0] dark:border-[#1B3D34] hover:border-[#0C2B24] dark:hover:border-emerald-500 hover:shadow-sm transition text-left"
            >
              <div className="font-semibold text-slate-900 dark:text-white text-xs mb-1">{item.title}</div>
              <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono">{item.sector} Sector</div>
            </Link>
          ))}
        </div>
      </section>

      {/* 01 — RESEARCH & METHODOLOGY MISSION STATEMENT */}
      <section className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#0C2B24] text-white p-10 sm:p-14 rounded-2xl border border-[#133E34] relative text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#133E34] text-emerald-300 text-xs font-mono font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>ĐỀ TÀI NGHIÊN CỨU KỸ THUẬT</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-editorial font-normal max-w-3xl mx-auto leading-relaxed text-slate-100">
            "Nền tảng tuyển dụng thông minh hỗ trợ đối sánh ngữ nghĩa JD – CV và xác thực năng lực qua GitHub"
          </h3>
          <p className="text-xs sm:text-sm font-light max-w-2xl mx-auto text-slate-300 leading-relaxed">
            Loại bỏ thiên vị và rào cản từ khóa bằng cách kết hợp trích xuất thực thể, mô hình nhúng vector 1536 chiều và phân tích mã nguồn GitHub có giải trình chi tiết.
          </p>
        </div>
      </section>

      {/* 01 — DUAL CTAs */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-[#0E241E] p-8 rounded-2xl border border-[#E2E8F0] dark:border-[#1B3D34] shadow-xs space-y-4">
          <span className="text-[11px] font-mono uppercase text-slate-500 dark:text-slate-400">FOR HIRING TEAMS</span>
          <h3 className="text-2xl font-editorial text-slate-900 dark:text-white">Ready to recruit with structural evidence?</h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Deploy modern recruitment rubrics. Stop the facade of standardized resumes and connect with pre-validated engineering talent.
          </p>
          <div className="pt-2">
            <Link
              href="/recruiter"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold bg-[#0C2B24] dark:bg-emerald-600 text-white hover:bg-[#133E34] dark:hover:bg-emerald-700 transition"
            >
              <span>Recruiter Console</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        <div className="bg-[#081C15] text-white p-8 rounded-2xl border border-[#133E34] shadow-xs space-y-4">
          <span className="text-[11px] font-mono uppercase text-emerald-400">FOR TECH CANDIDATES</span>
          <h3 className="text-2xl font-editorial text-white">Publish a verifiable record of your skills.</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Connect your repositories. Get matched with top technical engineering teams without recruiter screening filters.
          </p>
          <div className="pt-2">
            <Link
              href="/candidate/cvs/builder"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold bg-[#10B981] text-[#081C15] hover:bg-[#059669] transition"
            >
              <span>Create Verifiable CV</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* 01 — ACTIVE JOB OPPORTUNITIES CATALOG */}
      <section className="py-16 bg-white dark:bg-[#071410] border-t border-[#E2E8F0] dark:border-[#1B3D34]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-400">OPPORTUNITIES</span>
              <h2 className="text-3xl font-editorial text-slate-900 dark:text-white mt-1">Featured Verified Positions</h2>
            </div>
            <Link href="/jobs" className="text-xs font-semibold text-[#0C2B24] dark:text-emerald-400 hover:underline flex items-center gap-1">
              <span>View All Positions ({jobs.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {isLoading ? (
            <EmptyState
              type="LOADING"
              title="Đang tải danh sách việc làm..."
              description="Hệ thống đang đồng bộ cơ sở dữ liệu việc làm..."
            />
          ) : fetchError ? (
            <EmptyState
              type="ERROR"
              title="Không thể tải danh sách việc làm"
              description={fetchError}
              primaryCtaText="Thử lại"
              onPrimaryCtaClick={loadJobs}
            />
          ) : jobs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jobs.slice(0, 6).map((job) => (
                <div key={job.id} className="bg-[#F8FAF9] dark:bg-[#0E241E] p-6 rounded-xl border border-[#E2E8F0] dark:border-[#1B3D34] flex flex-col justify-between hover:border-[#0C2B24] dark:hover:border-emerald-500 transition">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">{job.department || 'Engineering'}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                        {job.industry}
                      </span>
                    </div>
                    <h3 className="font-semibold text-slate-900 dark:text-white text-base mb-1 hover:text-[#0C2B24] dark:hover:text-emerald-400">
                      <Link href={`/jobs/${job.id}`}>{job.title}</Link>
                    </h3>
                    <div className="text-xs text-slate-600 dark:text-slate-300 mb-3">{job.companyName} • {job.location}</div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 leading-relaxed">{job.description}</p>
                  </div>
                  <div className="pt-4 border-t border-slate-200/80 dark:border-[#1B3D34] flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
                      {job.salaryMin ? `$${job.salaryMin} - $${job.salaryMax} /mo` : (job.salaryRange || 'Thoả thuận')}
                    </span>
                    <button
                      onClick={() => setApplyJob(job)}
                      className="px-3.5 py-1.5 rounded-md text-xs font-medium bg-[#0C2B24] dark:bg-emerald-600 text-white hover:bg-[#133E34] dark:hover:bg-emerald-700 transition cursor-pointer"
                    >
                      Quick Apply
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              type="EMPTY"
              title="Chưa có vị trí tuyển dụng nào được xuất bản"
              description="Hệ thống hiện chưa có tin tuyển dụng nào từ doanh nghiệp. Bạn có thể là nhà tuyển dụng đầu tiên đăng tin tuyển dụng."
              primaryCtaText="Đăng tin tuyển dụng"
              primaryCtaHref="/recruiter/jobs/new"
              secondaryCtaText="Về cổng nhà tuyển dụng"
              secondaryCtaHref="/recruiter"
            />
          )}
        </div>
      </section>

      {/* Quick Apply Stepper Modal */}
      {applyJob && (
        <QuickApplyModal
          job={applyJob}
          isOpen={true}
          onClose={() => setApplyJob(null)}
          onSuccess={() => setApplyJob(null)}
        />
      )}

    </div>
  );
}
