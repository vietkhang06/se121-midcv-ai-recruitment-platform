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
  const { t, locale } = useLanguage();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  const loadJobs = () => {
    setIsLoading(true);
    fetchRecruiterJobs()
      .then(data => {
        setJobs(data);
        setFilteredJobs(data);
        setFetchError(null);
      })
      .catch((err) => {
        setFetchError(err.message || (locale === 'vi' ? 'Không thể tải danh sách bài tuyển dụng.' : 'Unable to load jobs list.'));
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadJobs();
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
    <div className="min-h-screen bg-[#F8FAF9] dark:bg-[#0B1329] text-slate-800 dark:text-slate-100 flex flex-col transition-colors">
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 w-full">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider font-mono">
              <Briefcase className="w-4 h-4" />
              <span>Job Management Center</span>
            </div>
            <h1 className="text-3xl font-editorial font-bold text-slate-900 dark:text-white tracking-tight">
              {t('recruiterPages.jobsTitle', 'Danh Sách Tin Tuyển Dụng Doanh Nghiệp')}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('recruiterPages.jobsSubtitle', 'Quản lý nội dung JD, trạng thái xuất bản, xem ứng tuyển và Bảng xếp hạng AI Matching')}
            </p>
          </div>

          <Link
            href="/recruiter/jobs/new"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs text-white bg-[#2563EB] hover:bg-[#1D4ED8] shadow-md shadow-blue-500/20 transition active:scale-95 flex-shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t('recruiterNav.createJob', 'Tạo Bài Tuyển Dụng Mới')}</span>
          </Link>
        </div>

        {/* Filter Bar */}
        <div className="bg-white dark:bg-[#111C38] border border-slate-200 dark:border-[#1E293B] rounded-2xl p-5 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-4 transition-colors">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              placeholder={locale === 'vi' ? 'Tìm kiếm vị trí tuyển dụng...' : 'Search job requisitions...'}
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#13233F] border border-slate-200 dark:border-[#1E293B] rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#13233F] border border-slate-200 dark:border-[#1E293B] rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:border-[#2563EB]"
            >
              <option value="">{locale === 'vi' ? 'Tất cả trạng thái' : 'All Statuses'}</option>
              <option value="PUBLISHED">PUBLISHED {locale === 'vi' ? '(Đã xuất bản)' : '(Published)'}</option>
              <option value="DRAFT">DRAFT {locale === 'vi' ? '(Bài nháp)' : '(Draft)'}</option>
              <option value="CLOSED">CLOSED {locale === 'vi' ? '(Đã đóng)' : '(Closed)'}</option>
            </select>
          </div>
        </div>

        {/* Job Grid or Loading / Error / Empty State */}
        {isLoading ? (
          <EmptyState
            type="LOADING"
            title={t('emptyStates.jobs.loading', 'Đang tải danh sách bài tuyển dụng...')}
            description={locale === 'vi' ? 'Hệ thống đang kết nối dữ liệu việc làm...' : 'Connecting to requisitions catalog...'}
          />
        ) : fetchError ? (
          <EmptyState
            type="ERROR"
            title={t('emptyStates.jobs.errorTitle', 'Không thể tải danh sách bài tuyển dụng')}
            description={fetchError}
            primaryCtaText={t('common.retry', 'Thử lại')}
            onPrimaryCtaClick={loadJobs}
          />
        ) : jobs.length === 0 ? (
          <EmptyState
            type="EMPTY"
            title={t('emptyStates.jobs.emptyTitle', 'Chưa có bài tuyển dụng nào')}
            description={t('emptyStates.jobs.emptyDesc', 'Doanh nghiệp chưa tạo bài tuyển dụng nào. Hãy bắt đầu bằng cách tạo vị trí tuyển dụng mới.')}
            primaryCtaText={t('recruiterNav.createJob', 'Tạo Bài Tuyển Dụng Mới')}
            primaryCtaHref="/recruiter/jobs/new"
          />
        ) : filteredJobs.length > 0 ? (
          <div className="space-y-4">
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                className="p-6 rounded-2xl bg-white dark:bg-[#111C38] border border-slate-200 dark:border-[#1E293B] hover:border-[#2563EB] dark:hover:border-[#2563EB] transition shadow-xs space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-[#1E293B] pb-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-[#13233F] border border-slate-200 dark:border-[#1E293B] text-slate-700 dark:text-[#93C5FD]">
                        {job.industry}
                      </span>
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                        job.status === 'PUBLISHED' ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[#00B14F]' : 'bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                      }`}>
                        {job.status}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold font-editorial text-slate-900 dark:text-white hover:text-[#2563EB] dark:hover:text-[#3B82F6] transition-colors">
                      <Link href={`/recruiter/jobs/${job.id}`}>{job.title}</Link>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {locale === 'vi' ? 'Địa điểm' : 'Location'}: {job.location} • {locale === 'vi' ? 'Cấp bậc' : 'Level'}: {job.seniority} • {locale === 'vi' ? 'Lương' : 'Salary'}: ${job.salaryMin} - ${job.salaryMax} /{locale === 'vi' ? 'tháng' : 'mo'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/recruiter/jobs/${job.id}`}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-[#13233F] hover:bg-slate-200 dark:hover:bg-[#18294E] text-slate-800 dark:text-slate-200 border border-transparent dark:border-[#1E293B] transition flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{locale === 'vi' ? 'Xem Chi tiết JD' : 'View Requisition'}</span>
                    </Link>

                    <Link
                      href={`/recruiter/jobs/${job.id}/applications`}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-[#13233F] hover:bg-slate-200 dark:hover:bg-[#18294E] text-slate-800 dark:text-slate-200 border border-transparent dark:border-[#1E293B] transition flex items-center gap-1"
                    >
                      <Users className="w-3.5 h-3.5 text-[#2563EB]" />
                      <span>{locale === 'vi' ? 'Đơn Ứng Tuyển' : 'Applications'}</span>
                    </Link>

                    <Link
                      href={`/recruiter/jobs/${job.id}/ranking`}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#00B14F] hover:bg-[#009643] shadow-xs shadow-emerald-500/20 transition active:scale-95 flex items-center gap-1.5"
                    >
                      <Award className="w-4 h-4" />
                      <span>{locale === 'vi' ? 'Bảng Xếp Hạng AI' : 'AI Ranking'}</span>
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
                        req.requirementType === 'REQUIRED' ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[#00B14F] font-medium' : 'bg-slate-100 dark:bg-[#13233F] border border-slate-200 dark:border-[#1E293B] text-slate-600 dark:text-slate-400'
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
