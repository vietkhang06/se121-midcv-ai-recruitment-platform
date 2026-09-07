export type UserRole = 'CANDIDATE' | 'RECRUITER' | 'ADMIN';

export type Industry = 'Technology' | 'Marketing' | 'Design' | 'Finance' | 'HR' | 'Sales';

export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'REMOTE' | 'HYBRID';

export type RequirementType = 'REQUIRED' | 'PREFERRED';

export type CompanyVerificationState = 'PENDING' | 'VERIFIED' | 'REJECTED';

export type GitHubActivitySignal = 'HIGH' | 'MODERATE' | 'LOW' | 'LIMITED_OBSERVABLE_ACTIVITY';

export type RequirementMatchStatus = 'MATCH' | 'PARTIAL' | 'MISSING';

export type EmailCheckStatus = 'UNKNOWN' | 'CHECKING' | 'AVAILABLE' | 'ALREADY_EXISTS' | 'INVALID';

export type AuthState = 'INITIALIZING' | 'ANONYMOUS' | 'AUTHENTICATED';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  age?: number;
  targetIndustry?: Industry;
  emailVerified?: boolean;
}

export interface Company {
  id: string;
  name: string;
  industry: Industry;
  website: string;
  companySize: string;
  contactEmail: string;
  contactPhone?: string;
  verificationStatus: CompanyVerificationState;
  verificationReason?: string;
}

export interface RecruiterProfile {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone?: string;
  company: Company;
}

export interface JobRequirement {
  id: string;
  skillName: string;
  requirementType: RequirementType;
  minExperienceYears?: number;
  minYearsExperience?: number;
  weight?: number;
  description?: string;
}

export interface Job {
  id: string;
  title: string;
  companyName: string;
  companyVerified: boolean;
  industry: Industry;
  employmentType: EmploymentType;
  seniority: string;
  location: string;
  salaryMin: number;
  salaryMax: number;
  salaryRange?: string;
  department?: string;
  publishedDate: string;
  description: string;
  responsibilities?: string[];
  requirements: JobRequirement[];
  benefits?: string[];
  applicationQuestions?: string[];
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED';
}

export interface CVSection {
  id?: string;
  sectionType: string;
  title: string;
  content: string;
}

export interface CVVersion {
  id: string;
  versionNumber: number;
  summaryText?: string;
  title?: string;
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
  rawText?: string;
  updatedAt: string;
  versions: CVVersion[];
}

export interface CandidateProfile {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  age?: number;
  location?: string;
  headline?: string;
  bio?: string;
  primaryIndustry: Industry;
  targetIndustry?: Industry;
  targetIndustries?: Industry[];
  additionalIndustries?: Industry[];
  targetRoles?: string[];
  skills: string[];
  experienceSummary?: string;
  educationSummary?: string;
  githubUrl?: string;
  githubUsername?: string;
  portfolioUrl?: string;
}


export interface Application {
  id: string;
  job: Job;
  appliedCvId: string;
  appliedCvTitle: string;
  appliedCvVersion: number;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'SHORTLISTED' | 'REJECTED';
  appliedDate: string;
  expectedSalary?: number;
  noticePeriodDays?: number;
  githubUrl?: string;
  portfolioUrl?: string;
  candidateAnswers?: Record<string, string>;
  candidateNotes?: string;
  candidateProfile?: CandidateProfile;
}

export interface SkillMatchResultItem {
  skillName: string;
  requirementType: RequirementType;
  status: RequirementMatchStatus;
  evidenceText?: string;
}

export interface MatchFactorItem {
  factorName: string; // Skill, Experience, Education, Project, Semantic, GitHub
  score: number;
  status: 'HIGH' | 'MODERATE' | 'LOW';
  explanation: string;
  evidence?: string;
}

export interface GitHubRepoItem {
  name: string;
  description: string;
  primaryLanguage: string;
  stars: number;
  forks: number;
  updatedDaysAgo: number;
  relevanceExplanation: string;
}

export interface GitHubAssessmentData {
  connected: boolean;
  status?: 'SYNCED' | 'NOT_CONNECTED' | 'PRIVATE_ONLY' | 'API_UNAVAILABLE' | 'NOT_APPLICABLE';
  username?: string;
  publicRepoCount?: number;
  topLanguages?: string[];
  languageDistribution?: Record<string, number>;
  activitySignal?: GitHubActivitySignal;
  latestActivityDaysAgo?: number;
  repos?: GitHubRepoItem[];
  overallAssessment?: string;
}

export interface CandidateRankingItem {
  rank: number;
  applicationId: string;
  candidateId: string;
  candidateName: string;
  headline: string;
  overallMatchScore: number;
  coreJdCvScore: number;
  githubSupportingScore?: number;
  requiredSkillsMatched: number;
  requiredSkillsTotal: number;
  requiredSkillsMissingNames: string[];
  relevantExperienceYears: number;
  appliedDate: string;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'SHORTLISTED' | 'REJECTED';
  gitHubConnected: boolean;
}

export interface MatchInspectionData {
  applicationId: string;
  jobTitle: string;
  candidateName: string;
  overallScore: number;
  coreScore: number;
  githubScore?: number;
  githubScoreActive: boolean;
  requiredSkillsStatus: SkillMatchResultItem[];
  preferredSkillsStatus: SkillMatchResultItem[];
  matchFactors: MatchFactorItem[];
  humanReadableExplanation: string;
  githubAssessment: GitHubAssessmentData;
}
