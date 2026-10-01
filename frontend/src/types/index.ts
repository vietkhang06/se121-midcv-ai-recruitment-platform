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
  status?: string;
  confirmedAt?: string;
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
  status?: string;
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
  candidateName?: string;
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

export interface AiSettings {
  provider: 'LOCAL_OLLAMA' | 'CLOUD_OPENAI_COMPATIBLE';
  ollamaUrl: string;
  ollamaModel: string;
  cloudBaseUrl: string;
  cloudApiKeyMasked?: string;
  hasCloudApiKey?: boolean;
  cloudModel: string;
  embeddingModel: string;
}

export interface QuickScreeningRun {
  id: string;
  title: string;
  filename: string;
  score: number | null;
  coverage: number | null;
  processing_state: string;
  jd_version_id: string;
  created_at: string;
  error_code: string | null;
}

export interface QuickScreeningDetail {
  screening: {
    id: string;
    job_id: string;
    cv_version_id: string;
    jd_version_id: string;
    industry_snapshot: string;
    github_enabled_snapshot: boolean;
    created_at: string;
  };
  cv: any;
  jd: any;
  result: {
    id: string;
    base_score: number;
    github_bonus: number;
    score: number;
    coverage: number;
    semantic_score: number;
    details: any;
    github: any;
    algorithm_version: string;
    created_at: string;
  } | null;
  jobs: any[];
}

export interface CVEvidenceItem {
  field_path: string;
  verbatim_value: any;
  quote: string;
  source_page?: number;
  page_number?: number;
  start_char?: number;
  end_char?: number;
  extraction_method?: string;
  method?: string;
  confidence?: number;
  is_verified?: boolean;
}

export interface PageSegmentItem {
  page_number: number;
  text: string;
  raw_text?: string;
  method: string;
  used_ocr: boolean;
  start_char: number;
  end_char: number;
  ocr_confidence?: number;
  warnings?: string[];
}

export interface CVReviewData {
  cvId: string;
  versionId?: string;
  title: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  status: string;
  extractionMethod?: string;
  rawText?: string;
  structured?: Record<string, any>;
  evidences?: CVEvidenceItem[];
  unverifiedFacts?: Record<string, any>[];
  warnings?: string[];
  pages?: PageSegmentItem[];
  createdAt?: string;
}

export interface TaxonomySkillItem {
  id: string;
  canonicalName: string;
  normalizedName: string;
  category?: string;
  description?: string;
  isCustom?: boolean;
}

export interface CVEvidenceAttachmentItem {
  attachmentId: string;
  cvId: string;
  itemType: 'CERTIFICATION' | 'LANGUAGE';
  itemId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  status: string;
  previewUrl: string;
  createdAt: string;
}

export interface CVDraftData {
  cv_id: string;
  profile_id?: string;
  version_id?: string;
  version_number?: number;
  title?: string;
  status?: string;
  confirmed_at?: string;
  personal_info?: Record<string, any>;
  summary?: Record<string, any>;
  skills?: Array<{ name: string; category?: string; level?: string; isCustom?: boolean; verified?: boolean; origin?: string }>;
  work_experience?: Array<{ id?: string; company: string; role?: string; position?: string; start_date?: string; end_date?: string; is_current?: boolean; description?: string; technologies?: string[]; origin?: string }>;
  projects?: Array<{ id?: string; name: string; role?: string; start_date?: string; end_date?: string; description?: string; techStack?: string[]; tech_stack?: string[]; origin?: string }>;
  education?: Array<{ id?: string; institution: string; degree?: string; fieldOfStudy?: string; field_of_study?: string; startYear?: number; endYear?: number; gpa?: number; gpa_scale?: number; gpaScale?: number; gpa_display?: string; description?: string; origin?: string }>;
  certifications?: Array<{ id?: string; name: string; issuer?: string; issueDate?: string; date?: string; credentialId?: string; credentialUrl?: string; attachment?: CVEvidenceAttachmentItem | null; origin?: string }>;
  languages?: Array<{ id?: string; language: string; name?: string; proficiency?: string; proficiencyLevel?: string; score?: string; attachment?: CVEvidenceAttachmentItem | null; origin?: string }>;
  links?: Record<string, any>;
}

export interface CVProcessingStatus {
  cvId: string;
  jobId: string;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CONFIRMED' | string;
  stage: string;
  progress: number;
  message: string;
  retryable: boolean;
  errorCode?: string;
  correlationId?: string;
  updatedAt?: string;
}
