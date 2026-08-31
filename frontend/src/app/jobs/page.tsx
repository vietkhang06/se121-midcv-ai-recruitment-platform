'use client';

import React, { useState, useEffect } from 'react';
import { Job } from '@/types';
import { fetchJobs } from '@/lib/api';
import { JobCard } from '@/components/jobs/JobCard';
import { JobFilter } from '@/components/jobs/JobFilter';
import { QuickApplyModal } from '@/components/application/QuickApplyModal';
import { Briefcase } from 'lucide-react';

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [applyJob, setApplyJob] = useState<Job | null>(null);

  useEffect(() => {
    fetchJobs().then((data) => {
      setJobs(data);
      setFilteredJobs(data);
    });
  }, []);

  useEffect(() => {
    let result = [...jobs];
    if (searchKeyword) {
      const k = searchKeyword.toLowerCase();
      result = result.filter(j => j.title.toLowerCase().includes(k) || j.description.toLowerCase().includes(k) || j.companyName.toLowerCase().includes(k));
    }
    if (selectedIndustry) {
      result = result.filter(j => j.industry === selectedIndustry);
    }
    if (selectedLocation) {
      result = result.filter(j => j.location.toLowerCase().includes(selectedLocation.toLowerCase()));
    }
    if (selectedType) {
      result = result.filter(j => j.employmentType === selectedType);
    }
    setFilteredJobs(result);
  }, [searchKeyword, selectedIndustry, selectedLocation, selectedType, jobs]);

  const handleResetFilters = () => {
    setSearchKeyword('');
    setSelectedIndustry('');
    setSelectedLocation('');
    setSelectedType('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider">
          <Briefcase className="w-4 h-4" />
          <span>Public Job Discovery</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Tìm Kiếm Việc Làm Toàn Quốc</h1>
        <p className="text-sm text-slate-400">Khám phá và nộp đơn ứng tuyển các vị trí hấp dẫn với công nghệ AI Matching</p>
      </div>

      {/* Filter Bar */}
      <JobFilter
        searchKeyword={searchKeyword}
        setSearchKeyword={setSearchKeyword}
        selectedIndustry={selectedIndustry}
        setSelectedIndustry={setSelectedIndustry}
        selectedLocation={selectedLocation}
        setSelectedLocation={setSelectedLocation}
        selectedType={selectedType}
        setSelectedType={setSelectedType}
        onReset={handleResetFilters}
      />

      {/* Results Count & Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Hiển thị <strong>{filteredJobs.length}</strong> việc làm phù hợp</span>
        </div>

        {filteredJobs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredJobs.map((job) => (
              <JobCard key={job.id} job={job} onApplyClick={(j) => setApplyJob(j)} />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3">
            <p className="text-base font-semibold text-slate-300">Không tìm thấy việc làm phù hợp với bộ lọc</p>
            <p className="text-xs text-slate-400">Thử thay đổi từ khóa tìm kiếm hoặc bấm Đặt lại bộ lọc</p>
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-500 transition"
            >
              Đặt lại bộ lọc
            </button>
          </div>
        )}
      </div>

      {/* Quick Apply Modal */}
      <QuickApplyModal
        job={applyJob}
        isOpen={!!applyJob}
        onClose={() => setApplyJob(null)}
        onApplySubmitted={() => {}}
      />
    </div>
  );
}
