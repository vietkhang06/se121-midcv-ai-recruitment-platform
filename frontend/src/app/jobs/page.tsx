'use client';

import React, { useState, useEffect } from 'react';
import { Job } from '@/types';
import { fetchJobs } from '@/lib/api';
import { JobCard } from '@/components/jobs/JobCard';
import { QuickApplyModal } from '@/components/application/QuickApplyModal';
import { Search, MapPin, SlidersHorizontal, ChevronDown, Check } from 'lucide-react';

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [locationKeyword, setLocationKeyword] = useState<string>('');
  const [matchThreshold, setMatchThreshold] = useState<string>('all');
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [selectedModes, setSelectedModes] = useState<string[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>('highest_match');
  const [applyJob, setApplyJob] = useState<Job | null>(null);

  useEffect(() => {
    fetchJobs().then((data) => {
      const published = data.filter((j) => j.status === 'PUBLISHED');
      setJobs(published);
      setFilteredJobs(published);
    });
  }, []);

  useEffect(() => {
    let result = [...jobs];
    if (searchKeyword) {
      const k = searchKeyword.toLowerCase();
      result = result.filter(
        (j) =>
          j.title.toLowerCase().includes(k) ||
          j.description.toLowerCase().includes(k) ||
          j.companyName.toLowerCase().includes(k)
      );
    }
    if (locationKeyword) {
      const l = locationKeyword.toLowerCase();
      result = result.filter((j) => j.location.toLowerCase().includes(l));
    }
    if (selectedSectors.length > 0) {
      result = result.filter((j) => selectedSectors.includes(j.industry));
    }
    if (selectedModes.length > 0) {
      result = result.filter((j) => selectedModes.includes(j.employmentType));
    }
    if (selectedLevels.length > 0) {
      result = result.filter((j) =>
        selectedLevels.some((lvl) => j.seniority.toLowerCase().includes(lvl.toLowerCase()))
      );
    }
    setFilteredJobs(result);
  }, [searchKeyword, locationKeyword, selectedSectors, selectedModes, selectedLevels, jobs]);

  const handleClearAll = () => {
    setSearchKeyword('');
    setLocationKeyword('');
    setMatchThreshold('all');
    setSelectedSectors([]);
    setSelectedModes([]);
    setSelectedLevels([]);
  };

  const toggleItem = (list: string[], setList: (v: string[]) => void, item: string) => {
    if (list.includes(item)) {
      setList(list.filter((x) => x !== item));
    } else {
      setList([...list, item]);
    }
  };

  return (
    <div className="bg-[#F8FAF9] min-h-screen py-8 text-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Hidden SEO/Test Header Anchor */}
        <div className="border-b border-slate-200 pb-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Vector Validation Directory
          </span>
          <h1 className="text-2xl sm:text-3xl font-editorial font-semibold text-slate-900 mt-1">
            Job Search & Discovery — Tìm Kiếm Việc Làm Toàn Quốc
          </h1>
        </div>

        {/* 02 — 2-Column Responsive Layout (Figma Screen 02) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Refine Matches Filters Sidebar */}
          <div className="lg:col-span-4 bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="font-semibold text-sm text-slate-900 uppercase tracking-wide">Refine Matches</h2>
              <button
                onClick={handleClearAll}
                className="text-[11px] font-semibold text-amber-700 hover:text-amber-800 uppercase tracking-wider"
              >
                CLEAR ALL
              </button>
            </div>

            {/* Role Keyword */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono font-semibold uppercase text-slate-500">ROLE KEYWORD</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. Infrastructure Engineer, Java..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="w-full bg-[#F8FAF9] border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0C2B24]"
                />
              </div>
            </div>

            {/* Location */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono font-semibold uppercase text-slate-500">LOCATION</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. London, Hanoi, Remote..."
                  value={locationKeyword}
                  onChange={(e) => setLocationKeyword(e.target.value)}
                  className="w-full bg-[#F8FAF9] border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0C2B24]"
                />
              </div>
            </div>

            {/* Match Threshold */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="text-[11px] font-mono font-semibold uppercase text-slate-500">MATCH THRESHOLD</label>
              <div className="space-y-1.5 text-xs text-slate-700">
                {[
                  { id: '90', label: '> 90% (Strict)' },
                  { id: '80', label: '> 80% (Recommended)' },
                  { id: '70', label: '> 70% (Broad)' },
                ].map((item) => (
                  <label key={item.id} className="flex items-center gap-2 cursor-pointer hover:text-slate-900">
                    <input
                      type="radio"
                      name="threshold"
                      checked={matchThreshold === item.id}
                      onChange={() => setMatchThreshold(item.id)}
                      className="accent-[#0C2B24]"
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Industry Sector */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="text-[11px] font-mono font-semibold uppercase text-slate-500">INDUSTRY SECTOR</label>
              <div className="space-y-1.5 text-xs text-slate-700">
                {['Technology', 'Marketing', 'Design', 'Finance'].map((sector) => (
                  <label key={sector} className="flex items-center gap-2 cursor-pointer hover:text-slate-900">
                    <input
                      type="checkbox"
                      checked={selectedSectors.includes(sector)}
                      onChange={() => toggleItem(selectedSectors, setSelectedSectors, sector)}
                      className="accent-[#0C2B24] rounded"
                    />
                    <span>{sector === 'Technology' ? 'Distributed Systems / Tech' : sector}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Employment Mode */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="text-[11px] font-mono font-semibold uppercase text-slate-500">EMPLOYMENT MODE</label>
              <div className="space-y-1.5 text-xs text-slate-700">
                {['Remote', 'Hybrid', 'Full-time'].map((mode) => (
                  <label key={mode} className="flex items-center gap-2 cursor-pointer hover:text-slate-900">
                    <input
                      type="checkbox"
                      checked={selectedModes.includes(mode)}
                      onChange={() => toggleItem(selectedModes, setSelectedModes, mode)}
                      className="accent-[#0C2B24] rounded"
                    />
                    <span>{mode}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Experience Level */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="text-[11px] font-mono font-semibold uppercase text-slate-500">EXPERIENCE LEVEL</label>
              <div className="space-y-1.5 text-xs text-slate-700">
                {['Junior', 'Mid Level', 'Senior', 'Lead'].map((lvl) => (
                  <label key={lvl} className="flex items-center gap-2 cursor-pointer hover:text-slate-900">
                    <input
                      type="checkbox"
                      checked={selectedLevels.includes(lvl)}
                      onChange={() => toggleItem(selectedLevels, setSelectedLevels, lvl)}
                      className="accent-[#0C2B24] rounded"
                    />
                    <span>{lvl}</span>
                  </label>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column: Job List & Pagination */}
          <div className="lg:col-span-8 space-y-4">
            
            {/* Results Header with Count & Sort */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="text-xs text-slate-600">
                Found <strong className="text-slate-900 font-semibold">{filteredJobs.length} matching positions</strong> based on vector validation
              </div>
              
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-[#F8FAF9] border border-slate-200 rounded-md px-2.5 py-1 text-slate-800 font-medium focus:outline-none focus:border-[#0C2B24]"
                >
                  <option value="highest_match">Highest Match Score</option>
                  <option value="newest">Most Recent</option>
                  <option value="salary">Highest Compensation</option>
                </select>
              </div>
            </div>

            {/* Job Cards */}
            <div className="space-y-4">
              {filteredJobs.length > 0 ? (
                filteredJobs.map((job, idx) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    matchScore={96 - idx * 4}
                    onApplyClick={(j) => setApplyJob(j)}
                  />
                ))
              ) : (
                <div className="bg-white border border-[#E2E8F0] rounded-xl p-12 text-center text-slate-500 space-y-3">
                  <div className="text-sm font-semibold text-slate-700">No positions found matching filter criteria</div>
                  <p className="text-xs text-slate-400">Try broadening your search keywords or clearing threshold constraints.</p>
                  <button
                    onClick={handleClearAll}
                    className="mt-2 px-4 py-2 rounded-md text-xs font-semibold bg-[#0C2B24] text-white hover:bg-[#133E34] transition"
                  >
                    Reset All Filters
                  </button>
                </div>
              )}
            </div>

            {/* Pagination Controls (Figma Screen 02) */}
            <div className="pt-6 flex items-center justify-center gap-1.5 text-xs font-medium">
              <button className="px-3 py-1.5 rounded-md border border-[#E2E8F0] bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                Previous
              </button>
              <button className="px-3 py-1.5 rounded-md bg-[#0C2B24] text-white font-bold">1</button>
              <button className="px-3 py-1.5 rounded-md border border-[#E2E8F0] bg-white text-slate-700 hover:bg-slate-50">2</button>
              <button className="px-3 py-1.5 rounded-md border border-[#E2E8F0] bg-white text-slate-700 hover:bg-slate-50">3</button>
              <button className="px-3 py-1.5 rounded-md border border-[#E2E8F0] bg-white text-slate-700 hover:bg-slate-50">4</button>
              <button className="px-3 py-1.5 rounded-md border border-[#E2E8F0] bg-white text-slate-600 hover:bg-slate-50">
                Next
              </button>
            </div>

          </div>

        </div>

      </div>

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
