'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Job } from '@/types';
import { fetchJobs } from '@/lib/api';
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
  Lock,
  LineChart
} from 'lucide-react';

export default function Home() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [applyJob, setApplyJob] = useState<Job | null>(null);

  useEffect(() => {
    fetchJobs().then((allJobs) => {
      setJobs(allJobs.filter((j) => j.status === 'PUBLISHED'));
    });
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    window.location.href = `/jobs?keyword=${encodeURIComponent(searchKeyword)}`;
  };

  return (
    <div className="space-y-0 text-slate-800 bg-[#F8FAF9]">
      
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
              MatchProof maps code vectors, code repositories, and work histories directly to Job Descriptions. No black-box filtering, just transparent, explainable matches.
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

      {/* KPI METRICS BANNER (Figma: 320k+, 94.6%, 11 Days, 180+) */}
      <section className="bg-white border-b border-[#E2E8F0] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center divide-y md:divide-y-0 md:divide-x divide-slate-100">
          <div className="pt-2 md:pt-0">
            <div className="text-3xl sm:text-4xl font-editorial font-bold text-slate-900">320k+</div>
            <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Verifiable Profiles Indexed</div>
          </div>
          <div className="pt-2 md:pt-0">
            <div className="text-3xl sm:text-4xl font-editorial font-bold text-slate-900">94.6%</div>
            <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Average Acceptance Rate</div>
          </div>
          <div className="pt-2 md:pt-0">
            <div className="text-3xl sm:text-4xl font-editorial font-bold text-slate-900">11 Days</div>
            <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Average Time-to-Hire</div>
          </div>
          <div className="pt-2 md:pt-0">
            <div className="text-3xl sm:text-4xl font-editorial font-bold text-slate-900">180+</div>
            <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Enterprise Tech Partners</div>
          </div>
        </div>
      </section>

      {/* 01 — THE MATCHPROOF EVIDENCE PIPELINE (4 Steps) */}
      <section id="pipeline" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <span className="text-xs font-semibold uppercase tracking-widest text-amber-700">EMPIRICAL PROCESS</span>
          <h2 className="text-3xl sm:text-4xl font-editorial text-slate-900 mt-2">The MatchProof Evidence Pipeline</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-xs relative">
            <div className="text-xs font-mono font-bold text-amber-600 mb-3">01</div>
            <h3 className="font-semibold text-slate-900 text-base mb-2">Upload & Ingest</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Candidate paper resume, GitHub repository, or direct commit ledger integration.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-xs relative">
            <div className="text-xs font-mono font-bold text-amber-600 mb-3">02</div>
            <h3 className="font-semibold text-slate-900 text-base mb-2">Evidence Parsing</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Deep AST parsing: Go public repos, commit history, and Pull Request reviews without subjective bias.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-xs relative">
            <div className="text-xs font-mono font-bold text-amber-600 mb-3">03</div>
            <h3 className="font-semibold text-slate-900 text-base mb-2">Semantic Matching</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              AI maps candidate verified skills against employer technical rubrics using 1536D embedding vectors.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-xs relative">
            <div className="text-xs font-mono font-bold text-amber-600 mb-3">04</div>
            <h3 className="font-semibold text-slate-900 text-base mb-2">Explainable Report</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              A detailed comparison report is generated detailing exact match evidence and confidence levels.
            </p>
          </div>
        </div>
      </section>

      {/* 01 — ENGINEERED FOR VERIFIED EVALUATION (4 Feature Cards) */}
      <section className="py-16 bg-[#F1F5F3] border-y border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">ARCHITECTED FOR TRUTH</span>
            <h2 className="text-3xl sm:text-4xl font-editorial text-slate-900 mt-2">Engineered for verified evaluation</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-8 rounded-xl border border-[#E2E8F0] shadow-xs flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-[#0C2B24] text-emerald-400 flex items-center justify-center shrink-0">
                <GitBranch className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-1">Deep GitHub Assessment</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Inspecting code quality, commit density, code reuse, and test coverage directly to verify authentic technical claims.
                </p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-xl border border-[#E2E8F0] shadow-xs flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-[#0C2B24] text-emerald-400 flex items-center justify-center shrink-0">
                <LineChart className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-1">Explainable Ranking System</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Transparent matching matrix separating required skills, bonus skills, and repo telemetry without opaque black-boxes.
                </p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-xl border border-[#E2E8F0] shadow-xs flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-[#0C2B24] text-emerald-400 flex items-center justify-center shrink-0">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-1">Structured CV Builder</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Translate prior project work into structured evidence containers tailored for multi-industry technical matching.
                </p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-xl border border-[#E2E8F0] shadow-xs flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-[#0C2B24] text-emerald-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-1">Instant Verification</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
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
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">SECTOR COVERAGE</span>
            <h2 className="text-3xl font-editorial text-slate-900 mt-1">Specialised matching indexes</h2>
          </div>
          <Link href="/jobs" className="text-xs font-semibold text-[#0C2B24] hover:underline flex items-center gap-1">
            <span>Explore All Sectors</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { title: 'Distributed Systems', count: '1,248 verified candidates', href: '/jobs?sector=DistributedSystems' },
            { title: 'Artificial Intelligence', count: '940 verified candidates', href: '/jobs?sector=AI' },
            { title: 'Cloud & DevOps', count: '1,520 verified candidates', href: '/jobs?sector=Cloud' },
            { title: 'Quantitative Finance', count: '680 verified candidates', href: '/jobs?sector=Finance' },
            { title: 'Enterprise Security', count: '890 verified candidates', href: '/jobs?sector=Security' },
            { title: 'Data Infrastructure', count: '1,100 verified candidates', href: '/jobs?sector=Data' },
          ].map((item, idx) => (
            <Link
              key={idx}
              href={item.href}
              className="bg-white p-4 rounded-xl border border-[#E2E8F0] hover:border-[#0C2B24] hover:shadow-sm transition text-left"
            >
              <div className="font-semibold text-slate-900 text-xs mb-1">{item.title}</div>
              <div className="text-[10px] text-slate-500">{item.count}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* 01 — TESTIMONIAL QUOTE (Figma: Forest Green Card with Large Quotes) */}
      <section className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#0C2B24] text-white p-10 sm:p-14 rounded-2xl border border-[#133E34] relative text-center">
          <div className="font-editorial text-6xl sm:text-7xl text-amber-400 font-bold mb-4 leading-none">
            “
          </div>
          <blockquote className="text-lg sm:text-2xl font-editorial font-light max-w-3xl mx-auto leading-relaxed text-slate-100">
            Before MatchProof, we screened dozens of engineers who listed Kubernetes on their resumes but couldn’t architect a robust deployment. MatchProof verified their hands-on infrastructure commits instantly. Our match-to-hire accuracy tripled.
          </blockquote>
          <div className="mt-6">
            <div className="font-semibold text-sm text-emerald-300">Dr. Aris Vance</div>
            <div className="text-xs text-slate-400">VP of Engineering, DevOpsCloud LLC</div>
          </div>
        </div>
      </section>

      {/* 01 — DUAL CTAs */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-4">
          <span className="text-[11px] font-mono uppercase text-slate-500">FOR HIRING TEAMS</span>
          <h3 className="text-2xl font-editorial text-slate-900">Ready to recruit with structural evidence?</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Deploy modern recruitment rubrics. Stop the facade of standardized resumes and connect with pre-validated engineering talent.
          </p>
          <div className="pt-2">
            <Link
              href="/recruiter"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold bg-[#0C2B24] text-white hover:bg-[#133E34] transition"
            >
              <span>Request Platform Demo</span>
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
      <section className="py-16 bg-white border-t border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-amber-700">OPPORTUNITIES</span>
              <h2 className="text-3xl font-editorial text-slate-900 mt-1">Featured Verified Positions</h2>
            </div>
            <Link href="/jobs" className="text-xs font-semibold text-[#0C2B24] hover:underline flex items-center gap-1">
              <span>View All Positions ({jobs.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.slice(0, 6).map((job) => (
              <div key={job.id} className="bg-[#F8FAF9] p-6 rounded-xl border border-[#E2E8F0] flex flex-col justify-between hover:border-[#0C2B24] transition">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-mono uppercase text-slate-500">{job.department || 'Engineering'}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-amber-50 text-amber-800 border border-amber-200">
                      94% MATCH
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-900 text-base mb-1 hover:text-[#0C2B24]">
                    <Link href={`/jobs/${job.id}`}>{job.title}</Link>
                  </h3>
                  <div className="text-xs text-slate-600 mb-3">{job.companyName} • {job.location}</div>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">{job.description}</p>
                </div>
                <div className="pt-4 border-t border-slate-200/80 flex items-center justify-between">
                  <span className="text-xs font-mono font-semibold text-slate-700">{job.salaryRange || '£95k - £120k'}</span>
                  <button
                    onClick={() => setApplyJob(job)}
                    className="px-3.5 py-1.5 rounded-md text-xs font-medium bg-[#0C2B24] text-white hover:bg-[#133E34] transition"
                  >
                    Quick Apply
                  </button>
                </div>
              </div>
            ))}
          </div>
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
