import { subscribeProgress } from './sse';
import {
  Job,
  CV,
  CandidateProfile,
  Application,
  ApplicationStatus,
  ApplicationAuditLogItem,
  User,
  RecruiterProfile,
  Company,
  CandidateRankingItem,
  MatchInspectionData,
  Industry,
  EmploymentType,
  RequirementType,
  AiSettings,
  QuickScreeningRun,
  QuickScreeningDetail,
  CVReviewData,
  CVProcessingStatus,
  AdminDashboardStats,
  CompanyAdminDto,
  UserAdminDto,
  JobAdminDto,
  ReportAdminDto,
  AdminAuditLogDto,
  TaxonomySkillAdminDto,
  SuspensionAppeal,
  SuspensionNotice,
  JobMatchingPolicy,
  CVQuota,
  CreateCVRequest,
  CVVersion,
  CVDraftData,
  TaxonomySkillItem
} from '@/types';

export const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

type JsonRecord = Record<string, unknown>;
interface ApiEnvelope<T> { data: T; message?: string; success?: boolean; }
interface ApiPage<T> { content: T[]; totalElements: number; totalPages: number; page?: number; size?: number; }

interface CandidateProfileApiDto {
  id?: string;
  fullName?: string;
  headline?: string;
  phone?: string;
  age?: number;
  bio?: string;
  targetIndustry?: string;
  targetIndustries?: Industry[];
  skills?: string[];
  githubUrl?: string;
  portfolioUrl?: string;
}

interface BackendApplicationDto {
  id: string | number;
  jobId: string | number;
  jobTitle?: string | null;
  companyName?: string | null;
  industry?: string | null;
  appliedCvId?: string | null;
  appliedCvVersionNumber?: number | null;
  appliedCvVersionId?: string | null;
  candidateName?: string | null;
  candidateEmail?: string | null;
  candidatePhone?: string | null;
  candidateHeadline?: string | null;
  candidateGithubUrl?: string | null;
  status?: string | null;
  matchScore?: number | null;
  matchStatus?: string | null;
  appliedAt?: string | null;
  snapshot?: {
    cvTitle?: string | null;
    rawTextSnapshot?: string | null;
    snapshotCreatedAt?: string | null;
  } | null;
}

interface CompanyApiDto {
  id?: string | number | null;
  name?: string | null;
  taxCode?: string | null;
  industry?: string | null;
  website?: string | null;
  size?: string | null;
  verificationStatus?: Company['verificationStatus'] | null;
  verificationReason?: string | null;
  reviewNotes?: string | null;
}

interface AuthApiResponse<T> {
  data?: T;
  message?: string;
}

interface RegistrationApiDto {
  email?: string;
  devVerificationToken?: string;
}

interface LoginApiDto {
  userId: string;
  email: string;
  role: string;
  accessToken: string;
  refreshToken: string;
}

declare global {
  interface Window {
    __MIDCV_TEST_HARNESS__?: {
      injectBenchmarkClient: () => Promise<void>;
      resetApiClient: () => void;
    };
  }
}

function isBackendApplication(value: unknown): value is BackendApplicationDto {
  return isRecord(value)
    && (typeof value.id === 'string' || typeof value.id === 'number')
    && (typeof value.jobId === 'string' || typeof value.jobId === 'number');
}

function toApplicationStatus(value: unknown, fallback: ApplicationStatus = 'SUBMITTED'): ApplicationStatus {
  const statuses: ApplicationStatus[] = ['SUBMITTED', 'REVIEWED', 'MATCHED', 'SHORTLISTED', 'INTERVIEWING', 'HIRED', 'REJECTED', 'UNDER_REVIEW'];
  return typeof value === 'string' && statuses.includes(value as ApplicationStatus) ? value as ApplicationStatus : fallback;
}

function getObjectRows(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function toRequirementType(value: unknown): RequirementType {
  return value === 'PREFERRED' ? 'PREFERRED' : 'REQUIRED';
}

function toRequirementMatchStatus(value: unknown): 'MATCH' | 'PARTIAL' | 'MISSING' {
  return value === 'MATCH' || value === 'PARTIAL' ? value : 'MISSING';
}

function toGitHubStatus(value: unknown): 'SYNCED' | 'NOT_CONNECTED' | 'PUBLIC_ONLY' | 'PRIVATE_ONLY' | 'API_UNAVAILABLE' | 'NOT_APPLICABLE' {
  const statuses = ['SYNCED', 'NOT_CONNECTED', 'PUBLIC_ONLY', 'PRIVATE_ONLY', 'API_UNAVAILABLE', 'NOT_APPLICABLE'] as const;
  return typeof value === 'string' && statuses.includes(value as typeof statuses[number]) ? value as typeof statuses[number] : 'NOT_CONNECTED';
}

interface UploadedEvidenceResponse {
  attachment_id: string;
  cv_id: string;
  item_type: 'CERTIFICATION' | 'LANGUAGE';
  item_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  status: string;
  preview_url: string;
  created_at: string;
  sha256?: string;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getApiData(value: unknown): unknown {
  return isRecord(value) && 'data' in value ? value.data : value;
}

function getApiRows(value: unknown): unknown[] {
  const data = getApiData(value);
  if (Array.isArray(data)) return data;
  return isRecord(data) && Array.isArray(data.content) ? data.content : [];
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function isCVQuota(value: unknown): value is CVQuota {
  if (!isRecord(value)) return false;
  return (value.plan === 'STANDARD' || value.plan === 'PRO')
    && typeof value.currentCount === 'number'
    && typeof value.maxLimit === 'number'
    && typeof value.remainingSlots === 'number'
    && typeof value.canUpload === 'boolean';
}

function toIndustry(value: unknown): Industry {
  const valid: Industry[] = ['Technology', 'Marketing', 'Design', 'Finance', 'HR', 'Sales', 'OTHER'];
  return typeof value === 'string' && valid.includes(value as Industry) ? value as Industry : 'Technology';
}

function readString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function readNumber(value: unknown): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}

function isApiEnvelope<T>(value: ApiEnvelope<T> | T): value is ApiEnvelope<T> {
  return isRecord(value) && 'data' in value;
}

function unwrapApiData<T>(value: ApiEnvelope<T> | T): T {
  return isApiEnvelope(value) ? value.data : value;
}

export async function beginOAuthLink(provider: 'google' | 'github'): Promise<string> {
  const token = getAuthToken();
  if (!token) throw new Error('Vui lòng đăng nhập lại trước khi liên kết tài khoản.');
  const response = await authorizedFetch(`${BASE_URL}/api/v1/auth/oauth/${provider}/link`, { method: 'POST', credentials: 'include', headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  const body = await response.json();
  if (!response.ok || !body?.data?.authorizationUrl) throw new Error(body?.message || 'Không thể bắt đầu liên kết tài khoản.');
  return body.data.authorizationUrl;
}

export async function fetchGithubConnection(): Promise<{ connected: boolean; login?: string; ownershipVerified: boolean; scanScope: string }> {
  const token = getAuthToken();
  if (!token) return { connected: false, ownershipVerified: false, scanScope: 'PUBLIC_PROFILE_ONLY' };
  const response = await authorizedFetch(`${BASE_URL}/api/v1/auth/oauth/github/connection`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  const body = await response.json();
  if (!response.ok) throw new Error(body?.message || 'Không thể tải trạng thái liên kết GitHub.');
  return body.data;
}

export interface CVProcessingEvent {
  eventId: string;
  jobId: string;
  step: string;
  code: string;
  level?: string | null;
  progress: number;
  message?: string | null;
  durationMs?: number | null;
  timestamp?: string;
}

function isCVProcessingEvent(value: unknown): value is CVProcessingEvent {
  if (typeof value !== 'object' || value === null) return false;
  const event = value as Record<string, unknown>;
  return typeof event.eventId === 'string' && typeof event.jobId === 'string' && typeof event.step === 'string' && typeof event.code === 'string' && typeof event.progress === 'number' && Number.isFinite(event.progress);
}

// ============================================================
// 1. ERROR TYPES & CENTRAL HTTP ENGINE
// ============================================================

export class ApiError extends Error {
  status: number;
  statusText: string;
  url: string;
  method: string;
  responseBody?: unknown;

  constructor(method: string, url: string, status: number, statusText: string, message: string, responseBody?: unknown) {
    super(`[API ERROR] ${method} ${url} - Status ${status} (${statusText}): ${message}`);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
    this.url = url;
    this.method = method;
    this.responseBody = responseBody;
  }
}

export function isJwtExpired(token: string | null): boolean {
  if (!token) return true;
  if (token.startsWith('jwt-test-token') || token.startsWith('mock-') || token.startsWith('e2e-')) return false;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    if (!payload.exp) return false;
    // 10 second clock skew buffer
    return Date.now() >= (payload.exp * 1000 - 10000);
  } catch {
    return true;
  }
}

export function getAuthUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('auth_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getAuthToken(): string | null {
  return typeof window === 'undefined' ? null : localStorage.getItem('auth_token');
}

export function clearAuthSession(): void {
  if (typeof window === 'undefined') return;
  for (const key of ['auth_user', 'auth_token', 'auth_refresh_token', 'auth_session']) localStorage.removeItem(key);
  window.dispatchEvent(new CustomEvent('midcv:session_expired'));
}

export function saveAuthTokens(auth: { accessToken: string; refreshToken?: string }): void {
  localStorage.setItem('auth_token', auth.accessToken);
  if (auth.refreshToken) localStorage.setItem('auth_refresh_token', auth.refreshToken);
}

let refreshPromise: Promise<string | null> | null = null;
export async function ensureAuthToken(rejectedToken?: string): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const refresh = async () => {
    const current = getAuthToken();
    if (current && !isJwtExpired(current) && current !== rejectedToken) return current;
    const refreshToken = localStorage.getItem('auth_refresh_token');
    if (!refreshToken) { if (current) clearAuthSession(); return null; }
    const response = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }), cache: 'no-store'
    });
    if (!response.ok) {
      if (response.status === 401 || response.status === 400) clearAuthSession();
      throw new Error('Không thể gia hạn phiên đăng nhập. Vui lòng thử lại.');
    }
    const body = await response.json();
    if (!body?.data?.accessToken || !body?.data?.refreshToken) throw new Error('Phản hồi gia hạn phiên không hợp lệ.');
    // A logout or a newer login may have happened while the refresh was in flight.
    if (localStorage.getItem('auth_refresh_token') !== refreshToken) return getAuthToken();
    saveAuthTokens(body.data);
    return body.data.accessToken as string;
  };
  if (!refreshPromise) {
    // Serialize rotation across tabs as well as concurrent requests in this tab.
    refreshPromise = (typeof navigator !== 'undefined' && navigator.locks
      ? navigator.locks.request('midcv-token-refresh', async () => refresh()).then(value => value) : refresh()).finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

export async function authorizedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers);
  const token = await ensureAuthToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  else headers.delete('Authorization');
  let response = await fetch(url, { ...options, headers });
  if (response.status === 401 && token && !options.signal?.aborted) {
    const renewed = await ensureAuthToken(token);
    if (renewed) {
      headers.set('Authorization', `Bearer ${renewed}`);
      response = await fetch(url, { ...options, headers });
    }
  }
  return response;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const method = options.method || 'GET';
  const url = `${BASE_URL}${endpoint}`;

  const headers = new Headers(options.headers || {});
  const token = getAuthToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let res: Response;
  try {
    res = await (['/api/v1/auth/login', '/api/v1/auth/verify-email', '/api/v1/auth/resend-verification', '/api/v1/auth/check-email', '/api/v1/auth/forgot-password', '/api/v1/auth/reset-password'].includes(endpoint.split('?')[0])
      || endpoint.startsWith('/api/v1/auth/register') ? fetch : authorizedFetch)(url, { ...options, headers });
  } catch (netErr: unknown) {
    const errMsg = netErr instanceof Error ? netErr.message : 'Lỗi kết nối mạng đến máy chủ backend.';
    console.error(`[API ERROR] Network failure: method=${method} url=${url}`, netErr);
    throw new ApiError(method, url, 0, 'NETWORK_ERROR', errMsg);
  }

  if (!res.ok) {
    let errBody: unknown = null;
    try {
      errBody = await res.json();
    } catch {
      // response is not JSON
    }

    const errMsg =
      (isRecord(errBody) && typeof errBody.message === 'string' ? errBody.message : '') ||
      res.statusText ||
      `Request failed with status ${res.status}`;

    const isExpiredSessionResponse =
      res.status === 401 ||
      (res.status === 403 &&
        /yêu cầu xác thực tài khoản|phiên làm việc đã hết hạn/i.test(
          errMsg
        ));

    if (typeof window !== 'undefined' && isExpiredSessionResponse) {
      clearAuthSession();

      window.dispatchEvent(
        new CustomEvent('midcv:session_expired', {
          detail: { message: errMsg },
        })
      );
    }

    // Lỗi xác thực là tình huống cần xử lý phiên đăng nhập,
    // không phải lúc nào cũng là lỗi lập trình.
    const logMessage =
      `[API ${isExpiredSessionResponse ? 'AUTH' : 'ERROR'}] ` +
      `method=${method} url=${url} status=${res.status} ` +
      `statusText=${res.statusText} message=${errMsg}`;

    if (isExpiredSessionResponse) {
      console.warn(logMessage);
    } else {
      console.error(logMessage, errBody);
    }

    throw new ApiError(
      method,
      url,
      res.status,
      res.statusText,
      errMsg,
      errBody
    );

  }

  const json = await res.json();
  return json;
}

