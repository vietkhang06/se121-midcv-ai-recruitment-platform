'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Job } from '@/types';
import { fetchJobById } from '@/lib/api';
import { QuickApplyModal } from '@/components/application/QuickApplyModal';
import { ShieldCheck, ChevronRight, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [job, setJob] = useState<Job | null>(null);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState<boolean>(false);

  useEffect(() => {
    fetchJobById(resolvedParams.id).then(setJob);
  }, [resolvedParams.id]);

  if (!job) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center text-slate-500">
        <p className="text-sm">Loading job verification profile...</p>
      </div>
    );
  }

  const requiredSkills = job.requirements.filter((r) => r.requirementType === 'REQUIRED');
  const preferredSkills = job.requirements.filter((r) => r.requirementType === 'PREFERRED');

  return (
    <div className="bg-[#F8FAF9] min-h-screen py-8 text-slate-800 space-y-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Breadcrumb Trail (Figma Screen 03) */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link href="/jobs" className="hover:text-slate-900 transition">Search Jobs</Link>
          <ChevronRight className="w-3 h-3 text-slate-400" />
          <span>{job.industry || 'Technology'}</span>
          <ChevronRight className="w-3 h-3 text-slate-400" />
          <span className="text-slate-800 font-medium truncate max-w-xs">{job.title}</span>
        </div>

        {/* 03 — Dark Forest Green Hero Header Banner (Figma Screen 03) */}
        <div className="bg-[#0C2B24] text-white rounded-2xl p-8 sm:p-10 border border-[#133E34] shadow-md relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="px-2.5 py-0.5 rounded bg-[#133E34] text-emerald-300 font-mono uppercase text-[11px] font-semibold border border-emerald-500/20">
                  {job.industry}
                </span>
                <span className="text-slate-300 text-xs">
                  Posted {job.publishedDate || '2 days ago'}
                </span>
                {job.companyVerified && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Verified Company</span>
                  </span>
                )}
              </div>

              <h1 className="text-3xl sm:text-4xl font-editorial font-normal tracking-tight text-white">
                {job.title}
              </h1>

              <div className="text-sm text-slate-300 font-light">
                {job.companyName} • {job.location} ({job.employmentType})
              </div>
            </div>

            {/* Match Score Badge */}
            <div className="shrink-0">
              <span className="px-3.5 py-1.5 rounded-full text-xs font-bold font-mono bg-amber-400/20 border border-amber-400/50 text-amber-300 shadow-sm">
                96% MATCH
              </span>
            </div>
          </div>
        </div>

        {/* 03 — 2-Column Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Role Details */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Role Summary */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xs space-y-3">
              <h2 className="text-base font-semibold text-slate-900 font-editorial text-lg">Role Summary</h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {job.description}
              </p>
            </div>

            {/* Key Responsibilities */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xs space-y-3">
              <h2 className="text-base font-semibold text-slate-900 font-editorial text-lg">Key Responsibilities</h2>
              <ul className="space-y-2 text-xs sm:text-sm text-slate-600 list-disc pl-5">
                {(job.responsibilities || [
                  'Maintain and scale high-concurrency production microservices on container orchestration clusters.',
                  'Implement secure infrastructure definitions utilizing modern Terraform and cloud paradigms.',
                  'Establish deep system telemetry networks with Prometheus and service mesh instrumentation.',
                  'Design cluster ingress pathways and VPC peering architectures across multi-region nodes.'
                ]).map((item, idx) => (
                  <li key={idx} className="leading-relaxed">{item}</li>
                ))}
              </ul>
            </div>

            {/* Technical Requirements & Evidence Rubrics */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xs space-y-4">
              <h2 className="text-base font-semibold text-slate-900 font-editorial text-lg">Technical Requirements</h2>
              
              {/* Required Skills Section (Preserved for E2E Test Compatibility) */}
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Kỹ năng Bắt buộc (Required Skills)
                </div>
                <div className="flex flex-wrap gap-2">
                  {requiredSkills.map((req) => (
                    <span
                      key={req.id}
                      className="px-3 py-1 rounded-md text-xs font-mono font-medium bg-[#F1F5F3] text-[#0C2B24] border border-[#133E34]/20"
                    >
                      {req.skillName} • {req.minYearsExperience}y exp
                    </span>
                  ))}
                </div>
              </div>

              {/* Preferred Skills */}
              {preferredSkills.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-slate-100">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Kỹ năng Ưu tiên (Preferred Skills)
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {preferredSkills.map((req) => (
                      <span
                        key={req.id}
                        className="px-2.5 py-1 rounded-md text-xs font-mono text-slate-600 bg-slate-50 border border-slate-200"
                      >
                        {req.skillName} • {req.minYearsExperience}y exp
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Compensation & Semantic Fit Evaluation */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Compensation & Apply Card */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xs space-y-4">
              <div className="space-y-1">
                <span className="text-[11px] font-mono font-semibold uppercase text-slate-500">ANNUAL COMPENSATION</span>
                <div className="text-2xl font-bold font-editorial text-slate-900">
                  {job.salaryRange || `$${job.salaryMin} - $${job.salaryMax} /month`}
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  onClick={() => setIsApplyModalOpen(true)}
                  className="w-full py-3 px-4 rounded-lg font-semibold text-xs text-white bg-[#0C2B24] hover:bg-[#133E34] transition shadow-xs text-center"
                >
                  Apply via MatchProof (Quick Apply) — Nộp đơn
                </button>
                <button
                  onClick={() => setIsApplyModalOpen(true)}
                  className="w-full py-2.5 px-4 rounded-lg font-medium text-xs text-slate-700 border border-[#E2E8F0] hover:bg-slate-50 transition text-center"
                >
                  Standard Application
                </button>
              </div>
            </div>

            {/* Semantic Fit Evaluation Widget (Radial Score Gauge) */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xs space-y-4 text-center">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Semantic Fit Evaluation
              </div>

              {/* Radial Score Meter */}
              <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-slate-100"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-[#0C2B24]"
                    strokeDasharray="96, 100"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold font-editorial text-slate-900">96%</span>
                  <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">ACCURACY SCORE</span>
                </div>
              </div>

              {/* Verified Skills Distribution Bar */}
              <div className="space-y-1.5 text-left pt-2 border-t border-slate-100">
                <div className="text-[10px] font-mono font-semibold uppercase text-slate-500">
                  VERIFIED SKILLS DISTRIBUTION
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden flex">
                  <div className="bg-[#0C2B24] h-full" style={{ width: '84%' }} title="Matched" />
                  <div className="bg-amber-400 h-full" style={{ width: '8%' }} title="Partial" />
                  <div className="bg-slate-300 h-full" style={{ width: '8%' }} title="Missing" />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1">
                  <span>11 Matched</span>
                  <span>1 Partial</span>
                  <span>1 Missing</span>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* 03 — Verifiable Skill Evidence Comparison Table (Figma Screen 03) */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 sm:p-8 shadow-xs space-y-6">
          <div>
            <span className="text-[11px] font-mono font-semibold text-amber-700 uppercase tracking-widest">
              EXPLAINABLE MATCHING AUDIT
            </span>
            <h2 className="text-2xl font-editorial text-slate-900 mt-1">Verifiable Skill Evidence Comparison</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAF9] text-slate-500 uppercase font-mono text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-semibold">Technical Requirement (JD)</th>
                  <th className="py-3 px-4 font-semibold">Candidate Verified CV Evidence</th>
                  <th className="py-3 px-4 font-semibold">Evaluation Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Match Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr>
                  <td className="py-3 px-4 font-medium text-slate-900">
                    <div>Go (Golang)</div>
                    <div className="text-[10px] text-slate-400">3+ Years designing concurrent microservices</div>
                  </td>
                  <td className="py-3 px-4">4 Years production Go at CloudScale & TechCorp</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Matched
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-slate-800">98% (High)</td>
                </tr>

                <tr>
                  <td className="py-3 px-4 font-medium text-slate-900">
                    <div>Kubernetes</div>
                    <div className="text-[10px] text-slate-400">Configuring ingress, statefulsets, & service meshes</div>
                  </td>
                  <td className="py-3 px-4">Wrote production helm charts for cluster migration</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Matched
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-slate-800">94% (High)</td>
                </tr>

                <tr>
                  <td className="py-3 px-4 font-medium text-slate-900">
                    <div>AWS Infrastructure</div>
                    <div className="text-[10px] text-slate-400">IAM policies, VPC peering, and RDS configuration</div>
                  </td>
                  <td className="py-3 px-4">Terraform automation for 12 core AWS VPCs</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Matched
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-slate-800">91% (High)</td>
                </tr>

                <tr>
                  <td className="py-3 px-4 font-medium text-slate-900">
                    <div>Prometheus / Grafana</div>
                    <div className="text-[10px] text-slate-400">Custom telemetry dashboards & query setup</div>
                  </td>
                  <td className="py-3 px-4">Set up basic metrics pipeline (no custom PromQL)</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                      Partial Match
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-slate-800">64% (Medium)</td>
                </tr>

                <tr>
                  <td className="py-3 px-4 font-medium text-slate-900">
                    <div>Rust Development</div>
                    <div className="text-[10px] text-slate-400">System-level integration patterns</div>
                  </td>
                  <td className="py-3 px-4 text-slate-400">No direct experience in current CV file</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                      Missing
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-400">--</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Quick Apply Stepper Modal */}
      {isApplyModalOpen && (
        <QuickApplyModal
          job={job}
          isOpen={true}
          onClose={() => setIsApplyModalOpen(false)}
          onSuccess={() => setIsApplyModalOpen(false)}
        />
      )}

    </div>
  );
}
