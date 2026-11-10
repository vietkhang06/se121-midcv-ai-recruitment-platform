"use client";
import { useMemo, useState } from "react";
import catalog from "@/data/occupations.json";
import { Search, Check, X, ChevronRight } from "lucide-react";
export { catalog as OCCUPATIONS };
const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .toLowerCase();

export function OccupationPicker({
  value,
  onChange,
  buttonLabel = "Danh mục Nghề",
}: {
  value: string[];
  onChange: (codes: string[]) => void;
  buttonLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [major, setMajor] = useState("IT");
  const [family, setFamily] = useState("");
  const [pending, setPending] = useState(value);
  const majors = Array.from(
    new Map(catalog.map((r) => [r.major, r.majorName])).entries(),
  );
  const source = catalog.filter((r) =>
    major === "IT" ? r.it : r.major === major,
  );
  const families = Array.from(
    new Map(source.map((r) => [r.family, r.familyName])).entries(),
  );
  const items = useMemo(
    () =>
      catalog.filter((r) => {
        if (query.trim())
          return normalize(
            `${r.name} ${r.en} ${r.code} ${r.familyName}`,
          ).includes(normalize(query.trim()));
        return (
          (major === "IT" ? r.it : r.major === major) &&
          (!family || r.family === family)
        );
      }),
    [query, major, family],
  );
  const toggle = (id: string) =>
    setPending((current) =>
      current.includes(id)
        ? current.filter((x) => x !== id)
        : current.length < 30
          ? [...current, id]
          : current,
    );
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setPending(value);
          setOpen(true);
        }}
        aria-expanded={open}
        className="flex h-full min-h-12 items-center gap-2 rounded-xl border border-emerald-600 bg-white px-4 text-sm font-semibold text-emerald-800"
      >
        <Search size={16} />
        {buttonLabel}
        {value.length > 0 && (
          <span className="rounded-full bg-emerald-100 px-2 text-xs">
            {value.length}
          </span>
        )}
      </button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Chọn nghề và chuyên môn"
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-3"
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
        >
          <div className="flex max-h-[85vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="font-bold">
                Chọn nhóm nghề, nghề hoặc vị trí chuyên môn
              </h2>
              <button
                aria-label="Đóng danh mục"
                type="button"
                onClick={() => setOpen(false)}
                className="rounded p-2 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>
            <label className="relative mx-4 my-3">
              <Search
                className="absolute left-3 top-3 text-slate-400"
                size={18}
              />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm theo tên tiếng Việt, tiếng Anh hoặc mã ISCO…"
                className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-3 text-sm"
              />
            </label>
            <div className="grid min-h-0 flex-1 grid-cols-1 overflow-auto md:grid-cols-[220px_260px_1fr]">
              <div className="max-h-40 overflow-y-auto border-r p-3 md:max-h-[440px]">
                <h3 className="mb-2 text-xs font-bold uppercase text-slate-400">
                  Nhóm nghề
                </h3>
                {[["IT", "Công nghệ thông tin · Ưu tiên"], ...majors].map(
                  ([id, name]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setMajor(id);
                        setFamily("");
                        setQuery("");
                      }}
                      className={`mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs ${major === id ? "bg-emerald-100 font-bold text-emerald-900" : "hover:bg-slate-100"}`}
                    >
                      {name}
                      <ChevronRight size={14} />
                    </button>
                  ),
                )}
              </div>
              <div className="max-h-32 overflow-y-auto border-r p-3 md:max-h-[440px]">
                <h3 className="mb-2 text-xs font-bold uppercase text-slate-400">
                  Nghề
                </h3>
                <button
                  type="button"
                  onClick={() => setFamily("")}
                  className="mb-2 text-xs font-semibold text-emerald-700"
                >
                  Tất cả trong nhóm
                </button>
                {families.map(([id, name]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setFamily(id);
                      setQuery("");
                    }}
                    className={`mb-1 w-full rounded-lg px-3 py-2 text-left text-xs ${family === id ? "bg-emerald-100 font-bold text-emerald-900" : "hover:bg-slate-100"}`}
                  >
                    {name}
                  </button>
                ))}
              </div>
              <div className="overflow-auto p-4 md:max-h-[440px]">
                <h3 className="mb-3 text-xs font-bold uppercase text-slate-400">
                  Vị trí chuyên môn · {items.length} mục
                </h3>
                <div className="flex flex-wrap gap-2">
                  {items.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      title={`${r.en} · ${r.code} · ${r.source}`}
                      onClick={() => toggle(r.code)}
                      aria-pressed={pending.includes(r.code)}
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-2 text-left text-xs ${pending.includes(r.code) ? "border-emerald-700 bg-emerald-700 text-white" : "border-slate-200 bg-slate-50 hover:border-emerald-600"}`}
                    >
                      {pending.includes(r.code) && <Check size={12} />} {r.name}
                    </button>
                  ))}
                </div>
                {!items.length && (
                  <p className="text-sm text-slate-500">
                    Không tìm thấy nghề phù hợp.
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-slate-50 p-4">
              <p className="text-xs text-slate-500">
                {pending.length}/30 đã chọn · 436 nhóm ISCO-08 + 83 vị trí midCV
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setPending([])}
                  className="text-sm text-slate-600 underline"
                >
                  Bỏ chọn tất cả
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onChange(pending);
                    setOpen(false);
                  }}
                  className="rounded-xl bg-emerald-700 px-6 py-2 text-sm font-bold text-white"
                >
                  Áp dụng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