// ============================================================
// 2. BACKEND MAPPERS (STRICT - NO FABRICATED DEFAULTS)
// ============================================================

export function mapBackendJobToFrontend(value: unknown): Job {
  const raw = isRecord(value) ? value : null;
  if (!raw || raw.id == null) {
    throw new Error('Dữ liệu bài đăng tuyển dụng không hợp lệ: thiếu id');
  }
  const company = isRecord(raw.company) ? raw.company : {};
  const rawRequirements = Array.isArray(raw.requirements) ? raw.requirements : [];
  return {
    id: String(raw.id),
    title: readString(raw.title),
    companyName: readString(raw.companyName, readString(company.name)),
    companyVerified: typeof raw.companyVerified === 'boolean' ? raw.companyVerified : company.verificationStatus === 'VERIFIED',
    industry: (raw.industry === 'OTHER' && typeof raw.industryOther === 'string' ? raw.industryOther : readString(raw.industry)) as Industry,
    industryOther: readString(raw.industryOther) || undefined,
    employmentType: raw.employmentType === 'OTHER' && typeof raw.employmentTypeOther === 'string' ? raw.employmentTypeOther as EmploymentType : (readString(raw.employmentType) as EmploymentType),
    employmentTypeOther: readString(raw.employmentTypeOther) || undefined,
    seniority: raw.seniority === 'OTHER' && typeof raw.seniorityOther === 'string' ? raw.seniorityOther : readString(raw.seniority),
    seniorityOther: readString(raw.seniorityOther) || undefined,
    location: readString(raw.location),
    salaryMin: raw.minSalary != null ? readNumber(raw.minSalary) : null,
    salaryMax: raw.maxSalary != null ? readNumber(raw.maxSalary) : null,
    salaryNegotiable: raw.salaryNegotiable === true,
    salaryCurrency: readString(raw.salaryCurrency, 'VND') as NonNullable<Job['salaryCurrency']>,
    salaryPeriod: 'MONTH',
    publishedDate: readString(raw.createdAt).split('T')[0],
    description: readString(raw.description),
    responsibilities: Array.isArray(raw.responsibilities) ? raw.responsibilities.filter((value): value is string => typeof value === 'string') : [],
    requirements: rawRequirements.filter(isRecord).map((req) => ({
      id: readString(req.id),
      skillName: readString(req.skillName),
      requirementType: readString(req.requirementType) as RequirementType,
      minYearsExperience: readNumber(req.minYearsExp) ?? undefined,
      minExperienceYears: readNumber(req.minYearsExp) ?? undefined
    })),
    status: (['DRAFT', 'PUBLISHED', 'CLOSED', 'SUSPENDED'].includes(readString(raw.status)) ? readString(raw.status) : 'DRAFT') as Job['status']
  };
}

export function mapBackendCVToFrontend(value: unknown): CV {
  const raw = isRecord(value) ? value : null;
  if (!raw || raw.id == null) {
    throw new Error('Dữ liệu CV không hợp lệ: thiếu id');
  }
  return {
    id: String(raw.id),
    title: readString(raw.title),
    targetIndustry: readString(raw.targetIndustry, 'Technology') as Industry,
    creationPath: raw.creationPath === 'BUILDER' ? 'BUILDER' : 'UPLOAD',
    isDefault: !!raw.isDefault,
    status: readString(raw.status, 'DRAFT'),
    currentVersionNumber: 1,
    rawText: readString(raw.rawText),
    updatedAt: readString(raw.createdAt).split('T')[0],
    versions: [
      {
        id: `v-${raw.id}`,
        versionNumber: 1,
        title: readString(raw.title),
        createdAt: raw.createdAt ? String(raw.createdAt).split('T')[0] : '',
        sections: [
          {
            id: `sec-${raw.id}`,
            sectionType: 'SUMMARY',
            title: 'Nội dung CV',
            content: readString(raw.rawText)
          }
        ]
      }
    ]
  };
}

// ============================================================
// 3. AUTH TYPES
// ============================================================

export interface RegisterCandidatePayload {
  email: string;
  password: string;
  fullName: string;
  age?: number;
  targetIndustry?: Industry;
  targetIndustries?: string[];
}

export interface RegisterRecruiterPayload {
  email: string;
  password: string;
  fullName: string;
  companyName: string;
  companyTaxCode?: string;
  companyIndustry?: Industry;
  companyWebsite?: string;
}

export interface AuthResponse {
  message: string;
  email: string;
  emailVerified: boolean;
  devVerificationToken?: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken?: string;
}

// ============================================================
// 4. API CLIENT INTERFACE
// ============================================================

export interface ApiClient {
  fetchJobs(industry?: string): Promise<Job[]>;
  fetchJobCatalog?(query?: string, location?: string): Promise<Job[]>;
  fetchJobById(id: string): Promise<Job | null>;
  fetchCandidateProfile(): Promise<CandidateProfile>;
  saveCandidateProfile(profile: CandidateProfile): Promise<CandidateProfile>;
  fetchCandidateCVs(): Promise<CV[]>;
  fetchCVQuota(): Promise<CVQuota>;
  saveCandidateCV(cv: CreateCVRequest): Promise<CV>;
  updateCVMetadata(cvId: string, metadata: { title: string }): Promise<CV>;
  uploadCandidateCV(file: File, title?: string, targetIndustry?: string, isDefault?: boolean): Promise<CV>;
  deleteCandidateCV(cvId: string): Promise<void>;
  fetchCVReview(cvId: string): Promise<CVReviewData>;
  fetchCVProcessingStatus(cvId: string): Promise<CVProcessingStatus>;
  subscribeCVProcessingEvents?(
    identifier: { cvId?: string; jobId?: string },
    onEvent: (event: CVProcessingEvent) => void,
    onError?: (err: Error) => void
  ): () => void;
  downloadCVFile(cvId: string, format: string, defaultFilename: string): Promise<void>;
  retryCVExtraction(cvId: string): Promise<CVReviewData>;
  fetchCVDraft(cvId: string): Promise<CVDraftData>;
  updateCVDraft(cvId: string, draftData: Record<string, unknown>): Promise<CVDraftData>;
  confirmCandidateCV(cvId: string): Promise<{ cv_id: string; profile_id: string; status: string; confirmed_at: string }>;
  fetchCVVersions(cvId: string): Promise<CVVersion[]>;
  searchTaxonomySkills(query: string, limit?: number, category?: string): Promise<TaxonomySkillItem[]>;
  fetchFavoriteSkills(): Promise<TaxonomySkillItem[]>;
  addFavoriteSkill(skillId: string): Promise<TaxonomySkillItem>;
  removeFavoriteSkill(skillId: string): Promise<TaxonomySkillItem>;
  uploadCVEvidence(cvId: string, file: File, itemType: 'CERTIFICATION' | 'LANGUAGE', itemId: string): Promise<UploadedEvidenceResponse>;
  deleteCVEvidence(cvId: string, attachmentId: string): Promise<void>;
  downloadCVEvidence(cvId: string, attachmentId: string, fileName: string): Promise<void>;
  fetchCVEvidenceBlob(cvId: string, attachmentId: string): Promise<Blob>;
  fetchCandidateApplications(): Promise<Application[]>;
  submitApplication(app: Application): Promise<Application>;
  fetchJobApplications(jobId: string): Promise<Application[]>;
  fetchApplicationById(applicationId: string): Promise<Application | null>;
  updateApplicationStatus(applicationId: string, status: ApplicationStatus, decisionNote?: string, expectedStatus?: ApplicationStatus): Promise<Application>;
  fetchApplicationAuditLogs(applicationId: string): Promise<ApplicationAuditLogItem[]>;
  fetchRecruiterProfile(): Promise<RecruiterProfile>;
  fetchRecruiterCompany(): Promise<Company>;
  saveCompanyProfile(company: Company): Promise<Company>;
  submitCompanyVerification(): Promise<Company>;
  fetchRecruiterJobs(): Promise<Job[]>;
  saveJob(job: Job): Promise<Job>;
  publishJob(jobId: string): Promise<Job | null>;
  closeJob(jobId: string): Promise<Job | null>;
  fetchCandidateRankings(jobId: string): Promise<CandidateRankingItem[]>;
  fetchMatchInspection(applicationId: string): Promise<MatchInspectionData | null>;
  checkEmailAvailability(email: string): Promise<{ exists: boolean; status: 'AVAILABLE' | 'ALREADY_EXISTS' }>;
  registerCandidateAccount(payload: RegisterCandidatePayload): Promise<AuthResponse>;
  registerRecruiterAccount(payload: RegisterRecruiterPayload): Promise<AuthResponse>;
  verifyEmailToken(token: string): Promise<{ success: boolean; message: string }>;
  resendVerificationToken(email: string): Promise<{ success: boolean; message: string; devVerificationToken?: string }>;
  loginAccount(email: string, password: string): Promise<LoginResponse>;
}

// ============================================================
// 5. PRODUCTION REAL API CLIENT IMPLEMENTATION
// ============================================================

export interface PaginatedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  sort?: {
    field: string;
    direction: string;
  };
}

async function fetchAllApiRows(path: string): Promise<unknown[]> {
  const rows: unknown[] = [];
  let pages = 1;
  for (let page = 0; page < pages; page++) {
    const separator = path.includes('?') ? '&' : '?';
    const response = await apiRequest<unknown>(`${path}${separator}page=${page}&size=100`);
    rows.push(...getApiRows(response));
    const data = getApiData(response);
    if (isRecord(data) && data.totalPages != null) {
      if (typeof data.totalPages !== 'number' || !Number.isInteger(data.totalPages) || data.totalPages < 0 || data.totalPages > 200)
        throw new Error('Không thể tải đầy đủ danh sách: thông tin phân trang không hợp lệ hoặc vượt giới hạn.');
      if (page === 0) pages = data.totalPages;
    }
  }
  return rows;
}

export class RealApiClient implements ApiClient {

  async fetchJobs(industry?: string, page = 0, size = 20, sort = 'createdAt', direction = 'desc'): Promise<Job[]> {
    const queryParts: string[] = [];
    if (industry) queryParts.push(`industry=${encodeURIComponent(industry)}`);
    if (page != null) queryParts.push(`page=${page}`);
    if (size != null) queryParts.push(`size=${size}`);
    if (sort) queryParts.push(`sort=${sort}`);
    if (direction) queryParts.push(`direction=${direction}`);
    const qs = queryParts.length ? `?${queryParts.join('&')}` : '';
    const json = await apiRequest<unknown>(`/api/v1/jobs${qs}`);
    return getApiRows(json).map(mapBackendJobToFrontend);
  }

