import { apiRequest } from '@/lib/api';

export type CandidateApplicationDetail = {
  id: string;
  job: { id: string; title: string; companyName: string | null };
  appliedAt: string;
  status: string;
  coverLetter: string | null;
  aiConsent: boolean | null;
  consentAt: string | null;
  cv: {
    versionId: string | null;
    version: number | null;
    title: string;
    capturedAt: string | null;
    rawText: string;
    reviewedText: string;
    declaredSkills: string[];
    skillListAvailable: boolean;
  } | null;
  pinnedJd: {
    id: string;
    version: number;
    title: string;
    requirements: { skill: string; type: 'REQUIRED' | 'PREFERRED'; minimumYears: number }[];
  } | null;
  skillGapAvailable: boolean;
  matchScore: number | null;
  matchStatus: string | null;
};

export type CandidateApplicationHistory = {
  items: { from: string | null; to: string; at: string }[];
  hasNext: boolean;
  page: number;
};

export type CandidateSkillGap = {
  gap_breakdown: { skill_name: string; category: string }[];
  tailored_roadmap: {
    milestone_number: number;
    title: string;
    target_skills: string[];
    estimated_weeks: number;
    learning_objectives: string[];
    practice_project: string;
  }[];
};

async function fetchApplicationResource<T>(id: string, suffix = '') {
  const result = await apiRequest<{ data: T }>(
    `/api/v1/candidate/applications/${encodeURIComponent(id)}${suffix}`,
  );
  return result.data;
}

export const fetchCandidateApplicationDetail = (id: string) =>
  fetchApplicationResource<CandidateApplicationDetail>(id);

export const fetchCandidateApplicationHistory = (id: string, page: number) =>
  fetchApplicationResource<CandidateApplicationHistory>(id, `/history?page=${page}`);

export const fetchCandidateSkillGap = (id: string, locale: 'vi' | 'en') =>
  fetchApplicationResource<CandidateSkillGap>(id, `/skill-gap?locale=${locale}`);
