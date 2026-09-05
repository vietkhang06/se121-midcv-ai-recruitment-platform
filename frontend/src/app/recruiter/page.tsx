'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Job, Company } from '@/types';
import { fetchRecruiterJobs, fetchRecruiterProfile } from '@/lib/api';
import { CompanyVerificationBanner } from '@/components/recruiter/CompanyVerificationBanner';
import {
  Briefcase,
  Users,
  Calendar,
  Clock,
  Plus,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  TrendingUp,
  BarChart3
} from 'lucide-react';

export default function HRDashboardPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [activeTab, setActiveTab] = useState<'console' | 'analytics'>('console');

  useEffect(() => {
    fetchRecruiterJobs().then(setJobs);
    fetchRecruiterProfile().then((p) => setCompany(p.company));
  }, []);

  const publishedJobs = jobs.filter((j) => j.status === 'PUBLISHED');
  const draftJobs = jobs.filter((j) => j.status === 'DRAFT');

  return (
    <div className="min-h-screen bg-[#F8FAF9] text-slate-800 flex flex-col py-8">
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 w-full">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="space-y-1">
            <span className="text-[11px] font-mono font-semibold text-slate-500 uppercase tracking-widest">
              RECRUITER PORTAL COMMAND CENTER
            </span>
            <h1 className="text-3xl font-editorial font-bold text-slate-900">
              Dashboard Console — Tổng Quan Tuyển Dụng Doanh Nghiệp
            </h1>
            <p className="text-xs text-slate-500">
              CloudScale Systems & {company?.name || 'FPT Software Corporation'} Recruitment command center & telemetry
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1 text-xs font-medium">
              <button
                onClick={() => setActiveTab('console')}
                className={`px-3 py-1.5 rounded-md transition ${activeTab === 'console' ? 'bg-[#0C2B24] text-white font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Dashboard Console (10)
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`px-3 py-1.5 rounded-md transition ${activeTab === 'analytics' ? 'bg-[#0C2B24] text-white font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Recruitment Telemetry (14)
              </button>
            </div>

            <Link
              href="/recruiter/jobs/new"
              className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#0C2B24] hover:bg-[#133E34] transition shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Tạo Bài Tuyển Dụng Mới</span>
            </Link>
          </div>
        </div>

        {/* Company Verification Banner */}
        {company && (
          <CompanyVerificationBanner
            status={company.verificationStatus}
            companyName={company.name}
            reason={company.verificationReason}
          />
        )}

        {/* 10 — Dark Forest Green Welcome Banner (Figma Screen 10) */}
        <div className="bg-[#0C2B24] text-white rounded-2xl p-8 border border-[#133E34] shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <h2 className="text-2xl sm:text-3xl font-editorial font-normal text-white">
              Welcome back, Sarah
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-light leading-relaxed">
              Your active matching pipelines have 24 new candidates verified by MatchProof engine today.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/recruiter/jobs/new"
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#10B981] hover:bg-[#059669] text-[#081C15] transition shadow-xs"
            >
              + Post New Job
            </Link>
            <Link
              href="/recruiter/jobs/job-tech-01/applications"
              className="px-4 py-2 rounded-lg text-xs font-medium border border-slate-400/40 text-white hover:bg-white/10 transition"
            >
              Review Candidates
            </Link>
          </div>
        </div>

        {activeTab === 'console' ? (
          <>
            {/* 10 — 4 KPI Cards (Figma Screen 10: 14 Active, 412 Applicants, 18 Interviews, 11 Days) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs space-y-1">
                <span className="text-[10px] font-mono font-semibold uppercase text-slate-500">ACTIVE JOB POSTINGS</span>
                <div className="text-3xl font-editorial font-bold text-slate-900">
                  {jobs.length > 0 ? jobs.length : 14}
                </div>
                <div className="text-[11px] text-emerald-600 font-medium pt-1">4 premium matches open</div>
              </div>

              <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs space-y-1">
                <span className="text-[10px] font-mono font-semibold uppercase text-slate-500">APPLICANTS THIS MONTH</span>
                <div className="text-3xl font-editorial font-bold text-slate-900">412</div>
                <div className="text-[11px] text-emerald-600 font-medium pt-1">+18% since last week</div>
              </div>

              <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs space-y-1">
                <span className="text-[10px] font-mono font-semibold uppercase text-slate-500">INTERVIEWS SCHEDULED</span>
                <div className="text-3xl font-editorial font-bold text-slate-900">18</div>
                <div className="text-[11px] text-slate-500 pt-1">6 scheduled for today</div>
              </div>

              <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs space-y-1">
                <span className="text-[10px] font-mono font-semibold uppercase text-slate-500">AVG TIME-TO-HIRE</span>
                <div className="text-3xl font-editorial font-bold text-slate-900">11 Days</div>
                <div className="text-[11px] text-slate-500 pt-1">5 days faster than industry</div>
              </div>
            </div>

            {/* 10 — Active Sourcing Funnel Stage (Figma Screen 10) */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xs space-y-4">
              <div className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                Active Sourcing Funnel
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 text-center pt-2">
                {[
                  { count: 412, label: 'Applied' },
                  { count: 180, label: 'Screened' },
                  { count: 94, label: 'Shortlisted' },
                  { count: 32, label: 'Interview' },
                  { count: 8, label: 'Offered' },
                  { count: 5, label: 'Hired' },
                ].map((st, idx) => (
                  <div key={idx} className="bg-[#F8FAF9] border border-slate-200 rounded-lg p-3">
                    <div className="text-xl font-bold font-editorial text-slate-900">{st.count}</div>
                    <div className="text-[10px] font-mono uppercase text-slate-500 mt-0.5">{st.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 10 — Two Columns: Top Performing Postings & Recent Candidate Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Column: Top Performing Postings */}
              <div className="lg:col-span-8 bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-semibold text-slate-900">Top Performing Postings</h3>
                  <Link href="/recruiter/jobs" className="text-xs font-semibold text-amber-700 hover:underline">
                    View All Postings
                  </Link>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F8FAF9] text-slate-500 font-mono text-[10px] uppercase border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold">Job Title</th>
                        <th className="py-2.5 px-3 font-semibold">Views</th>
                        <th className="py-2.5 px-3 font-semibold">Apps</th>
                        <th className="py-2.5 px-3 font-semibold">Avg Match</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {[
                        { title: 'Senior Infrastructure Engineer', id: 'job-tech-01', views: '1.2k', apps: 47, match: '96%', status: 'Active' },
                        { title: 'Senior Rust Systems Architect', id: 'job-tech-02', views: '840', apps: 24, match: '88%', status: 'Active' },
                        { title: 'Staff Backend Developer', id: 'job-tech-03', views: '980', apps: 39, match: '91%', status: 'Reviewing' },
                        { title: 'Distributed Systems Dev', id: 'job-tech-04', views: '610', apps: 18, match: '84%', status: 'Draft' },
                      ].map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-3 px-3 font-medium text-slate-900">
                            <Link href={`/recruiter/jobs/${item.id}/ranking`} className="hover:text-[#0C2B24] hover:underline">
                              {item.title}
                            </Link>
                          </td>
                          <td className="py-3 px-3 font-mono">{item.views}</td>
                          <td className="py-3 px-3 font-mono">{item.apps}</td>
                          <td className="py-3 px-3 font-mono font-semibold text-emerald-800">{item.match}</td>
                          <td className="py-3 px-3 text-right">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                item.status === 'Active'
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : item.status === 'Reviewing'
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right Column: Recent Candidate Activity */}
              <div className="lg:col-span-4 bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xs space-y-4">
                <h3 className="text-sm font-semibold text-slate-900">Recent Candidate Activity</h3>

                <div className="space-y-3 text-xs">
                  {[
                    { name: 'Andrew Sterling', role: 'Senior Infrastructure Engineer', time: '2h ago', score: '96% MATCH' },
                    { name: 'Hana Khatib', role: 'Senior Rust Systems Architect', time: '4h ago', score: '88% MATCH' },
                    { name: 'Marcus Brody', role: 'Staff Backend Developer', time: 'Yesterday', score: '91% MATCH' },
                    { name: 'Elena Rostova', role: 'Distributed Systems Dev', time: '2 days ago', score: '84% MATCH' },
                  ].map((cand, idx) => (
                    <div key={idx} className="p-3 bg-[#F8FAF9] border border-slate-200 rounded-lg flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-slate-900">{cand.name}</div>
                        <div className="text-[10px] text-slate-500">{cand.role}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{cand.time}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-amber-50 text-amber-800 border border-amber-300">
                        {cand.score}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </>
        ) : (
          /* 14 — Assessment & Analytics View (Figma Screen 14) */
          <div className="space-y-6">
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-xl font-editorial font-bold text-slate-900">Recruitment Telemetry</h3>
                  <p className="text-xs text-slate-500">Anonymised evaluations of active talent sourcing vectors & funnel conversions</p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500">Sourcing Analytics:</span>
                  <select className="bg-[#F8FAF9] border border-slate-200 rounded-md px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none">
                    <option>Senior Systems Developer (CloudScale)</option>
                    <option>Infrastructure Lead (Multi-Region)</option>
                  </select>
                </div>
              </div>

              {/* 3 Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
                <div className="p-5 bg-[#F8FAF9] border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[10px] font-mono font-semibold uppercase text-slate-500">Conversion Rate</span>
                  <div className="text-3xl font-editorial font-bold text-slate-900">43.2%</div>
                  <div className="text-[11px] text-slate-500">Top 10% in SaaS sector</div>
                </div>

                <div className="p-5 bg-[#F8FAF9] border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[10px] font-mono font-semibold uppercase text-slate-500">Sourcing Velocity</span>
                  <div className="text-3xl font-editorial font-bold text-slate-900">11.4 days</div>
                  <div className="text-[11px] text-slate-500">Average time-to-accept</div>
                </div>

                <div className="p-5 bg-[#F8FAF9] border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[10px] font-mono font-semibold uppercase text-slate-500">Diverse Pipeline Delta</span>
                  <div className="text-3xl font-editorial font-bold text-emerald-700">+24%</div>
                  <div className="text-[11px] text-slate-500">Attributed to automated bias check</div>
                </div>
              </div>
            </div>

            {/* Top Candidates Sourcing Matrix */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-semibold text-slate-900">Top Candidates Sourcing Matrix</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAF9] text-slate-500 font-mono text-[10px] uppercase border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4 font-semibold">Developer</th>
                      <th className="py-2.5 px-4 font-semibold">Go Skill Score</th>
                      <th className="py-2.5 px-4 font-semibold">K8s Match</th>
                      <th className="py-2.5 px-4 font-semibold">GitHub Evidence</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Overall Vector</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    <tr>
                      <td className="py-3 px-4 font-semibold text-slate-900">Andrew Sterling</td>
                      <td className="py-3 px-4 font-mono">98%</td>
                      <td className="py-3 px-4 font-mono">94%</td>
                      <td className="py-3 px-4 text-emerald-700 font-medium">Production Ready</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-amber-700">96% Match</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-slate-900">Elena Rostova</td>
                      <td className="py-3 px-4 font-mono">91%</td>
                      <td className="py-3 px-4 font-mono">84%</td>
                      <td className="py-3 px-4 text-emerald-700 font-medium">Active Contributor</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-amber-700">88% Match</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-slate-900">Dr. Aris Vance</td>
                      <td className="py-3 px-4 font-mono">85%</td>
                      <td className="py-3 px-4 font-mono">91%</td>
                      <td className="py-3 px-4 text-emerald-700 font-medium">Enterprise Commits</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-amber-700">91% Match</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-slate-900">Marcus Brody</td>
                      <td className="py-3 px-4 font-mono">94%</td>
                      <td className="py-3 px-4 font-mono">80%</td>
                      <td className="py-3 px-4 text-emerald-700 font-medium">High Volume</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-amber-700">86% Match</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* AI Sourcing Copilot Insights Card */}
            <div className="bg-[#081E17] text-white border border-[#1B4D41] rounded-xl p-6 shadow-xs space-y-3">
              <div className="text-[10px] font-mono uppercase text-emerald-400">AI SOURCING COPILOT INSIGHTS</div>
              <ul className="space-y-2 text-xs text-slate-300 font-light list-disc pl-5">
                <li>Your Job Profile attracted 23% more senior candidates with verified Terraform commits than peer SaaS listings this quarter.</li>
                <li>Sourcing optimization alert: Removing &quot;Rust proficiency&quot; from non-essential goals would broaden your matched candidate pool by 18 active candidates.</li>
              </ul>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
