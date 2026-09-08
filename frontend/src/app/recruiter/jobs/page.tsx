'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Job } from '@/types';
import { fetchRecruiterJobs } from '@/lib/api';
import { RecruiterNavbar } from '@/components/recruiter/RecruiterNavbar';
import { EmptyState } from '@/components/common/EmptyState';
import { useLanguage } from '@/context/LanguageContext';
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
    <div className="min-h-screen bg-[#F8FAF9] dark:bg-[#071410] text-slate-800 dark:text-slate-100 flex flex-col transition-colors">
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 w-full">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider font-mono">
              <Briefcase className="w-4 h-4" />
              <span>Job Management Center</span>
            </div>
            <h1 className="text-3xl font-editorial font-bold text-slate-900 dark:text-white tracking-tight">Danh Sách Tin Tuyển Dụng Doanh Nghiệp</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Quản lý nội dung JD, trạng thái xuất bản, xem ứng tuyển và Bảng xếp hạng AI Matching</p>
          </div>

          <Link
            href="/recruiter/jobs/new"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs text-white bg-[#0C2B24] hover:bg-[#133E34] dark:bg-[#10B981] dark:hover:bg-[#059669] dark:text-[#040D0A] shadow-xs transition active:scale-95 flex-shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Tạo Bài Tuyển Dụng Mới</span>
          </Link>
        </div>

        {/* Filter Bar */}
        <div className="bg-white dark:bg-[#0E241E] border border-slate-200 dark:border-[#1B3D34] rounded-2xl p-5 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-4 transition-colors">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm vị trí tuyển dụng..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#071410] border border-slate-200 dark:border-[#1B3D34] rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:border-[#0C2B24] dark:focus:border-emerald-500"
            />
          </div>

          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#071410] border border-slate-200 dark:border-[#1B3D34] rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:border-[#0C2B24] dark:focus:border-emerald-500"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="PUBLISHED">PUBLISHED (Đã xuất bản)</option>
              <option value="DRAFT">DRAFT (Bài nháp)</option>
              <option value="CLOSED">CLOSED (Đã đóng)</option>
            </select>
          </div>
        </div>

        {/* Job Grid or Empty State */}
        {jobs.length === 0 ? (
          <EmptyState
            type="EMPTY"
            title="Chưa có bài tuyển dụng nào"
            description="Doanh nghiệp chưa tạo bài tuyển dụng nào. Hãy bắt đầu bằng cách tạo vị trí tuyển dụng mới."
            primaryCtaText="Tạo Bài Tuyển Dụng Mới"
            primaryCtaHref="/recruiter/jobs/new"
          />
        ) : filteredJobs.length > 0 ? (
          <div className="space-y-4">
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                className="p-6 rounded-2xl bg-white dark:bg-[#0E241E] border border-slate-200 dark:border-[#1B3D34] hover:border-[#0C2B24] dark:hover:border-emerald-500/40 transition shadow-xs space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-[#1B3D34] pb-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-[#14332B] border border-slate-200 dark:border-[#1B3D34] text-slate-700 dark:text-emerald-300">
                        {job.industry}
                      </span>
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                        job.status === 'PUBLISHED' ? 'bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300' : 'bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-500/40 text-amber-800 dark:text-amber-300'
                      }`}>
                        {job.status}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold font-editorial text-slate-900 dark:text-white hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors">
                      <Link href={`/recruiter/jobs/${job.id}`}>{job.title}</Link>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Địa điểm: {job.location} • Cấp bậc: {job.seniority} • Lương: ${job.salaryMin} - ${job.salaryMax} /tháng
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/recruiter/jobs/${job.id}`}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Xem Chi tiết JD</span>
                    </Link>

                    <Link
                      href={`/recruiter/jobs/${job.id}/applications`}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition flex items-center gap-1"
                    >
                      <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Đơn Ứng Tuyển</span>
                    </Link>

                    <Link
                      href={`/recruiter/jobs/${job.id}/ranking`}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#0C2B24] hover:bg-[#133E34] dark:bg-[#10B981] dark:hover:bg-[#059669] dark:text-[#040D0A] shadow-xs transition active:scale-95 flex items-center gap-1.5"
                    >
                      <Award className="w-4 h-4" />
                      <span>Bảng Xếp Hạng AI</span>
                    </Link>
                  </div>
                </div>

                {/* Requirements Summary */}
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400 font-semibold mr-1">Skills:</span>
                  {(job.requirements || []).map((req, idx) => (
                    <span
                      key={req.id || idx}
                      className={`px-2 py-0.5 rounded font-mono ${
                        req.requirementType === 'REQUIRED' ? 'bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-medium' : 'bg-slate-100 dark:bg-[#071410] border border-slate-200 dark:border-[#1B3D34] text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {req.skillName} {req.requirementType === 'REQUIRED' ? '(Req)' : ''}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            type="NO_MATCH"
            title="Không tìm thấy bài tuyển dụng phù hợp"
            description="Không có vị trí tuyển dụng nào khớp với từ khóa tìm kiếm hoặc bộ lọc trạng thái."
            primaryCtaText="Xóa tất cả bộ lọc"
            onPrimaryCtaClick={() => {
              setSearchKeyword('');
              setSelectedStatus('');
            }}
          />
        )}
      </main>
    </div>
  );
}
