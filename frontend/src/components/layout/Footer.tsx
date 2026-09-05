'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#081C15] border-t border-[#133E34] text-slate-400 text-sm py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-5 gap-10">
        {/* Brand Column */}
        <div className="space-y-4 md:col-span-2 pr-6">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-xl text-white tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-[#10B981] flex items-center justify-center shadow-md">
              <ShieldCheck className="w-5 h-5 text-[#081C15] stroke-[2.5]" />
            </div>
            <span className="font-editorial text-2xl tracking-normal text-white">MatchProof</span>
          </Link>
          <p className="text-xs text-slate-300/80 leading-relaxed max-w-sm">
            MatchProof is an objective evaluation layer for modern technical recruitment. Built to empower developers and infrastructure experts with transparent matching vectors.
          </p>
          <div className="pt-2 flex items-center gap-3 text-xs text-emerald-400 font-mono">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Vector Ingestion Engine 1536D • Active</span>
          </div>
        </div>

        {/* Platform */}
        <div>
          <h4 className="text-[11px] font-semibold text-slate-200 uppercase tracking-widest mb-4">Platform</h4>
          <ul className="space-y-2.5 text-xs text-slate-400">
            <li><Link href="/jobs" className="hover:text-white transition">Search Jobs</Link></li>
            <li><Link href="/candidate/cvs" className="hover:text-white transition">Verifiable Resume</Link></li>
            <li><Link href="/candidate/profile" className="hover:text-white transition">Matching Vector Map</Link></li>
            <li><Link href="/candidate/applications" className="hover:text-white transition">Explainable Ranking</Link></li>
          </ul>
        </div>

        {/* Developers */}
        <div>
          <h4 className="text-[11px] font-semibold text-slate-200 uppercase tracking-widest mb-4">Developers</h4>
          <ul className="space-y-2.5 text-xs text-slate-400">
            <li><Link href="/candidate/cvs/builder" className="hover:text-white transition">CV Evidence Builder</Link></li>
            <li><a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-white transition">GitHub Parsing API</a></li>
            <li><Link href="/candidate/profile" className="hover:text-white transition">Evidence Telemetry</Link></li>
            <li><Link href="/jobs" className="hover:text-white transition">Open Rubric Spec</Link></li>
          </ul>
        </div>

        {/* Recruiter / Company */}
        <div>
          <h4 className="text-[11px] font-semibold text-slate-200 uppercase tracking-widest mb-4">Recruiter Portal</h4>
          <ul className="space-y-2.5 text-xs text-slate-400">
            <li><Link href="/recruiter" className="hover:text-white transition">Hiring Console</Link></li>
            <li><Link href="/recruiter/jobs/new" className="hover:text-white transition">JD Builder & Rubrics</Link></li>
            <li><Link href="/recruiter/company" className="hover:text-white transition">Company Verification</Link></li>
            <li><Link href="/recruiter" className="hover:text-white transition">Recruitment Telemetry</Link></li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-6 border-t border-[#133E34]/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
        <div>© 2026 MatchProof Inc. All rights reserved. Recruiter & Candidate Platform.</div>
        <div className="flex items-center gap-6 text-xs text-slate-400">
          <a href="#" className="hover:text-white transition">Privacy Policy</a>
          <a href="#" className="hover:text-white transition">Terms of Service</a>
          <a href="#" className="hover:text-white transition">Compliance Security</a>
          <a href="#" className="hover:text-white transition">EEO Compliance</a>
        </div>
      </div>
    </footer>
  );
};
