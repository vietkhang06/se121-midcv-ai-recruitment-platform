'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Job } from '@/types';
import { fetchJobById } from '@/lib/api';
import { QuickApplyModal } from '@/components/application/QuickApplyModal';
import { ShieldCheck, ChevronRight, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [job, setJob] = useState<Job | null>(null);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState<boolean>(false);

  useEffect(() => {
    fetchJobById(resolvedParams.id).then(setJob);
  }, [resolvedParams.id]);

  if (!job) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center text-slate-500">
        <p className="text-sm">Loading job verification profile...</p>
      </div>
    );
  }

  const requiredSkills = job.requirements.filter((r) => r.requirementType === 'REQUIRED');
  const preferredSkills = job.requirements.filter((r) => r.requirementType === 'PREFERRED');

  return (
    <div className="bg-slate-50/60 dark:bg-[#071A17] min-h-screen py-8 text-[#0F2A52] dark:text-[#F1F5F9] space-y-8 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Breadcrumb Trail (Figma Screen 03) */}
        <div className="flex items-center gap-2 text-xs text-[#64748B] dark:text-[#94A3B8]">
          <Link href="/jobs" className="hover:text-[#2563EB] transition">Danh sách việc làm</Link>
          <ChevronRight className="w-3 h-3 text-slate-400" />
          <span>{job.industry || 'Technology'}</span>
          <ChevronRight className="w-3 h-3 text-slate-400" />
          <span className="text-[#0F2A52] dark:text-slate-200 font-medium truncate max-w-xs">{job.title}</span>
        </div>

        {/* 03 — Editorial Hero Header Banner */}
        <div className="bg-gradient-to-br from-[#0F2A52] to-[#1E3A5F] dark:from-[#0B211D] dark:to-[#102A25] text-white rounded-3xl p-8 sm:p-10 border border-white/10 shadow-lg relative overflow-hidden">
          <div className="absolute -right-20 -top-20 w-80 h-80 bg-[#2563EB]/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-[#00B14F]/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-start justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs text-[#D7F9FA] font-mono uppercase text-[11px] font-semibold border border-white/15">
                  {job.industry}
                </span>
                <span className="text-slate-300 text-xs">
                  Đăng {job.publishedDate || 'gần đây'}
                </span>
                {job.companyVerified && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#00B14F] bg-[#00B14F]/20 border border-[#00B14F]/40 px-2.5 py-0.5 rounded-full">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Doanh nghiệp xác thực</span>
                  </span>
                )}
              </div>

              <h1 className="text-3xl sm:text-4xl font-editorial font-bold tracking-tight text-white">
                {job.title}
              </h1>

              <div className="text-sm text-slate-300 font-light">
                {job.companyName} • {job.location} ({job.employmentType})
              </div>
            </div>

            {/* Verified JD Status Badge */}
            <div className="shrink-0 relative z-10">
              <span className="px-4 py-1.5 rounded-full text-xs font-bold font-mono bg-[#00B14F]/25 border border-[#00B14F]/40 text-[#D7F9FA] shadow-sm">
                VERIFIED JD
              </span>
            </div>
          </div>
        </div>

        {/* 03 — 2-Column Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Role Details */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Role Summary */}
            <div className="bg-white dark:bg-[#102A25] border border-slate-200 dark:border-[#1F4A40] rounded-2xl p-6 sm:p-8 shadow-xs space-y-3 transition-colors">
              <h2 className="font-editorial text-xl font-bold text-[#0F2A52] dark:text-[#F1F5F9]">Mô Tả Công Việc</h2>
              <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
                {job.description}
              </p>
            </div>

            {/* Key Responsibilities */}
            <div className="bg-white dark:bg-[#102A25] border border-slate-200 dark:border-[#1F4A40] rounded-2xl p-6 sm:p-8 shadow-xs space-y-3 transition-colors">
              <h2 className="font-editorial text-xl font-bold text-[#0F2A52] dark:text-[#F1F5F9]">Trách Nhiệm Chính</h2>
              <ul className="space-y-2 text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] list-disc pl-5">
                {(job.responsibilities || [
                  'Xây dựng và tối ưu hệ thống microservices chịu tải cao trên nền tảng hạ tầng hiện đại.',
                  'Thiết kế, triển khai giải pháp kiến trúc an toàn, tuân thủ các tiêu chuẩn bảo mật số.',
                  'Tối ưu hóa hiệu năng, giám sát hệ thống và phân tích dữ liệu chuyên sâu.',
                  'Phối hợp đa phòng ban để đẩy nhanh tiến độ release các tính năng quan trọng.'
                ]).map((item, idx) => (
                  <li key={idx} className="leading-relaxed">{item}</li>
                ))}
              </ul>
            </div>

            {/* Technical Requirements & Evidence Rubrics */}
            <div className="bg-white dark:bg-[#102A25] border border-slate-200 dark:border-[#1F4A40] rounded-2xl p-6 sm:p-8 shadow-xs space-y-4 transition-colors">
              <h2 className="font-editorial text-xl font-bold text-[#0F2A52] dark:text-[#F1F5F9]">Yêu Cầu Kỹ Thuật</h2>
              
              {/* Required Skills Section (Preserved for E2E Test Compatibility) */}
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-[#0F2A52] dark:text-[#E2E8F0] font-mono">
                  Kỹ năng Bắt buộc (Required Skills)
                </div>
                <div className="flex flex-wrap gap-2">
                  {requiredSkills.map((req) => (
                    <span
                      key={req.id}
                      className="px-3 py-1.5 rounded-xl text-xs font-mono font-semibold bg-[#EFF6FF] dark:bg-[#071A17] text-[#2563EB] dark:text-[#93C5FD] border border-[#BFDBFE] dark:border-[#1F4A40]"
                    >
                      {req.skillName} • {req.minYearsExperience}y exp
                    </span>
                  ))}
                </div>
              </div>

              {/* Preferred Skills */}
              {preferredSkills.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-[#1F4A40]">
                  <div className="text-xs font-semibold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] font-mono">
                    Kỹ năng Ưu tiên (Preferred Skills)
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {preferredSkills.map((req) => (
                      <span
                        key={req.id}
                        className="px-2.5 py-1 rounded-xl text-xs font-mono text-[#64748B] dark:text-[#94A3B8] bg-slate-50 dark:bg-[#071A17] border border-slate-200 dark:border-[#1F4A40]"
                      >
                        {req.skillName} • {req.minYearsExperience}y exp
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Compensation & Semantic Fit Evaluation */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Compensation & Apply Card */}
            <div className="bg-white dark:bg-[#102A25] border border-slate-200 dark:border-[#1F4A40] rounded-2xl p-6 sm:p-7 shadow-xs space-y-4 transition-colors">
              <div className="space-y-1">
                <span className="text-[11px] font-mono font-semibold uppercase text-[#64748B] dark:text-[#94A3B8]">MỨC LƯƠNG ĐỀ XUẤT</span>
                <div className="text-2xl font-bold font-editorial text-[#00B14F]">
                  {job.salaryRange || `$${job.salaryMin} - $${job.salaryMax} /tháng`}
                </div>
              </div>

              <div className="space-y-2.5 pt-2">
                <button
                  onClick={() => setIsApplyModalOpen(true)}
                  className="w-full py-3 px-4 rounded-xl font-semibold text-xs text-white bg-[#00B14F] hover:bg-[#009643] transition shadow-xs text-center cursor-pointer active:scale-[0.99]"
                >
                  Apply via midCV® (Quick Apply) — Nộp đơn
                </button>
                <button
                  onClick={() => setIsApplyModalOpen(true)}
                  className="w-full py-2.5 px-4 rounded-xl font-medium text-xs text-[#0F2A52] dark:text-slate-200 border border-slate-200 dark:border-[#1F4A40] hover:bg-slate-50 dark:hover:bg-[#1F4A40]/50 transition text-center cursor-pointer"
                >
                  Ứng tuyển tiêu chuẩn
                </button>
              </div>
            </div>

            {/* Semantic Fit Evaluation Widget (Radial Score Gauge) */}
            <div className="bg-white dark:bg-[#102A25] border border-slate-200 dark:border-[#1F4A40] rounded-2xl p-6 shadow-xs space-y-4 text-center transition-colors">
              <div className="text-xs font-semibold uppercase tracking-wider text-[#0F2A52] dark:text-[#E2E8F0] font-mono">
                Đối Sánh Vector Tự Động
              </div>

              {/* Radial Score Meter */}
              <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-slate-100 dark:text-[#071A17]"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-[#00B14F]"
                    strokeDasharray="96, 100"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold font-editorial text-[#0F2A52] dark:text-white">{job.requirements.length}</span>
                  <span className="text-[9px] font-mono text-[#64748B] uppercase tracking-wider">TIÊU CHÍ KHỚP</span>
                </div>
              </div>

              {/* Verified Skills Distribution Bar */}
              <div className="space-y-1.5 text-left pt-2 border-t border-slate-100 dark:border-[#1F4A40]">
                <div className="text-[10px] font-mono font-semibold uppercase text-[#64748B] dark:text-[#94A3B8]">
                  CƠ CẤU YÊU CẦU CÔNG VIỆC
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden flex bg-slate-100 dark:bg-[#071A17]">
                  <div
                    className="bg-[#2563EB] h-full"
                    style={{ width: `${job.requirements.length > 0 ? ((requiredSkills.length / job.requirements.length) * 100) : 100}%` }}
                    title="Required Skills"
                  />
                  <div
                    className="bg-[#FACC15] h-full"
                    style={{ width: `${job.requirements.length > 0 ? ((preferredSkills.length / job.requirements.length) * 100) : 0}%` }}
                    title="Preferred Skills"
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-[#64748B] dark:text-[#94A3B8] font-mono pt-1">
                  <span>{requiredSkills.length} Bắt buộc</span>
                  <span>{preferredSkills.length} Ưu tiên</span>
                  <span>100% Xác thực</span>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* 03 — Verifiable Skill Evidence Comparison Table (Figma Screen 03) */}
        <div className="bg-white dark:bg-[#102A25] border border-slate-200 dark:border-[#1F4A40] rounded-2xl p-6 sm:p-8 shadow-xs space-y-6 transition-colors">
          <div>
            <span className="text-[11px] font-mono font-semibold text-[#2563EB] dark:text-[#60A5FA] uppercase tracking-widest">
              EXPLAINABLE MATCHING AUDIT
            </span>
            <h2 className="text-2xl font-editorial font-bold text-[#0F2A52] dark:text-[#F1F5F9] mt-1">Đối Soát Minh Chứng Kỹ Năng</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-[#071A17] text-[#64748B] dark:text-[#94A3B8] uppercase font-mono text-[10px] border-b border-slate-200 dark:border-[#1F4A40]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Yêu Cầu Kỹ Thuật (JD)</th>
                  <th className="py-3 px-4 font-semibold">Minh Chứng Đã Xác Thực Từ CV</th>
                  <th className="py-3 px-4 font-semibold">Trạng Thái Thẩm Định</th>
                  <th className="py-3 px-4 font-semibold text-right">Độ Khớp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#1F4A40] text-[#0F2A52] dark:text-slate-200">
                <tr>
                  <td className="py-3.5 px-4 font-medium text-[#0F2A52] dark:text-white">
                    <div className="font-semibold">Go (Golang)</div>
                    <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">3+ năm thiết kế microservices đồng thời</div>
                  </td>
                  <td className="py-3.5 px-4 text-[#64748B] dark:text-[#94A3B8]">4 năm kinh nghiệm Go production tại CloudScale</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F8EE] dark:bg-[#00B14F]/15 text-[#00873D] dark:text-[#10B981] border border-[#00B14F]/30">
                      Đạt chuẩn
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-semibold text-[#00B14F]">98% (Cao)</td>
                </tr>

                <tr>
                  <td className="py-3.5 px-4 font-medium text-[#0F2A52] dark:text-white">
                    <div className="font-semibold">Kubernetes</div>
                    <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">Cấu hình Ingress, StatefulSets & Service Mesh</div>
                  </td>
                  <td className="py-3.5 px-4 text-[#64748B] dark:text-[#94A3B8]">Viết production Helm Charts cho cluster migration</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F8EE] dark:bg-[#00B14F]/15 text-[#00873D] dark:text-[#10B981] border border-[#00B14F]/30">
                      Đạt chuẩn
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-semibold text-[#00B14F]">94% (Cao)</td>
                </tr>

                <tr>
                  <td className="py-3.5 px-4 font-medium text-[#0F2A52] dark:text-white">
                    <div className="font-semibold">AWS Infrastructure</div>
                    <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">IAM policies, VPC peering, và RDS clusters</div>
                  </td>
                  <td className="py-3.5 px-4 text-[#64748B] dark:text-[#94A3B8]">Tự động hóa Terraform cho 12 VPC cốt lõi</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F8EE] dark:bg-[#00B14F]/15 text-[#00873D] dark:text-[#10B981] border border-[#00B14F]/30">
                      Đạt chuẩn
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-semibold text-[#00B14F]">91% (Cao)</td>
                </tr>

                <tr>
                  <td className="py-3.5 px-4 font-medium text-[#0F2A52] dark:text-white">
                    <div className="font-semibold">Prometheus / Grafana</div>
                    <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">Tùy biến Dashboard giám sát & truy vấn PromQL</div>
                  </td>
                  <td className="py-3.5 px-4 text-[#64748B] dark:text-[#94A3B8]">Thiết lập pipeline metrics cơ bản</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FEF9C3] dark:bg-[#FACC15]/20 text-[#92400E] dark:text-[#FACC15] border border-[#FACC15]/40">
                      Một phần
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-semibold text-amber-600 dark:text-amber-400">64% (Trung bình)</td>
                </tr>

                <tr>
                  <td className="py-3.5 px-4 font-medium text-[#0F2A52] dark:text-white">
                    <div className="font-semibold">Rust Development</div>
                    <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">System-level integration patterns</div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-400 dark:text-slate-500">Chưa có dữ liệu trực tiếp trong hồ sơ CV</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40">
                      Chưa có
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-slate-400 dark:text-slate-500">--</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Quick Apply Stepper Modal */}
      {isApplyModalOpen && (
        <QuickApplyModal
          job={job}
          isOpen={true}
          onClose={() => setIsApplyModalOpen(false)}
          onSuccess={() => setIsApplyModalOpen(false)}
        />
      )}

    </div>
  );
}
