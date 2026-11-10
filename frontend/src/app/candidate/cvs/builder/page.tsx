"use client";

import {
  CVTemplateGallery,
  CV_TEMPLATES,
  CVTemplateId,
} from "@/components/cv/CVTemplateGallery";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Plus, Save, Trash2, Download } from "lucide-react";
import { CV, CVQuota, CreateCVRequest } from "@/types";
import {
  confirmCandidateCV,
  fetchCVDraft,
  fetchCandidateCVs,
  fetchCandidateProfile,
  fetchCVQuota,
  saveCandidateCV,
  updateCVDraft,
} from "@/lib/api";
import { SkillAutocomplete } from "@/components/common/SkillAutocomplete";
import { useLanguage } from "@/context/LanguageContext";

type Item = Record<string, string>;
type Draft = {
  fullName: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  github: string;
  linkedin: string;
  portfolio: string;
  skills: string[];
  experience: Item[];
  projects: Item[];
  education: Item[];
  certifications: Item[];
  languages: Item[];
};
const emptyDraft = (): Draft => ({
  fullName: "",
  headline: "",
  email: "",
  phone: "",
  location: "",
  summary: "",
  github: "",
  linkedin: "",
  portfolio: "",
  skills: [],
  experience: [],
  projects: [],
  education: [],
  certifications: [],
  languages: [],
});
const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white";
const labelClass =
  "mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200";

type DataRecord = Record<string, unknown>;

function asRecord(value: unknown): DataRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as DataRecord)
    : {};
}

function asText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  const record = asRecord(value);
  return typeof record.value === "string" ? record.value : "";
}

function readText(record: DataRecord, ...keys: string[]): string {
  for (const key of keys) {
    const value = asText(record[key]);
    if (value) return value;
  }
  return "";
}

function mapItems(value: unknown): Item[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => {
    if (typeof entry === "string") return { name: entry };
    return Object.fromEntries(
      Object.entries(asRecord(entry)).map(([key, itemValue]) => [
        key,
        asText(itemValue),
      ]),
    );
  });
}

function mapDraft(rawValue: unknown): Draft {
  const raw = asRecord(rawValue);
  const personal = asRecord(raw.personal_info);
  const links = asRecord(raw.links);
  const summary = raw.summary;
  const skills = Array.isArray(raw.skills)
    ? raw.skills
        .map((item) =>
          typeof item === "string"
            ? item
            : readText(asRecord(item), "name", "skill", "canonical_name"),
        )
        .filter(Boolean)
    : [];
  return {
    fullName: readText(personal, "full_name", "fullName", "name"),
    headline: readText(personal, "headline", "title"),
    email: readText(personal, "email"),
    phone: readText(personal, "phone"),
    location: readText(personal, "location", "address"),
    summary:
      typeof summary === "string"
        ? summary
        : readText(asRecord(summary), "text", "content", "value"),
    github:
      readText(links, "github_url", "githubUrl") ||
      readText(personal, "github_url", "githubUrl"),
    linkedin:
      readText(links, "linkedin_url", "linkedinUrl") ||
      readText(personal, "linkedin_url", "linkedinUrl"),
    portfolio:
      readText(links, "portfolio_url", "portfolioUrl") ||
      readText(personal, "portfolio_url", "portfolioUrl"),
    skills,
    experience: mapItems(raw.work_experience),
    projects: mapItems(raw.projects),
    education: mapItems(raw.education),
    certifications: mapItems(raw.certifications),
    languages: mapItems(raw.languages),
  };
}

