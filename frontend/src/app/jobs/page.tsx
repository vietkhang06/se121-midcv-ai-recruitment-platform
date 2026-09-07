'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Job } from '@/types';
import { fetchJobs, fetchCandidateProfile } from '@/lib/api';
import { JobCard } from '@/components/jobs/JobCard';
import { QuickApplyModal } from '@/components/application/QuickApplyModal';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import {
  Search,
  MapPin,
  SlidersHorizontal,
  ChevronDown,
  Check,
  RotateCcw,
  Sparkles,
  DollarSign,
  Briefcase,
  Layers,
  FilterX
} from 'lucide-react';

export default function JobsPage() {
  const { user, isAuthenticated } = useAuth();
  const { t, locale } = useLanguage();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Filters State
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [locationKeyword, setLocationKeyword] = useState<string>('');
  const [matchThreshold, setMatchThreshold] = useState<string>('all');
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [selectedModes, setSelectedModes] = useState<string[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [minSalary, setMinSalary] = useState<number>(0);
  const [skillFilter, setSkillFilter] = useState<string>('');
  const [onlyTargetIndustries, setOnlyTargetIndustries] = useState<boolean>(false);
  const [candidateIndustries, setCandidateIndustries] = useState<string[]>([]);

  const [sortBy, setSortBy] = useState<string>('newest');
  const [applyJob, setApplyJob] = useState<Job | null>(null);

  useEffect(() => {
    setIsLoading(true);
    fetchJobs()
      .then((data) => {
        const published = data.filter((j) => j.status === 'PUBLISHED');
        setJobs(published);
        setFetchError(null);
      })
      .catch((err) => {
        setFetchError(err.message || 'Unable to load jobs catalog.');
      })
      .finally(() => setIsLoading(false));

    // If authenticated candidate, load target industries for multi-industry recommendation
    if (isAuthenticated && user?.role === 'CANDIDATE') {
      fetchCandidateProfile().then((profile) => {
        if (profile?.targetIndustries && profile.targetIndustries.length > 0) {
          setCandidateIndustries(profile.targetIndustries);
        } else if (profile?.targetIndustry) {
          setCandidateIndustries([profile.targetIndustry]);
        }
      });
    }
  }, [isAuthenticated, user]);

  // Real Functional Filtering Engine
  const filteredJobs = useMemo(() => {
    let result = [...jobs];

    // 1. Role Keyword (Title, Company Name, Description)
    if (searchKeyword.trim()) {
      const k = searchKeyword.toLowerCase().trim();
      result = result.filter(
        (j) =>
          j.title.toLowerCase().includes(k) ||
          j.description.toLowerCase().includes(k) ||
          j.companyName.toLowerCase().includes(k)
      );
    }

    // 2. Location Keyword
    if (locationKeyword.trim()) {
      const l = locationKeyword.toLowerCase().trim();
      result = result.filter((j) => j.location.toLowerCase().includes(l));
    }

    // 3. Industry Sector Filter
    if (selectedSectors.length > 0) {
      result = result.filter((j) =>
        selectedSectors.some((sec) => sec.toLowerCase() === j.industry.toLowerCase())
      );
    }

    // 4. Multi-industry Candidate Target Industries Recommendation Filter
    if (onlyTargetIndustries && candidateIndustries.length > 0) {
      result = result.filter((j) =>
        candidateIndustries.some((ci) =>
          j.industry.toLowerCase().includes(ci.toLowerCase()) ||
          ci.toLowerCase().includes(j.industry.toLowerCase())
        )
      );
    }

    // 5. Employment Mode Filter
    if (selectedModes.length > 0) {
      result = result.filter((j) =>
        selectedModes.some((mode) => j.employmentType.toLowerCase().includes(mode.toLowerCase()))
      );
    }

    // 6. Seniority / Experience Level Filter
    if (selectedLevels.length > 0) {
      result = result.filter((j) =>
        selectedLevels.some((lvl) => j.seniority.toLowerCase().includes(lvl.toLowerCase()))
      );
    }

    // 7. Salary Filter
    if (minSalary > 0) {
      result = result.filter((j) => (j.salaryMax ? j.salaryMax >= minSalary : true));
    }

    // 8. Skill Requirement Filter
    if (skillFilter.trim()) {
      const sf = skillFilter.toLowerCase().trim();
      result = result.filter((j) =>
        j.requirements &&
        j.requirements.some(
          (req) =>
            req.skillName.toLowerCase().includes(sf) ||
            (req.description && req.description.toLowerCase().includes(sf))
        )
      );
    }

    // 9. Sorting
    if (sortBy === 'newest') {
      result.sort((a, b) => (b.publishedDate || '').localeCompare(a.publishedDate || ''));
    } else if (sortBy === 'salary_high') {
      result.sort((a, b) => (b.salaryMax || 0) - (a.salaryMax || 0));
    }

    return result;
  }, [
    jobs,
    searchKeyword,
    locationKeyword,
    selectedSectors,
    onlyTargetIndustries,
    candidateIndustries,
    selectedModes,
    selectedLevels,
    minSalary,
    skillFilter,
    sortBy
  ]);

  const handleClearAll = () => {
    setSearchKeyword('');
    setLocationKeyword('');
    setMatchThreshold('all');
    setSelectedSectors([]);
    setSelectedModes([]);
    setSelectedLevels([]);
    setMinSalary(0);
    setSkillFilter('');
    setOnlyTargetIndustries(false);
  };

  const toggleItem = (list: string[], setList: (v: string[]) => void, item: string) => {
    if (list.includes(item)) {
      setList(list.filter((x) => x !== item));
    } else {
      setList([...list, item]);
    }
  };

  const activeFiltersCount =
    (searchKeyword ? 1 : 0) +
    (locationKeyword ? 1 : 0) +
    selectedSectors.length +
    selectedModes.length +
    selectedLevels.length +
    (minSalary > 0 ? 1 : 0) +
    (skillFilter ? 1 : 0) +
    (onlyTargetIndustries ? 1 : 0);

  return (
    <div className="bg-[#F8FAF9] dark:bg-[#071410] min-h-screen py-8 text-slate-800 dark:text-slate-100 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Page Header */}
        <div className="border-b border-slate-200 dark:border-[#1B3D34] pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
              Vector Validation Directory
            </span>
            <h1 className="text-2xl sm:text-3xl font-editorial font-bold text-slate-900 dark:text-white mt-1">
              {t('jobs.pageTitle', 'Job Search & Discovery')}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              {t('jobs.pageSubtitle', 'Explore verified positions across multiple industries with transparent algorithmic criteria.')}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
              Showing <strong className="text-slate-900 dark:text-white">{filteredJobs.length}</strong> of {jobs.length} jobs
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#1B3D34] bg-white dark:bg-[#0E241E] text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="salary_high">Sort: Salary (High to Low)</option>
            </select>
          </div>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Refine Matches Filters Sidebar */}
          <aside className="lg:col-span-4 bg-white dark:bg-[#0E241E] border border-[#E2E8F0] dark:border-[#1B3D34] rounded-xl p-6 space-y-5 shadow-xs transition-colors">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1B3D34] pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#0C2B24] dark:text-emerald-400" />
                <h2 className="font-semibold text-sm text-slate-900 dark:text-white uppercase tracking-wide">
                  {t('jobs.refineMatches', 'Refine Matches')}
                </h2>
                {activeFiltersCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#0C2B24] text-white">
                    {activeFiltersCount}
                  </span>
                )}
              </div>

              {activeFiltersCount > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:text-amber-800 uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{t('jobs.clearAll', 'CLEAR ALL')}</span>
                </button>
              )}
            </div>

            {/* Candidate Target Industries Recommendation Toggle */}
            {candidateIndustries.length > 0 && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-1.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={onlyTargetIndustries}
                    onChange={(e) => setOnlyTargetIndustries(e.target.checked)}
                    className="accent-emerald-600 rounded"
                  />
                  <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                    Match My Target Industries
                  </span>
                </label>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 pl-5">
                  Filtering for: {candidateIndustries.join(', ')}
                </p>
              </div>
            )}

            {/* Role Keyword Filter */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono font-semibold uppercase text-slate-500 dark:text-slate-400">
                {t('jobs.roleKeyword', 'ROLE KEYWORD')}
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. Infrastructure, Java, Senior..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="w-full bg-[#F8FAF9] dark:bg-[#0A1E19] border border-slate-200 dark:border-[#1B3D34] rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#0C2B24] dark:focus:border-emerald-500"
                />
                {searchKeyword && (
                  <button
                    onClick={() => setSearchKeyword('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* Location Filter */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono font-semibold uppercase text-slate-500 dark:text-slate-400">
                {t('jobs.locationKeyword', 'LOCATION')}
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. London, Hanoi, Remote..."
                  value={locationKeyword}
                  onChange={(e) => setLocationKeyword(e.target.value)}
                  className="w-full bg-[#F8FAF9] dark:bg-[#0A1E19] border border-slate-200 dark:border-[#1B3D34] rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#0C2B24] dark:focus:border-emerald-500"
                />
                {locationKeyword && (
                  <button
                    onClick={() => setLocationKeyword('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* Required Skill Filter */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono font-semibold uppercase text-slate-500 dark:text-slate-400">
                SKILL REQUIREMENT
              </label>
              <input
                type="text"
                placeholder="e.g. Spring Boot, Docker, PostgreSQL..."
                value={skillFilter}
                onChange={(e) => setSkillFilter(e.target.value)}
                className="w-full bg-[#F8FAF9] dark:bg-[#0A1E19] border border-slate-200 dark:border-[#1B3D34] rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#0C2B24] dark:focus:border-emerald-500"
              />
            </div>

            {/* Industry Sector Filter */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-[#1B3D34]">
              <label className="text-[11px] font-mono font-semibold uppercase text-slate-500 dark:text-slate-400">
                {t('jobs.industrySector', 'INDUSTRY SECTOR')}
              </label>
              <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                {['Technology', 'Marketing', 'Design', 'Finance', 'Healthcare', 'Engineering'].map((sector) => (
                  <label key={sector} className="flex items-center gap-2 cursor-pointer hover:text-slate-900 dark:hover:text-white select-none">
                    <input
                      type="checkbox"
                      checked={selectedSectors.includes(sector)}
                      onChange={() => toggleItem(selectedSectors, setSelectedSectors, sector)}
                      className="accent-[#0C2B24] dark:accent-emerald-500 rounded"
                    />
                    <span>{sector === 'Technology' ? 'Distributed Systems / Tech' : sector}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Employment Mode */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-[#1B3D34]">
              <label className="text-[11px] font-mono font-semibold uppercase text-slate-500 dark:text-slate-400">
                {t('jobs.employmentMode', 'EMPLOYMENT MODE')}
              </label>
              <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                {['Remote', 'Hybrid', 'Full-time', 'Contract'].map((mode) => (
                  <label key={mode} className="flex items-center gap-2 cursor-pointer hover:text-slate-900 dark:hover:text-white select-none">
                    <input
                      type="checkbox"
                      checked={selectedModes.includes(mode)}
                      onChange={() => toggleItem(selectedModes, setSelectedModes, mode)}
                      className="accent-[#0C2B24] dark:accent-emerald-500 rounded"
                    />
                    <span>{mode}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Experience Level */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-[#1B3D34]">
              <label className="text-[11px] font-mono font-semibold uppercase text-slate-500 dark:text-slate-400">
                {t('jobs.experienceLevel', 'EXPERIENCE LEVEL')}
              </label>
              <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                {['Junior', 'Mid', 'Senior', 'Lead'].map((lvl) => (
                  <label key={lvl} className="flex items-center gap-2 cursor-pointer hover:text-slate-900 dark:hover:text-white select-none">
                    <input
                      type="checkbox"
                      checked={selectedLevels.includes(lvl)}
                      onChange={() => toggleItem(selectedLevels, setSelectedLevels, lvl)}
                      className="accent-[#0C2B24] dark:accent-emerald-500 rounded"
                    />
                    <span>{lvl} Level</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Salary Range Slider */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-[#1B3D34]">
              <div className="flex items-center justify-between text-[11px] font-mono font-semibold uppercase text-slate-500 dark:text-slate-400">
                <span>MIN SALARY</span>
                <span className="text-[#0C2B24] dark:text-emerald-400 font-bold">
                  {minSalary > 0 ? `$${minSalary.toLocaleString()} /mo` : 'Any'}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={10000}
                step={500}
                value={minSalary}
                onChange={(e) => setMinSalary(parseInt(e.target.value) || 0)}
                className="w-full accent-[#0C2B24] dark:accent-emerald-500 cursor-pointer"
              />
            </div>
          </aside>

          {/* Right Column: Job Listings Results */}
          <main className="lg:col-span-8 space-y-4">
            {isLoading ? (
              <div className="py-16 text-center text-slate-500 bg-white dark:bg-[#0E241E] border border-slate-200 dark:border-[#1B3D34] rounded-2xl">
                Loading verified positions...
              </div>
            ) : fetchError ? (
              <div className="py-12 text-center text-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl p-6">
                <p className="font-semibold">{fetchError}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-3 px-4 py-2 bg-rose-600 text-white text-xs font-semibold rounded-lg"
                >
                  Retry Loading
                </button>
              </div>
            ) : filteredJobs.length > 0 ? (
              filteredJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onApplyClick={(j) => setApplyJob(j)}
                  matchStatus={isAuthenticated && user?.role === 'CANDIDATE' ? 'INSUFFICIENT_DATA' : undefined}
                />
              ))
            ) : (
              /* Real Empty State */
              <div className="py-16 text-center bg-white dark:bg-[#0E241E] border border-slate-200 dark:border-[#1B3D34] rounded-2xl p-8 space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 dark:bg-[#14332B] flex items-center justify-center text-slate-400">
                  <FilterX className="w-8 h-8" />
                </div>
                <div className="space-y-1 max-w-md mx-auto">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {t('jobs.noJobsFound', 'No matching positions found')}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('jobs.clearFiltersPrompt', 'Try clearing some filter criteria to discover more opportunities.')}
                  </p>
                </div>
                <button
                  onClick={handleClearAll}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#0C2B24] dark:bg-emerald-700 hover:bg-[#133E34] transition shadow-xs cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{t('jobs.resetFiltersCta', 'Reset All Filters')}</span>
                </button>
              </div>
            )}
          </main>

        </div>

        {/* Quick Apply Modal */}
        {applyJob && (
          <QuickApplyModal
            isOpen={!!applyJob}
            onClose={() => setApplyJob(null)}
            job={applyJob}
          />
        )}

      </div>
    </div>
  );
}
