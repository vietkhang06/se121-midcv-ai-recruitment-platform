'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Industry, EmploymentType, Job, Company } from '@/types';
import { fetchRecruiterProfile, saveJob, MOCK_COMPANY } from '@/lib/api';
import {
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Send,
  Save,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';

export default function CreateJobPage() {
  const [company, setCompany] = useState<Company>(MOCK_COMPANY);

  const [title, setTitle] = useState<string>('Senior Systems Architect');
  const [department, setDepartment] = useState<string>('Platform Engineering');
  const [location, setLocation] = useState<string>('London, UK (Hybrid)');
  const [employmentType, setEmploymentType] = useState<EmploymentType>('FULL_TIME');
  const [salaryRange, setSalaryRange] = useState<string>('£110,000 - £130,000');
  const [seniority, setSeniority] = useState<string>('Senior (5+ Years)');
  const [industry, setIndustry] = useState<Industry>('Technology');
  const [responsibilities, setResponsibilities] = useState<string>(
    '• Architect high-concurrency event routing microservices using Go and Rust. • Deliver resilient multi-region infrastructure orchestration through custom Terraform structures. • Audit Kubernetes production environments and maintain strict Service Mesh routing matrices.'
  );

  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [publishBlockedMessage, setPublishBlockedMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchRecruiterProfile().then((p) => setCompany(p.company));
  }, []);

  const handleSaveJob = async (statusToSave: 'DRAFT' | 'PUBLISHED') => {
    if (statusToSave === 'PUBLISHED' && company?.verificationStatus !== 'VERIFIED') {
      setPublishBlockedMessage('Doanh nghiệp chưa hoàn tất xác minh! Thao tác PUBLISH (Xuất bản) bị từ chối.');
      return;
    }

    setPublishBlockedMessage(null);

    const newJob: Job = {
      id: `job-rec-${Date.now()}`,
      title,
      companyName: company ? company.name : 'CloudScale Systems',
      companyVerified: company?.verificationStatus === 'VERIFIED',
      industry,
      employmentType,
      seniority,
      location,
      salaryMin: 3500,
      salaryMax: 5500,
      salaryRange,
      publishedDate: new Date().toISOString().split('T')[0],
      description: `Role in ${department}: ${responsibilities}`,
      responsibilities: responsibilities.split('•').map((s) => s.trim()).filter(Boolean),
      requirements: [
        { id: 'req-1', skillName: 'Go', requirementType: 'REQUIRED', minYearsExperience: 3 },
        { id: 'req-2', skillName: 'Kubernetes', requirementType: 'REQUIRED', minYearsExperience: 3 },
        { id: 'req-3', skillName: 'Terraform', requirementType: 'REQUIRED', minYearsExperience: 2 },
        { id: 'req-4', skillName: 'Rust', requirementType: 'PREFERRED', minYearsExperience: 1 },
      ],
      status: statusToSave,
    };

    await saveJob(newJob);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      window.location.href = '/recruiter/jobs';
    }, 1500);
  };

  return (
    <div className="bg-[#F8FAF9] min-h-screen py-8 text-slate-800 space-y-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Header & Back Link */}
        <div className="border-b border-slate-200 pb-4">
          <Link href="/recruiter/jobs" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition mb-3">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Postings</span>
          </Link>

          <span className="text-[11px] font-mono font-semibold text-slate-500 uppercase tracking-widest block">
            RUBRIC COMPILER ENGINE
          </span>
          <h1 className="text-3xl font-editorial font-bold text-slate-900 mt-1">
            Create Job Profile — Tạo Bài Tuyển Dụng Mới
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Verify and establish exact technical rubrics for matching candidates
          </p>
        </div>

        {/* Success Banner (Required by Playwright E2E Tests: #save-success-banner) */}
        {savedSuccess && (
          <div
            id="save-success-banner"
            className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-center gap-2 shadow-xs"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">
              Bài tuyển dụng đã được lưu thành công vào hệ thống MatchProof Engine!
            </span>
          </div>
        )}

        {publishBlockedMessage && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-center gap-2 shadow-xs">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{publishBlockedMessage}</span>
          </div>
        )}

        {/* 11 — 2-Column Studio (Figma Screen 11) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Role Fundamentals & AI Assisted JD (lg:col-span-8) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Card 1: Role Fundamentals */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xs space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-900">Role Fundamentals</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-semibold uppercase text-slate-500">JOB TITLE</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-[#F8FAF9] border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0C2B24]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-semibold uppercase text-slate-500">DEPARTMENT</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-[#F8FAF9] border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0C2B24]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-semibold uppercase text-slate-500">LOCATION</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-[#F8FAF9] border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0C2B24]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-semibold uppercase text-slate-500">EMPLOYMENT TYPE</label>
                  <select
                    value={employmentType}
                    onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
                    className="w-full bg-[#F8FAF9] border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0C2B24]"
                  >
                    <option value="FULL_TIME">Full-Time Permanent</option>
                    <option value="PART_TIME">Part-Time</option>
                    <option value="CONTRACT">Contract / Consulting</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-semibold uppercase text-slate-500">SALARY RANGE</label>
                  <input
                    type="text"
                    value={salaryRange}
                    onChange={(e) => setSalaryRange(e.target.value)}
                    className="w-full bg-[#F8FAF9] border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0C2B24]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-semibold uppercase text-slate-500">EXPERIENCE LEVEL</label>
                  <input
                    type="text"
                    value={seniority}
                    onChange={(e) => setSeniority(e.target.value)}
                    className="w-full bg-[#F8FAF9] border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0C2B24]"
                  />
                </div>
              </div>
            </div>

            {/* Card 2: AI Assisted Job Description (Figma Screen 11) */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-900">
                  AI Assisted Job Description
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-amber-50 text-amber-800 border border-amber-300">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  <span>COPILOT ACTIVE</span>
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-semibold uppercase text-slate-500">
                  RESPONSIBILITIES (AUTO-GENERATED)
                </label>
                <textarea
                  rows={5}
                  value={responsibilities}
                  onChange={(e) => setResponsibilities(e.target.value)}
                  className="w-full bg-[#F8FAF9] border border-slate-200 rounded-lg p-3 text-xs text-slate-900 focus:outline-none focus:border-[#0C2B24] leading-relaxed"
                />
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() =>
                    setResponsibilities(
                      '• Architect resilient event streams with Kafka and Go. • Configure zero-trust Kubernetes networking. • Conduct strict automated chaos engineering and canary evaluations.'
                    )
                  }
                  className="px-3.5 py-1.5 rounded-md text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
                >
                  Regenerate Section
                </button>
                <button
                  type="button"
                  className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-[#F1F5F3] text-[#0C2B24] border border-[#133E34]/20 hover:bg-[#E2ECE7] transition"
                >
                  Apply to Draft
                </button>
              </div>
            </div>

          </div>

          {/* Right Column: JD Quality Analysis & Optimization Copilot (lg:col-span-4) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Card 1: JD Quality Analysis */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xs space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                JD Quality Analysis
              </h3>

              <div className="bg-[#F8FAF9] border border-slate-200 rounded-xl p-4 text-center space-y-1">
                <div className="text-4xl font-editorial font-bold text-slate-900">84%</div>
                <div className="text-[10px] font-mono uppercase text-slate-500">Match Optimization Index</div>
              </div>

              <div className="space-y-2 text-xs divide-y divide-slate-100">
                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-500">Clarity Score</span>
                  <span className="font-semibold text-slate-900">High</span>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-slate-500">Bias Neutrality</span>
                  <span className="font-semibold text-emerald-700">92%</span>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-slate-500">Required Commits Evidence</span>
                  <span className="font-semibold text-slate-900">3 Verified</span>
                </div>
              </div>
            </div>

            {/* Card 2: Optimization Copilot */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xs space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Optimization Copilot
              </h3>

              {/* Requirement Warning */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1 text-xs text-amber-900">
                <div className="font-semibold text-amber-950 text-[11px]">Requirement Warning</div>
                <p className="text-[11px] leading-relaxed text-amber-900/90 font-light">
                  Requiring exactly &quot;10 years Kubernetes&quot; may reduce candidate matches by 70%. MatchProof suggests reducing to &quot;Hands-on orchestration commits.&quot;
                </p>
              </div>

              {/* Sourcing Suggestion */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1 text-xs text-slate-700">
                <div className="font-semibold text-slate-900 text-[11px]">Sourcing Suggestion</div>
                <p className="text-[11px] leading-relaxed text-slate-600 font-light">
                  Salary range is perfectly aligned to the top 20% of matching profiles in London. Excellent reach expected.
                </p>
              </div>

              {/* Action Buttons with Required Test IDs */}
              <div className="pt-2 space-y-2">
                <button
                  id="save-draft-btn"
                  type="button"
                  onClick={() => handleSaveJob('DRAFT')}
                  className="w-full py-2.5 px-4 rounded-lg text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-50 transition text-center"
                >
                  Save Draft
                </button>

                <button
                  id="publish-job-btn"
                  type="button"
                  onClick={() => handleSaveJob('PUBLISHED')}
                  className="w-full py-2.5 px-4 rounded-lg text-xs font-semibold text-white bg-[#0C2B24] hover:bg-[#133E34] transition shadow-xs text-center"
                >
                  Publish Posting
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
