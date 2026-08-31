'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Industry } from '@/types';
import { ArrowLeft, Sparkles, Eye, Download, Save, CheckCircle2, Layout } from 'lucide-react';

export default function CVBuilderPage() {
  const [targetIndustry, setTargetIndustry] = useState<Industry>('Technology');
  const [cvTitle, setCvTitle] = useState<string>('CV Backend Engineer - Tech Standard');
  const [targetRole, setTargetRole] = useState<string>('Senior Java Engineer');
  const [activeTemplate, setActiveTemplate] = useState<string>('TECH_MODERN');

  // Common Sections
  const [summary, setSummary] = useState<string>('Lập trình viên Backend với 3.5 năm kinh nghiệm Java 21, Spring Boot và PostgreSQL. Đam mê thiết kế hệ thống Microservices quy mô lớn.');
  const [skills, setSkills] = useState<string>('Java 21, Spring Boot, PostgreSQL, Docker, Redis, REST API, Git, TypeScript');
  const [experience, setExperience] = useState<string>('2023 - Nay: Senior Java Backend Engineer tại FPT Software\n- Thiết kế và phát triển Microservices xử lý 100,000+ request/ngày.\n- Tối ưu hóa truy vấn PostgreSQL và thiết lập Redis Cache.');
  const [education, setEducation] = useState<string>('2019 - 2023: Cử nhân Công nghệ Thông tin - Đại học Bách Khoa');

  // Industry Specific Sections
  const [githubProjects, setGithubProjects] = useState<string>('AI Matching Engine (https://github.com/candidate-java/ai-matching)\n- Thuật toán đối sánh JD-CV bằng Vector Embedding 1536D & Pgvector Cosine Similarity.');
  const [marketingCampaigns, setMarketingCampaigns] = useState<string>('Chiến dịch Meta Ads Summer Sale 2025\n- Ngân sách: $30,000. Đạt ROAS 4.8x và 12,000 đơn hàng mới.');
  const [accountingTools, setAccountingTools] = useState<string>('Phần mềm MISA SME, SAP ERP, Excel nâng cao (VLOOKUP, PivotTable, VBAMacro)');

  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const handleSaveCV = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleExportPDF = () => {
    alert(`Đã xuất file PDF thành công cho CV "${cvTitle}" mẫu ${activeTemplate}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div className="space-y-1">
          <Link href="/candidate/cvs" className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white mb-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại Thư viện CV</span>
          </Link>
          <h1 className="text-2xl font-extrabold text-white">Công Cụ CV Builder & Gợi Ý Mẫu Theo Ngành</h1>
          <p className="text-xs text-slate-400">Industry-aware CV Template Recommendation (Target Industry + Target Role → Recommended Template)</p>
        </div>

        {/* Action CTAs */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPreviewOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
          >
            <Eye className="w-4 h-4 text-cyan-400" />
            <span>Xem trước Live</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-amber-300 transition"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>Xuất PDF</span>
          </button>
          <button
            onClick={handleSaveCV}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md transition active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>Lưu CV</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Lưu phiên bản CV thành công!</span>
        </div>
      )}

      {/* Main Grid: Form Builder vs Template Recommendation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Form Section Editor */}
        <div className="lg:col-span-2 space-y-6">
          {/* Target Industry & Basic Info */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3">Định hình CV & Ngành Tuyển dụng</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Tên lưu trữ CV</label>
                <input
                  type="text"
                  value={cvTitle}
                  onChange={(e) => setCvTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Ngành nghề nhắm tới</label>
                <select
                  value={targetIndustry}
                  onChange={(e) => setTargetIndustry(e.target.value as Industry)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500 font-semibold text-cyan-400"
                >
                  <option value="Technology">Technology (CNTT)</option>
                  <option value="Marketing">Digital Marketing</option>
                  <option value="Design">UI/UX Product Design</option>
                  <option value="Finance">Tài chính - Kế toán</option>
                </select>
              </div>
            </div>
          </div>

          {/* Common Sections Form */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
            <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3">Các Mục CV Chung (Common Sections)</h3>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">1. Tóm tắt bản thân (Summary)</label>
              <textarea
                rows={2}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">2. Bộ kỹ năng (Skills)</label>
              <input
                type="text"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">3. Kinh nghiệm làm việc (Experience)</label>
              <textarea
                rows={3}
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">4. Học vấn & Bằng cấp (Education)</label>
              <input
                type="text"
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Industry-Specific Conditional Sections */}
          <div className="bg-slate-900 border border-indigo-500/40 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <h3 className="text-base font-bold text-white">Mục Đặc Thù Ngành: <span className="text-cyan-400">{targetIndustry}</span></h3>
            </div>

            {targetIndustry === 'Technology' && (
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-300">Dự án Open Source & GitHub Repositories</label>
                <textarea
                  rows={3}
                  value={githubProjects}
                  onChange={(e) => setGithubProjects(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>
            )}

            {targetIndustry === 'Marketing' && (
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-300">Các Chiến dịch Performance Marketing & Chỉ số ROAS</label>
                <textarea
                  rows={3}
                  value={marketingCampaigns}
                  onChange={(e) => setMarketingCampaigns(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}

            {targetIndustry === 'Finance' && (
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-300">Phần mềm Kế toán & Chứng chỉ Hành nghề (MISA / SAP / CPA)</label>
                <textarea
                  rows={3}
                  value={accountingTools}
                  onChange={(e) => setAccountingTools(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Industry-aware Template Recommendation Panel */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 sticky top-20">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Layout className="w-4 h-4 text-indigo-400" />
              <h3 className="text-base font-bold text-white">Gợi Ý Mẫu CV Theo Ngành</h3>
            </div>

            <p className="text-xs text-slate-400">
              Industry-aware CV Template Recommendation (Target Industry + Target Role → Recommended Template):
            </p>

            <div className="space-y-3">
              <div
                onClick={() => setActiveTemplate('TECH_MODERN')}
                className={`p-3.5 rounded-xl border cursor-pointer transition ${
                  activeTemplate === 'TECH_MODERN' ? 'border-cyan-500 bg-cyan-950/30' : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white">1. Tech Modern Standard</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 font-mono">Recommended</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Tối ưu hóa các điểm minh chứng kỹ thuật và cấu trúc GitHub.</p>
              </div>

              <div
                onClick={() => setActiveTemplate('MARKETING_CREATIVE')}
                className={`p-3.5 rounded-xl border cursor-pointer transition ${
                  activeTemplate === 'MARKETING_CREATIVE' ? 'border-indigo-500 bg-indigo-950/30' : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white">2. Marketing & Growth Layout</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Nổi bật số liệu tăng trưởng và chỉ số hiệu suất chiến dịch.</p>
              </div>

              <div
                onClick={() => setActiveTemplate('FINANCE_CORPORATE')}
                className={`p-3.5 rounded-xl border cursor-pointer transition ${
                  activeTemplate === 'FINANCE_CORPORATE' ? 'border-emerald-500 bg-emerald-950/30' : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white">3. Executive Corporate</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Chuẩn mực chỉn chu dành cho Tài chính - Kế toán & Quản trị.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Preview Modal */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-100 space-y-4 relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsPreviewOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">×</button>
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Xem trước CV Live (Template: {activeTemplate})</h3>
              <button onClick={handleExportPDF} className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white">Xuất PDF ngay</button>
            </div>
            <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 space-y-4 text-xs">
              <h2 className="text-lg font-bold text-white">{cvTitle}</h2>
              <p className="text-cyan-400 font-semibold">{targetRole} • Ngành {targetIndustry}</p>
              <div className="border-t border-slate-800 pt-3 space-y-3">
                <div><h4 className="font-bold text-slate-400 uppercase">Tóm tắt</h4><p>{summary}</p></div>
                <div><h4 className="font-bold text-slate-400 uppercase">Kỹ năng</h4><p>{skills}</p></div>
                <div><h4 className="font-bold text-slate-400 uppercase">Kinh nghiệm</h4><p className="whitespace-pre-line">{experience}</p></div>
                {targetIndustry === 'Technology' && <div><h4 className="font-bold text-cyan-400 uppercase">GitHub & Open Source</h4><p className="whitespace-pre-line">{githubProjects}</p></div>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
