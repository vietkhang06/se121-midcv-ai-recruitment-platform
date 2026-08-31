export type Role = 'CANDIDATE' | 'RECRUITER' | 'ADMIN';

export type Industry = 'Technology' | 'Marketing' | 'Design' | 'Finance' | 'HR' | 'Healthcare' | 'Sales';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  age?: number;
  targetIndustry?: Industry;
}

export interface JobRequirement {
  id: string;
  skillName: string;
  requirementType: 'REQUIRED' | 'PREFERRED';
  minExperienceYears?: number;
}

export interface Job {
  id: string;
  title: string;
  companyName: string;
  companyVerified?: boolean;
  industry: Industry;
  location: string;
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'HYBRID' | 'REMOTE' | 'CONTRACT';
  seniority: 'JUNIOR' | 'MID' | 'SENIOR' | 'LEAD';
  salaryMin?: number;
  salaryMax?: number;
  salaryPublic?: boolean;
  description: string;
  responsibilities?: string[];
  benefits?: string[];
  publishedDate: string;
  requirements: JobRequirement[];
}

export interface CandidateProfile {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  age?: number;
  headline?: string;
  bio?: string;
  primaryIndustry: Industry;
  additionalIndustries?: Industry[];
  targetRoles?: string[];
  skills: string[];
  githubUrl?: string;
  portfolioUrl?: string;
  experienceYears?: number;
}

export interface CVSection {
  id?: string;
  sectionType: 'SUMMARY' | 'SKILLS' | 'EXPERIENCE' | 'EDUCATION' | 'PROJECTS' | 'CERTIFICATIONS' | 'LANGUAGES' | 'PORTFOLIO' | 'GITHUB_PROJECTS' | 'CAMPAIGNS' | 'ACCOUNTING_SOFTWARE';
  title: string;
  content: string;
}

export interface CVVersion {
  id: string;
  versionNumber: number;
  summaryText?: string;
  createdAt: string;
  sections: CVSection[];
}

export interface CV {
  id: string;
  title: string;
  targetIndustry: Industry;
  targetRole?: string;
  creationPath: 'UPLOAD' | 'BUILDER';
  isDefault: boolean;
  currentVersionNumber: number;
  updatedAt: string;
  versions: CVVersion[];
}

export interface Application {
  id: string;
  job: Job;
  appliedCvId: string;
  appliedCvTitle: string;
  appliedCvVersion: number;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'SHORTLISTED' | 'REJECTED';
  appliedDate: string;
}
