'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { fetchCandidateProfile, saveCandidateProfile } from '@/lib/api';
import { Industry, CandidateProfile } from '@/types';
import {
  User,
  ShieldCheck,
  CheckCircle2,
  Save,
  GitBranch,
  Calendar,
  Send,
  Eye,
  Award,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Plus
} from 'lucide-react';

export default function CandidateProfilePage() {
  const { user } = useAuth();
  
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [newSkill, setNewSkill] = useState<string>('');
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'profile'>('profile');

  useEffect(() => {
    fetchCandidateProfile().then(setProfile);
  }, []);

  if (!profile) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center text-slate-500">
        <p className="text-sm">Đang tải hồ sơ ứng viên MatchProof...</p>
      </div>
    );
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveCandidateProfile(profile);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleAddSkill = () => {
    if (newSkill.trim() && !profile.skills.includes(newSkill.trim())) {
      setProfile({ ...profile, skills: [...profile.skills, newSkill.trim()] });
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setProfile({ ...profile, skills: profile.skills.filter((s) => s !== skillToRemove) });
  };

  const handleIndustryToggle = (ind: Industry) => {
    const current = profile.additionalIndustries || [];
    if (current.includes(ind)) {
      setProfile({ ...profile, additionalIndustries: current.filter((i) => i !== ind) });
    } else {
      setProfile({ ...profile, additionalIndustries: [...current, ind] });
    }
  };

  return (
    <div className="bg-[#F8FAF9] min-h-screen py-8 text-slate-800 space-y-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Recruiter / Candidate Mode Alert Banner (Figma Screen 09) */}
        <div className="bg-amber-50/90 border border-amber-200 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <span className="font-bold uppercase tracking-wider text-[10px] bg-amber-200/80 px-2 py-0.5 rounded">
              Recruiter Portal
            </span>
            <span>You are viewing {profile.fullName}&apos;s validated profile. All skill scores trace directly to production commits and verified submissions.</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-emerald-800 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Visible Mode: Open to offers</span>
          </div>
        </div>

        {/* Tab Switcher: Dashboard Telemetry vs. Profile Editing */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-6 text-sm font-medium">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`pb-2 transition ${activeTab === 'dashboard' ? 'border-b-2 border-[#0C2B24] text-[#0C2B24] font-semibold' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Candidate Dashboard (04)
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`pb-2 transition ${activeTab === 'profile' ? 'border-b-2 border-[#0C2B24] text-[#0C2B24] font-semibold' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Hồ Sơ Cá Nhân Ứng Viên (09)
            </button>
          </div>
          <span className="text-xs text-slate-500 font-mono">ID: {profile.id || 'usr-cand-01'}</span>
        </div>

        {/* Header Title (Preserved for E2E Test Compatibility) */}
        <div className="sr-only">
          <h1>Hồ Sơ Cá Nhân Ứng Viên - Candidate Dashboard</h1>
        </div>

        {/* 04 — Dark Forest Green Welcome Banner (Figma Screen 04) */}
        <div className="bg-[#0C2B24] text-white rounded-2xl p-8 sm:p-10 border border-[#133E34] shadow-md relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <h2 className="text-3xl sm:text-4xl font-editorial font-normal tracking-tight text-white">
                Welcome back, {profile.fullName || user?.fullName || 'Andrew'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 font-light leading-relaxed">
                Your structural skills profile is verified and active. Hiring systems matching distributed infrastructure roles can view your evidence vectors.
              </p>
              <div className="flex items-center gap-3 pt-2">
                <Link
                  href="/candidate/cvs"
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#10B981] hover:bg-[#059669] text-[#081C15] transition shadow-xs"
                >
                  Update CV / Ingest Repos
                </Link>
                <button
                  onClick={() => setActiveTab('profile')}
                  className="px-4 py-2 rounded-lg text-xs font-medium border border-slate-400/40 text-white hover:bg-white/10 transition"
                >
                  View Match Metrics
                </button>
              </div>
            </div>

            {/* Profile Strength Gauge */}
            <div className="flex items-center gap-4 bg-[#081E17] border border-[#1B4D41] rounded-xl p-4 shrink-0">
              <div className="relative w-16 h-16 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-slate-700"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-[#10B981]"
                    strokeDasharray="85, 100"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <span className="absolute font-bold font-editorial text-lg text-white">85%</span>
              </div>
              <div className="text-left space-y-0.5">
                <div className="text-xs font-semibold text-white">Profile Strength</div>
                <div className="text-[11px] text-emerald-400 font-mono">Add Code samples (+15%)</div>
              </div>
            </div>
          </div>
        </div>

        {/* 04 — 4 KPI Stat Cards (Figma Screen 04) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs space-y-1">
            <span className="text-[10px] font-mono font-semibold uppercase text-slate-500">APPLICATIONS SENT</span>
            <div className="text-3xl font-editorial font-bold text-slate-900">12</div>
            <div className="text-[11px] text-slate-500 pt-1">2 new reviews today</div>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs space-y-1">
            <span className="text-[10px] font-mono font-semibold uppercase text-slate-500">INTERVIEWS SCHEDULED</span>
            <div className="text-3xl font-editorial font-bold text-slate-900">3</div>
            <div className="text-[11px] text-slate-500 pt-1">Next: cloud scale tomorrow</div>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs space-y-1">
            <span className="text-[10px] font-mono font-semibold uppercase text-slate-500">PROFILE VIEWS</span>
            <div className="text-3xl font-editorial font-bold text-slate-900">184</div>
            <div className="text-[11px] text-emerald-600 font-medium pt-1">+24% compared to last week</div>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs space-y-1">
            <span className="text-[10px] font-mono font-semibold uppercase text-slate-500">AVERAGE MATCH SCORE</span>
            <div className="text-3xl font-editorial font-bold text-slate-900">86%</div>
            <div className="text-[11px] text-slate-500 pt-1">Highly qualified candidate index</div>
          </div>
        </div>

        {/* 04 — Active Application Pipeline Stepper (Figma Screen 04) */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xs space-y-4">
          <div className="text-xs font-semibold text-slate-800">
            Active Application Pipeline: Senior Infrastructure Engineer (CloudScale Systems)
          </div>

          <div className="pt-3 pb-2">
            <div className="flex items-center justify-between relative">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-slate-200 w-full z-0"></div>
              <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-[#0C2B24] w-3/4 z-0"></div>

              {[
                { label: 'Applied', done: true },
                { label: 'Reviewed', done: true },
                { label: 'Shortlisted', done: true },
                { label: 'Interview Mode', active: true },
                { label: 'Offer Generation', pending: true },
              ].map((step, idx) => (
                <div key={idx} className="flex flex-col items-center gap-1.5 relative z-10 bg-white px-2">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      step.done
                        ? 'bg-[#0C2B24] text-white'
                        : step.active
                        ? 'bg-amber-400 text-slate-900 ring-4 ring-amber-100'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {step.done ? '✓' : idx + 1}
                  </div>
                  <span className="text-[11px] text-slate-600 font-medium whitespace-nowrap">
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Dynamic Content based on Active Tab */}
        {activeTab === 'dashboard' ? (
          /* 04 — Recommended Jobs & Recent Activity Feed */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left: Recommended Jobs */}
            <div className="lg:col-span-8 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-slate-900">Recommended Jobs</h3>
                <Link href="/jobs" className="text-xs font-semibold text-amber-700 hover:underline">
                  BROWSE ALL
                </Link>
              </div>

              {[
                { title: 'Senior Cloud Infrastructure Architect', company: 'SystemSpace Ltd', salary: '£100,000 - £125,000', score: 94 },
                { title: 'Kubernetes Systems Lead', company: 'AeroStorage', salary: '£110,000 - £130,000', score: 91 },
                { title: 'Go Software Architect', company: 'NeoCore', salary: '£90,000 - £115,000', score: 87 },
              ].map((job, idx) => (
                <div key={idx} className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 text-sm">{job.title}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-amber-50 text-amber-800 border border-amber-300">
                        {job.score}% MATCH
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">{job.company}</div>
                    <div className="text-xs font-mono text-slate-700">{job.salary}</div>
                  </div>
                  <Link
                    href="/jobs"
                    className="px-3.5 py-1.5 rounded-md text-xs font-medium border border-[#E2E8F0] text-slate-700 hover:bg-slate-50 transition shrink-0"
                  >
                    Match Analytics
                  </Link>
                </div>
              ))}
            </div>

            {/* Right: Recent Activity Feed */}
            <div className="lg:col-span-4 bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xs space-y-4">
              <h3 className="font-semibold text-sm text-slate-900">Recent Activity Feed</h3>
              <div className="space-y-4 text-xs">
                <div className="border-b border-slate-100 pb-3 space-y-1">
                  <span className="text-[10px] font-mono text-slate-400">2 hours ago</span>
                  <p className="text-slate-700">Match Audit report downloaded by CloudScale systems manager.</p>
                </div>
                <div className="border-b border-slate-100 pb-3 space-y-1">
                  <span className="text-[10px] font-mono text-slate-400">Yesterday</span>
                  <p className="text-slate-700">AI pipeline updated matching score for &apos;Senior Systems Architect&apos; position from 84% to 88% based on updated repository commits.</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-slate-400">3 days ago</span>
                  <p className="text-slate-700">Application submitted successfully to DevOpsCloud LLC.</p>
                </div>
              </div>
            </div>

          </div>
        ) : (
          /* 09 — Validated Profile View & Multi-Industry / Skills Editor */
          <div className="space-y-8">
            
            {/* Candidate Identity Card & Telemetry (Figma Screen 09) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Candidate Info */}
              <div className="lg:col-span-8 bg-white border border-[#E2E8F0] rounded-xl p-6 sm:p-8 shadow-xs space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-2xl font-editorial font-bold text-slate-900">{profile.fullName}</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-50 text-emerald-800 border border-emerald-300">
                    VERIFIED SOURCE
                  </span>
                </div>

                <div className="text-xs text-slate-600 font-medium">
                  Staff Systems Infrastructure Architect • {profile.location || 'London, UK'}
                </div>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {profile.bio || 'Specialized in deep container orchestration architectures, automated service meshes, and high-concurrency systems development in Go. Proponent of explainable infrastructure configurations.'}
                </p>

                {/* Verified Work Experience Timeline */}
                <div className="pt-4 border-t border-slate-100 space-y-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Verified Work Experience Timeline
                  </div>

                  <div className="space-y-3 pl-4 border-l-2 border-[#0C2B24] text-xs">
                    <div className="space-y-1 relative">
                      <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[#0C2B24]"></span>
                      <div className="flex items-center justify-between font-semibold text-slate-900">
                        <span>CloudScale Systems — Lead Systems Architect</span>
                        <span className="text-[10px] font-mono text-slate-400">2022 - PRESENT</span>
                      </div>
                      <p className="text-slate-600">Rebuilt transit microservice models in production clusters using concurrent Go mechanisms. Implemented Terraform infrastructure definitions mapping AWS VPC networks safely.</p>
                    </div>

                    <div className="space-y-1 relative pt-2">
                      <span className="absolute -left-[21px] top-3 w-2.5 h-2.5 rounded-full bg-slate-300"></span>
                      <div className="flex items-center justify-between font-semibold text-slate-900">
                        <span>TechCorp — Infrastructure Engineer</span>
                        <span className="text-[10px] font-mono text-slate-400">2019 - 2022</span>
                      </div>
                      <p className="text-slate-600">Spearheaded transition from bare metal clusters to AWS Kubernetes setups. Configured custom routing metrics using basic Prometheus instrumentation nodes.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side: Evaluation Actions & Repos Telemetry */}
              <div className="lg:col-span-4 space-y-4">
                
                {/* Actions Box */}
                <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xs space-y-3">
                  <div className="text-[10px] font-mono uppercase text-slate-500">EVALUATION ACTIONS</div>
                  <div className="text-sm font-semibold text-slate-900">Secure Recruitment Channel</div>
                  <div className="space-y-2 pt-2">
                    <button className="w-full py-2.5 px-4 rounded-lg text-xs font-semibold text-white bg-[#0C2B24] hover:bg-[#133E34] transition">
                      Unlock Evidence Map
                    </button>
                    <button className="w-full py-2.5 px-4 rounded-lg text-xs font-medium text-slate-700 border border-[#E2E8F0] hover:bg-slate-50 transition">
                      Contact Andrew Directly
                    </button>
                  </div>
                </div>

                {/* Ingested Repos Telemetry Card */}
                <div className="bg-[#081E17] text-white border border-[#1B4D41] rounded-xl p-6 shadow-xs space-y-3">
                  <div className="flex items-center gap-2 text-[10px] font-mono uppercase text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span>Ingested Repos Telemetry</span>
                  </div>
                  <div className="space-y-2 text-xs divide-y divide-[#133E34]/80">
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-slate-400">Top Repository:</span>
                      <span className="font-mono text-amber-400">{profile.githubUsername ? `${profile.githubUsername}/k8s-mesh` : 'k8s-engine-mesh'}</span>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-slate-400">Contribution Streak:</span>
                      <span className="font-mono font-bold text-white">42 days</span>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-slate-400">Total Verifiable Commits:</span>
                      <span className="font-mono font-bold text-emerald-400">1,248 commits</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>

            {/* Profile Editing Form (Preserved for E2E Test Compatibility) */}
            <form onSubmit={handleSaveProfile} className="bg-white border border-[#E2E8F0] rounded-xl p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Cập nhật Chi tiết Hồ sơ & Định hướng</h3>
                  <p className="text-xs text-slate-500">Chỉnh sửa thông tin liên hệ, đa ngành nghề và bộ kỹ năng đối sánh.</p>
                </div>
                {savedSuccess && (
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Đã lưu thành công!</span>
                  </span>
                )}
              </div>

              {/* Multi-Industry Selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 block">
                  Định hướng Nghề nghiệp Đa ngành
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(['Technology', 'Marketing', 'Design', 'Finance'] as Industry[]).map((ind) => (
                    <button
                      key={ind}
                      type="button"
                      onClick={() => handleIndustryToggle(ind)}
                      className={`p-3 rounded-lg border text-xs font-medium text-left transition ${
                        (profile.additionalIndustries || []).includes(ind) || profile.targetIndustry === ind
                          ? 'bg-[#0C2B24] text-white border-[#0C2B24]'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {ind}
                    </button>
                  ))}
                </div>
              </div>

              {/* Skills Tag Cloud & Adder */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 block">
                  Kỹ năng Chuyên môn
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {profile.skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-3 py-1 rounded-full text-xs font-mono font-medium bg-[#F1F5F3] text-[#0C2B24] border border-[#133E34]/20 flex items-center gap-1.5"
                    >
                      <span>{skill}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="text-slate-400 hover:text-rose-600 font-bold"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2 max-w-md">
                  <input
                    type="text"
                    placeholder="Thêm kỹ năng mới (e.g. Terraform, Rust)..."
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs bg-[#F8FAF9] border border-slate-200 rounded-lg focus:outline-none focus:border-[#0C2B24]"
                  />
                  <button
                    type="button"
                    onClick={handleAddSkill}
                    className="px-3 py-2 rounded-lg text-xs font-semibold bg-slate-800 text-white hover:bg-slate-900 transition"
                  >
                    Thêm
                  </button>
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-lg text-xs font-semibold text-white bg-[#0C2B24] hover:bg-[#133E34] transition flex items-center gap-2 shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Lưu Hồ Sơ Cá Nhân</span>
                </button>
              </div>

            </form>
          </div>
        )}

      </div>
    </div>
  );
}
