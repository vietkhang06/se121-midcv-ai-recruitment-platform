'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { CV } from '@/types';
import { fetchCandidateCVs, saveCandidateCV, deleteCandidateCV } from '@/lib/api';
import { CVUploadModal } from '@/components/cv/CVUploadModal';
import {
  FolderOpen,
  Plus,
  Upload,
  Download,
  Trash2,
  GitBranch,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  Edit3
} from 'lucide-react';

export default function CVLibraryPage() {
  const [cvList, setCvList] = useState<CV[]>([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);

  useEffect(() => {
    fetchCandidateCVs().then(setCvList);
  }, []);

  const handleDelete = async (targetCv: CV) => {
    if (confirm(`Are you sure you want to delete profile "${targetCv.title}"?`)) {
      await deleteCandidateCV(targetCv.id);
      const updated = await fetchCandidateCVs();
      setCvList(updated);
    }
  };

  const handleExport = (targetCv: CV) => {
    window.location.href = `/candidate/cvs/builder?edit=${targetCv.id}`;
  };

  return (
    <div className="bg-[#F8FAF9] min-h-screen py-8 text-slate-800 space-y-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* 06 — Header Section (Figma Screen 06) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="space-y-1">
            <span className="text-[11px] font-mono font-semibold text-amber-700 uppercase tracking-widest">
              CANDIDATE ASSETS
            </span>
            <h1 className="text-3xl font-editorial text-slate-900">
              Curate Verifiable Experience Profiles
              <span className="sr-only"> — Thư Viện CV Cá Nhân</span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="px-4 py-2 rounded-lg text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
            >
              Upload New / Ingest Repo
            </button>
            <Link
              href="/candidate/cvs/builder"
              className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#0C2B24] hover:bg-[#133E34] transition shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Create New CV</span>
            </Link>
          </div>
        </div>

        {/* 06 — MatchProof Ingestion Node Active Banner (Figma Screen 06) */}
        <div className="bg-[#081E17] text-white border border-[#1B4D41] rounded-xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></div>
            <div>
              <div className="text-xs font-semibold text-white flex items-center gap-2">
                <span>MatchProof Ingestion Node Active</span>
                <span className="text-[10px] text-emerald-400 font-mono bg-[#133E34] px-2 py-0.5 rounded">
                  v2.4 AST Parser
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-mono pt-0.5">
                Parsing live commits from github.com/andrew-sterling/k8s-engine-mesh
              </p>
            </div>
          </div>

          {/* Checklist */}
          <div className="flex items-center gap-4 text-xs font-medium text-slate-300 flex-wrap">
            <span className="flex items-center gap-1 text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Personal info
            </span>
            <span className="flex items-center gap-1 text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Experience
            </span>
            <span className="flex items-center gap-1 text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Skills Graph
            </span>
            <span className="flex items-center gap-1 text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
              Education (Parsing...)
            </span>
          </div>
        </div>

        {/* 06 — CV Cards Grid (Figma Screen 06) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Staff k8s Profile */}
          {cvList.map((cv, idx) => {
            const score = idx === 0 ? 94 : 85;
            return (
              <div
                key={cv.id}
                className="bg-white border border-[#E2E8F0] hover:border-[#0C2B24] rounded-xl p-6 shadow-xs flex flex-col justify-between transition-all"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-slate-900 text-sm truncate max-w-[200px]" title={cv.title}>
                        {cv.title.includes('Andrew') ? cv.title : `Andrew_Sterling_Staff_k8s.pdf (${cv.title})`}
                      </h3>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        Updated {cv.updatedAt || '2 hours ago'}
                      </div>
                    </div>

                    {/* Circular Match Gauge Ring */}
                    <div className="relative w-11 h-11 flex items-center justify-center shrink-0">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-slate-100"
                          strokeWidth="3.5"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="text-amber-500"
                          strokeDasharray={`${score}, 100`}
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <span className="absolute font-bold font-mono text-[10px] text-slate-800">
                        {score}%
                      </span>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 text-[11px]">
                    <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                      {idx === 0 ? 'Systems Architecture' : 'Golang Development'}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                      {idx === 0 ? 'London (Hybrid)' : 'Full Remote'}
                    </span>
                  </div>

                  {/* Active Submissions Counter */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Active Job Submissions</span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-black text-white">
                      {idx === 0 ? '4 Applications' : '1 Application'}
                    </span>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="pt-5 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  <Link
                    href={`/candidate/cvs/builder?edit=${cv.id}`}
                    className="flex-1 py-1.5 px-3 rounded-md text-center text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
                  >
                    Edit Evidence
                  </Link>
                  <button
                    onClick={() => handleExport(cv)}
                    title="Export / Download PDF"
                    className="p-2 rounded-md border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(cv)}
                    title="Delete Profile"
                    className="p-2 rounded-md border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Card 3: Upload New / Ingest Repo Card (Dashed) */}
          <div
            onClick={() => setIsUploadModalOpen(true)}
            className="border-2 border-dashed border-slate-300 hover:border-[#0C2B24] rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50/50 transition min-h-[260px] space-y-3"
          >
            <div className="w-12 h-12 rounded-full bg-[#F1F5F3] text-[#0C2B24] flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">Upload New / Ingest Repo</div>
              <p className="text-xs text-slate-500 mt-1">Drag & drop PDF, DOCX or connect repo</p>
            </div>
            <div className="text-[10px] font-mono text-slate-400">
              SUPPORTED: GitHub link, raw AST payload, PDF
            </div>
          </div>

        </div>

      </div>

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <CVUploadModal
          isOpen={true}
          onClose={() => setIsUploadModalOpen(false)}
          onSuccess={() => {
            setIsUploadModalOpen(false);
            fetchCandidateCVs().then(setCvList);
          }}
        />
      )}

    </div>
  );
}
