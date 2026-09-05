'use client';

import React from 'react';
import Link from 'next/link';
import { Job } from '@/types';
import { Briefcase, Bookmark, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface JobCardProps {
  job: Job;
  onApplyClick?: (job: Job) => void;
  matchScore?: number;
}

export const JobCard: React.FC<JobCardProps> = ({ job, onApplyClick, matchScore = 96 }) => {
  const verifiedCount = Math.min(job.requirements.length, 11);
  const totalCount = Math.max(job.requirements.length, 12);
  const percentVerified = Math.round((verifiedCount / totalCount) * 100);

  return (
    <div className="bg-white border border-[#E2E8F0] hover:border-[#0C2B24] rounded-xl p-6 shadow-xs hover:shadow-md transition-all duration-200">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        
        {/* Left: Company Icon + Details */}
        <div className="flex items-start gap-4 flex-1">
          <div className="w-12 h-12 rounded-lg bg-[#F1F5F3] border border-[#E2E8F0] flex items-center justify-center text-[#0C2B24] shrink-0">
            <Briefcase className="w-6 h-6" />
          </div>

          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-semibold text-slate-900 hover:text-[#0C2B24] transition">
                <Link href={`/jobs/${job.id}`}>{job.title}</Link>
              </h3>
              {job.companyVerified && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Verified Company</span>
                </span>
              )}
            </div>

            <div className="text-xs text-slate-600">
              <span className="font-medium text-slate-800">{job.companyName}</span>
              <span className="mx-2 text-slate-400">•</span>
              <span>{job.location} ({job.employmentType})</span>
            </div>

            {/* Matching Technical Skills Bar */}
            <div className="pt-2 max-w-md space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-medium">Matching Technical Skills</span>
                <span className="font-semibold text-slate-800 font-mono">
                  {verifiedCount} / {totalCount} Verified
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-[#0C2B24] h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${percentVerified}%` }}
                />
              </div>
            </div>

            {/* Salary & Date */}
            <div className="pt-2 text-xs text-slate-500 font-mono">
              <span className="font-semibold text-slate-800">
                {job.salaryRange || `$${job.salaryMin} - $${job.salaryMax} /mo`}
              </span>
              <span className="mx-2 text-slate-300">•</span>
              <span>Posted {job.publishedDate || '2 days ago'}</span>
            </div>
          </div>
        </div>

        {/* Right: Match Badge & Actions */}
        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 shrink-0 pt-2 sm:pt-0">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-bold font-mono bg-amber-50 text-amber-800 border border-amber-300">
              {matchScore}% MATCH
            </span>
            <button className="text-slate-400 hover:text-slate-600 p-1" title="Save job">
              <Bookmark className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Link
              href={`/jobs/${job.id}`}
              className="px-3.5 py-1.5 rounded-md text-xs font-medium border border-[#E2E8F0] text-slate-700 hover:bg-slate-50 transition"
            >
              View Match Details
            </Link>
            <button
              onClick={() => onApplyClick && onApplyClick(job)}
              className="px-4 py-1.5 rounded-md text-xs font-semibold text-white bg-[#0C2B24] hover:bg-[#133E34] transition shadow-xs"
            >
              Quick Apply
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
