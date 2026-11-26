export type CVBuilderItem = Record<string, unknown>;

export type CVBuilderDraft = {
  fullName: string; headline: string; email: string; phone: string; location: string;
  summary: string; github: string; linkedin: string; portfolio: string; skills: string[];
  experience: CVBuilderItem[]; projects: CVBuilderItem[]; education: CVBuilderItem[];
  certifications: CVBuilderItem[]; languages: CVBuilderItem[];
};

type DataRecord = Record<string, unknown>;

export function asRecord(value: unknown): DataRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as DataRecord : {};
}

export function asText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  const record = asRecord(value);
  return typeof record.value === 'string' ? record.value : '';
}

function readText(record: DataRecord, ...keys: string[]): string {
  for (const key of keys) {
    const value = asText(record[key]);
    if (value) return value;
  }
  return '';
}

function mapItems(value: unknown): CVBuilderItem[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => typeof entry === 'string' ? { name: entry } : { ...asRecord(entry) });
}

export function emptyCVBuilderDraft(): CVBuilderDraft {
  return { fullName: '', headline: '', email: '', phone: '', location: '', summary: '', github: '', linkedin: '', portfolio: '', skills: [], experience: [], projects: [], education: [], certifications: [], languages: [] };
}

export function mapCVBuilderDraft(rawValue: unknown): CVBuilderDraft {
  const raw = asRecord(rawValue);
  const personal = asRecord(raw.personal_info);
  const links = asRecord(raw.links);
  const summary = raw.summary;
  const skills = Array.isArray(raw.skills)
    ? raw.skills.map((item) => typeof item === 'string' ? item : readText(asRecord(item), 'name', 'skill', 'canonical_name')).filter(Boolean)
    : [];
  return {
    fullName: readText(personal, 'full_name', 'fullName', 'name'),
    headline: readText(personal, 'headline', 'title'),
    email: readText(personal, 'email'),
    phone: readText(personal, 'phone'),
    location: readText(personal, 'location', 'address'),
    summary: typeof summary === 'string' ? summary : readText(asRecord(summary), 'text', 'content', 'value'),
    github: readText(links, 'github_url', 'githubUrl') || readText(personal, 'github_url', 'githubUrl'),
    linkedin: readText(links, 'linkedin_url', 'linkedinUrl') || readText(personal, 'linkedin_url', 'linkedinUrl'),
    portfolio: readText(links, 'portfolio_url', 'portfolioUrl') || readText(personal, 'portfolio_url', 'portfolioUrl'),
    skills,
    experience: mapItems(raw.work_experience), projects: mapItems(raw.projects), education: mapItems(raw.education),
    certifications: mapItems(raw.certifications), languages: mapItems(raw.languages)
  };
}

export function readCVBuilderTemplate(rawValue: unknown): 'simple' | 'editorial' {
  return asRecord(rawValue).presentation && asRecord(asRecord(rawValue).presentation).template === 'editorial' ? 'editorial' : 'simple';
}

export function buildCVBuilderPayload(draft: CVBuilderDraft, title: string, template: 'simple' | 'editorial') {
  return {
    title,
    personal_info: { full_name: draft.fullName, headline: draft.headline, email: draft.email, phone: draft.phone, location: draft.location },
    summary: { content: draft.summary },
    skills: draft.skills.map((name) => ({ name })),
    work_experience: draft.experience,
    projects: draft.projects,
    education: draft.education,
    certifications: draft.certifications,
    languages: draft.languages,
    links: { github_url: draft.github, linkedin_url: draft.linkedin, portfolio_url: draft.portfolio },
    structured_json: { presentation: { template } }
  };
}
