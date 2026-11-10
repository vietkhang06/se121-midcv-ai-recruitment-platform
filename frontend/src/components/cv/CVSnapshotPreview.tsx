"use client";
import { CSSProperties } from "react";
const record = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
const text = (v: unknown): string =>
  typeof v === "string" || typeof v === "number"
    ? String(v)
    : typeof record(v).value === "string"
      ? String(record(v).value)
      : "";
export function CVSnapshotPreview({
  json,
  fallback,
}: {
  json?: string;
  fallback?: string;
}) {
  let profile: Record<string, unknown> = {};
  try {
    profile = record(JSON.parse(json || "{}"));
  } catch {
    /* Older applications retain their immutable raw snapshot. */
  }
  if (!Object.keys(profile).length)
    return (
      <p className="whitespace-pre-wrap text-sm leading-7">
        {fallback || "Chưa có nội dung CV."}
      </p>
    );
  const personal = record(profile.personal_info);
  const design = record(profile.presentation);
  const accent = /^#[0-9a-f]{6}$/i.test(String(design.accent))
    ? String(design.accent)
    : "#176b58";
  const photo =
    typeof design.photo === "string" &&
    /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(design.photo)
      ? design.photo
      : "";
  const defaults = [
    "work_experience",
    "projects",
    "education",
    "certifications",
    "languages",
  ];
  const mapped: Record<string, string> = {
    experience: "work_experience",
    projects: "projects",
    education: "education",
    certifications: "certifications",
    languages: "languages",
  };
  const labels: Record<string, string> = {
    work_experience: "Kinh nghiệm làm việc",
    projects: "Dự án",
    education: "Học vấn",
    certifications: "Chứng chỉ",
    languages: "Ngôn ngữ",
  };
  const order = Array.isArray(design.sectionOrder)
    ? design.sectionOrder.map((s) => mapped[String(s)]).filter(Boolean)
    : defaults;
  const hidden = Array.isArray(design.hiddenSections)
    ? design.hiddenSections.map((s) => mapped[String(s)])
    : [];
  const style: CSSProperties = {
    fontFamily: ["Arial", "Georgia", "Times New Roman", "Verdana"].includes(
      String(design.font),
    )
      ? String(design.font)
      : "Arial",
    fontSize: Math.max(11, Math.min(20, Number(design.fontSize) || 14)),
    lineHeight: Math.max(1.1, Math.min(2, Number(design.lineHeight) || 1.6)),
  };
  const heading = (label: string) => (
    <h3
      className="mb-3 border-b pb-1 text-sm font-bold uppercase tracking-wide"
      style={{ color: accent, borderColor: accent + "40" }}
    >
      {label}
    </h3>
  );
  return (
    <div style={style} className="space-y-6 text-slate-900">
      <header
        className="flex flex-wrap items-start gap-5 border-b pb-5"
        style={{ borderColor: accent }}
      >
        {photo && (
          <img
            src={photo}
            alt="Ảnh cá nhân trên CV"
            className={`h-28 w-24 shrink-0 object-cover ${design.template === "creative" ? "rounded-full" : "rounded-lg"}`}
          />
        )}
        <div className="min-w-0 flex-1">
          <h2
            className="break-words text-2xl font-bold"
            style={{ color: accent }}
          >
            {text(personal.full_name)}
          </h2>
          <p className="mt-1 font-semibold">{text(personal.headline)}</p>
          <p className="mt-2 break-words text-xs">
            {[personal.email, personal.phone, personal.location]
              .map(text)
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </header>
      {(text(record(profile.summary).text) ||
        text(record(profile.summary).content) ||
        text(profile.summary)) && (
        <section>
          {heading("Mục tiêu nghề nghiệp")}
          <p className="whitespace-pre-wrap">
            {text(record(profile.summary).text) ||
              text(record(profile.summary).content) ||
              text(profile.summary)}
          </p>
        </section>
      )}
      {Array.isArray(profile.skills) && profile.skills.length > 0 && (
        <section>
          {heading("Kỹ năng")}
          <p>
            {profile.skills
              .map((v) => (typeof v === "string" ? v : text(record(v).name)))
              .filter(Boolean)
              .join(" · ")}
          </p>
        </section>
      )}
      {order
        .filter((key) => !hidden.includes(key))
        .map(
          (key) =>
            Array.isArray(profile[key]) &&
            (profile[key] as unknown[]).length > 0 && (
              <section key={key}>
                {heading(labels[key] || key)}
                <div className="space-y-4">
                  {(profile[key] as unknown[]).map((value, index) => {
                    const row = record(value);
                    return (
                      <article key={index}>
                        <h4 className="font-semibold">
                          {text(row.company) ||
                            text(row.name) ||
                            text(row.school) ||
                            text(row.institution) ||
                            text(row.language)}
                        </h4>
                        <p className="text-xs text-slate-600">
                          {[
                            "title",
                            "position",
                            "role",
                            "degree",
                            "field",
                            "field_of_study",
                            "issuer",
                            "proficiency",
                            "dates",
                            "start_date",
                            "end_date",
                            "date",
                          ]
                            .map((k) => text(row[k]))
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                        {text(row.description) && (
                          <p className="mt-2 whitespace-pre-wrap">
                            {text(row.description)}
                          </p>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>
            ),
        )}
    </div>
  );
}
