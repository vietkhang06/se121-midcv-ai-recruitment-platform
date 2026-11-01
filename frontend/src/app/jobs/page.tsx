'use client';

import React, { Suspense, useCallback, useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Job } from '@/types';
import { fetchJobCatalog, fetchCandidateProfile } from '@/lib/api';
import { JobCard } from '@/components/jobs/JobCard';
import { QuickApplyModal } from '@/components/application/QuickApplyModal';
import { EmptyState } from '@/components/common/EmptyState';
import { Reveal, staggerDelay } from '@/components/motion';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { translateIndustry, translateWorkMode, translateSeniority } from '@/lib/i18n';
import {
  SlidersHorizontal,
  RotateCcw,
} from 'lucide-react';

export default function JobsPage() {
  return (
    <Suspense fallback={<div className="min-h-[50vh]" aria-busy="true" />}>
      <JobsPageContent />
    </Suspense>
  );
}

function JobsPageContent() {
  const { user, isAuthenticated } = useAuth();
  const { t, locale } = useLanguage();
  const searchParams = useSearchParams();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [profileFetchError, setProfileFetchError] = useState<string | null>(null);

  // Filters State
  const [searchKeyword, setSearchKeyword] = useState<string>(() => searchParams.get('keyword') ?? '');
  const [locationKeyword, setLocationKeyword] = useState<string>(() => searchParams.get('location') ?? '');
  const [selectedSectors, setSelectedSectors] = useState<string[]>(() => {
    const industry = searchParams.get('industry');
    return industry && ['Technology', 'Marketing', 'Design', 'Finance', 'HR', 'Sales'].includes(industry) ? [industry] : [];
  });
  const [selectedModes, setSelectedModes] = useState<string[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [minSalary, setMinSalary] = useState<number>(0);
  const [salaryCurrencyFilter, setSalaryCurrencyFilter] = useState('VND');
  const [skillFilter, setSkillFilter] = useState<string>('');
  const [onlyTargetIndustries, setOnlyTargetIndustries] = useState<boolean>(false);
  const [candidateIndustries, setCandidateIndustries] = useState<string[]>([]);

  const [serverSearch, setServerSearch] = useState({ query: searchKeyword, location: locationKeyword });
  useEffect(() => {
    const timer = window.setTimeout(() => setServerSearch({ query: searchKeyword, location: locationKeyword }), 300);
    return () => window.clearTimeout(timer);
  }, [searchKeyword, locationKeyword]);

  const [sortBy, setSortBy] = useState<string>('newest');
  const [applyJob, setApplyJob] = useState<Job | null>(null);

  const requestJobs = useCallback(() => Promise.allSettled([
      fetchJobCatalog(serverSearch.query, serverSearch.location),
      isAuthenticated && user?.role === 'CANDIDATE' ? fetchCandidateProfile() : Promise.resolve(null),
  ]), [isAuthenticated, user, serverSearch]);

  const applyJobResults = useCallback((requests: Awaited<ReturnType<typeof requestJobs>>) => {
    const [jobsResult, profileResult] = requests;

    if (jobsResult.status === 'fulfilled') {
      setJobs(jobsResult.value.filter((job) => job.status === 'PUBLISHED'));
      setFetchError(null);
    } else {
      setFetchError('Unable to load the jobs catalog. Please try again.');
    }

    if (profileResult.status === 'fulfilled') {
      const profile = profileResult.value;
      setCandidateIndustries(profile?.targetIndustries?.length ? profile.targetIndustries : profile?.targetIndustry ? [profile.targetIndustry] : []);
      setProfileFetchError(null);
    } else {
      setProfileFetchError(t('errors.generic', 'Candidate recommendations could not be loaded.'));
    }

    setIsLoading(false);
  }, [t]);

  useEffect(() => {
    let isActive = true;
    void requestJobs().then((requests) => {
      if (isActive) applyJobResults(requests);
    });
    return () => { isActive = false; };
  }, [applyJobResults, requestJobs]);

  const retryJobs = () => {
    setFetchError(null);
    setIsLoading(true);
    void requestJobs().then(applyJobResults);
  };

  // Real Functional Filtering Engine
  const filteredJobs = useMemo(() => {
    let result = [...jobs];

    // 1. Role Keyword (Title, Company Name, Description)
    if (searchKeyword.trim()) {
      const k = searchKeyword.toLowerCase().trim();
      result = result.filter(
        (j) =>
          (j.title && j.title.toLowerCase().includes(k)) ||
          (j.description && j.description.toLowerCase().includes(k)) ||
          (j.companyName && j.companyName.toLowerCase().includes(k))
      );
    }

    // 2. Location Keyword
    if (locationKeyword.trim()) {
      const l = locationKeyword.toLowerCase().trim();
      result = result.filter((j) => j.location && j.location.toLowerCase().includes(l));
    }

    // 3. Industry Sector Filter
    if (selectedSectors.length > 0) {
      result = result.filter((j) =>
        j.industry && selectedSectors.some((sec) => sec.toLowerCase() === j.industry.toLowerCase())
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
      result = result.filter((j) => (j.salaryCurrency || 'VND') === salaryCurrencyFilter && (j.salaryMax != null ? j.salaryMax >= minSalary : true));
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
      result.sort((a, b) => (a.salaryCurrency || 'VND').localeCompare(b.salaryCurrency || 'VND') || (b.salaryMax || 0) - (a.salaryMax || 0));
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
    salaryCurrencyFilter,
    skillFilter,
    sortBy
  ]);

  const handleClearAll = () => {
    setSearchKeyword('');
    setLocationKeyword('');
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
    <div className="bg-slate-50/60 dark:bg-[var(--surface)] min-h-screen py-8 text-[var(--heading)] dark:text-[var(--retro-cream)] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

        {/* Page Header */}
        <Reveal direction="up" delay={0}>
          <div className="border-b border-slate-200 dark:border-[var(--border)] pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-sans">
                Vector Validation Directory
              </span>
              <h1 className="text-2xl sm:text-3xl font-editorial font-bold text-[var(--heading)] dark:text-[var(--retro-cream)] mt-1">
                {t('jobs.pageTitle', 'Khám Phá & Đối Sánh Việc Làm')}
              </h1>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)] mt-0.5">
                {t('jobs.pageSubtitle', 'Tìm kiếm vị trí tuyển dụng với tiêu chuẩn minh bạch và đối soát năng lực số.')}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-sans text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
                {t('jobs.showing', 'Hiển thị')} <strong className="text-[var(--heading)] dark:text-white">{filteredJobs.length}</strong> {t('jobs.of', '/')} {jobs.length} {t('jobs.jobsCount', 'công việc')}
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[var(--border)] bg-white dark:bg-[var(--surface)] text-xs font-medium text-[var(--heading)] dark:text-slate-200 focus:outline-none focus:border-[var(--border)]"
              >
                <option value="newest">{t('jobs.newestFirst', 'Mới nhất trước')}</option>
                <option value="salary_high">{t('jobs.salaryHighLow', 'Lương cao đến thấp')}</option>
              </select>
            </div>
          </div>
        </Reveal>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Left Column: Refine Matches Filters Sidebar */}
          <Reveal direction="up" delay={80} className="lg:col-span-4">
            <aside className="bg-white dark:bg-[var(--surface)] border border-slate-200 dark:border-[var(--border)] rounded-xl p-6 space-y-5 shadow-xs transition-colors">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-[var(--border)] pb-3">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-[var(--primary)]" />
                  <h2 className="font-semibold text-sm text-[var(--heading)] dark:text-white uppercase tracking-wide">
                    {t('jobs.refineMatches', 'Bộ Lọc Đối Sánh')}
                  </h2>
                  {activeFiltersCount > 0 && (
                    <span className="px-2 py-0.5 rounded-xl text-[10px] font-bold bg-[var(--primary)] text-white">
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
                    <span>{t('jobs.clearAll', 'XÓA TẤT CẢ')}</span>
                  </button>
                )}
              </div>

              {/* Candidate Target Industries Recommendation Toggle */}
              {candidateIndustries.length > 0 && (
                <div className="p-3 rounded-xl bg-[var(--surface-secondary)] dark:bg-[var(--success)]/15 border border-[var(--border)]/30 space-y-1.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={onlyTargetIndustries}
                      onChange={(e) => setOnlyTargetIndustries(e.target.checked)}
                      className="accent-[var(--success)] rounded"
                    />
                    <span className="text-xs font-semibold text-[var(--heading)] dark:text-[var(--success)]">
                      {t('jobs.prioritizeTarget', 'Ưu tiên ngành nghề mục tiêu của tôi')}
                    </span>
                  </label>
                  <p className="text-[11px] text-[var(--heading)] dark:text-[var(--success)] pl-5">
                    {t('jobs.filtering', 'Đang lọc:')} {candidateIndustries.map(ind => translateIndustry(ind, locale)).join(', ')}
                  </p>
                </div>
              )}
              {profileFetchError ? <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200">{profileFetchError}</p> : null}

              {/* Role Keyword Filter */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-sans font-semibold uppercase text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
                  {t('jobs.roleKeyword', 'TỪ KHÓA VỊ TRÍ')}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder={t('jobs.rolePlaceholder', 'Ví dụ: Frontend, Java, Senior...')}
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[var(--surface)] border border-slate-200 dark:border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--heading)] dark:text-[var(--retro-cream)] focus:outline-none focus:border-[var(--border)]"
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
                <label className="text-[11px] font-sans font-semibold uppercase text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
                  {t('jobs.locationKeyword', 'ĐỊA ĐIỂM')}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder={t('jobs.locationPlaceholder', 'Ví dụ: TP. Hồ Chí Minh, Hà Nội, Remote...')}
                    value={locationKeyword}
                    onChange={(e) => setLocationKeyword(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[var(--surface)] border border-slate-200 dark:border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--heading)] dark:text-[var(--retro-cream)] focus:outline-none focus:border-[var(--border)]"
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
                <label className="text-[11px] font-sans font-semibold uppercase text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
                  {t('jobs.requiredSkills', 'KỸ NĂNG YÊU CẦU')}
                </label>
                <input
                  type="text"
                  placeholder={t('jobs.skillPlaceholder', 'Ví dụ: React, TypeScript, Docker...')}
                  value={skillFilter}
                  onChange={(e) => setSkillFilter(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[var(--surface)] border border-slate-200 dark:border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--heading)] dark:text-[var(--retro-cream)] focus:outline-none focus:border-[var(--border)]"
                />
              </div>

              {/* Industry Sector Filter */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-[var(--border)]">
                <label className="text-[11px] font-sans font-semibold uppercase text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
                  {t('jobs.industrySector', 'LĨNH VỰC HOẠT ĐỘNG')}
                </label>
                <div className="space-y-1.5 text-xs text-[var(--heading)] dark:text-slate-300">
                  {['Technology', 'Marketing', 'Design', 'Finance', 'Healthcare', 'Engineering'].map((sector) => (
                    <label key={sector} className="flex items-center gap-2 cursor-pointer hover:text-[var(--primary)] dark:hover:text-white select-none">
                      <input
                        type="checkbox"
                        checked={selectedSectors.includes(sector)}
                        onChange={() => toggleItem(selectedSectors, setSelectedSectors, sector)}
                        className="accent-[var(--primary)] rounded cursor-pointer"
                      />
                      <span>{translateIndustry(sector, locale)}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Employment Mode */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-[var(--border)]">
                <label className="text-[11px] font-sans font-semibold uppercase text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
                  {t('jobs.employmentMode', 'HÌNH THỨC LÀM VIỆC')}
                </label>
                <div className="space-y-1.5 text-xs text-[var(--heading)] dark:text-slate-300">
                  {['Remote', 'Hybrid', 'Full-time', 'Contract'].map((mode) => (
                    <label key={mode} className="flex items-center gap-2 cursor-pointer hover:text-[var(--primary)] dark:hover:text-white select-none">
                      <input
                        type="checkbox"
                        checked={selectedModes.includes(mode)}
                        onChange={() => toggleItem(selectedModes, setSelectedModes, mode)}
                        className="accent-[var(--primary)] rounded cursor-pointer"
                      />
                      <span>{translateWorkMode(mode, locale)}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Experience Level */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-[var(--border)]">
                <label className="text-[11px] font-sans font-semibold uppercase text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
                  {t('jobs.experienceLevel', 'CẤP BẬC KINH NGHIỆM')}
                </label>
                <div className="space-y-1.5 text-xs text-[var(--heading)] dark:text-slate-300">
                  {['Junior', 'Mid', 'Senior', 'Lead'].map((lvl) => (
                    <label key={lvl} className="flex items-center gap-2 cursor-pointer hover:text-[var(--primary)] dark:hover:text-white select-none">
                      <input
                        type="checkbox"
                        checked={selectedLevels.includes(lvl)}
                        onChange={() => toggleItem(selectedLevels, setSelectedLevels, lvl)}
                        className="accent-[var(--primary)] rounded cursor-pointer"
                      />
                      <span>{translateSeniority(lvl, locale)}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Salary Range Slider */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-[var(--border)]">
                <div className="flex items-center justify-between text-[11px] font-sans font-semibold uppercase text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
                  <span>{t('jobs.minSalaryLabel', 'MỨC LƯƠNG TỐI THIỂU')}</span>
                  <span className="text-[var(--success)] font-bold">
                    {minSalary > 0 ? `${new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US', { style: 'currency', currency: salaryCurrencyFilter }).format(minSalary)}${locale === 'vi' ? '/tháng' : '/month'}` : t('jobs.all', 'Tất cả')}
                  </span>
                </div>
                <label className="block text-xs text-slate-600 dark:text-slate-300">{locale === 'vi' ? 'Tiền tệ dùng cho bộ lọc' : 'Currency for salary filter'}
                  <select value={salaryCurrencyFilter} onChange={(e) => setSalaryCurrencyFilter(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
                    {['VND', 'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'KRW', 'SGD', 'AUD', 'CAD'].map((code) => <option key={code} value={code}>{code}</option>)}
                  </select>
                </label>
                <input
                  type="range"
                  min={0}
                  max={100000000}
                  step={5000000}
                  value={minSalary}
                  onChange={(e) => setMinSalary(parseInt(e.target.value) || 0)}
                  className="w-full accent-[var(--primary)] cursor-pointer"
                />
              </div>
            </aside>
          </Reveal>

          {/* Right Column: Job Listings Results */}
          <main className="lg:col-span-8 space-y-4">
            {isLoading ? (
              <EmptyState
                type="LOADING"
                title={t('emptyStates.jobs.loading', 'Đang tải việc làm...')}
                description=""
              />
            ) : fetchError ? (
              <EmptyState
                type="ERROR"
                title={t('emptyStates.jobs.errorTitle', 'Không thể tải danh sách việc làm')}
                description={fetchError}
                primaryCtaText={t('common.retry', 'Thử lại')}
                onPrimaryCtaClick={retryJobs}
              />
            ) : jobs.length === 0 ? (
              /* Genuine Empty State: DB has zero jobs */
              <EmptyState
                type="EMPTY"
                title={t('emptyStates.jobs.emptyTitle', 'Chưa có việc làm')}
                description={t('emptyStates.jobs.emptyDesc', 'Hiện tại chưa có vị trí tuyển dụng nào trên hệ thống.')}
                primaryCtaText={t('recruiterNav.createJob', 'Tạo Bài Tuyển Dụng')}
                primaryCtaHref="/recruiter/jobs/new"
              />
            ) : filteredJobs.length > 0 ? (
              filteredJobs.map((job, idx) => (
                <Reveal key={job.id} delay={staggerDelay(idx)} className="h-full">
                  <JobCard
                    job={job}
                    onApplyClick={(j) => setApplyJob(j)}
                    matchStatus={isAuthenticated && user?.role === 'CANDIDATE' ? 'INSUFFICIENT_DATA' : undefined}
                  />
                </Reveal>
              ))
            ) : (
              /* Filter No-Match State: DB has jobs, but active filters returned 0 */
              <EmptyState
                type="NO_MATCH"
                title={t('emptyStates.jobs.noMatchTitle', 'Không tìm thấy việc làm phù hợp')}
                description={t('emptyStates.jobs.noMatchDesc', 'Hiện chưa có công việc nào phù hợp với điều kiện tìm kiếm và bộ lọc của bạn.')}
                primaryCtaText={t('emptyStates.jobs.resetFilters', 'Xóa tất cả bộ lọc')}
                onPrimaryCtaClick={handleClearAll}
              />
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
