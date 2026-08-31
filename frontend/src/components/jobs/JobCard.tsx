'use client';

import React from 'react';
import Link from 'next/link';
import { Job } from '@/types';
import { Building2, MapPin, DollarSign, Briefcase, ShieldCheck, ArrowRight, Calendar } from 'lucide-react';

interface JobCardProps {
  job: Job;
  onApplyClick?: (job: Job) => void;
}

export const JobCard: React.FC<JobCardProps> = ({ job, onApplyClick }) => {
  return (
    <div className="group relative bg-slate-900/90 border border-slate-800/80 hover:border-indigo-500/50 rounded-2xl p-5 shadow-lg hover:shadow-indigo-500/10 transition-all duration-300 flex flex-col justify-between">
      <div className="space-y-3">
        {/* Header Badges & Verified tag */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-950/80 border border-indigo-500/30 text-indigo-300">
              {job.industry}
            </span>
            <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 text-slate-300">
              {job.employmentType}
            </span>
          </div>
          {job.companyVerified && (
            <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/50 border border-emerald-500/30 px-2 py-0.5 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verified Company</span>
            </span>
          )}
        </div>

        {/* Title & Company */}
        <div>
          <h3 className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors line-clamp-1">
            <Link href={`/jobs/${job.id}`}>{job.title}</Link>
          </h3>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-medium text-slate-300">{job.companyName}</span>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 pt-1">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <span className="truncate">{job.location}</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium text-emerald-400">
            <DollarSign className="w-3.5 h-3.5" />
            <span>${job.salaryMin} - ${job.salaryMax} /mo</span>
          </div>
        </div>

        {/* Key Skills Tags */}
        <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-800/60">
          {job.requirements.slice(0, 4).map((req) => (
            <span
              key={req.id}
              className={`text-[11px] px-2 py-0.5 rounded-md ${
                req.requirementType === 'REQUIRED'
                  ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-500/30 font-medium'
                  : 'bg-slate-800/60 text-slate-400 border border-slate-700'
              }`}
            >
              {req.skillName}
            </span>
          ))}
          {job.requirements.length > 4 && (
            <span className="text-[10px] text-slate-400 font-mono">+{job.requirements.length - 4} more</span>
          )}
        </div>
      </div>

      {/* Card Footer & CTAs */}
      <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-800/80 text-xs">
        <span className="text-[11px] text-slate-400 flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          <span>{job.publishedDate}</span>
        </span>
        <div className="flex items-center gap-2">
          <Link
            href={`/jobs/${job.id}`}
            className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
          >
            Xem Chi tiết
          </Link>
          <button
            onClick={() => onApplyClick && onApplyClick(job)}
            className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm shadow-indigo-500/20 transition active:scale-95"
          >
            <span>Nộp đơn ngay</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