  async fetchJobCatalog(query = '', location = ''): Promise<Job[]> {
    const result: Job[] = [];
    let totalPages = 1;
    for (let page = 0; page < totalPages; page++) {
      const response = await apiRequest<{ data: ApiPage<JsonRecord> }>(`/api/v1/jobs?page=${page}&size=100&sort=createdAt&direction=desc&query=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}`);
      const data = response.data;
      if (!data || !Array.isArray(data.content) || !Number.isInteger(data.totalPages) || data.totalPages < 0 || data.totalPages > 200) {
        throw new Error('Không thể tải đầy đủ danh mục việc làm. Phản hồi phân trang không hợp lệ hoặc vượt giới hạn.');
      }
      if (page === 0) totalPages = data.totalPages;
      result.push(...data.content.map(mapBackendJobToFrontend));
    }
    return [...new Map(result.map(job => [job.id, job])).values()];
  }

  async fetchJobById(id: string): Promise<Job | null> {
    const url = `${BASE_URL}/api/v1/jobs/${id}`;
    let res: Response;
    try {
      res = await authorizedFetch(url);
    } catch (netErr: unknown) {
      console.error(`[API ERROR] Network failure: GET ${url}`, netErr);
      throw new ApiError('GET', url, 0, 'NETWORK_ERROR', getErrorMessage(netErr, 'Lỗi kết nối mạng.'));
    }

    if (!res.ok) {
      if (res.status === 404) return null;
      console.error(`[API ERROR] method=GET url=${url} status=${res.status} statusText=${res.statusText}`);
      throw new ApiError('GET', url, res.status, res.statusText, `GET /jobs/${id} thất bại`);
    }

    const json = await res.json();
    const jobData = json?.data !== undefined ? json.data : json;
    return jobData ? mapBackendJobToFrontend(jobData) : null;
  }

  async fetchCandidateProfile(): Promise<CandidateProfile> {
    const token = getAuthToken();
    if (!token) {
      throw new ApiError('GET', '/api/v1/candidate/profile', 401, 'UNAUTHORIZED', 'Chưa đăng nhập hoặc token đã hết hạn.');
    }

    const json = await apiRequest<ApiEnvelope<CandidateProfileApiDto>>('/api/v1/candidate/profile', {
      headers: { Authorization: `Bearer ${token}` }
    });

    const p = json.data;
    if (!p) {
      throw new ApiError('GET', '/api/v1/candidate/profile', 404, 'NOT_FOUND', 'Không tìm thấy dữ liệu hồ sơ ứng viên.');
    }

    const user = getAuthUser();
    return {
      id: String(p.id || user?.id || ''),
      fullName: p.fullName || user?.fullName || '',
      email: user?.email || '',
      phone: p.phone || '',
      age: p.age,
      headline: p.headline || '',
      bio: p.bio || '',
      primaryIndustry: toIndustry(p.targetIndustry || user?.targetIndustry),
      targetIndustry: toIndustry(p.targetIndustry || user?.targetIndustry),
      targetIndustries: p.targetIndustries || [toIndustry(p.targetIndustry)],
      skills: p.skills || [],
      githubUrl: p.githubUrl || '',
      portfolioUrl: p.portfolioUrl || ''
    };
  }

