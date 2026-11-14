"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ImagePlus } from "lucide-react";

export const CV_TEMPLATES = [
  {
    id: "standard",
    name: "Tiêu chuẩn",
    group: "Đơn giản",
    color: "#176b58",
    note: "Rõ ràng, dễ đọc. Phù hợp với nhiều ngành nghề.",
  },
  {
    id: "starter",
    name: "Tiêu chuẩn (Ít kinh nghiệm)",
    group: "Đơn giản",
    color: "#245ca5",
    note: "Đưa học vấn và dự án lên trước kinh nghiệm làm việc.",
  },
  {
    id: "creative",
    name: "Sáng tạo",
    group: "Sáng tạo",
    color: "#8258a1",
    note: "Tiêu đề nổi bật, khung ảnh tròn và điểm nhấn cá nhân.",
  },
  {
    id: "impact",
    name: "Ấn tượng",
    group: "Chuyên nghiệp",
    color: "#253d52",
    note: "Bố cục hai cột, khung ảnh và thông tin liên hệ riêng.",
  },
] as const;
export type CVTemplateId = (typeof CV_TEMPLATES)[number]["id"];
export function CVTemplateGallery({
  onSelect,
}: {
  onSelect: (id: CVTemplateId) => void;
}) {
  const [filter, setFilter] = useState("Tất cả");
  return (
    <main className="min-h-[80vh] bg-[var(--background)] px-4 py-10 text-[var(--text-primary)]">
      <div className="mx-auto max-w-6xl">
        <Link href="/candidate/cvs" className="text-sm text-[var(--primary)]">
          ← Thư viện CV của tôi
        </Link>
        <div className="my-8 max-w-2xl">
          <span className="text-xs font-bold uppercase tracking-[.2em] text-emerald-700">
            midCV · Thiết kế hồ sơ của bạn
          </span>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
            Chọn mẫu, kể câu chuyện của bạn.
          </h1>
          <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
            4 mẫu chính thức, đều có khung ảnh cá nhân. Chỉnh font, màu sắc, thứ
            tự nội dung và xem trước ngay trong trình tạo CV.
          </p>
        </div>
        <div
          className="mb-6 flex flex-wrap gap-2"
          role="group"
          aria-label="Bộ lọc mẫu CV"
        >
          {["Tất cả", "Đơn giản", "Chuyên nghiệp", "Sáng tạo"].map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={`rounded-full border px-5 py-2 text-sm font-semibold transition ${filter === f ? "border-emerald-700 bg-emerald-700 text-white" : "border-[var(--border)] bg-[var(--surface)] hover:border-emerald-600"}`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {CV_TEMPLATES.filter(
            (t) => filter === "Tất cả" || t.group === filter,
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelect(t.id)}
              className="group overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-emerald-600"
            >
              <div className="bg-slate-100 p-5">
                <div
                  aria-hidden="true"
                  className={`min-h-72 bg-white p-4 shadow-md ${t.id === "impact" ? "border-l-[45px]" : "border-t-[7px]"}`}
                  style={{ borderColor: t.color }}
                >
                  <div
                    className={`flex gap-3 border-b pb-3 ${t.id === "creative" ? "flex-col items-center" : ""}`}
                  >
                    <div
                      className={`flex h-16 w-14 shrink-0 items-center justify-center border-2 border-dashed text-slate-400 ${t.id === "creative" ? "rounded-full" : "rounded"}`}
                    >
                      <ImagePlus size={24} />
                    </div>
                    <div className="w-full space-y-2 py-2">
                      <div
                        className="h-3 w-4/5 rounded"
                        style={{ background: t.color }}
                      />
                      <div className="h-1.5 w-3/5 rounded bg-slate-200" />
                      <div className="h-1.5 w-4/5 rounded bg-slate-200" />
                    </div>
                  </div>
                  {[1, 2, 3, 4].map((n) => (
                    <div key={n} className="mt-4 space-y-1.5">
                      <div
                        className="mb-2 h-2 w-1/2 rounded"
                        style={{ background: t.color }}
                      />
                      <div className="h-1 w-full bg-slate-200" />
                      <div className="h-1 w-5/6 bg-slate-200" />
                      <div className="h-1 w-4/6 bg-slate-200" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2 p-4">
                <span className="text-[10px] font-bold uppercase text-emerald-700">
                  {t.group} · Có ảnh cá nhân
                </span>
                <h2 className="text-base font-bold">{t.name}</h2>
                <p className="min-h-12 text-xs leading-5 text-[var(--text-secondary)]">
                  {t.note}
                </p>
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">
                  Dùng mẫu này <ArrowRight size={15} />
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
