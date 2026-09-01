'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Job } from '@/types';
import { fetchRecruiterJobs } from '@/lib/api';
import { RecruiterNavbar } from '@/components/recruiter/RecruiterNavbar';
import { Briefcase, PlusCircle, Search, Filter, Eye, Award, Users } from 'lucide-react';

export default function RecruiterJobsListPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  useEffect(() => {
    fetchRecruiterJobs().then(data => {
      setJobs(data);
      setFilteredJobs(data);
    });
  }, []);

  useEffect(() => {
    let result = [...jobs];
    if (searchKeyword) {
      result = result.filter(j => j.title.toLowerCase().includes(searchKeyword.toLowerCase()));
    }
    if (selectedStatus) {
      result = result.filter(j => j.status === selectedStatus);
    }
    setFilteredJobs(result);
  }, [searchKeyword, selectedStatus, jobs]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <RecruiterNavbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 w-full">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider">
              <Briefcase className="w-4 h-4" />
              <span>Job Management Center</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Danh Sách Tin Tuyển Dụng Doanh Nghiệp</h1>
            <p className="text-sm text-slate-400">Quản lý nội dung JD, trạng thái xuất bản, xem ứng tuyển và Bảng xếp hạng AI Matching</p>
          </div>

          <Link
            href="/recruiter/jobs/new"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs text-white bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 shadow-md shadow-amber-500/20 transition active:scale-95 flex-shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Tạo Bài Tuyển Dụng Mới</span>
          </Link>
        </div>

        {/* Filter Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm vị trí tuyển dụng..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="PUBLISHED">PUBLISHED (Đã xuất bản)</option>
              <option value="DRAFT">DRAFT (Bài nháp)</option>
              <option value="CLOSED">CLOSED (Đã đóng)</option>
            </select>
          </div>
        </div>

        {/* Job Grid */}
        <div className="space-y-4">
          {filteredJobs.map((job) => (
            <div
              key={job.id}
              className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 transition shadow-lg space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-950 border border-indigo-500/30 text-indigo-300">
                      {job.industry}
                    </span>
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                      job.status === 'PUBLISHED' ? 'bg-emerald-950 border border-emerald-500/40 text-emerald-300' : 'bg-amber-950 border border-amber-500/40 text-amber-300'
                    }`}>
                      {job.status}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white hover:text-cyan-400 transition-colors">
                    <Link href={`/recruiter/jobs/${job.id}`}>{job.title}</Link>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Địa điểm: {job.location} • Cấp bậc: {job.seniority} • Lương: ${job.salaryMin} - ${job.salaryMax} /tháng
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    href={`/recruiter/jobs/${job.id}`}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Xem Chi tiết JD</span>
                  </Link>

                  <Link
                    href={`/recruiter/jobs/${job.id}/applications`}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition flex items-center gap-1"
                  >
                    <Users className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Đơn Ứng Tuyển</span>
                  </Link>

                  <Link
                    href={`/recruiter/jobs/${job.id}/ranking`}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 shadow-md transition active:scale-95 flex items-center gap-1.5"
                  >
                    <Award className="w-4 h-4" />
                    <span>Bảng Xếp Hạng AI</span>
                  </Link>
                </div>
              </div>

              {/* Requirements Summary */}
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                <span className="text-slate-400 font-semibold mr-1">Skills:</span>
                {job.requirements.map(req => (
                  <span
                    key={req.id}
                    className={`px-2 py-0.5 rounded ${
                      req.requirementType === 'REQUIRED' ? 'bg-cyan-950 border border-cyan-500/30 text-cyan-300' : 'bg-slate-950 text-slate-400'
                    }`}
                  >
                    {req.skillName} {req.requirementType === 'REQUIRED' ? '(Req)' : ''}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
