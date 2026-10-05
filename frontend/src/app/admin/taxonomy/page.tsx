'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Tag,
  ArrowLeft,
  Search,
  Plus,
  ShieldAlert,
  Loader2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ToggleLeft,
  ToggleRight,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { adminApi } from '@/lib/api';
import { TaxonomySkillAdminDto } from '@/types';

export default function AdminTaxonomyPage() {
  const [skills, setSkills] = useState<TaxonomySkillAdminDto[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create Skill Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillCategory, setNewSkillCategory] = useState('');
  const [creating, setCreating] = useState(false);

  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchSkills = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getTaxonomySkills({
        search: searchTerm.trim() || undefined,
        activeOnly: activeFilter === 'ALL' ? undefined : activeFilter === 'ACTIVE',
        page: currentPage,
        size: 15
      });
      setSkills(res.content || []);
      setTotalPages(res.totalPages || 0);
      setTotalElements(res.totalElements || 0);
    } catch (err: any) {
      setError(err?.message || 'Không thể tải danh mục kỹ năng.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, activeFilter, searchTerm]);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  const handleToggleActive = async (skill: TaxonomySkillAdminDto) => {
    setTogglingId(skill.id);
    setFeedback(null);
    try {
      await adminApi.toggleTaxonomySkillActive(skill.id);
      setFeedback({
        type: 'success',
        text: `Đã ${skill.active ? 'ngừng hoạt động' : 'kích hoạt lại'} kỹ năng "${skill.name}".`
      });
      fetchSkills();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Lỗi khi cập nhật trạng thái kỹ năng.'
      });
    } finally {
      setTogglingId(null);
    }
  };

  const handleCreateSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim() || !newSkillCategory.trim()) {
      setFeedback({ type: 'error', text: 'Vui lòng nhập đầy đủ tên và danh mục kỹ năng.' });
      return;
    }

    setCreating(true);
    setFeedback(null);
    try {
      await adminApi.createTaxonomySkill({
        name: newSkillName.trim(),
        category: newSkillCategory.trim()
      });
      setFeedback({
        type: 'success',
        text: `Đã thêm kỹ năng "${newSkillName.trim()}" vào taxonomy hệ thống.`
      });
      setIsCreateModalOpen(false);
      setNewSkillName('');
      setNewSkillCategory('');
      fetchSkills();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Lỗi khi tạo mới kỹ năng taxonomy.'
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#060D1E] text-slate-800 dark:text-slate-100 transition-colors">
      <main className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <Link
            href="/admin"
            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại Trang Quản trị</span>
          </Link>
        </div>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-sm">
                <Tag className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Quản Trị Danh Mục & Taxonomy
              </h1>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
              Quản lý từ khóa kỹ năng chuẩn hóa, phân loại chuyên môn dùng chung cho AI extraction và semantic matching.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Kỹ Năng Mới</span>
            </button>
            <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 shrink-0">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              <span>Admin Only</span>
            </div>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium transition-all ${
              feedback.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(0);
              }}
              placeholder="Tìm theo tên kỹ năng hoặc category..."
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((s) => (
              <button
                key={s}
                onClick={() => {
                  setActiveFilter(s);
                  setCurrentPage(0);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeFilter === s
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {s === 'ALL' ? 'Tất cả' : s === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm vô hiệu'}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-[#0B1329] rounded-2xl border border-slate-200 dark:border-slate-800">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Đang tải danh mục kỹ năng...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="p-8 rounded-2xl bg-white dark:bg-[#0B1329] border border-rose-200 dark:border-rose-900/50 text-center space-y-4">
            <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Lỗi tải dữ liệu</h3>
            <p className="text-xs text-rose-600 dark:text-rose-400 max-w-md mx-auto">{error}</p>
            <button
              onClick={fetchSkills}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold inline-flex items-center gap-1.5 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Thử lại
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && skills.length === 0 && (
          <div className="p-12 rounded-2xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 text-center space-y-3">
            <Tag className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Không tìm thấy kỹ năng</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Không có từ khóa kỹ năng nào phù hợp với bộ lọc hiện tại.
            </p>
          </div>
        )}

        {/* Skills Table */}
        {!loading && !error && skills.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1329] shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-[#111C38] text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Tên Kỹ Năng (Display Name)</th>
                  <th className="py-3.5 px-4">Normalized Key</th>
                  <th className="py-3.5 px-4">Phân Loại (Category)</th>
                  <th className="py-3.5 px-4">Trạng Thái</th>
                  <th className="py-3.5 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {skills.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                    <td className="py-4 px-4 font-bold text-slate-900 dark:text-white">
                      {s.name}
                    </td>
                    <td className="py-4 px-4 font-mono text-slate-500 dark:text-slate-400">
                      {s.normalizedKey}
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40">
                        {s.category || 'General'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      {s.active ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" /> Hoạt động
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400">
                          <XCircle className="w-3 h-3" /> Tạm ẩn
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => handleToggleActive(s)}
                        disabled={togglingId === s.id}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                          s.active
                            ? 'border border-amber-300 dark:border-amber-800 text-amber-600 hover:bg-amber-50'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        }`}
                      >
                        {togglingId === s.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : s.active ? (
                          <ToggleLeft className="w-3.5 h-3.5" />
                        ) : (
                          <ToggleRight className="w-3.5 h-3.5" />
                        )}
                        <span>{s.active ? 'Vô hiệu hóa' : 'Kích hoạt'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Trang {currentPage + 1} / {totalPages} (Tổng {totalElements} kỹ năng)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                    disabled={currentPage === 0}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={currentPage >= totalPages - 1}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Create Skill Modal */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#0B1329] border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600">
                  <Tag className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Thêm Kỹ Năng Taxonomy Mới
                  </h3>
                  <p className="text-xs text-slate-500">
                    Bổ sung từ khóa chuẩn hóa vào kho tri thức của hệ thống matching.
                  </p>
                </div>
              </div>

              <form onSubmit={handleCreateSkill} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tên kỹ năng (Display Name) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newSkillName}
                    onChange={(e) => setNewSkillName(e.target.value)}
                    placeholder="VD: Spring Boot, React, PostgreSQL..."
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Phân loại (Category) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newSkillCategory}
                    onChange={(e) => setNewSkillCategory(e.target.value)}
                    placeholder="VD: Backend, Frontend, DevOps, Database..."
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    disabled={creating}
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5"
                  >
                    {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Lưu kỹ năng
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