export default function CVBuilderPage() {
  const { locale } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const requestedReturnTo = searchParams.get("returnTo");
  const returnTo =
    requestedReturnTo && /^\/jobs\/[^/?#]+$/.test(requestedReturnTo)
      ? requestedReturnTo
      : "/candidate/cvs";
  const vi = locale === "vi";
  const [title, setTitle] = useState(
    vi ? "Hồ sơ chuyên môn" : "Professional CV",
  );
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [cv, setCv] = useState<CV | null>(null);
  const [quota, setQuota] = useState<CVQuota | null>(null);
  const [quotaLoaded, setQuotaLoaded] = useState(false);
  const [template, setTemplate] = useState<CVTemplateId>("standard");
  const [galleryOpen, setGalleryOpen] = useState(!editId);
  const [photo, setPhoto] = useState("");
  const [font, setFont] = useState("Arial");
  const [fontSize, setFontSize] = useState(14);
  const [lineHeight, setLineHeight] = useState(1.6);
  const [accent, setAccent] = useState("#176b58");
  const [sectionOrder, setSectionOrder] = useState([
    "experience",
    "projects",
    "education",
    "certifications",
    "languages",
  ]);
  const [hiddenSections, setHiddenSections] = useState<string[]>([]);
  const [designPanel, setDesignPanel] = useState("Thiết kế & Font");
  const markDesignDirty = () => {
    editRevision.current += 1;
    setDirty(true);
  };
  const selectTemplate = (id: CVTemplateId) => {
    setTemplate(id);
    setAccent(CV_TEMPLATES.find((t) => t.id === id)!.color);
    setGalleryOpen(false);
    setSectionOrder(
      id === "starter"
        ? ["education", "projects", "experience", "certifications", "languages"]
        : [
            "experience",
            "projects",
            "education",
            "certifications",
            "languages",
          ],
    );
    markDesignDirty();
  };
  const uploadPhoto = (file?: File) => {
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setError("Chọn ảnh JPG/PNG/WebP tối đa 5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 360;
        canvas.height = 440;
        const context = canvas.getContext("2d");
        if (!context) return;
        const scale = Math.max(360 / image.width, 440 / image.height);
        context.drawImage(
          image,
          (360 - image.width * scale) / 2,
          (440 - image.height * scale) / 2,
          image.width * scale,
          image.height * scale,
        );
        setPhoto(canvas.toDataURL("image/jpeg", 0.85));
        markDesignDirty();
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const editRevision = useRef(0);
  const [editorWidth, setEditorWidth] = useState(50);
  const editorLayoutRef = useRef<HTMLDivElement>(null);
  const setEditorWidthFromPointer = (clientX: number) => {
    const bounds = editorLayoutRef.current?.getBoundingClientRect();
    if (!bounds || bounds.width <= 0) return;
    setEditorWidth(
      Math.max(
        35,
        Math.min(65, ((clientX - bounds.left) / bounds.width) * 100),
      ),
    );
  };

  const patchDraft = (key: keyof Draft, value: Draft[keyof Draft]) => {
    editRevision.current += 1;
    setDraft((current) => ({ ...current, [key]: value }));
    setDirty(true);
    setNotice("");
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        if (!editId) {
          const currentQuota = await fetchCVQuota();
          if (!active) return;
          setQuota(currentQuota);
          setQuotaLoaded(true);
          if (!currentQuota.canUpload) {
            setError(
              vi
                ? "Bạn đã đạt hạn mức tạo CV. Hãy xóa một CV cũ hoặc nâng cấp gói để tiếp tục."
                : "You have reached your CV creation limit. Delete an existing CV or upgrade your plan to continue.",
            );
            return;
          }
        } else {
          setQuotaLoaded(true);
        }
        if (editId) {
          const cvs = await fetchCandidateCVs();
          const selected = cvs.find((item) => item.id === editId);
          if (!selected)
            throw new Error(
              "CV not found or access is denied. / Không tìm thấy hồ sơ hoặc bạn không có quyền truy cập.",
            );
          const data = await fetchCVDraft(editId);
          if (!active) return;
          setCv(selected);
          setTitle(data.title || selected.title);
          setDraft(mapDraft(data));
          const presentation = asRecord(data.presentation);
          if (CV_TEMPLATES.some((t) => t.id === presentation.template))
            setTemplate(presentation.template as CVTemplateId);
          if (
            typeof presentation.photo === "string" &&
            /^data:image\/(jpeg|png|webp);base64,/.test(presentation.photo)
          )
            setPhoto(presentation.photo);
          if (
            ["Arial", "Georgia", "Times New Roman", "Verdana"].includes(
              String(presentation.font),
            )
          )
            setFont(String(presentation.font));
          if (typeof presentation.fontSize === "number")
            setFontSize(Math.max(11, Math.min(20, presentation.fontSize)));
          if (typeof presentation.lineHeight === "number")
            setLineHeight(Math.max(1.1, Math.min(2, presentation.lineHeight)));
          if (/^#[0-9a-f]{6}$/i.test(String(presentation.accent)))
            setAccent(String(presentation.accent));
          const sections = [
            "experience",
            "projects",
            "education",
            "certifications",
            "languages",
          ];
          if (
            Array.isArray(presentation.sectionOrder) &&
            presentation.sectionOrder.length === 5 &&
            new Set(presentation.sectionOrder).size === 5 &&
            presentation.sectionOrder.every((v) => sections.includes(String(v)))
          )
            setSectionOrder(presentation.sectionOrder as string[]);
          if (Array.isArray(presentation.hiddenSections))
            setHiddenSections(
              presentation.hiddenSections.filter((v) =>
                sections.includes(String(v)),
              ) as string[],
            );
        } else {
          const profile = await fetchCandidateProfile().catch(() => null);
          if (!active) return;
          setDraft((value) => ({
            ...value,
            fullName: profile?.fullName || "",
            email: profile?.email || "",
            phone: profile?.phone || "",
            headline: profile?.headline || "",
            location: profile?.location || "",
            summary: profile?.bio || "",
            github: profile?.githubUrl || "",
            portfolio: profile?.portfolioUrl || "",
            skills: profile?.skills || [],
          }));
        }
      } catch (error: unknown) {
        if (active) {
          setQuotaLoaded(true);
          setError(
            error instanceof Error
              ? error.message
              : "Could not load the CV. / Không tải được hồ sơ.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [editId, vi]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const saveDraft = async () => {
    const savedRevision = editRevision.current;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      if (draft.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email))
        throw new Error(
          vi ? "Email chưa đúng định dạng." : "Enter a valid email address.",
        );
      for (const [label, value] of [
        [vi ? "GitHub" : "GitHub", draft.github],
        ["LinkedIn", draft.linkedin],
        [vi ? "Trang cá nhân" : "Portfolio", draft.portfolio],
      ] as const) {
        if (value) {
          const url = new URL(value);
          if (!["http:", "https:"].includes(url.protocol))
            throw new Error(
              `${label}: ${vi ? "chỉ chấp nhận liên kết HTTP hoặc HTTPS." : "only HTTP or HTTPS links are supported."}`,
            );
        }
      }
      let target = cv;
      if (!target) {
        const currentQuota = await fetchCVQuota();
        setQuota(currentQuota);
        setQuotaLoaded(true);
        if (!currentQuota.canUpload)
          throw new Error(
            vi
              ? "Bạn đã đạt hạn mức tạo CV. Hãy xóa một CV cũ hoặc nâng cấp gói để tiếp tục."
              : "You have reached your CV creation limit. Delete an existing CV or upgrade your plan to continue.",
          );
        const createRequest: CreateCVRequest = {
          title,
          creationPath: "BUILDER",
          targetIndustry: "Technology",
          isDefault: true,
        };
        target = await saveCandidateCV(createRequest);
        setCv(target);
      }
      const payload = {
        title,
        presentation: {
          template,
          photo,
          font,
          fontSize,
          lineHeight,
          accent,
          sectionOrder,
          hiddenSections,
        },
        personal_info: {
          full_name: draft.fullName,
          headline: draft.headline,
          email: draft.email,
          phone: draft.phone,
          location: draft.location,
        },
        summary: { text: draft.summary },
        skills: draft.skills.map((name) => ({ name })),
        work_experience: draft.experience,
        projects: draft.projects,
        education: draft.education,
        certifications: draft.certifications,
        languages: draft.languages,
        links: {
          github_url: draft.github,
          linkedin_url: draft.linkedin,
          portfolio_url: draft.portfolio,
        },
      };
      await updateCVDraft(target.id, payload);
      if (editRevision.current === savedRevision) {
        setDirty(false);
        setNotice(vi ? "Bản nháp đã được lưu." : "Draft saved.");
      } else {
        setNotice(
          vi
            ? "Đã lưu bản nháp trước đó; thay đổi mới vẫn chưa lưu."
            : "The earlier draft was saved; newer edits are still unsaved.",
        );
      }
    } catch (error: unknown) {
      setError(
        error instanceof Error
          ? error.message
          : vi
            ? "Không lưu được. Các chỉnh sửa vẫn còn trên trang."
            : "Save failed. Your edits are still on this page.",
      );
    } finally {
      setSaving(false);
    }
  };

  const confirmDraft = async () => {
    if (!cv || dirty || !draft.fullName.trim()) {
      setError(
        vi
          ? "Hãy lưu bản nháp và nhập họ tên trước khi xác nhận."
          : "Save the draft and enter a name before confirming.",
      );
      return;
    }
    setConfirming(true);
    setError("");
    try {
      await confirmCandidateCV(cv.id);
      router.push(returnTo);
    } catch (error: unknown) {
      setError(
        error instanceof Error
          ? error.message
          : vi
            ? "Không thể xác nhận hồ sơ."
            : "Could not confirm the CV.",
      );
      setConfirming(false);
    }
  };

  const changeItem = (
    section:
      | "experience"
      | "projects"
      | "education"
      | "certifications"
      | "languages",
    index: number,
    key: string,
    value: string,
  ) => {
    const items = [...draft[section]];
    items[index] = { ...items[index], [key]: value };
    patchDraft(section, items);
  };
  const addItem = (
    section:
      | "experience"
      | "projects"
      | "education"
      | "certifications"
      | "languages",
  ) => patchDraft(section, [...draft[section], {}]);
  const removeItem = (
    section:
      | "experience"
      | "projects"
      | "education"
      | "certifications"
      | "languages",
    index: number,
  ) =>
    patchDraft(
      section,
      draft[section].filter((_, i) => i !== index),
    );
  const sectionLabels = {
    experience: vi ? "Kinh nghiệm" : "Experience",
    projects: vi ? "Dự án" : "Projects",
    education: vi ? "Học vấn" : "Education",
    certifications: vi ? "Chứng chỉ" : "Certifications",
    languages: vi ? "Ngôn ngữ" : "Languages",
  };
  const fields: Record<keyof typeof sectionLabels, [string, string][]> = {
    experience: [
      ["company", vi ? "Công ty" : "Company"],
      ["title", vi ? "Chức danh" : "Job title"],
      ["dates", vi ? "Thời gian" : "Dates"],
      ["description", vi ? "Mô tả và kết quả" : "Description and outcomes"],
    ],
    projects: [
      ["name", vi ? "Tên dự án" : "Project name"],
      ["role", vi ? "Vai trò" : "Role"],
      ["dates", vi ? "Thời gian" : "Dates"],
      ["description", vi ? "Mô tả" : "Description"],
      ["technologies", vi ? "Công nghệ" : "Technologies"],
    ],
    education: [
      ["school", vi ? "Trường" : "School"],
      ["degree", vi ? "Bằng cấp" : "Degree"],
      ["field", vi ? "Chuyên ngành" : "Field of study"],
      ["dates", vi ? "Thời gian" : "Dates"],
    ],
    certifications: [
      ["name", vi ? "Tên chứng chỉ" : "Certification"],
      ["issuer", vi ? "Đơn vị cấp" : "Issuer"],
      ["date", vi ? "Ngày cấp" : "Date"],
    ],
    languages: [
      ["language", vi ? "Ngôn ngữ" : "Language"],
      ["proficiency", vi ? "Trình độ" : "Proficiency"],
    ],
  };
  const field = (
    key: keyof Draft,
    label: string,
    multiline = false,
    type = "text",
  ) => (
    <label className="block" key={key}>
      <span className={labelClass}>{label}</span>
      {multiline ? (
        <textarea
          className={inputClass}
          rows={4}
          value={draft[key] as string}
          onChange={(e) => patchDraft(key, e.target.value as never)}
        />
      ) : (
        <input
          className={inputClass}
          type={type}
          value={draft[key] as string}
          onChange={(e) => patchDraft(key, e.target.value as never)}
        />
      )}
    </label>
  );

  if (galleryOpen && !editId)
    return <CVTemplateGallery onSelect={selectTemplate} />;

  if (loading)
    return (
      <main
        aria-busy="true"
        className="flex min-h-[60vh] items-center justify-center p-8"
      >
        <p role="status">Đang tải hồ sơ và thiết kế CV…</p>
      </main>
    );
  if (editId && error && !cv)
    return (
      <main className="mx-auto max-w-xl space-y-4 p-8">
        <p role="alert" className="text-rose-700">
          {error}
        </p>
        <Link href="/candidate/cvs" className="text-emerald-700 underline">
          Về thư viện CV
        </Link>
      </main>
    );

  if (!editId && quotaLoaded && quota?.canUpload !== true)
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-950 shadow-sm dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          <h1 className="text-lg font-semibold">
            {quota
              ? vi
                ? "Đã đạt hạn mức tạo CV"
                : "CV creation limit reached"
              : vi
                ? "Không kiểm tra được hạn mức CV"
                : "Could not check CV quota"}
          </h1>
          <p className="mt-2 text-sm">
            {quota
              ? vi
                ? "Bạn có thể tiếp tục khi còn hạn mức, hoặc xóa một CV hiện có để giải phóng lượt tạo."
                : "You can create a CV when you have an available slot, or delete an existing CV to free one."
              : vi
                ? "Vui lòng quay lại thư viện CV và thử lại sau."
                : "Return to your CV library and try again later."}
          </p>
        </div>
        <Link
          href="/candidate/cvs"
          className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          {vi ? "Về thư viện CV" : "Back to CV library"}
        </Link>
      </main>
    );

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header
        data-retro-editor-toolbar="true"
        className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95"
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              aria-label={vi ? "Quay lại danh sách hồ sơ" : "Back to CV list"}
              onClick={(event) => {
                if (
                  dirty &&
                  !window.confirm(
                    vi
                      ? "Bạn có thay đổi chưa lưu. Rời trang?"
                      : "You have unsaved edits. Leave this page?",
                  )
                )
                  event.preventDefault();
              }}
              href="/candidate/cvs"
              className="rounded-xl p-2 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600"
            >
              <ArrowLeft size={18} />
            </Link>
            <label className="flex items-center gap-2 text-sm">
              <span className="hidden sm:inline">
                {vi ? "Tiêu đề hồ sơ" : "CV title"}
              </span>
              <input
                aria-label={vi ? "Tiêu đề hồ sơ" : "CV title"}
                className={`${inputClass} w-44 sm:w-64`}
                value={title}
                onChange={(e) => {
                  editRevision.current += 1;
                  setTitle(e.target.value);
                  setDirty(true);
                }}
              />
            </label>
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="cv-template">
              {vi ? "Mẫu CV" : "CV template"}
            </label>
            <select
              id="cv-template"
              value={template}
              onChange={(e) => selectTemplate(e.target.value as CVTemplateId)}
              className={`${inputClass} w-auto`}
            >
              {CV_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-600"
            >
              <Download size={16} />
              <span className="hidden sm:inline">PDF</span>
            </button>
            {cv && (
              <button
                type="button"
                onClick={confirmDraft}
                disabled={confirming || dirty || !draft.fullName.trim()}
                className="rounded-xl border border-emerald-700 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50 dark:text-emerald-300"
              >
                {confirming
                  ? vi
                    ? "Đang xác nhận…"
                    : "Confirming…"
                  : vi
                    ? "Xác nhận hồ sơ"
                    : "Confirm CV"}
              </button>
            )}
            <button
              type="button"
              onClick={saveDraft}
              disabled={
                saving ||
                loading ||
                !title.trim() ||
                (!editId && quotaLoaded && quota?.canUpload === false)
              }
              className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save size={15} />
              {saving ? (vi ? "Đang lưu…" : "Saving…") : vi ? "Lưu" : "Save"}
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-[1600px] px-4 py-4">
        <section className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <nav
            aria-label="Công cụ thiết kế CV"
            className="flex flex-wrap gap-1 border-b border-slate-200 p-2"
          >
            {[
              "Thiết kế & Font",
              "Thêm mục",
              "Bố cục",
              "Đổi mẫu CV",
              "Gợi ý viết CV",
            ].map((tab) => (
              <button
                type="button"
                key={tab}
                onClick={() => setDesignPanel(tab)}
                aria-pressed={designPanel === tab}
                className={`rounded-xl px-4 py-2 text-sm ${designPanel === tab ? "bg-emerald-100 font-semibold text-emerald-900" : "hover:bg-slate-100"}`}
              >
                {tab}
              </button>
            ))}
          </nav>
          <div className="p-4">
            {designPanel === "Thiết kế & Font" && (
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <label>
                  Font{" "}
                  <select
                    aria-label="Font CV"
                    value={font}
                    onChange={(e) => {
                      setFont(e.target.value);
                      markDesignDirty();
                    }}
                    className="rounded border p-2"
                  >
                    {["Arial", "Georgia", "Times New Roman", "Verdana"].map(
                      (f) => (
                        <option key={f}>{f}</option>
                      ),
                    )}
                  </select>
                </label>
                <label>
                  Cỡ chữ{" "}
                  <input
                    type="range"
                    min="11"
                    max="20"
                    value={fontSize}
                    onChange={(e) => {
                      setFontSize(Number(e.target.value));
                      markDesignDirty();
                    }}
                  />{" "}
                  {fontSize}px
                </label>
                <label>
                  Giãn dòng{" "}
                  <input
                    type="range"
                    min="1.1"
                    max="2"
                    step=".1"
                    value={lineHeight}
                    onChange={(e) => {
                      setLineHeight(Number(e.target.value));
                      markDesignDirty();
                    }}
                  />{" "}
                  {lineHeight.toFixed(1)}
                </label>
                <label>
                  Màu chủ đạo{" "}
                  <input
                    aria-label="Màu CV"
                    type="color"
                    value={accent}
                    onChange={(e) => {
                      setAccent(e.target.value);
                      markDesignDirty();
                    }}
                    className="ml-2 align-middle"
                  />
                </label>
              </div>
            )}
            {["Thêm mục", "Bố cục"].includes(designPanel) && (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {sectionOrder.map((section, index) => (
                  <div
                    key={section}
                    className="flex items-center gap-2 rounded-xl border p-2 text-sm"
                  >
                    <label className="flex flex-1 items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!hiddenSections.includes(section)}
                        onChange={(e) => {
                          setHiddenSections(
                            e.target.checked
                              ? hiddenSections.filter((s) => s !== section)
                              : [...hiddenSections, section],
                          );
                          markDesignDirty();
                        }}
                      />
                      {sectionLabels[section as keyof typeof sectionLabels]}
                    </label>
                    {[
                      ["↑", -1],
                      ["↓", 1],
                    ].map(([label, delta]) => (
                      <button
                        key={label}
                        type="button"
                        aria-label={`${label} ${section}`}
                        disabled={
                          index + Number(delta) < 0 ||
                          index + Number(delta) >= sectionOrder.length
                        }
                        onClick={() => {
                          const order = [...sectionOrder];
                          [order[index], order[index + Number(delta)]] = [
                            order[index + Number(delta)],
                            order[index],
                          ];
                          setSectionOrder(order);
                          markDesignDirty();
                        }}
                        className="rounded border px-2 disabled:opacity-30"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
            {designPanel === "Đổi mẫu CV" && (
              <div className="flex flex-wrap gap-2">
                {CV_TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => selectTemplate(t.id)}
                    className={`rounded-xl border px-4 py-3 text-sm ${template === t.id ? "border-emerald-600 bg-emerald-50 text-emerald-900" : ""}`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            )}
            {designPanel === "Gợi ý viết CV" && (
              <p className="max-w-3xl text-sm leading-6">
                Viết mục tiêu gắn với vị trí ứng tuyển. Với mỗi kinh nghiệm hoặc
                dự án, nêu rõ vai trò, công việc và kết quả có minh chứng. Đưa
                thông tin gần nhất lên trước; chỉ ghi kỹ năng bạn thực sự có.
                Lưu và kiểm tra hồ sơ trước khi xác nhận.
              </p>
            )}
          </div>
        </section>
        <label className="mb-3 hidden items-center gap-3 text-xs text-slate-600 dark:text-slate-300 lg:flex">
          {vi ? "Độ rộng khung chỉnh sửa" : "Editor width"}
          <input
            aria-label={vi ? "Độ rộng khung chỉnh sửa" : "Editor width"}
            type="range"
            min="35"
            max="65"
            value={editorWidth}
            onChange={(e) => setEditorWidth(Number(e.target.value))}
            className="w-48"
          />
          <span>{editorWidth}%</span>
        </label>
        <div
          ref={editorLayoutRef}
          id="cv-editor-layout"
          className="grid min-w-0 grid-cols-1 gap-6 lg:gap-3"
          style={{
            gridTemplateColumns: `minmax(0, ${editorWidth}fr) 10px minmax(0, ${100 - editorWidth}fr)`,
          }}
        >
          <section
            className="space-y-6"
            aria-label={vi ? "Chỉnh sửa hồ sơ" : "CV editor"}
          >
            {loading && (
              <p
                role="status"
                className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800"
              >
                {vi ? "Đang tải bản nháp…" : "Loading draft…"}
              </p>
            )}
            {error && (
              <p
                role="alert"
                className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-950/40 dark:text-rose-200"
              >
                {error}
              </p>
            )}
            {notice && (
              <p
                role="status"
                className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
              >
                {notice}
              </p>
            )}
            {dirty && !saving && (
              <p
                role="status"
                className="text-xs font-medium text-amber-700 dark:text-amber-300"
              >
                {vi ? "Có thay đổi chưa lưu." : "Unsaved changes."}
              </p>
            )}
            <section className="rounded-xl border border-slate-200 bg-white p-5 dark:bg-slate-900">
              <h2 className="mb-3 font-semibold">Ảnh cá nhân trên CV</h2>
              <div className="flex flex-wrap items-center gap-5">
                <label className="flex h-32 w-28 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-emerald-500 bg-emerald-50 text-center text-xs text-emerald-900">
                  {photo ? (
                    <img
                      src={photo}
                      alt="Ảnh cá nhân"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>
                      + Tải ảnh cá nhân
                      <br />
                      JPG / PNG / WebP
                    </span>
                  )}
                  <input
                    aria-label="Tải ảnh cá nhân"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={(e) => uploadPhoto(e.target.files?.[0])}
                  />
                </label>
                <div className="space-y-2 text-xs">
                  <p>
                    Ảnh tối đa 5 MB, tự cắt giữa khung. Ảnh được lưu cùng phiên
                    bản CV.
                  </p>
                  <p className="text-slate-500">
                    Ảnh cá nhân không tham gia tính điểm đối sánh.
                  </p>
                  {photo && (
                    <button
                      type="button"
                      onClick={() => {
                        setPhoto("");
                        markDesignDirty();
                      }}
                      className="rounded border px-3 py-2 text-rose-700"
                    >
                      Xóa ảnh
                    </button>
                  )}
                </div>
              </div>
            </section>
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h1 className="mb-4 text-lg font-semibold">
                {vi ? "Thông tin cá nhân" : "Personal information"}
              </h1>
              <div className="grid gap-4 sm:grid-cols-2">
                {field("fullName", vi ? "Họ và tên" : "Full name")}
                {field("headline", vi ? "Chức danh / tiêu đề" : "Headline")}
                {field("email", "Email", false, "email")}
                {field("phone", vi ? "Số điện thoại" : "Phone", false, "tel")}
                {field("location", vi ? "Địa điểm" : "Location")}
                {field("github", "GitHub URL", false, "url")}
                {field("linkedin", "LinkedIn URL", false, "url")}
                {field(
                  "portfolio",
                  vi ? "Trang cá nhân" : "Portfolio URL",
                  false,
                  "url",
                )}
              </div>
              <div className="mt-4">
                {field(
                  "summary",
                  vi ? "Tóm tắt nghề nghiệp" : "Professional summary",
                  true,
                )}
              </div>
            </section>
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="mb-3 text-lg font-semibold">
                {vi ? "Kỹ năng" : "Skills"}
              </h2>
              <SkillAutocomplete
                skills={draft.skills}
                onSkillsChange={(value) => patchDraft("skills", value)}
                placeholder={
                  vi ? "Tìm và thêm kỹ năng…" : "Find and add skills…"
                }
              />
            </section>
            {(
              sectionOrder.filter((s) => !hiddenSections.includes(s)) as Array<
                keyof typeof sectionLabels
              >
            ).map((section) => (
              <section
                key={section}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">
                    {sectionLabels[section]}
                  </h2>
                  <button
                    type="button"
                    onClick={() => addItem(section)}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-600"
                  >
                    <Plus size={16} />
                    {vi ? "Thêm mục" : "Add item"}
                  </button>
                </div>
                {draft[section].length === 0 && (
                  <p className="text-sm text-slate-500">
                    {vi
                      ? "Chưa có mục nào. Bạn có thể để trống hoặc thêm mục."
                      : "No entries yet. You can leave this section empty or add an item."}
                  </p>
                )}
                <div className="space-y-4">
                  {draft[section].map((item, index) => (
                    <div
                      key={index}
                      className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"
                    >
                      <div className="mb-3 flex justify-end">
                        <button
                          type="button"
                          aria-label={`${vi ? "Xóa" : "Remove"} ${sectionLabels[section]} ${index + 1}`}
                          onClick={() => removeItem(section, index)}
                          className="rounded-xl p-2 text-rose-700 hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-rose-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {fields[section].map(([key, label]) => (
                          <label
                            className={`block ${key === "description" || key === "technologies" ? "sm:col-span-2" : ""}`}
                            key={key}
                          >
                            <span className={labelClass}>{label}</span>
                            {key === "description" ? (
                              <textarea
                                className={inputClass}
                                rows={3}
                                value={item[key] || ""}
                                onChange={(e) =>
                                  changeItem(
                                    section,
                                    index,
                                    key,
                                    e.target.value,
                                  )
                                }
                              />
                            ) : (
                              <input
                                className={inputClass}
                                value={item[key] || ""}
                                onChange={(e) =>
                                  changeItem(
                                    section,
                                    index,
                                    key,
                                    e.target.value,
                                  )
                                }
                              />
                            )}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </section>
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label={
              vi
                ? "Kéo để đổi độ rộng khung chỉnh sửa và xem trước"
                : "Drag to resize the editor and preview panes"
            }
            aria-valuemin={35}
            aria-valuemax={65}
            aria-valuenow={Math.round(editorWidth)}
            tabIndex={0}
            className="hidden touch-none cursor-col-resize select-none items-center justify-center rounded-xl outline-none hover:bg-blue-200 focus-visible:bg-blue-200 focus-visible:ring-2 focus-visible:ring-blue-600 lg:flex"
            onPointerDown={(event) => {
              event.preventDefault();
              event.currentTarget.setPointerCapture(event.pointerId);
              setEditorWidthFromPointer(event.clientX);
            }}
            onPointerMove={(event) => {
              if (event.buttons === 1) setEditorWidthFromPointer(event.clientX);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                event.preventDefault();
                setEditorWidth((width) =>
                  Math.max(
                    35,
                    Math.min(65, width + (event.key === "ArrowRight" ? 2 : -2)),
                  ),
                );
              }
              if (event.key === "Home") {
                event.preventDefault();
                setEditorWidth(35);
              }
              if (event.key === "End") {
                event.preventDefault();
                setEditorWidth(65);
              }
            }}
          >
            <span
              aria-hidden="true"
              className="h-10 w-1 rounded-xl bg-slate-300"
            />
          </div>{" "}
          <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
            <p className="mb-2 text-sm text-slate-600 dark:text-slate-400">
              {vi ? "Bản xem trước" : "Preview"}
            </p>
            <article
              id="printable-cv"
              style={{
                fontFamily: font,
                fontSize,
                lineHeight,
                borderTop: `6px solid ${accent}`,
                color: "#172b3a",
              }}
              className={`min-h-[700px] rounded-xl border border-slate-200 bg-white p-8 shadow-lg dark:border-slate-800 dark:bg-white dark:text-slate-900 cv-template-${template}`}
            >
              <header
                className={`border-b border-slate-200 pb-5 ${template === "creative" ? "text-center" : ""}`}
              >
                <div
                  className={`mb-4 flex ${template === "creative" ? "justify-center" : ""}`}
                >
                  <div
                    className={`flex h-32 w-28 shrink-0 items-center justify-center overflow-hidden border-2 border-dashed bg-slate-50 text-xs text-slate-400 ${template === "creative" ? "rounded-full" : "rounded-xl"}`}
                    style={{ borderColor: accent }}
                  >
                    {photo ? (
                      <img
                        alt="Ảnh cá nhân trên CV"
                        src={photo}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      "Ảnh cá nhân"
                    )}
                  </div>
                </div>
                <h2 className="break-words text-3xl font-bold">
                  {draft.fullName || (vi ? "Họ và tên" : "Full name")}
                </h2>
                {draft.headline && (
                  <p className="mt-1 text-lg text-slate-700">
                    {draft.headline}
                  </p>
                )}
                <p className="mt-2 break-words text-sm text-slate-600">
                  {[draft.email, draft.phone, draft.location]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <p className="mt-1 break-all text-xs text-blue-800">
                  {[draft.github, draft.linkedin, draft.portfolio]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </header>
              {draft.summary && (
                <section className="mt-5">
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-600">
                    {vi ? "Tóm tắt" : "Summary"}
                  </h3>
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                    {draft.summary}
                  </p>
                </section>
              )}
              {draft.skills.length > 0 && (
                <section className="mt-5">
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-600">
                    {vi ? "Kỹ năng" : "Skills"}
                  </h3>
                  <p className="break-words text-sm">
                    {draft.skills.join(" · ")}
                  </p>
                </section>
              )}
              {(
                sectionOrder.filter(
                  (s) => !hiddenSections.includes(s),
                ) as Array<keyof typeof sectionLabels>
              ).map(
                (section) =>
                  draft[section].length > 0 && (
                    <section key={section} className="mt-5">
                      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-600">
                        {sectionLabels[section]}
                      </h3>
                      <div className="space-y-3">
                        {draft[section].map((item, i) => (
                          <div key={i} className="break-words">
                            <p className="font-semibold">
                              {item.company ||
                                item.name ||
                                item.school ||
                                item.language ||
                                item.title ||
                                item.degree ||
                                item.certification}
                            </p>
                            <p className="text-sm text-slate-700">
                              {[
                                item.title,
                                item.role,
                                item.degree,
                                item.field,
                                item.issuer,
                                item.proficiency,
                                item.dates,
                                item.date,
                                item.technologies,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                            {item.description && (
                              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
                                {item.description}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>
                  ),
              )}
            </article>
          </aside>
        </div>
      </div>
      <style jsx global>{`
        #printable-cv {
          border-radius: 2px;
        }
        #printable-cv p {
          font-size: inherit;
          line-height: inherit;
        }
        #printable-cv h3 {
          color: ${accent};
          border-bottom: 1px solid ${accent}40;
          padding-bottom: 5px;
        }
        #printable-cv.cv-template-impact {
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 0 24px;
        }
        #printable-cv.cv-template-impact > header {
          grid-row: span 12;
          border-right: 1px solid #e2e8f0;
          padding-right: 18px;
        }
        #printable-cv.cv-template-impact h2 {
          font-size: 22px;
        }
        #printable-cv.cv-template-creative h2 {
          color: ${accent};
        }
        @media (max-width: 1023px) {
          #cv-editor-layout {
            grid-template-columns: minmax(0, 1fr) !important;
          }
        }
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-cv,
          #printable-cv * {
            visibility: visible;
          }
          #printable-cv {
            position: absolute;
            inset: 0;
            width: 100%;
            border: 0;
            box-shadow: none;
          }
          @page {
            size: A4;
            margin: 16mm;
          }
        }
      `}</style>
    </main>
  );
}
