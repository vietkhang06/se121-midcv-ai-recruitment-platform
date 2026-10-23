export type UserRole = 'CANDIDATE' | 'RECRUITER' | 'ADMIN';

export type Industry = 'Technology' | 'Marketing' | 'Design' | 'Finance' | 'HR' | 'Sales' | 'OTHER';

export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'REMOTE' | 'HYBRID' | 'OTHER';

export type RequirementType = 'REQUIRED' | 'PREFERRED';

export type CompanyVerificationState = 'PENDING' | 'UNDER_REVIEW' | 'CHANGES_REQUESTED' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';

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
  accountStatus?: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
  isActive?: boolean;
}

export interface Company {
  id: string;
  name: string;
  taxCode?: string;
  industry: Industry;
  website: string;
  companySize: string;
  contactEmail: string;
  contactPhone?: string;
  verificationStatus: CompanyVerificationState;
  operationalStatus?: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
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
  industryOther?: string;
  employmentType: EmploymentType;
  employmentTypeOther?: string;
  seniority: string;
  seniorityOther?: string;
  location: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryNegotiable?: boolean;
  salaryCurrency?: 'VND' | 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CNY' | 'KRW' | 'SGD' | 'AUD' | 'CAD';
  salaryPeriod?: 'MONTH';
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

export type CreateCVRequest = Pick<CV, 'title' | 'targetIndustry' | 'creationPath' | 'isDefault'> &
  Partial<Pick<CV, 'rawText' | 'versions'>>;

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


export type ApplicationStatus =
  | 'SUBMITTED'
  | 'REVIEWED'
  | 'MATCHED'
  | 'SHORTLISTED'
  | 'INTERVIEWING'
  | 'HIRED'
  | 'REJECTED'
  | 'UNDER_REVIEW';

export interface Application {
  id: string;
  job: Job;
  appliedCvId: string;
  appliedCvTitle: string;
  appliedCvVersion: number | null;
  appliedCvVersionId?: string;
  candidateName?: string;
  candidateEmail?: string;
  candidatePhone?: string;
  candidateHeadline?: string;
  status: ApplicationStatus;
  appliedDate: string;
  expectedSalary?: number;
  noticePeriodDays?: number;
  githubUrl?: string;
  portfolioUrl?: string;
  matchScore?: number;
  matchStatus?: string;
  snapshot?: {
    cvTitle?: string;
    rawTextSnapshot?: string;
    snapshotCreatedAt?: string;
  };
  candidateAnswers?: Record<string, string>;
  candidateNotes?: string;
  candidateProfile?: CandidateProfile;
}

export interface ApplicationAuditLogItem {
  id: string;
  applicationId: string;
  recruiterUserId: string;
  previousStatus: ApplicationStatus;
  newStatus: ApplicationStatus;
  decisionNote?: string;
  createdAt: string;
}

export interface SkillMatchResultItem {
  skillName: string;
  requirementType: RequirementType;
  status: RequirementMatchStatus;
  evidenceText?: string;
}

export interface MatchFactorItem {
  factorName: string; // Skill, Experience, Education, Project, Semantic, GitHub
  score: number | null;
  weight?: number;
  configuredWeight?: number;
  effectiveWeight?: number;
  weightedContribution?: number;
  status: 'AVAILABLE' | 'NOT_AVAILABLE' | 'NOT_COMPUTED' | 'HIGH' | 'MODERATE' | 'LOW' | string;
  calculationMethod?: string;
  algorithmVersion?: string;
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
  status?: 'SYNCED' | 'NOT_CONNECTED' | 'PUBLIC_ONLY' | 'PRIVATE_ONLY' | 'API_UNAVAILABLE' | 'NOT_APPLICABLE';
  username?: string;
  publicRepoCount?: number;
  topLanguages?: string[];
  languageDistribution?: Record<string, number>;
  activitySignal?: GitHubActivitySignal;
  ownershipStatus?: 'OWNED' | 'UNVERIFIED_PUBLIC';
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
  status: ApplicationStatus;
  gitHubConnected: boolean;
}

export interface EvidenceItem {
  id?: string;
  sourceType: 'CV' | 'JD' | 'GITHUB' | string;
  sourceId?: string;
  section: string;
  snippet: string;
  normalizedValue?: number;
  requirementId?: string;
  requirementText?: string;
  candidateValue?: string;
  matchStatus?: string;
  similarityConfidence?: number;
  validationStatus?: string;
}

export interface MatchInspectionData {
  applicationId: string;
  jobTitle: string;
  candidateName: string;
  algorithmVersion?: string;
  calculationStatus?: string;
  overallScore: number | null;
  coreScore: number | null;
  githubScore?: number | null;
  githubScoreActive: boolean;
  requiredSkillsStatus: SkillMatchResultItem[];
  preferredSkillsStatus: SkillMatchResultItem[];
  matchFactors: MatchFactorItem[];
  humanReadableExplanation: string;
  githubAssessment: GitHubAssessmentData;
  evidences?: EvidenceItem[];
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
  cv: Record<string, unknown>;
  jd: Record<string, unknown>;
  result: {
    id: string;
    base_score: number;
    github_bonus: number;
    score: number;
    coverage: number;
    semantic_score: number;
    details?: Record<string, unknown>;
    github?: Record<string, unknown>;
    algorithm_version: string;
    created_at: string;
  } | null;
  jobs: Record<string, unknown>[];
}

export interface CVPersonalInfo {
  [key: string]: unknown;
  fullName?: string;
  full_name?: string;
  headline?: string;
  title?: string;
  email?: string;
  phone?: string;
  address?: string;
  location?: string;
  githubUrl?: string;
  github_url?: string;
  linkedinUrl?: string;
  linkedin_url?: string;
}

export interface CVStructuredItem {
  [key: string]: unknown;
  id?: string;
  name?: string;
  company?: string;
  role?: string;
  title?: string;
  position?: string;
  institution?: string;
  degree?: string;
  issuer?: string;
  language?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  startDate?: string;
  endDate?: string;
  start_year?: string | number;
  end_year?: string | number;
  graduationYear?: string | number;
  school?: string;
  proficiency?: string;
  proficiencyLevel?: string;
  proficiency_level?: string;
  technologies?: CVTechnology[];
  techStack?: CVTechnology[];
  tech_stack?: CVTechnology[];
}

export type CVTechnology = string | { name: string; [key: string]: unknown };

export interface CVStructuredData {
  [key: string]: unknown;
  personalInfo?: CVPersonalInfo;
  personal_info?: CVPersonalInfo;
  fullName?: string;
  full_name?: string;
  name?: string;
  headline?: string;
  targetRole?: string;
  target_role?: string;
  email?: string;
  phone?: string;
  address?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  summary?: string;
  schema_version?: string;
  skills?: Array<string | CVStructuredItem>;
  experience?: CVStructuredItem[];
  experiences?: CVStructuredItem[];
  projects?: CVStructuredItem[];
  education?: CVStructuredItem[];
  educations?: CVStructuredItem[];
  certifications?: CVStructuredItem[];
  languages?: CVStructuredItem[];
}

export interface CVEvidenceItem {
  field_path: string;
  verbatim_value: unknown;
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
  structured?: CVStructuredData;
  evidences?: CVEvidenceItem[];
  unverifiedFacts?: Array<{ field_path: string; quote?: string; reason?: string; [key: string]: unknown }>;
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
  [key: string]: unknown;
  cv_id: string;
  profile_id?: string;
  version_id?: string;
  version_number?: number;
  title?: string;
  status?: string;
  confirmed_at?: string;
  personal_info?: CVPersonalInfo;
  summary?: string | { content?: string; text?: string };
  skills?: Array<{ name: string; category?: string; level?: string; isCustom?: boolean; verified?: boolean; origin?: string }>;
  work_experience?: Array<{ [key: string]: unknown; id?: string; company: string; role?: string; position?: string; start_date?: string; end_date?: string; startDate?: string; endDate?: string; is_current?: boolean; description?: string; technologies?: CVTechnology[]; origin?: string }>;
  projects?: Array<{ [key: string]: unknown; id?: string; name: string; role?: string; start_date?: string; end_date?: string; description?: string; techStack?: CVTechnology[]; tech_stack?: CVTechnology[]; origin?: string }>;
  education?: Array<{ [key: string]: unknown; id?: string; institution: string; school?: string; degree?: string; fieldOfStudy?: string; field_of_study?: string; startYear?: number; start_year?: string | number; endYear?: number; end_year?: string | number; graduationYear?: string | number; gpa?: number; gpa_scale?: number; gpaScale?: number; gpa_display?: string; description?: string; origin?: string }>;
  certifications?: Array<{ [key: string]: unknown; id?: string; name: string; issuer?: string; issueDate?: string; date?: string; credentialId?: string; credentialUrl?: string; attachment?: CVEvidenceAttachmentItem | null; origin?: string }>;
  languages?: Array<{ [key: string]: unknown; id?: string; language: string; name?: string; proficiency?: string; proficiencyLevel?: string; proficiency_level?: string; score?: string; attachment?: CVEvidenceAttachmentItem | null; origin?: string }>;
  links?: { [key: string]: unknown; github_url?: string; linkedin_url?: string; portfolio_url?: string };
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

export interface AdminDashboardStats {
  totalUsers: number;
  candidatesCount: number;
  recruitersCount: number;
  activeUsersCount: number;
  suspendedUsersCount: number;
  companiesPendingCount: number;
  companiesUnderReviewCount: number;
  companiesVerifiedCount: number;
  companiesRejectedCount: number;
  companiesSuspendedCount: number;
  activeJobsCount: number;
  suspendedJobsCount: number;
  pendingReportsCount: number;
  recentAuditLogs: AdminAuditLogDto[];
  aiStatus: {
    provider?: string;
    ollamaModel?: string;
    cloudModel?: string;
    hasCloudApiKey?: boolean;
  };
}

export type CompanyReviewAction = 'START_REVIEW' | 'VERIFY' | 'REQUEST_CHANGES' | 'REJECT' | 'SUSPEND' | 'RESTORE';
export type ReportStatus = 'PENDING' | 'RESOLVED' | 'DISMISSED';
export type ReportTargetType = 'JOB' | 'COMPANY' | 'CANDIDATE' | 'RECRUITER';

export interface CompanyAdminDto {
  id: string;
  name: string;
  taxCode?: string;
  website?: string;
  size?: string;
  industry?: string;
  location?: string;
  description?: string;
  verificationStatus: CompanyVerificationState;
  reviewedById?: string;
  reviewedByEmail?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
  recruiterEmail?: string;
  recruiterName?: string;
  recruiterPhone?: string;
  activeJobsCount?: number;
}

export interface UserAdminDto {
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  accountStatus?: 'ACTIVE' | 'SUSPENDED';
  emailVerified: boolean;
  fullName?: string;
  phone?: string;
  createdAt?: string;
  targetIndustry?: string;
  headline?: string;
  githubUrl?: string;
  cvCount?: number;
  applicationCount?: number;
  companyId?: string;
  companyName?: string;
  companyVerificationStatus?: string;
}

export interface JobAdminDto {
  id: string;
  companyId: string;
  companyName: string;
  companyVerificationStatus: string;
  title: string;
  industry: string;
  seniority: string;
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'SUSPENDED';
  minSalary?: number;
  maxSalary?: number;
  location?: string;
  jobType?: string;
  experienceLevel?: string;
  employmentType?: string;
  description: string;
  moderationReason?: string;
  suspendedAt?: string;
  createdAt: string;
}

export interface ReportAdminDto {
  id: string;
  reporterId?: string;
  reporterEmail?: string;
  targetType: 'JOB' | 'COMPANY' | 'CANDIDATE' | 'RECRUITER';
  targetId: string;
  targetTitle?: string;
  reason: string;
  details?: string;
  status: 'PENDING' | 'RESOLVED' | 'DISMISSED';
  resolutionNotes?: string;
  resolvedById?: string;
  resolvedByEmail?: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface AdminAuditLogDto {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  previousState?: string;
  newState?: string;
  reason?: string;
  ipAddress?: string;
  correlationId?: string;
  createdAt: string;
}

export interface TaxonomySkillAdminDto {
  id: string;
  canonicalName: string;
  name?: string;
  normalizedName: string;
  normalizedKey?: string;
  category: string;
  description?: string;
  source: string;
  active: boolean;
  aliases?: string[];
}

export interface SuspensionAppeal {
  id: string;
  appellantUserId: string;
  appellantEmail?: string;
  suspensionId?: string;
  targetType: 'USER' | 'COMPANY';
  targetId: string;
  subject: string;
  content: string;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  evidenceAttachmentId?: string;
  submittedAt: string;
  reviewerEmail?: string;
  reviewedAt?: string;
  resolutionNote?: string;
  createdAt: string;
}

export interface SuspensionNotice {
  hasActiveSuspension: boolean;
  userSuspended: boolean;
  companySuspended: boolean;
  suspensionRecordId?: string;
  reason?: string;
  startsAt?: string;
  expiresAt?: string;
  appealStatus?: 'NONE' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  appealId?: string;
  appealSubmittedAt?: string;
  appealResolutionNotes?: string;
}

export interface JobMatchingPolicy {
  id?: string;
  jobId: string;
  skillRequiredWeight: number;
  skillPreferredWeight: number;
  experienceWeight: number;
  educationWeight: number;
  projectWeight: number;
  semanticWeight: number;
  coreWeight: number;
  githubWeight: number;
  isGithubActive: boolean;
  policyVersion?: number;
}

export interface CVQuota {
  plan: 'STANDARD' | 'PRO';
  currentCount: number;
  maxLimit: number;
  remainingSlots: number;
  canUpload: boolean;
}

export type SkillType = 'TECHNICAL' | 'SOFT_SKILL' | 'TOOL_PLATFORM' | 'DOMAIN_KNOWLEDGE' | 'LANGUAGE' | 'CERTIFICATION';

export interface TaxonomyCatalogSkill {
  id: string;
  canonicalName: string;
  normalizedKey: string;
  category: string;
  skillType: SkillType;
  viName: string;
  enName: string;
  aliases: string[];
  industryIds: string[];
  roleIds?: string[];
  description?: string;
}

export interface TaxonomyIndustry {
  id: string;
  canonicalName: string;
  vi: string;
  en: string;
  active: boolean;
}

export interface TaxonomyJobFamily {
  id: string;
  canonicalName: string;
  vi: string;
  en: string;
  industryId: string;
  associatedSkillIds: string[];
}

export interface FavoriteSkillsResponse {
  userId?: string;
  total: number;
  maxLimit: number;
  favorites: TaxonomySkillItem[];
}
