'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Job } from '@/types';
import { fetchRecruiterJobs, publishJob, closeJob, fetchJobApplications } from '@/lib/api';
import { RecruiterPageHeader } from '@/components/recruiter/RecruiterPageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { useLanguage } from '@/context/LanguageContext';
import {
  Briefcase,
  PlusCircle,
  Search,
  Users,
  Award,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronRight,
  MapPin,
  DollarSign
} from 'lucide-react';

export default function RecruiterJobsListPage() {
  const { t, locale } = useLanguage();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applicationCounts, setApplicationCounts] = useState<Record<string, number>>({});
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

  const loadJobs = () => {
    setIsLoading(true);
    fetchRecruiterJobs()
      .then(async (data) => {
        setJobs(data);
        setFilteredJobs(data);
        setFetchError(null);

        // Fetch application counts
        const counts: Record<string, number> = {};
        await Promise.all(
          data.map(async (j) => {
            try {
              const apps = await fetchJobApplications(j.id);
              counts[j.id] = apps.length;
            } catch {
              counts[j.id] = 0;
            }
          })
        );
        setApplicationCounts(counts);
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
    if (searchKeyword.trim()) {
      const q = searchKeyword.toLowerCase();
      result = result.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          (j.location && j.location.toLowerCase().includes(q)) ||
          (j.industry && j.industry.toLowerCase().includes(q))
      );
    }
    if (selectedStatus !== 'ALL') {
      result = result.filter((j) => j.status === selectedStatus);
    }
    setFilteredJobs(result);
  }, [searchKeyword, selectedStatus, jobs]);

  const handlePublish = async (jobId: string) => {
    setActionInProgressId(jobId);
    try {
      const updated = await publishJob(jobId);
      if (updated) {
        setJobs((prev) => prev.map((j) => (j.id === jobId ? updated : j)));
      }
    } catch (err: any) {
      alert(err.message || 'Xuất bản tin thất bại.');
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleClose = async (jobId: string) => {
    if (!confirm(locale === 'vi' ? 'Bạn có chắc chắn muốn đóng tin tuyển dụng này? Ứng viên sẽ không thể nộp đơn tiếp.' : 'Are you sure you want to close this job posting? Candidates will no longer be able to apply.')) {
      return;
    }
    setActionInProgressId(jobId);
    try {
      const updated = await closeJob(jobId);
      if (updated) {
        setJobs((prev) => prev.map((j) => (j.id === jobId ? updated : j)));
      }
    } catch (err: any) {
      alert(err.message || 'Đóng tin tuyển dụng thất bại.');
    } finally {
      setActionInProgressId(null);
    }
  };

  const publishedCount = jobs.filter((j) => j.status === 'PUBLISHED').length;
  const draftCount = jobs.filter((j) => j.status === 'DRAFT').length;
  const closedCount = jobs.filter((j) => j.status === 'CLOSED').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 w-full">
      {/* Header */}
      <RecruiterPageHeader
        categoryTag="REQUISITION MANAGEMENT"
        title={t('recruiterPages.jobsTitle', 'Danh Sách Tin Tuyển Dụng Doanh Nghiệp')}
        subtitle={t('recruiterPages.jobsSubtitle', 'Quản lý trạng thái xuất bản, xem số lượng hồ sơ nộp và truy cập Bảng xếp hạng AI Matching')}
        actions={
          <Link
            href="/recruiter/jobs/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] shadow-sm transition active:scale-95 shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t('recruiterNav.createJob', 'Tạo Tin Tuyển Dụng Mới')}</span>
          </Link>
        }
      />

      {/* Filter and Search Controls */}
      <div className="bg-white dark:bg-[#111C38] border border-[#E2E8F0] dark:border-[#1E293B] rounded-2xl p-4 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-[#94A3B8]" />
            <input
              type="text"
              placeholder={locale === 'vi' ? 'Tìm theo tên vị trí, địa điểm, ngành nghề...' : 'Search by job title, location, industry...'}
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#F8FAFC] dark:bg-[#13233F] border border-[#CBD5E1] dark:border-[#1E3A5F] rounded-xl text-[#0F2A52] dark:text-white text-xs focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'ALL', label: locale === 'vi' ? 'Tất cả' : 'All', count: jobs.length },
              { id: 'PUBLISHED', label: locale === 'vi' ? 'Đang tuyển' : 'Published', count: publishedCount },
              { id: 'DRAFT', label: locale === 'vi' ? 'Bản nháp' : 'Drafts', count: draftCount },
              { id: 'CLOSED', label: locale === 'vi' ? 'Đã đóng' : 'Closed', count: closedCount },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedStatus(tab.id)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                  selectedStatus === tab.id
                    ? 'bg-[#2563EB] text-white shadow-2xs'
                    : 'bg-[#F8FAFC] dark:bg-[#13233F] text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F2A52] dark:hover:text-white hover:bg-[#F1F5F9]'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    selectedStatus === tab.id
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Jobs Data Table / List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-white dark:bg-[#111C38] border border-[#E2E8F0] dark:border-[#1E293B] animate-pulse" />
          ))}
        </div>
      ) : fetchError ? (
        <EmptyState
          type="ERROR"
          title={locale === 'vi' ? 'Không thể tải danh sách tin tuyển dụng' : 'Failed to load job listings'}
          description={fetchError}
          primaryCtaText={locale === 'vi' ? 'Thử lại' : 'Retry'}
          onPrimaryCtaClick={loadJobs}
        />
      ) : filteredJobs.length === 0 ? (
        <EmptyState
          type="EMPTY"
          title={locale === 'vi' ? 'Không tìm thấy tin tuyển dụng nào' : 'No job postings found'}
          description={
            searchKeyword || selectedStatus !== 'ALL'
              ? (locale === 'vi' ? 'Không có tin tuyển dụng nào phù hợp với bộ lọc hiện tại.' : 'No jobs matching current search filters.')
              : (locale === 'vi' ? 'Doanh nghiệp chưa có bài tuyển dụng nào. Hãy bắt đầu tạo tin ngay.' : 'Your company has no active postings. Create your first job requisition.')
          }
          primaryCtaText={locale === 'vi' ? 'Tạo tin mới' : 'Create Job'}
          onPrimaryCtaClick={() => (window.location.href = '/recruiter/jobs/new')}
        />
      ) : (
        <div className="bg-white dark:bg-[#111C38] border border-[#E2E8F0] dark:border-[#1E293B] rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#0B1528] text-[11px] font-mono uppercase font-bold text-[#64748B] dark:text-[#94A3B8]">
                  <th className="py-3.5 px-4 sm:px-6">Vị trí & Ngành nghề</th>
                  <th className="py-3.5 px-4">Địa điểm & Mức lương</th>
                  <th className="py-3.5 px-4 text-center">Trạng thái</th>
                  <th className="py-3.5 px-4 text-center">Hồ sơ ứng tuyển</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#1E293B] text-xs">
                {filteredJobs.map((job) => {
                  const appCount = applicationCounts[job.id] ?? 0;
                  const isBusy = actionInProgressId === job.id;

                  return (
                    <tr
                      key={job.id}
                      className="hover:bg-[#F8FBFF] dark:hover:bg-[#13233F]/60 transition-colors"
                    >
                      {/* Title & Industry */}
                      <td className="py-4 px-4 sm:px-6">
                        <div className="space-y-1">
                          <Link
                            href={`/recruiter/jobs/${job.id}`}
                            className="font-bold text-sm text-[#0F2A52] dark:text-white hover:text-[#2563EB] dark:hover:text-[#3B82F6] transition block"
                          >
                            {job.title}
                          </Link>
                          <div className="flex items-center gap-2 text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                            <span className="font-mono text-[#2563EB] dark:text-[#3B82F6]">
                              {job.industry}
                            </span>
                            <span>•</span>
                            <span>{job.employmentType}</span>
                            {job.seniority && (
                              <>
                                <span>•</span>
                                <span>{job.seniority}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Location & Salary */}
                      <td className="py-4 px-4">
                        <div className="space-y-1 text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-[#94A3B8]" />
                            <span>{job.location || 'Toàn quốc'}</span>
                          </div>
                          {(job.salaryMin > 0 || job.salaryMax > 0) ? (
                            <div className="flex items-center gap-1 font-mono font-semibold text-[#0F2A52] dark:text-slate-200">
                              <DollarSign className="w-3.5 h-3.5 text-[#00B14F]" />
                              <span>
                                ${job.salaryMin.toLocaleString()} - ${job.salaryMax.toLocaleString()}/tháng
                              </span>
                            </div>
                          ) : (
                            <span className="italic text-[#94A3B8]">Thỏa thuận</span>
                          )}
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-4 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase ${
                            job.status === 'PUBLISHED'
                              ? 'bg-[#E8F8EE] dark:bg-[#00B14F]/15 text-[#00B14F] dark:text-[#10B981] border border-[#00B14F]/30'
                              : job.status === 'DRAFT'
                              ? 'bg-[#FEF3C7] dark:bg-[#FACC15]/15 text-[#B45309] dark:text-[#FACC15] border border-[#FACC15]/30'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                          }`}
                        >
                          {job.status}
                        </span>
                      </td>

                      {/* Applications Count */}
                      <td className="py-4 px-4 text-center">
                        <Link
                          href={`/recruiter/jobs/${job.id}/applications`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#EFF6FF] dark:bg-[#152342] text-[#2563EB] dark:text-[#3B82F6] font-mono font-bold hover:bg-[#DBEAFE] transition"
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>{appCount}</span>
                        </Link>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 sm:px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/recruiter/jobs/${job.id}`}
                            className="p-1.5 rounded-lg text-[#64748B] dark:text-[#94A3B8] hover:text-[#2563EB] dark:hover:text-[#3B82F6] hover:bg-[#F1F5F9] dark:hover:bg-[#13233F] transition"
                            title="Xem chi tiết JD"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>

                          <Link
                            href={`/recruiter/jobs/${job.id}/ranking`}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#EFF6FF] dark:bg-[#152342] text-[#2563EB] dark:text-[#3B82F6] hover:bg-[#DBEAFE] border border-[#2563EB]/20 transition inline-flex items-center gap-1"
                            title="Xem Bảng xếp hạng AI"
                          >
                            <Award className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Ranking</span>
                          </Link>

                          {job.status === 'DRAFT' && (
                            <button
                              type="button"
                              onClick={() => handlePublish(job.id)}
                              disabled={isBusy}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#E8F8EE] text-[#00B14F] hover:bg-[#C9F2D8] border border-[#00B14F]/30 transition disabled:opacity-50 cursor-pointer"
                            >
                              {isBusy ? '...' : (locale === 'vi' ? 'Xuất bản' : 'Publish')}
                            </button>
                          )}

                          {job.status === 'PUBLISHED' && (
                            <button
                              type="button"
                              onClick={() => handleClose(job.id)}
                              disabled={isBusy}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-600 border border-slate-200 dark:border-slate-700 transition disabled:opacity-50 cursor-pointer"
                            >
                              {isBusy ? '...' : (locale === 'vi' ? 'Đóng tin' : 'Close')}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