  async saveCandidateProfile(profile: CandidateProfile): Promise<CandidateProfile> {
    const token = getAuthToken();
    if (!token) {
      throw new ApiError('PUT', '/api/v1/candidate/profile', 401, 'UNAUTHORIZED', 'Chưa đăng nhập hoặc token đã hết hạn.');
    }

    const json = await apiRequest<ApiEnvelope<CandidateProfileApiDto>>('/api/v1/candidate/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        fullName: profile.fullName,
        headline: profile.headline,
        phone: profile.phone,
        age: profile.age,
        bio: profile.bio,
        targetIndustry: profile.primaryIndustry || profile.targetIndustry,
        targetIndustries: profile.targetIndustries,
        githubUrl: profile.githubUrl,
        portfolioUrl: profile.portfolioUrl
      })
    });

    const p = json.data;
    return {
      ...profile,
      id: String(p?.id || profile.id),
      fullName: p?.fullName || profile.fullName,
      headline: p?.headline || profile.headline,
      phone: p?.phone || profile.phone,
      bio: p?.bio || profile.bio
    };
  }

  async fetchCandidateCVs(): Promise<CV[]> {
    const token = getAuthToken();
    if (!token) {
      throw new ApiError('GET', '/api/v1/candidate/cvs', 401, 'UNAUTHORIZED', 'Chưa đăng nhập hoặc token đã hết hạn.');
    }

    const json = await apiRequest<unknown>('/api/v1/candidate/cvs', {
      headers: { Authorization: `Bearer ${token}` }
    });

    return getApiRows(json).map(mapBackendCVToFrontend);
  }

  async fetchCVQuota(): Promise<CVQuota> {
    const token = getAuthToken();
    if (!token) {
      throw new ApiError('GET', '/api/v1/candidate/cvs/quota', 401, 'UNAUTHORIZED', 'Chưa đăng nhập hoặc token đã hết hạn.');
    }

    const json = await apiRequest<ApiEnvelope<unknown>>('/api/v1/candidate/cvs/quota', {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!isCVQuota(json.data)) throw new Error('Phản hồi hạn mức CV không hợp lệ.');
    return json.data;
  }

  async saveCandidateCV(cv: CreateCVRequest): Promise<CV> {
    const token = getAuthToken();
    if (!token) {
      throw new ApiError('POST', '/api/v1/candidate/cvs', 401, 'UNAUTHORIZED', 'Chưa đăng nhập hoặc token đã hết hạn.');
    }

    const rawText = cv.rawText || (cv.versions && cv.versions[0]?.sections ? cv.versions[0].sections.map(s => s.content).join('\n') : cv.title);

    const json = await apiRequest<ApiEnvelope<unknown>>('/api/v1/candidate/cvs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        title: cv.title,
        creationPath: cv.creationPath || 'BUILDER',
        targetIndustry: cv.targetIndustry || 'Technology',
        rawText: rawText,
        isDefault: cv.isDefault || false
      })
    });

    return mapBackendCVToFrontend(json.data);
  }

  async updateCVMetadata(cvId: string, metadata: { title: string }): Promise<CV> {
    const token = getAuthToken();
    if (!token) {
      throw new ApiError('PATCH', `/api/v1/candidate/cvs/${cvId}/metadata`, 401, 'UNAUTHORIZED', 'Chưa đăng nhập hoặc token đã hết hạn.');
    }

    const json = await apiRequest<ApiEnvelope<unknown>>(`/api/v1/candidate/cvs/${cvId}/metadata`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ title: metadata.title })
    });

    return mapBackendCVToFrontend(json.data);
  }

  async uploadCandidateCV(file: File, title?: string, targetIndustry?: string, isDefault?: boolean): Promise<CV> {
    const token = getAuthToken();
    if (!token) {
      throw new ApiError('POST', '/api/v1/candidate/cvs/upload', 401, 'UNAUTHORIZED', 'Chưa đăng nhập hoặc token đã hết hạn.');
    }

    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);
    if (targetIndustry) formData.append('targetIndustry', targetIndustry);
    if (isDefault != null) formData.append('isDefault', String(isDefault));

    const json = await apiRequest<ApiEnvelope<unknown>>('/api/v1/candidate/cvs/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });

    return mapBackendCVToFrontend(json.data);
  }

  async deleteCandidateCV(cvId: string): Promise<void> {
    const token = getAuthToken();
    if (!token) {
      throw new ApiError('DELETE', `/api/v1/candidate/cvs/${cvId}`, 401, 'UNAUTHORIZED', 'Chưa đăng nhập hoặc token đã hết hạn.');
    }

    await apiRequest(`/api/v1/candidate/cvs/${cvId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  async fetchCVReview(cvId: string): Promise<CVReviewData> {
    const token = getAuthToken();
    if (!token) {
      throw new ApiError('GET', `/api/v1/candidate/cvs/${cvId}/review`, 401, 'UNAUTHORIZED', 'Chưa đăng nhập hoặc token đã hết hạn.');
    }
    const json = await apiRequest<{ data: CVReviewData }>(`/api/v1/candidate/cvs/${cvId}/review`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return json.data;
  }

  async fetchCVProcessingStatus(cvId: string): Promise<CVProcessingStatus> {
    const token = getAuthToken();
    if (!token) {
      throw new ApiError('GET', `/api/v1/candidate/cvs/${cvId}/processing-status`, 401, 'UNAUTHORIZED', 'Chưa đăng nhập hoặc token đã hết hạn.');
    }
    const json = await apiRequest<{ data: CVProcessingStatus }>(`/api/v1/candidate/cvs/${cvId}/processing-status`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return json.data;
  }

  subscribeCVProcessingEvents(
    identifier: { cvId?: string; jobId?: string },
    onEvent: (event: CVProcessingEvent) => void,
    onError?: (err: Error) => void
  ): () => void {
    const endpoint = identifier.jobId
      ? `/api/v1/candidate/cvs/processing/${identifier.jobId}/events`
      : `/api/v1/candidate/cvs/${identifier.cvId}/events`;
    return subscribeProgress(
      (lastId, signal) => authorizedFetch(`${BASE_URL}${endpoint}`, {
        headers: { Accept: 'text/event-stream', ...(lastId ? { 'Last-Event-ID': lastId } : {}) },
        cache: 'no-store', signal
      }),
      isCVProcessingEvent, onEvent, onError
    );
  }


  async downloadCVFile(cvId: string, format: string, defaultFilename: string): Promise<void> {
    const token = getAuthToken();
    const url = `${BASE_URL}/api/v1/candidate/cvs/${cvId}/download/${format}`;
    const res = await authorizedFetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!res.ok) {
      throw new Error(`Tải tập tin thất bại: ${res.statusText}`);
    }
    const blob = await res.blob();
    const disposition = res.headers.get('Content-Disposition');
    let filename = defaultFilename;
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) filename = match[1];
    }
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
  }

  async retryCVExtraction(cvId: string): Promise<CVReviewData> {
    const token = getAuthToken();
    if (!token) {
      throw new ApiError('POST', `/api/v1/candidate/cvs/${cvId}/retry`, 401, 'UNAUTHORIZED', 'Chưa đăng nhập hoặc token đã hết hạn.');
    }
    const json = await apiRequest<ApiEnvelope<CVReviewData>>(`/api/v1/candidate/cvs/${cvId}/retry`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    return json.data;
  }

  async fetchCVDraft(cvId: string): Promise<CVDraftData> {
    const token = getAuthToken();
    if (!token) {
      throw new ApiError('GET', `/api/v1/candidate/cvs/${cvId}/draft`, 401, 'UNAUTHORIZED', 'Chưa đăng nhập hoặc token đã hết hạn.');
    }
    const json = await apiRequest<ApiEnvelope<CVDraftData>>(`/api/v1/candidate/cvs/${cvId}/draft`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return json.data;
  }

  async updateCVDraft(cvId: string, draftData: Record<string, unknown>): Promise<CVDraftData> {
    const token = getAuthToken();
    if (!token) {
      throw new ApiError('PUT', `/api/v1/candidate/cvs/${cvId}/draft`, 401, 'UNAUTHORIZED', 'Chưa đăng nhập hoặc token đã hết hạn.');
    }
    const json = await apiRequest<ApiEnvelope<CVDraftData>>(`/api/v1/candidate/cvs/${cvId}/draft`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(draftData)
    });
    return json.data;
  }

  async confirmCandidateCV(cvId: string): Promise<{ cv_id: string; profile_id: string; status: string; confirmed_at: string }> {
    const token = getAuthToken();
    if (!token) {
      throw new ApiError('POST', `/api/v1/candidate/cvs/${cvId}/confirm`, 401, 'UNAUTHORIZED', 'Chưa đăng nhập hoặc token đã hết hạn.');
    }
    const json = await apiRequest<ApiEnvelope<{ cv_id: string; profile_id: string; status: string; confirmed_at: string }>>(`/api/v1/candidate/cvs/${cvId}/confirm`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    return json.data;
  }

  async fetchCVVersions(cvId: string): Promise<CVVersion[]> {
    const token = getAuthToken();
    if (!token) {
      throw new ApiError('GET', `/api/v1/candidate/cvs/${cvId}/versions`, 401, 'UNAUTHORIZED', 'Chưa đăng nhập hoặc token đã hết hạn.');
    }
    const json = await apiRequest<ApiEnvelope<CVVersion[]> | CVVersion[]>(`/api/v1/candidate/cvs/${cvId}/versions`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return Array.isArray(json) ? json : (json?.data ?? []);
  }

  async searchTaxonomySkills(query: string, limit = 10, category?: string): Promise<TaxonomySkillItem[]> {
    const categoryParam = category ? `&category=${encodeURIComponent(category)}` : '';
    const json = await apiRequest<ApiEnvelope<{ skills?: TaxonomySkillItem[] }>>(`/api/v1/taxonomy/skills/search?query=${encodeURIComponent(query)}&limit=${limit}${categoryParam}`);
    return json.data.skills || [];
  }

  async fetchFavoriteSkills(): Promise<TaxonomySkillItem[]> {
    const token = getAuthToken();
    if (!token) return [];
    try {
      const json = await apiRequest<ApiEnvelope<{ favorites?: TaxonomySkillItem[] }>>('/api/v1/taxonomy/favorites', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return json?.data?.favorites || [];
    } catch (err) {
      console.warn('Failed to load user favorite skills:', err);
      return [];
    }
  }

  async addFavoriteSkill(skillId: string): Promise<TaxonomySkillItem> {
    const token = getAuthToken();
    if (!token) {
      throw new ApiError('POST', `/api/v1/taxonomy/favorites/${skillId}`, 401, 'UNAUTHORIZED', 'Chưa đăng nhập.');
    }
    const json = await apiRequest<ApiEnvelope<TaxonomySkillItem>>(`/api/v1/taxonomy/favorites/${skillId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    return json?.data;
  }

  async removeFavoriteSkill(skillId: string): Promise<TaxonomySkillItem> {
    const token = getAuthToken();
    if (!token) {
      throw new ApiError('DELETE', `/api/v1/taxonomy/favorites/${skillId}`, 401, 'UNAUTHORIZED', 'Chưa đăng nhập.');
    }
    const json = await apiRequest<ApiEnvelope<TaxonomySkillItem>>(`/api/v1/taxonomy/favorites/${skillId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    return json?.data;
  }

  async uploadCVEvidence(cvId: string, file: File, itemType: 'CERTIFICATION' | 'LANGUAGE', itemId: string): Promise<UploadedEvidenceResponse> {
    const token = getAuthToken();
    if (!token) {
      throw new ApiError('POST', `/api/v1/candidate/cvs/${cvId}/attachments`, 401, 'UNAUTHORIZED', 'Chưa đăng nhập hoặc token đã hết hạn.');
    }
    const formData = new FormData();
    formData.append('file', file);
    formData.append('itemType', itemType);
    formData.append('itemId', itemId);

    const url = `${BASE_URL}/api/v1/candidate/cvs/${cvId}/attachments`;
    const res = await authorizedFetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new ApiError('POST', url, res.status, res.statusText, errJson?.message || 'Tải minh chứng thất bại.');
    }
    const json = await res.json();
    return json?.data;
  }

  async deleteCVEvidence(cvId: string, attachmentId: string): Promise<void> {
    const token = getAuthToken();
    if (!token) {
      throw new ApiError('DELETE', `/api/v1/candidate/cvs/${cvId}/attachments/${attachmentId}`, 401, 'UNAUTHORIZED', 'Chưa đăng nhập.');
    }
    await apiRequest(`/api/v1/candidate/cvs/${cvId}/attachments/${attachmentId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  async downloadCVEvidence(cvId: string, attachmentId: string, fileName: string): Promise<void> {
    const token = getAuthToken();
    if (!token) {
      throw new ApiError('GET', `/api/v1/candidate/cvs/${cvId}/attachments/${attachmentId}`, 401, 'UNAUTHORIZED', 'Chưa đăng nhập.');
    }
    const url = `${BASE_URL}/api/v1/candidate/cvs/${cvId}/attachments/${attachmentId}`;
    const res = await authorizedFetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      const contentType = res.headers.get('content-type') || '';
      const message = contentType.includes('json') ? (await res.json().catch(() => null))?.message : null;
      throw new ApiError('GET', url, res.status, res.statusText, message || 'Không thể tải minh chứng.');
    }
    const blob = await res.blob();
    if (!blob.size || (res.headers.get('content-type') || '').includes('application/json')) throw new Error('Tệp minh chứng trống hoặc phản hồi không phải là tệp.');
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 1000);
  }

  async fetchCVEvidenceBlob(cvId: string, attachmentId: string): Promise<Blob> {
    const token = getAuthToken();
    if (!token) throw new ApiError('GET', `/api/v1/candidate/cvs/${cvId}/attachments/${attachmentId}`, 401, 'UNAUTHORIZED', 'Chưa đăng nhập.');
    const url = `${BASE_URL}/api/v1/candidate/cvs/${cvId}/attachments/${attachmentId}`;
    const response = await authorizedFetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
    if (!response.ok) throw new ApiError('GET', url, response.status, response.statusText, 'Không thể mở tệp minh chứng.');
    const blob = await response.blob();
    if (!blob.size || (response.headers.get('content-type') || '').includes('application/json')) throw new Error('Tệp minh chứng trống hoặc phản hồi không phải là tệp.');
    return blob;
  }


  async fetchCandidateApplications(): Promise<Application[]> {
    const token = getAuthToken();
    if (!token) {
      throw new ApiError('GET', '/api/v1/candidate/applications', 401, 'UNAUTHORIZED', 'Chưa đăng nhập hoặc token đã hết hạn.');
    }

    const user = getAuthUser();
    const rawList = (await fetchAllApiRows('/api/v1/candidate/applications')).filter(isBackendApplication);
    return rawList.map((app) => ({
      id: String(app.id),
      job: {
        id: String(app.jobId),
        title: app.jobTitle || '',
        companyName: app.companyName || '',
        companyVerified: true,
        industry: (app.industry || 'Technology') as Industry,
        employmentType: 'FULL_TIME',
        seniority: '',
        location: '',
        salaryMin: 0,
        salaryMax: 0,
        publishedDate: app.appliedAt ? String(app.appliedAt).split('T')[0] : '',
        description: '',
        requirements: [],
        status: 'PUBLISHED'
      },
      appliedCvId: String(app.appliedCvId || ''),
      appliedCvTitle: app.snapshot?.cvTitle || 'CV Ứng tuyển',
      appliedCvVersion: app.appliedCvVersionNumber ?? null,
      appliedCvVersionId: app.appliedCvVersionId ?? undefined,
      candidateName: app.candidateName || user?.fullName || '',
      status: toApplicationStatus(app.status),
      appliedDate: app.appliedAt ? String(app.appliedAt).split('T')[0] : ''
    }));
  }

  async submitApplication(app: Application): Promise<Application> {
    const token = getAuthToken();
    if (!token) {
      throw new ApiError('POST', '/api/v1/candidate/applications', 401, 'UNAUTHORIZED', 'Chưa đăng nhập hoặc token đã hết hạn.');
    }

    const json = await apiRequest<ApiEnvelope<BackendApplicationDto>>('/api/v1/candidate/applications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        jobId: app.job.id,
        cvId: app.appliedCvId
      })
    });

    const data = json.data;
    return {
      ...app,
      id: String(data.id),
      appliedCvVersion: data.appliedCvVersionNumber ?? null,
      appliedCvVersionId: data.appliedCvVersionId ?? undefined,
      status: toApplicationStatus(data.status),
      appliedDate: data.appliedAt ? String(data.appliedAt).split('T')[0] : new Date().toISOString().split('T')[0]
    };
  }

  async fetchJobApplications(jobId: string): Promise<Application[]> {
    const token = getAuthToken();
    if (!token) {
      throw new ApiError('GET', `/api/v1/recruiter/jobs/${jobId}/applications`, 401, 'UNAUTHORIZED', 'Chưa đăng nhập tài khoản nhà tuyển dụng.');
    }

    const rawList = (await fetchAllApiRows(`/api/v1/recruiter/jobs/${jobId}/applications`)).filter(isBackendApplication);
    return rawList.map((app) => ({
      id: String(app.id),
      job: {
        id: String(app.jobId),
        title: app.jobTitle || '',
        companyName: '',
        companyVerified: true,
        industry: 'Technology',
        employmentType: 'FULL_TIME',
        seniority: '',
        location: '',
        salaryMin: 0,
        salaryMax: 0,
        publishedDate: app.appliedAt ? String(app.appliedAt).split('T')[0] : '',
        description: '',
        requirements: [],
        status: 'PUBLISHED'
      },
      appliedCvId: String(app.appliedCvId || ''),
      appliedCvTitle: app.snapshot?.cvTitle || 'CV Ứng tuyển',
      appliedCvVersion: app.appliedCvVersionNumber ?? null,
      appliedCvVersionId: app.appliedCvVersionId ?? undefined,
      candidateName: app.candidateName || '',
      candidateEmail: app.candidateEmail ?? undefined,
      candidatePhone: app.candidatePhone ?? undefined,
      candidateHeadline: app.candidateHeadline ?? undefined,
      status: toApplicationStatus(app.status),
      matchScore: app.matchScore != null ? Number(app.matchScore) : undefined,
      matchStatus: app.matchStatus ?? undefined,
      appliedDate: app.appliedAt ? String(app.appliedAt).split('T')[0] : '',
      snapshot: app.snapshot ? {
        cvTitle: app.snapshot.cvTitle ?? undefined,
        rawTextSnapshot: app.snapshot.rawTextSnapshot ?? undefined,
        snapshotCreatedAt: app.snapshot.snapshotCreatedAt ? String(app.snapshot.snapshotCreatedAt) : undefined
      } : undefined
    }));
  }

  async fetchApplicationById(applicationId: string): Promise<Application | null> {
    const token = getAuthToken();
    if (!token) {
      throw new ApiError('GET', `/api/v1/recruiter/applications/${applicationId}`, 401, 'UNAUTHORIZED', 'Chưa đăng nhập tài khoản nhà tuyển dụng.');
    }

    const json = await apiRequest<ApiEnvelope<BackendApplicationDto | null>>(`/api/v1/recruiter/applications/${applicationId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const app = json.data;
    if (!app) return null;

    return {
      id: String(app.id),
      job: {
        id: String(app.jobId),
        title: app.jobTitle || '',
        companyName: '',
        companyVerified: true,
        industry: 'Technology',
        employmentType: 'FULL_TIME',
        seniority: '',
        location: '',
        salaryMin: 0,
        salaryMax: 0,
        publishedDate: '',
        description: '',
        requirements: [],
        status: 'PUBLISHED'
      },
      appliedCvId: String(app.appliedCvId || ''),
      appliedCvTitle: app.snapshot?.cvTitle || 'CV Ứng tuyển',
      appliedCvVersion: app.appliedCvVersionNumber ?? null,
      appliedCvVersionId: app.appliedCvVersionId ?? undefined,
      candidateName: app.candidateName || '',
      candidateEmail: app.candidateEmail ?? undefined,
      candidatePhone: app.candidatePhone ?? undefined,
      candidateHeadline: app.candidateHeadline ?? undefined,
      githubUrl: app.candidateGithubUrl ?? undefined,
      status: toApplicationStatus(app.status),
      matchScore: app.matchScore != null ? Number(app.matchScore) : undefined,
      matchStatus: app.matchStatus ?? undefined,
      appliedDate: app.appliedAt ? String(app.appliedAt).split('T')[0] : '',
      snapshot: app.snapshot ? {
        cvTitle: app.snapshot.cvTitle ?? undefined,
        rawTextSnapshot: app.snapshot.rawTextSnapshot ?? undefined,
        snapshotCreatedAt: app.snapshot.snapshotCreatedAt ? String(app.snapshot.snapshotCreatedAt) : undefined
      } : undefined
    };
  }

  async updateApplicationStatus(applicationId: string, status: ApplicationStatus, decisionNote?: string, expectedStatus?: ApplicationStatus): Promise<Application> {
    const token = getAuthToken();
    if (!token) {
      throw new ApiError('PUT', `/api/v1/recruiter/applications/${applicationId}/status`, 401, 'UNAUTHORIZED', 'Chưa đăng nhập tài khoản nhà tuyển dụng.');
    }

    const json = await apiRequest<ApiEnvelope<BackendApplicationDto>>(`/api/v1/recruiter/applications/${applicationId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        status,
        decisionNote: decisionNote || '',
        expectedStatus
      })
    });

    const app = json.data;
    return {
      id: String(app.id),
      job: {
        id: String(app.jobId),
        title: app.jobTitle || '',
        companyName: '',
        companyVerified: true,
        industry: 'Technology',
        employmentType: 'FULL_TIME',
        seniority: '',
        location: '',
        salaryMin: 0,
        salaryMax: 0,
        publishedDate: '',
        description: '',
        requirements: [],
        status: 'PUBLISHED'
      },
      appliedCvId: String(app.appliedCvId || ''),
      appliedCvTitle: app.snapshot?.cvTitle || 'CV Ứng tuyển',
      appliedCvVersion: app.appliedCvVersionNumber ?? null,
      appliedCvVersionId: app.appliedCvVersionId ?? undefined,
      candidateName: app.candidateName || '',
      candidateEmail: app.candidateEmail ?? undefined,
      candidatePhone: app.candidatePhone ?? undefined,
      candidateHeadline: app.candidateHeadline ?? undefined,
      githubUrl: app.candidateGithubUrl ?? undefined,
      status: toApplicationStatus(app.status, status),
      matchScore: app.matchScore != null ? Number(app.matchScore) : undefined,
      matchStatus: app.matchStatus ?? undefined,
      appliedDate: app.appliedAt ? String(app.appliedAt).split('T')[0] : '',
      snapshot: app.snapshot ? {
        cvTitle: app.snapshot.cvTitle ?? undefined,
        rawTextSnapshot: app.snapshot.rawTextSnapshot ?? undefined,
        snapshotCreatedAt: app.snapshot.snapshotCreatedAt ? String(app.snapshot.snapshotCreatedAt) : undefined
      } : undefined
    };
  }

  async fetchApplicationAuditLogs(applicationId: string): Promise<ApplicationAuditLogItem[]> {
    const token = getAuthToken();
    if (!token) {
      throw new ApiError('GET', `/api/v1/recruiter/applications/${applicationId}/audit-logs`, 401, 'UNAUTHORIZED', 'Chưa đăng nhập tài khoản nhà tuyển dụng.');
    }

    const json = await apiRequest<unknown>(`/api/v1/recruiter/applications/${applicationId}/audit-logs`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const rawList = getApiRows(json).filter(isRecord);
    return rawList.map((item) => ({
      id: String(item.id),
      applicationId: String(item.applicationId),
      recruiterUserId: String(item.recruiterUserId),
      previousStatus: toApplicationStatus(item.previousStatus),
      newStatus: toApplicationStatus(item.newStatus),
      decisionNote: readString(item.decisionNote),
      createdAt: item.createdAt ? String(item.createdAt) : ''
    }));
  }

  async fetchRecruiterProfile(): Promise<RecruiterProfile> {
    const user = getAuthUser();
    const token = getAuthToken();
    if (!token || !user) {
      throw new ApiError('GET', '/api/v1/recruiter/profile', 401, 'UNAUTHORIZED', 'Chưa đăng nhập tài khoản nhà tuyển dụng.');
    }

    const company = await this.fetchRecruiterCompany();
    return {
      id: user.id,
      userId: user.id,
      fullName: user.fullName || '',
      email: user.email,
      company
    };
  }

  async fetchRecruiterCompany(): Promise<Company> {
    const token = getAuthToken();
    if (!token) {
      throw new ApiError('GET', '/api/v1/recruiter/company', 401, 'UNAUTHORIZED', 'Chưa đăng nhập tài khoản nhà tuyển dụng.');
    }

    const json = await apiRequest<ApiEnvelope<CompanyApiDto>>('/api/v1/recruiter/company', {
      headers: { Authorization: `Bearer ${token}` }
    });

    const c = json.data;
    if (!c) {
      throw new ApiError('GET', '/api/v1/recruiter/company', 404, 'NOT_FOUND', 'Không tìm thấy dữ liệu hồ sơ công ty.');
    }

    return {
      id: String(c.id),
      name: c.name || '',
      taxCode: c.taxCode || '',
      industry: toIndustry(c.industry),
      website: c.website || '',
      companySize: c.size || '',
      contactEmail: getAuthUser()?.email || '',
      verificationStatus: c.verificationStatus || 'PENDING',
      verificationReason: c.verificationReason || c.reviewNotes || (c.verificationStatus === 'VERIFIED' ? 'Doanh nghiệp đã được xác thực.' : undefined)
    };
  }

  async saveCompanyProfile(company: Company): Promise<Company> {
    const token = getAuthToken();
    if (!token) {
      throw new ApiError('PUT', '/api/v1/recruiter/company', 401, 'UNAUTHORIZED', 'Chưa đăng nhập tài khoản nhà tuyển dụng.');
    }

    const json = await apiRequest<ApiEnvelope<CompanyApiDto>>('/api/v1/recruiter/company', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        name: company.name,
        taxCode: company.taxCode,
        industry: company.industry,
        website: company.website,
        size: company.companySize,
        description: company.verificationReason || ''
      })
    });

    const c = json.data;
    return {
      ...company,
      id: String(c?.id || company.id),
      name: c?.name || company.name,
      taxCode: c?.taxCode || company.taxCode,
      verificationStatus: c?.verificationStatus || company.verificationStatus,
      verificationReason: c?.verificationReason || c?.reviewNotes || company.verificationReason
    };
  }

  async submitCompanyVerification(): Promise<Company> {
    const token = getAuthToken();
    if (!token) {
      throw new ApiError('POST', '/api/v1/recruiter/company/submit-verification', 401, 'UNAUTHORIZED', 'Chưa đăng nhập tài khoản nhà tuyển dụng.');
    }

    const json = await apiRequest<ApiEnvelope<CompanyApiDto>>('/api/v1/recruiter/company/submit-verification', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const c = json.data;
    return {
      id: String(c?.id || ''),
      name: c?.name || '',
      taxCode: c?.taxCode || '',
      industry: toIndustry(c?.industry),
      website: c?.website || '',
      companySize: c?.size || '',
      contactEmail: getAuthUser()?.email || '',
      verificationStatus: c?.verificationStatus || 'PENDING',
      verificationReason: c?.verificationReason || c?.reviewNotes || undefined
    };
  }

  async fetchRecruiterJobs(): Promise<Job[]> {
    return (await fetchAllApiRows('/api/v1/recruiter/jobs')).map(mapBackendJobToFrontend);
  }

  async saveJob(job: Job): Promise<Job> {
    const token = getAuthToken();
    if (!token) {
      throw new ApiError('POST', '/api/v1/jobs/draft', 401, 'UNAUTHORIZED', 'Chưa đăng nhập tài khoản nhà tuyển dụng.');
    }

    const reqPayload = {
      title: job.title,
      industry: job.industryOther ? 'OTHER' : job.industry,
      industryOther: job.industryOther,
      seniority: job.seniorityOther ? 'OTHER' : job.seniority,
      seniorityOther: job.seniorityOther,
      minSalary: job.salaryMin,
      maxSalary: job.salaryMax,
      salaryNegotiable: job.salaryNegotiable === true,
      salaryCurrency: job.salaryCurrency || 'VND',
      location: job.location,
      employmentType: job.employmentTypeOther ? 'OTHER' : job.employmentType,
      employmentTypeOther: job.employmentTypeOther,
      description: job.description || (job.responsibilities ? job.responsibilities.join('\n') : job.title),
      responsibilities: job.responsibilities || [],
      requirements: (job.requirements || []).map(r => ({
        skillName: r.skillName,
        type: r.requirementType,
        minYearsExp: r.minExperienceYears || r.minYearsExperience || 0
      }))
    };

    const existingId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(job.id);
    const json = await apiRequest<ApiEnvelope<unknown>>(existingId ? `/api/v1/jobs/${job.id}` : '/api/v1/jobs/draft', {
      method: existingId ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(reqPayload)
    });

    const savedJob = mapBackendJobToFrontend(json.data);

    if (job.status === 'PUBLISHED' && savedJob.status !== 'PUBLISHED') {
      return (await this.publishJob(savedJob.id)) || savedJob;
    }

    return savedJob;
  }

  async publishJob(jobId: string): Promise<Job | null> {
    const token = getAuthToken();
    if (!token) {
      throw new ApiError('POST', `/api/v1/jobs/${jobId}/publish`, 401, 'UNAUTHORIZED', 'Chưa đăng nhập tài khoản nhà tuyển dụng.');
    }

    const json = await apiRequest<ApiEnvelope<unknown>>(`/api/v1/jobs/${jobId}/publish`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    return mapBackendJobToFrontend(json.data);
  }

  async closeJob(jobId: string): Promise<Job | null> {
    const token = getAuthToken();
    if (!token) {
      throw new ApiError('POST', `/api/v1/jobs/${jobId}/close`, 401, 'UNAUTHORIZED', 'Chưa đăng nhập tài khoản nhà tuyển dụng.');
    }

    const json = await apiRequest<ApiEnvelope<unknown>>(`/api/v1/jobs/${jobId}/close`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    return mapBackendJobToFrontend(json.data);
  }

  async fetchCandidateRankings(jobId: string): Promise<CandidateRankingItem[]> {
    const token = getAuthToken();
    if (!token) {
      throw new ApiError('GET', `/api/v1/matching/jobs/${jobId}/rankings`, 401, 'UNAUTHORIZED', 'Chưa đăng nhập tài khoản nhà tuyển dụng.');
    }

    const json = await apiRequest<unknown>(`/api/v1/matching/jobs/${jobId}/rankings`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const rawList = getApiRows(json).filter(isRecord);
    return rawList.map((item, idx) => {
      const app = isRecord(item.application) ? item.application : null;
      const cand = app && isRecord(app.candidate) ? app.candidate : null;
      const fallbackCandidate = isRecord(item.candidate) ? item.candidate : null;
      const appliedAt = app ? readString(app.appliedAt) : '';
      const requiredMissing = Array.isArray(item.requiredSkillsMissingNames)
        ? item.requiredSkillsMissingNames.filter((name): name is string => typeof name === 'string')
        : [];
      const rank = readNumber(item.rank);
      const overall = readNumber(item.overallMatchScore ?? item.overallScore);
      const core = readNumber(item.coreJdCvScore ?? item.coreScore);
      const githubScore = readNumber(item.githubSupportingScore ?? item.githubScore);
      const requiredMatched = readNumber(item.requiredSkillsMatched);
      const requiredTotal = readNumber(item.requiredSkillsTotal);
      const experienceYears = readNumber(item.relevantExperienceYears ?? cand?.yearsOfExperience);
      return {
        rank: rank || idx + 1,
        applicationId: String(app?.id || item.applicationId || item.id || ''),
        candidateId: String(cand?.id || item.candidateId || ''),
        candidateName: readString(cand?.fullName) || readString(item.candidateName) || readString(fallbackCandidate?.fullName),
        headline: readString(cand?.headline) || readString(item.headline),
        overallMatchScore: overall || 0,
        coreJdCvScore: core || 0,
        githubSupportingScore: githubScore ?? undefined,
        requiredSkillsMatched: requiredMatched || 0,
        requiredSkillsTotal: requiredTotal || 0,
        requiredSkillsMissingNames: requiredMissing,
        relevantExperienceYears: experienceYears || 0,
        appliedDate: appliedAt ? appliedAt.split('T')[0] : readString(item.appliedDate),
        status: toApplicationStatus(app?.status || item.status),
        gitHubConnected: !!(item.gitHubConnected ?? (item.isGithubActive && item.githubScore != null))
      };
    });
  }

  async fetchMatchInspection(applicationId: string): Promise<MatchInspectionData | null> {
    const token = getAuthToken();
    if (!token) {
      throw new ApiError('GET', `/api/v1/matching/applications/${applicationId}/inspection`, 401, 'UNAUTHORIZED', 'Chưa đăng nhập tài khoản nhà tuyển dụng.');
    }

    const url = `${BASE_URL}/api/v1/matching/applications/${applicationId}/inspection`;
    let res: Response;
    try {
      res = await authorizedFetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (netErr: unknown) {
      console.error(`[API ERROR] Network failure: GET ${url}`, netErr);
      throw new ApiError('GET', url, 0, 'NETWORK_ERROR', getErrorMessage(netErr, 'Lỗi kết nối mạng.'));
    }

    if (!res.ok) {
      if (res.status === 404) return null;
      let errBody: unknown = null;
      try { errBody = await res.json(); } catch { }
      const errMsg = (isRecord(errBody) ? readString(errBody.message) : '') || res.statusText || `GET /inspection thất bại: ${res.status}`;
      console.error(`[API ERROR] method=GET url=${url} status=${res.status} statusText=${res.statusText} message=${errMsg}`, errBody);
      throw new ApiError('GET', url, res.status, res.statusText, errMsg, errBody);
    }

    const json: unknown = await res.json();
    const unwrapped = getApiData(json);
    if (!isRecord(unwrapped) || (!unwrapped.applicationId && !unwrapped.id)) return null;
    const data = unwrapped;
    const github = isRecord(data.githubAssessment) ? data.githubAssessment : null;
    const distribution = github && isRecord(github.languageDistribution)
      ? Object.fromEntries(Object.entries(github.languageDistribution).flatMap(([language, count]) => {
        const numericCount = readNumber(count);
        return numericCount === null ? [] : [[language, numericCount]];
      }))
      : {};

    return {
      applicationId: String(data.applicationId || data.id),
      jobTitle: readString(data.jobTitle),
      candidateName: readString(data.candidateName),
      overallScore: Number(data.overallScore) || 0,
      coreScore: Number(data.coreScore) || 0,
      githubScore: data.githubScore != null ? Number(data.githubScore) : undefined,
      githubScoreActive: !!data.githubScoreActive,
      requiredSkillsStatus: getObjectRows(data.requiredSkillsStatus).map((skill) => ({
        skillName: readString(skill.skillName),
        requirementType: toRequirementType(skill.requirementType),
        status: toRequirementMatchStatus(skill.status),
        evidenceText: readString(skill.evidenceText) || undefined
      })),
      preferredSkillsStatus: getObjectRows(data.preferredSkillsStatus).map((skill) => ({
        skillName: readString(skill.skillName),
        requirementType: toRequirementType(skill.requirementType),
        status: toRequirementMatchStatus(skill.status),
        evidenceText: readString(skill.evidenceText) || undefined
      })),
      matchFactors: getObjectRows(data.matchFactors).map((factor) => ({
        factorName: readString(factor.factorName),
        score: readNumber(factor.score) ?? 0,
        status: readString(factor.status) || 'MODERATE',
        explanation: readString(factor.explanation),
        evidence: readString(factor.evidence) || undefined
      })),
      humanReadableExplanation: readString(data.humanReadableExplanation),
      githubAssessment: github ? {
        connected: github.connected === true,
        status: toGitHubStatus(github.status || (github.connected ? 'SYNCED' : 'NOT_CONNECTED')),
        username: readString(github.username) || undefined,
        publicRepoCount: readNumber(github.publicRepoCount) ?? undefined,
        topLanguages: Array.isArray(github.topLanguages) ? github.topLanguages.filter((language): language is string => typeof language === 'string') : [],
        languageDistribution: distribution,
        activitySignal: github.activitySignal === 'HIGH' || github.activitySignal === 'LOW' || github.activitySignal === 'MODERATE' || github.activitySignal === 'LIMITED_OBSERVABLE_ACTIVITY'
          ? github.activitySignal
          : (github.connected ? 'MODERATE' : 'LIMITED_OBSERVABLE_ACTIVITY'),
        latestActivityDaysAgo: readNumber(github.latestActivityDaysAgo) ?? undefined,
        repos: getObjectRows(github.repos).map((repo) => ({
          name: readString(repo.name),
          description: readString(repo.description),
          primaryLanguage: readString(repo.primaryLanguage),
          stars: readNumber(repo.stars) ?? 0,
          forks: readNumber(repo.forks) ?? 0,
          updatedDaysAgo: readNumber(repo.updatedDaysAgo) ?? 0,
          relevanceExplanation: readString(repo.relevanceExplanation)
        })),
        overallAssessment: readString(github.overallAssessment) || undefined
      } : {
        connected: false,
        status: 'NOT_CONNECTED'
      }
    };
  }

  async checkEmailAvailability(email: string): Promise<{ exists: boolean; status: 'AVAILABLE' | 'ALREADY_EXISTS' }> {
    const json = await apiRequest<AuthApiResponse<{ exists: boolean; status: string }>>(`/api/v1/auth/check-email?email=${encodeURIComponent(email)}`, {
      headers: { Accept: 'application/json' }
    });
    const data = json.data;
    if (!data || typeof data.exists !== 'boolean' || (data.status !== 'AVAILABLE' && data.status !== 'ALREADY_EXISTS')) {
      throw new Error('Phản hồi kiểm tra email không hợp lệ.');
    }
    return { exists: data.exists, status: data.status };
  }

  async registerCandidateAccount(payload: RegisterCandidatePayload): Promise<AuthResponse> {
    const json = await apiRequest<AuthApiResponse<RegistrationApiDto>>('/api/v1/auth/register/candidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    return {
      message: json.message || 'Đăng ký thành công. Vui lòng xác thực email.',
      email: json.data?.email || payload.email,
      emailVerified: false,
      devVerificationToken: json.data?.devVerificationToken
    };
  }

  async registerRecruiterAccount(payload: RegisterRecruiterPayload): Promise<AuthResponse> {
    const json = await apiRequest<AuthApiResponse<RegistrationApiDto>>('/api/v1/auth/register/recruiter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    return {
      message: json.message || 'Đăng ký thành công. Vui lòng xác thực email.',
      email: json.data?.email || payload.email,
      emailVerified: false,
      devVerificationToken: json.data?.devVerificationToken
    };
  }

  async verifyEmailToken(token: string): Promise<{ success: boolean; message: string }> {
    const json = await apiRequest<AuthApiResponse<unknown>>('/api/v1/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });

    return {
      success: true,
      message: json.message || 'Email đã được xác thực thành công. Bạn có thể đăng nhập ngay.'
    };
  }

  async resendVerificationToken(email: string): Promise<{ success: boolean; message: string; devVerificationToken?: string }> {
    const json = await apiRequest<AuthApiResponse<RegistrationApiDto>>('/api/v1/auth/resend-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    return {
      success: true,
      message: json.message || 'Email xác thực đã được gửi lại thành công.',
      devVerificationToken: json?.data?.devVerificationToken
    };
  }

  async loginAccount(email: string, password: string): Promise<LoginResponse> {
    const cleanEmail = email.trim();
    const json = await apiRequest<AuthApiResponse<LoginApiDto>>('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password })
    });

    const jwtData = json.data;
    if (!jwtData || !jwtData.userId || !jwtData.email || !jwtData.accessToken || !jwtData.refreshToken) {
      throw new Error('Phản hồi đăng nhập không hợp lệ.');
    }
    const user: User = {
      id: jwtData.userId,
      email: jwtData.email,
      fullName: jwtData.email.split('@')[0],
      role: jwtData.role === 'HR' ? 'RECRUITER' : (jwtData.role === 'ADMIN' ? 'ADMIN' : 'CANDIDATE'),
      emailVerified: true
    };
    return { user, accessToken: jwtData.accessToken, refreshToken: jwtData.refreshToken };
  }
}

// ============================================================
// 6. DEFAULT INSTANCE & TEST HARNESS BOUNDARY
// ============================================================

export const realApiClient: ApiClient = new RealApiClient();
let currentApiClient: ApiClient = realApiClient;

export function setApiClientForTesting(client: ApiClient): void {
  currentApiClient = client;
}

export function resetApiClient(): void {
  currentApiClient = realApiClient;
}

export function getActiveApiClient(): ApiClient {
  return currentApiClient;
}

// Global browser test harness hook (only active in non-production environments when explicitly called)
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  window.__MIDCV_TEST_HARNESS__ = {
    injectBenchmarkClient: async () => {
      const { BenchmarkFixtureClient } = await import('./benchmarkFixtures');
      setApiClientForTesting(new BenchmarkFixtureClient());
    },
    resetApiClient: () => {
      resetApiClient();
    }
  };
}

// ============================================================
// 7. EXPORTED BUSINESS FUNCTIONS (DELEGATE TO CURRENT CLIENT)
// ============================================================

export const fetchJobCatalog = (query = '', location = '') => currentApiClient.fetchJobCatalog ? currentApiClient.fetchJobCatalog(query, location) : currentApiClient.fetchJobs();
export const fetchJobs = (industry?: string) => currentApiClient.fetchJobs(industry);
export const fetchJobById = (id: string) => currentApiClient.fetchJobById(id);
export async function fetchRecruiterJobById(id: string): Promise<Job> {
  const response = await apiRequest<unknown>(`/api/v1/recruiter/jobs/${id}`);
  const job = getApiData(response);
  if (!job) throw new Error('Không tìm thấy tin tuyển dụng.');
  return mapBackendJobToFrontend(job);
}
export const fetchCandidateProfile = () => currentApiClient.fetchCandidateProfile();
export const saveCandidateProfile = (profile: CandidateProfile) => currentApiClient.saveCandidateProfile(profile);
export const fetchCandidateCVs = () => currentApiClient.fetchCandidateCVs();
export const fetchCVQuota = () => currentApiClient.fetchCVQuota();
export const saveCandidateCV = (cv: CreateCVRequest) => currentApiClient.saveCandidateCV(cv);
export const updateCVMetadata = (cvId: string, metadata: { title: string }) => currentApiClient.updateCVMetadata(cvId, metadata);
export const uploadCandidateCV = (file: File, title?: string, targetIndustry?: string, isDefault?: boolean) =>
  currentApiClient.uploadCandidateCV(file, title, targetIndustry, isDefault);
export const deleteCandidateCV = (cvId: string) => currentApiClient.deleteCandidateCV(cvId);
export const fetchCVReview = (cvId: string) => currentApiClient.fetchCVReview(cvId);
export const fetchCVProcessingStatus = (cvId: string) => currentApiClient.fetchCVProcessingStatus(cvId);
export const subscribeCVProcessingEvents = (
  identifier: { cvId?: string; jobId?: string },
  onEvent: (event: CVProcessingEvent) => void,
  onError?: (err: Error) => void
) => (currentApiClient.subscribeCVProcessingEvents ? currentApiClient.subscribeCVProcessingEvents(identifier, onEvent, onError) : () => { });
export const downloadCVFile = (cvId: string, format: string, defaultFilename: string) => currentApiClient.downloadCVFile(cvId, format, defaultFilename);
export const retryCVExtraction = (cvId: string) => currentApiClient.retryCVExtraction(cvId);
export const fetchCVDraft = (cvId: string) => currentApiClient.fetchCVDraft(cvId);
export const updateCVDraft = (cvId: string, draftData: Record<string, unknown>) => currentApiClient.updateCVDraft(cvId, draftData);
export const confirmCandidateCV = (cvId: string) => currentApiClient.confirmCandidateCV(cvId);
export const fetchCVVersions = (cvId: string) => currentApiClient.fetchCVVersions(cvId);
export const searchTaxonomySkills = (query: string, limit?: number, category?: string) => currentApiClient.searchTaxonomySkills(query, limit, category);
export const fetchFavoriteSkills = () => currentApiClient.fetchFavoriteSkills();
export const addFavoriteSkill = (skillId: string) => currentApiClient.addFavoriteSkill(skillId);
export const removeFavoriteSkill = (skillId: string) => currentApiClient.removeFavoriteSkill(skillId);
export const uploadCVEvidence = (cvId: string, file: File, itemType: 'CERTIFICATION' | 'LANGUAGE', itemId: string) => currentApiClient.uploadCVEvidence(cvId, file, itemType, itemId);
export const deleteCVEvidence = (cvId: string, attachmentId: string) => currentApiClient.deleteCVEvidence(cvId, attachmentId);
export const downloadCVEvidence = (cvId: string, attachmentId: string, fileName: string) => currentApiClient.downloadCVEvidence(cvId, attachmentId, fileName);
export const fetchCVEvidenceBlob = (cvId: string, attachmentId: string) => currentApiClient.fetchCVEvidenceBlob(cvId, attachmentId);
export const fetchCandidateApplications = () => currentApiClient.fetchCandidateApplications();
export const submitApplication = (app: Application) => currentApiClient.submitApplication(app);
export const fetchJobApplications = (jobId: string) => currentApiClient.fetchJobApplications(jobId);
export const fetchRecruiterProfile = () => currentApiClient.fetchRecruiterProfile();
export const fetchRecruiterCompany = () => currentApiClient.fetchRecruiterCompany();
export const saveCompanyProfile = (company: Company) => currentApiClient.saveCompanyProfile(company);
export const submitCompanyVerification = () => currentApiClient.submitCompanyVerification();
export const fetchRecruiterJobs = () => currentApiClient.fetchRecruiterJobs();
export const saveJob = (job: Job) => currentApiClient.saveJob(job);
export const publishJob = (jobId: string) => currentApiClient.publishJob(jobId);
export const closeJob = (jobId: string) => currentApiClient.closeJob(jobId);
export const fetchApplicationById = (applicationId: string) => currentApiClient.fetchApplicationById(applicationId);
export const updateApplicationStatus = (applicationId: string, status: ApplicationStatus, decisionNote?: string, expectedStatus?: ApplicationStatus) =>
  currentApiClient.updateApplicationStatus(applicationId, status, decisionNote, expectedStatus);
export const fetchApplicationAuditLogs = (applicationId: string) => currentApiClient.fetchApplicationAuditLogs(applicationId);
export const fetchCandidateRankings = (jobId: string) => currentApiClient.fetchCandidateRankings(jobId);
export const fetchMatchInspection = (applicationId: string) => currentApiClient.fetchMatchInspection(applicationId);
export const checkEmailAvailability = (email: string) => currentApiClient.checkEmailAvailability(email);
export const registerCandidateAccount = (payload: RegisterCandidatePayload) => currentApiClient.registerCandidateAccount(payload);
export const registerRecruiterAccount = (payload: RegisterRecruiterPayload) => currentApiClient.registerRecruiterAccount(payload);
export const verifyEmailToken = (token: string) => currentApiClient.verifyEmailToken(token);
export const resendVerificationToken = (email: string) => currentApiClient.resendVerificationToken(email);
export const loginAccount = (email: string, password: string) => currentApiClient.loginAccount(email, password);

// ============================================================
// 8. MIDCV AI ENGINE & QUICK SCREENING API CLIENTS
// ============================================================

export interface WorkerRuntimeConfiguration {
  status: string;
  configurationSource: string;
  restartRequiredForChanges?: boolean;
  primary?: { enabled: boolean; provider: string; model: string };
  fallback?: { enabled: boolean; provider: string; model: string };
  embedding?: { model: string; dimension: number };
  mockMode?: boolean;
}

export async function fetchAiRuntime(): Promise<{ backend: AiSettings; worker: WorkerRuntimeConfiguration; lastBackendCall: Record<string, string> }> {
  return apiRequest('/api/v1/admin/ai-settings/runtime');
}

export async function fetchJobApplicationCount(jobId: string): Promise<number> {
  const result = await apiRequest<ApiEnvelope<ApiPage<JsonRecord>>>(`/api/v1/recruiter/jobs/${jobId}/applications?page=0&size=1`);
  const count = result.data?.totalElements;
  if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0)
    throw new Error('Không thể xác nhận số lượng đơn ứng tuyển.');
  return count;
}

export async function deleteDraftJob(jobId: string): Promise<void> {
  await apiRequest(`/api/v1/jobs/${jobId}`, { method: 'DELETE' });
}

export async function fetchAiSettings(): Promise<AiSettings> {
  return apiRequest<AiSettings>('/api/v1/admin/ai-settings');
}

export async function updateAiSettings(body: Partial<AiSettings> & { cloudApiKey?: string }): Promise<AiSettings> {
  return apiRequest<AiSettings>('/api/v1/admin/ai-settings', {
    method: 'PUT',
    body: JSON.stringify(body)
  });
}

export async function testAiSettings(body: Partial<AiSettings> & { cloudApiKey?: string }): Promise<{ healthy: boolean; latencyMs?: number; message?: string; error?: string }> {
  return apiRequest<{ healthy: boolean; latencyMs?: number; message?: string; error?: string }>('/api/v1/admin/ai-settings/test', {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

export async function uploadQuickScreening(jobId: string, file: File, githubEnabled = true): Promise<{ id: string; jobId: string; document: Record<string, unknown> }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('githubEnabled', String(githubEnabled));
  return apiRequest<{ id: string; jobId: string; document: Record<string, unknown> }>(`/api/v1/hr/jobs/${jobId}/screenings`, {
    method: 'POST',
    body: formData
  });
}

export async function fetchQuickScreenings(jobId: string, page = 0, size = 20): Promise<QuickScreeningRun[]> {
  const response = await apiRequest<unknown>(`/api/v1/hr/jobs/${jobId}/screenings?page=${page}&size=${size}`);
  const payload = isRecord(response) && 'data' in response ? response.data : response;
  const rows = Array.isArray(payload)
    ? payload
    : isRecord(payload) && Array.isArray(payload.content)
      ? payload.content
      : [];
  return rows.filter(isQuickScreeningRun);
}

function isQuickScreeningRun(value: unknown): value is QuickScreeningRun {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.processing_state === 'string'
    && (value.score === null || typeof value.score === 'number');
}

export async function fetchScreeningDetail(screeningId: string): Promise<QuickScreeningDetail> {
  return apiRequest<QuickScreeningDetail>(`/api/v1/hr/screenings/${screeningId}`);
}

export async function rematchScreening(screeningId: string): Promise<{ jobId: string }> {
  return apiRequest<{ jobId: string }>(`/api/v1/hr/screenings/${screeningId}/match`, {
    method: 'POST'
  });
}

// ============================================================
// 9. CENTRAL ADMIN PORTAL API CLIENTS
// ============================================================

export async function fetchAdminDashboardStats(): Promise<AdminDashboardStats> {
  const res = await apiRequest<ApiEnvelope<AdminDashboardStats> | AdminDashboardStats>('/api/v1/admin/dashboard');
  return unwrapApiData(res);
}

export async function fetchAdminCompanies(params: {
  query?: string;
  status?: string;
  page?: number;
  size?: number;
} = {}): Promise<{ content: CompanyAdminDto[]; totalElements: number; totalPages: number }> {
  const queryParts: string[] = [];
  if (params.query) queryParts.push(`query=${encodeURIComponent(params.query)}`);
  if (params.status && params.status !== 'ALL') queryParts.push(`status=${params.status}`);
  if (params.page != null) queryParts.push(`page=${params.page}`);
  if (params.size != null) queryParts.push(`size=${params.size}`);
  const qs = queryParts.length ? `?${queryParts.join('&')}` : '';
  const res = await apiRequest<ApiEnvelope<ApiPage<CompanyAdminDto>> | ApiPage<CompanyAdminDto>>(`/api/v1/admin/companies${qs}`);
  return unwrapApiData(res);
}

export async function fetchAdminCompanyDetail(id: string): Promise<CompanyAdminDto> {
  const res = await apiRequest<ApiEnvelope<CompanyAdminDto> | CompanyAdminDto>(`/api/v1/admin/companies/${id}`);
  return unwrapApiData(res);
}

export async function transitionCompanyVerification(id: string, body: {
  status: string;
  reason?: string;
  version?: number;
}): Promise<CompanyAdminDto> {
  const res = await apiRequest<ApiEnvelope<CompanyAdminDto> | CompanyAdminDto>(`/api/v1/admin/companies/${id}/transition`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return unwrapApiData(res);
}

export async function fetchAdminCandidates(params: {
  query?: string;
  isActive?: boolean;
  page?: number;
  size?: number;
} = {}): Promise<{ content: UserAdminDto[]; totalElements: number; totalPages: number }> {
  const queryParts: string[] = [];
  if (params.query) queryParts.push(`query=${encodeURIComponent(params.query)}`);
  if (params.isActive != null) queryParts.push(`isActive=${params.isActive}`);
  if (params.page != null) queryParts.push(`page=${params.page}`);
  if (params.size != null) queryParts.push(`size=${params.size}`);
  const qs = queryParts.length ? `?${queryParts.join('&')}` : '';
  const res = await apiRequest<ApiEnvelope<ApiPage<UserAdminDto>> | ApiPage<UserAdminDto>>(`/api/v1/admin/candidates${qs}`);
  return unwrapApiData(res);
}

export async function fetchAdminRecruiters(params: {
  query?: string;
  isActive?: boolean;
  page?: number;
  size?: number;
} = {}): Promise<{ content: UserAdminDto[]; totalElements: number; totalPages: number }> {
  const queryParts: string[] = [];
  if (params.query) queryParts.push(`query=${encodeURIComponent(params.query)}`);
  if (params.isActive != null) queryParts.push(`isActive=${params.isActive}`);
  if (params.page != null) queryParts.push(`page=${params.page}`);
  if (params.size != null) queryParts.push(`size=${params.size}`);
  const qs = queryParts.length ? `?${queryParts.join('&')}` : '';
  const res = await apiRequest<ApiEnvelope<ApiPage<UserAdminDto>> | ApiPage<UserAdminDto>>(`/api/v1/admin/recruiters${qs}`);
  return unwrapApiData(res);
}

export async function suspendUser(id: string, reason: string): Promise<void> {
  await apiRequest(`/api/v1/admin/users/${id}/suspend`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function reactivateUser(id: string, reason?: string): Promise<void> {
  await apiRequest(`/api/v1/admin/users/${id}/reactivate`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function fetchAdminJobs(params: {
  query?: string;
  status?: string;
  page?: number;
  size?: number;
} = {}): Promise<{ content: JobAdminDto[]; totalElements: number; totalPages: number }> {
  const queryParts: string[] = [];
  if (params.query) queryParts.push(`query=${encodeURIComponent(params.query)}`);
  if (params.status && params.status !== 'ALL') queryParts.push(`status=${params.status}`);
  if (params.page != null) queryParts.push(`page=${params.page}`);
  if (params.size != null) queryParts.push(`size=${params.size}`);
  const qs = queryParts.length ? `?${queryParts.join('&')}` : '';
  const res = await apiRequest<ApiEnvelope<ApiPage<JobAdminDto>> | ApiPage<JobAdminDto>>(`/api/v1/admin/jobs${qs}`);
  return unwrapApiData(res);
}

export async function suspendJob(id: string, reason: string): Promise<void> {
  await apiRequest(`/api/v1/admin/jobs/${id}/suspend`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function restoreJob(id: string): Promise<void> {
  await apiRequest(`/api/v1/admin/jobs/${id}/restore`, {
    method: 'POST',
  });
}

export async function fetchAdminReports(params: {
  status?: string;
  targetType?: string;
  page?: number;
  size?: number;
} = {}): Promise<{ content: ReportAdminDto[]; totalElements: number; totalPages: number }> {
  const queryParts: string[] = [];
  if (params.status && params.status !== 'ALL') queryParts.push(`status=${params.status}`);
  if (params.targetType && params.targetType !== 'ALL') queryParts.push(`targetType=${params.targetType}`);
  if (params.page != null) queryParts.push(`page=${params.page}`);
  if (params.size != null) queryParts.push(`size=${params.size}`);
  const qs = queryParts.length ? `?${queryParts.join('&')}` : '';
  const res = await apiRequest<ApiEnvelope<ApiPage<ReportAdminDto>> | ApiPage<ReportAdminDto>>(`/api/v1/admin/reports${qs}`);
  return unwrapApiData(res);
}

export async function resolveReport(id: string, resolutionNotes?: string): Promise<void> {
  await apiRequest(`/api/v1/admin/reports/${id}/resolve`, {
    method: 'POST',
    body: JSON.stringify({ resolutionNotes }),
  });
}

export async function dismissReport(id: string, resolutionNotes?: string): Promise<void> {
  await apiRequest(`/api/v1/admin/reports/${id}/dismiss`, {
    method: 'POST',
    body: JSON.stringify({ resolutionNotes }),
  });
}

export async function fetchAdminTaxonomySkills(params: {
  query?: string;
  active?: boolean;
  page?: number;
  size?: number;
} = {}): Promise<{ content: TaxonomySkillAdminDto[]; totalElements: number; page: number; size: number }> {
  const queryParts: string[] = [];
  if (params.query) queryParts.push(`query=${encodeURIComponent(params.query)}`);
  if (params.active != null) queryParts.push(`active=${params.active}`);
  if (params.page != null) queryParts.push(`page=${params.page}`);
  if (params.size != null) queryParts.push(`size=${params.size}`);
  const qs = queryParts.length ? `?${queryParts.join('&')}` : '';
  const taxonomyPage = await apiRequest<ApiEnvelope<ApiPage<TaxonomySkillAdminDto> & { page: number; size: number }> | (ApiPage<TaxonomySkillAdminDto> & { page: number; size: number })>(`/api/v1/admin/taxonomy/skills${qs}`);
  return unwrapApiData(taxonomyPage);
}

export async function createAdminTaxonomySkill(body: {
  canonicalName: string;
  category: string;
  description?: string;
  aliases?: string[];
}): Promise<string> {
  const res = await apiRequest<ApiEnvelope<string> | string>('/api/v1/admin/taxonomy/skills', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return unwrapApiData(res);
}

export async function toggleAdminTaxonomySkill(id: string): Promise<boolean> {
  const res = await apiRequest<ApiEnvelope<boolean> | boolean>(`/api/v1/admin/taxonomy/skills/${id}/toggle`, {
    method: 'PUT',
  });
  return unwrapApiData(res);
}

export async function fetchAdminAuditLogs(params: {
  page?: number;
  size?: number;
} = {}): Promise<{ content: AdminAuditLogDto[]; totalElements: number; totalPages: number }> {
  const queryParts: string[] = [];
  if (params.page != null) queryParts.push(`page=${params.page}`);
  if (params.size != null) queryParts.push(`size=${params.size}`);
  const qs = queryParts.length ? `?${queryParts.join('&')}` : '';
  const res = await apiRequest<ApiEnvelope<ApiPage<AdminAuditLogDto>> | ApiPage<AdminAuditLogDto>>(`/api/v1/admin/audit-logs${qs}`);
  return unwrapApiData(res);
}

export const adminApi = {
  getDashboardStats: fetchAdminDashboardStats,
  getCompanies: async (params?: { query?: string; search?: string; status?: string; page?: number; size?: number }) => {
    return fetchAdminCompanies({
      query: params?.query || params?.search,
      status: params?.status,
      page: params?.page,
      size: params?.size,
    });
  },
  getCompanyDetail: fetchAdminCompanyDetail,
  transitionCompanyVerification: async (
    id: string,
    data: { action?: string; notes?: string; status?: string; reason?: string; version?: number }
  ) => {
    let targetStatus = data.status;
    const targetReason = data.reason || data.notes;

    if (data.action) {
      switch (data.action) {
        case 'START_REVIEW':
          targetStatus = 'UNDER_REVIEW';
          break;
        case 'VERIFY':
          targetStatus = 'VERIFIED';
          break;
        case 'REQUEST_CHANGES':
          targetStatus = 'CHANGES_REQUESTED';
          break;
        case 'REJECT':
          targetStatus = 'REJECTED';
          break;
        case 'SUSPEND':
          targetStatus = 'SUSPENDED';
          break;
        case 'RESTORE':
          targetStatus = 'VERIFIED';
          break;
        default:
          targetStatus = data.action;
      }
    }

    return transitionCompanyVerification(id, {
      status: targetStatus || 'UNDER_REVIEW',
      reason: targetReason,
      version: data.version,
    });
  },
  getUsers: async (params?: {
    role?: string;
    status?: string;
    search?: string;
    query?: string;
    page?: number;
    size?: number;
  }) => {
    const query = new URLSearchParams({ page: String(params?.page ?? 0), size: String(params?.size ?? 10) });
    const role = params?.role === 'RECRUITER' ? 'HR' : params?.role;
    if (role && role !== 'ALL') query.set('role', role);
    if (params?.status && params.status !== 'ALL') query.set('accountStatus', params.status);
    if (params?.query || params?.search) query.set('query', params.query || params.search || '');
    type WireUser = Omit<UserAdminDto, 'role'> & { role: 'HR' | UserAdminDto['role'] };
    const result = await apiRequest<ApiEnvelope<ApiPage<WireUser>>>(`/api/v1/admin/users?${query}`);
    return { ...result.data, content: result.data.content.map((u) => ({
      ...u, role: u.role === 'HR' ? 'RECRUITER' as const : u.role,
      accountStatus: u.accountStatus ?? (u.isActive ? 'ACTIVE' as const : 'DEACTIVATED' as const),
    })) };
  },
  moderateUser: async (id: string, data: { action: 'SUSPEND' | 'REACTIVATE'; reason?: string }) => {
    if (data.action === 'SUSPEND') {
      return suspendUser(id, data.reason || 'Đình chỉ bởi quản trị viên');
    } else {
      return reactivateUser(id, data.reason);
    }
  },
  getJobs: async (params?: { query?: string; search?: string; status?: string; page?: number; size?: number }) => {
    return fetchAdminJobs({
      query: params?.query || params?.search,
      status: params?.status,
      page: params?.page,
      size: params?.size,
    });
  },
  moderateJob: async (id: string, data: { action: 'SUSPEND' | 'RESTORE'; reason?: string }) => {
    if (data.action === 'SUSPEND') {
      return suspendJob(id, data.reason || 'Đình chỉ bởi quản trị viên');
    } else {
      return restoreJob(id);
    }
  },
  getReports: async (params?: {
    status?: string;
    targetType?: string;
    page?: number;
    size?: number;
  }) => {
    return fetchAdminReports(params);
  },
  resolveReport: async (id: string, data: { action: 'RESOLVE' | 'DISMISS'; resolutionNotes?: string }) => {
    if (data.action === 'RESOLVE') {
      return resolveReport(id, data.resolutionNotes);
    } else {
      return dismissReport(id, data.resolutionNotes);
    }
  },
  getTaxonomySkills: async (params?: { search?: string; query?: string; activeOnly?: boolean; active?: boolean; page?: number; size?: number }) => {
    const res = await fetchAdminTaxonomySkills({
      query: params?.query || params?.search,
      active: params?.activeOnly ?? params?.active,
      page: params?.page,
      size: params?.size,
    });
    return {
      content: res.content.map((s) => ({
        ...s,
        name: s.canonicalName,
        normalizedKey: s.normalizedName,
      })),
      totalElements: res.totalElements,
      totalPages: Math.ceil((res.totalElements || 1) / (params?.size || 15)),
    };
  },
  createTaxonomySkill: async (data: { name: string; category: string; description?: string }) => {
    return createAdminTaxonomySkill({
      canonicalName: data.name,
      category: data.category,
      description: data.description,
    });
  },
  toggleTaxonomySkillActive: async (id: string) => {
    return toggleAdminTaxonomySkill(id);
  },
  getAuditLogs: async (params?: { targetType?: string; page?: number; size?: number }) => {
    return fetchAdminAuditLogs(params);
  },
};

// ============================================================
// 15. SUSPENSION APPEALS API
// ============================================================


export async function fetchMyAppeals(): Promise<SuspensionAppeal[]> {
  const res = await apiRequest<ApiEnvelope<SuspensionAppeal[]> | SuspensionAppeal[]>('/api/v1/appeals', {
    method: 'GET',
  });
  return unwrapApiData(res) || [];
}


export async function fetchAdminAppeals(params?: {
  status?: string;
  page?: number;
  size?: number;
}): Promise<{ content: SuspensionAppeal[]; totalElements: number; totalPages: number }> {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.set('status', params.status);
  if (params?.page !== undefined) queryParams.set('page', params.page.toString());
  if (params?.size !== undefined) queryParams.set('size', params.size.toString());

  const url = `/api/v1/admin/appeals${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const res = await apiRequest<ApiEnvelope<ApiPage<SuspensionAppeal>> | ApiPage<SuspensionAppeal>>(url, {
    method: 'GET',
  });
  return unwrapApiData(res);
}

export async function startReviewAdminAppeal(appealId: string): Promise<SuspensionAppeal> {
  const res = await apiRequest<ApiEnvelope<SuspensionAppeal> | SuspensionAppeal>(`/api/v1/admin/appeals/${appealId}/review`, {
    method: 'POST',
  });
  return unwrapApiData(res);
}

export async function approveAdminAppeal(appealId: string, resolutionNote: string): Promise<SuspensionAppeal> {
  const res = await apiRequest<ApiEnvelope<SuspensionAppeal> | SuspensionAppeal>(`/api/v1/admin/appeals/${appealId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ resolutionNote }),
  });
  return unwrapApiData(res);
}

export async function rejectAdminAppeal(appealId: string, resolutionNote: string): Promise<SuspensionAppeal> {
  const res = await apiRequest<ApiEnvelope<SuspensionAppeal> | SuspensionAppeal>(`/api/v1/admin/appeals/${appealId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ resolutionNote }),
  });
  return unwrapApiData(res);
}


export async function getMyActiveSuspension(): Promise<SuspensionNotice | null> {
  const token = getAuthToken();

  // Người chưa đăng nhập không cần kiểm tra trạng thái đình chỉ.
  if (!token) {
    return null;
  }

  try {
    const res = await apiRequest<ApiEnvelope<SuspensionNotice | null> | SuspensionNotice | null>('/api/v1/suspensions/my-active', {
      method: 'GET',
    });

    return unwrapApiData(res) ?? null;
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      const message = String(
        (isRecord(err.responseBody) ? err.responseBody.message : undefined) ?? err.message
      );

      const isAuthenticationFailure =
        err.status === 401 ||
        (err.status === 403 &&
          /yêu cầu xác thực tài khoản|phiên làm việc đã hết hạn/i.test(
            message
          ));

      if (isAuthenticationFailure) {
        return null;
      }
    }

    // Các lỗi khác vẫn phải được báo ra để không che lỗi thật.
    throw err;
  }
}


export async function submitSuspensionAppeal(data: {
  suspensionRecordId?: string;
  targetType?: 'USER' | 'COMPANY';
  targetId?: string;
  subject: string;
  content: string;
  evidenceAttachmentId?: string;
}): Promise<SuspensionAppeal> {
  const res = await apiRequest<ApiEnvelope<SuspensionAppeal> | SuspensionAppeal>('/api/v1/appeals', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return unwrapApiData(res);
}

export async function cancelSuspensionAppeal(appealId: string, reason?: string): Promise<SuspensionAppeal> {
  const res = await apiRequest<ApiEnvelope<SuspensionAppeal> | SuspensionAppeal>(`/api/v1/appeals/${appealId}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason: reason || 'Người dùng tự hủy khiếu nại' }),
  });
  return unwrapApiData(res);
}

export async function deactivateAccount(password: string, reason?: string): Promise<void> {
  await apiRequest<void>('/api/v1/account/deactivate', {
    method: 'POST',
    body: JSON.stringify({ password, reason }),
  });
}

export async function restoreUserAccount(userId: string, reason: string): Promise<void> {
  await apiRequest<void>(`/api/v1/admin/users/${userId}/restore`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function getJobMatchingPolicy(jobId: string): Promise<JobMatchingPolicy> {
  const res = await apiRequest<ApiEnvelope<JobMatchingPolicy> | JobMatchingPolicy>(`/api/v1/jobs/${jobId}/matching-policy`, {
    method: 'GET',
  });
  return unwrapApiData(res);
}

export async function updateJobMatchingPolicy(
  jobId: string,
  policy: Partial<JobMatchingPolicy>
): Promise<JobMatchingPolicy> {
  const res = await apiRequest<ApiEnvelope<JobMatchingPolicy> | JobMatchingPolicy>(`/api/v1/jobs/${jobId}/matching-policy`, {
    method: 'PUT',
    body: JSON.stringify(policy),
  });
  return unwrapApiData(res);
}

export async function recalculateJobMatching(jobId: string): Promise<{ recalculatedCount: number }> {
  const res = await apiRequest<{ data: number }>(`/api/v1/jobs/${jobId}/matching/recalculate`, {
    method: 'POST',
  });
  const count = res.data;
  if (!Number.isInteger(count) || count < 0) {
    throw new Error('Phản hồi số lượng hồ sơ tính lại không hợp lệ.');
  }
  return { recalculatedCount: count };
}

export async function triggerGithubAnalysis(): Promise<{ message: string; status: string }> {
  const res = await apiRequest<ApiEnvelope<{ message: string; status: string }> | { message: string; status: string }>('/api/v1/processing/candidate/github', {
    method: 'POST',
  });
  return unwrapApiData(res);
}


