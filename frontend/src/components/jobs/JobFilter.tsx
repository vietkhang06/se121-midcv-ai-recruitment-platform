'use client';

import React from 'react';
import { Industry } from '@/types';
import { Search, Filter, MapPin, Briefcase, Award } from 'lucide-react';

interface JobFilterProps {
  searchKeyword: string;
  setSearchKeyword: (val: string) => void;
  selectedIndustry: string;
  setSelectedIndustry: (val: string) => void;
  selectedLocation: string;
  setSelectedLocation: (val: string) => void;
  selectedType: string;
  setSelectedType: (val: string) => void;
  selectedSeniority: string;
  setSelectedSeniority: (val: string) => void;
  onReset: () => void;
}

export const JobFilter: React.FC<JobFilterProps> = ({
  searchKeyword,
  setSearchKeyword,
  selectedIndustry,
  setSelectedIndustry,
  selectedLocation,
  setSelectedLocation,
  selectedType,
  setSelectedType,
  selectedSeniority,
  setSelectedSeniority,
  onReset
}) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      {/* Search Input Bar */}
      <div className="relative">
        <Search className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
        <input
          type="text"
          placeholder="Tìm kiếm vị trí việc làm, công nghệ (Java, Marketing, Figma, MISA...)..."
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500 placeholder-slate-400"
        />
      </div>

      {/* Filters Grid: 4 Columns */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
        {/* Industry Filter */}
        <div>
          <label className="block font-medium text-slate-400 mb-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-indigo-400" />
            <span>Ngành nghề</span>
          </label>
          <select
            value={selectedIndustry}
            onChange={(e) => setSelectedIndustry(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
          >
            <option value="">Tất cả ngành nghề</option>
            <option value="Technology">Technology (CNTT)</option>
            <option value="Marketing">Digital Marketing</option>
            <option value="Design">UI/UX Design</option>
            <option value="Finance">Tài chính - Kế toán</option>
            <option value="HR">Quản trị Nhân sự (HR)</option>
          </select>
        </div>

        {/* Seniority Filter */}
        <div>
          <label className="block font-medium text-slate-400 mb-1 flex items-center gap-1">
            <Award className="w-3.5 h-3.5 text-cyan-400" />
            <span>Cấp bậc</span>
          </label>
          <select
            value={selectedSeniority}
            onChange={(e) => setSelectedSeniority(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500"
          >
            <option value="">Tất cả cấp bậc</option>
            <option value="Junior">Junior</option>
            <option value="Mid-Level">Mid-Level</option>
            <option value="Senior">Senior</option>
            <option value="Lead">Lead / Manager</option>
          </select>
        </div>

        {/* Location Filter */}
        <div>
          <label className="block font-medium text-slate-400 mb-1 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            <span>Địa điểm</span>
          </label>
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
          >
            <option value="">Tất cả địa điểm</option>
            <option value="Hồ Chí Minh">Hồ Chí Minh</option>
            <option value="Hà Nội">Hà Nội</option>
            <option value="Đà Nẵng">Đà Nẵng</option>
            <option value="Remote">Làm việc Remote</option>
          </select>
        </div>

        {/* Employment Type Filter */}
        <div>
          <label className="block font-medium text-slate-400 mb-1 flex items-center gap-1">
            <Briefcase className="w-3.5 h-3.5 text-amber-400" />
            <span>Hình thức</span>
          </label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500"
          >
            <option value="">Tất cả hình thức</option>
            <option value="FULL_TIME">Toàn thời gian (Full-time)</option>
            <option value="PART_TIME">Bán thời gian (Part-time)</option>
            <option value="REMOTE">Remote 100%</option>
            <option value="HYBRID">Hybrid Linh hoạt</option>
          </select>
        </div>
      </div>

      {/* Filter Reset CTA */}
      <div className="flex justify-end pt-1">
        <button
          onClick={onReset}
          className="text-xs text-slate-400 hover:text-cyan-400 transition"
        >
          Đặt lại bộ lọc
        </button>
      </div>
    </div>
  );
};
