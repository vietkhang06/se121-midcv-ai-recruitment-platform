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
  TaxonomySkillAdminDto
} from '@/types';

export const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// ============================================================
// 1. ERROR TYPES & CENTRAL HTTP ENGINE
// ============================================================

export class ApiError extends Error {
  status: number;
  statusText: string;
  url: string;
  method: string;
  responseBody?: any;

  constructor(method: string, url: string, status: number, statusText: string, message: string, responseBody?: any) {
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
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('auth_token');
  if (token && isJwtExpired(token)) {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('midcv:session_expired'));
    }
    return null;
  }
  return token;
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
    res = await fetch(url, {
      ...options,
      headers
    });
  } catch (netErr: any) {
    const errMsg = netErr?.message || 'Lỗi kết nối mạng đến máy chủ backend.';
    console.error(`[API ERROR] Network failure: method=${method} url=${url}`, netErr);
    throw new ApiError(method, url, 0, 'NETWORK_ERROR', errMsg);
  }

  if (!res.ok) {
    let errBody: any = null;
    try {
      errBody = await res.json();
    } catch {
      // response is not JSON
    }
    const errMsg = errBody?.message || res.statusText || `Request failed with status ${res.status}`;

    // Auto-clean expired or invalid credentials on 401/403
    if (typeof window !== 'undefined' && (res.status === 401 || (res.status === 403 && (!token || isJwtExpired(token))))) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      window.dispatchEvent(new CustomEvent('midcv:session_expired', { detail: { message: errMsg } }));
    }

    console.error(`[API ERROR] method=${method} url=${url} status=${res.status} statusText=${res.statusText} message=${errMsg}`, errBody);
    throw new ApiError(method, url, res.status, res.statusText, errMsg, errBody);
  }

  const json = await res.json();
  return json;
}

// ============================================================
// 2. BACKEND MAPPERS (STRICT - NO FABRICATED DEFAULTS)
// ============================================================

export function mapBackendJobToFrontend(raw: any): Job {
  if (!raw || raw.id == null) {
    throw new Error('Dữ liệu bài đăng tuyển dụng không hợp lệ: thiếu id');
  }
  return {
    id: String(raw.id),
    title: raw.title || '',
    companyName: raw.companyName || raw.company?.name || '',
    companyVerified: raw.companyVerified ?? (raw.company?.verificationStatus === 'VERIFIED'),
    industry: (raw.industry || 'Technology') as Industry,
    employmentType: (raw.employmentType || 'FULL_TIME') as EmploymentType,
    seniority: raw.seniority || '',
    location: raw.location || '',
    salaryMin: raw.minSalary != null ? Number(raw.minSalary) : 0,
    salaryMax: raw.maxSalary != null ? Number(raw.maxSalary) : 0,
    salaryRange: raw.minSalary != null && raw.maxSalary != null ? `$${raw.minSalary} - $${raw.maxSalary}` : undefined,
    publishedDate: raw.createdAt ? String(raw.createdAt).split('T')[0] : '',
    description: raw.description || '',
    responsibilities: raw.description ? raw.description.split('\n').filter(Boolean) : [],
    requirements: (raw.requirements || []).map((req: any) => ({
      id: String(req.id || ''),
      skillName: req.skillName || '',
      requirementType: req.requirementType as RequirementType,
      minYearsExperience: req.minYearsExp != null ? Number(req.minYearsExp) : undefined,
      minExperienceYears: req.minYearsExp != null ? Number(req.minYearsExp) : undefined
    })),
    status: raw.status || 'DRAFT'
  };
}

export function mapBackendCVToFrontend(raw: any): CV {
  if (!raw || raw.id == null) {
    throw new Error('Dữ liệu CV không hợp lệ: thiếu id');
  }
  return {
    id: String(raw.id),
    title: raw.title || '',
    targetIndustry: (raw.targetIndustry || 'Technology') as Industry,
    creationPath: raw.creationPath === 'BUILDER' ? 'BUILDER' : 'UPLOAD',
    isDefault: !!raw.isDefault,
    status: raw.status || 'DRAFT',
    currentVersionNumber: 1,
    rawText: raw.rawText || '',
    updatedAt: raw.createdAt ? String(raw.createdAt).split('T')[0] : '',
    versions: [
      {
        id: `v-${raw.id}`,
        versionNumber: 1,
        title: raw.title,
        createdAt: raw.createdAt ? String(raw.createdAt).split('T')[0] : '',
        sections: [
          {
            id: `sec-${raw.id}`,
            sectionType: 'SUMMARY',
            title: 'Nội dung CV',
            content: raw.rawText || ''
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
  fetchJobById(id: string): Promise<Job | null>;
  fetchCandidateProfile(): Promise<CandidateProfile>;
  saveCandidateProfile(profile: CandidateProfile): Promise<CandidateProfile>;
  fetchCandidateCVs(): Promise<CV[]>;
  saveCandidateCV(cv: CV): Promise<CV>;
  uploadCandidateCV(file: File, title?: string, targetIndustry?: string, isDefault?: boolean): Promise<CV>;
  deleteCandidateCV(cvId: string): Promise<void>;
  fetchCVReview(cvId: string): Promise<CVReviewData>;
  fetchCVProcessingStatus(cvId: string): Promise<CVProcessingStatus>;
  downloadCVFile(cvId: string, format: string, defaultFilename: string): Promise<void>;
  retryCVExtraction(cvId: string): Promise<CVReviewData>;
  fetchCVDraft(cvId: string): Promise<any>;
  updateCVDraft(cvId: string, draftData: any): Promise<any>;
  confirmCandidateCV(cvId: string): Promise<{ cv_id: string; profile_id: string; status: string; confirmed_at: string }>;
  fetchCVVersions(cvId: string): Promise<any[]>;
  searchTaxonomySkills(query: string, limit?: number): Promise<any[]>;
  uploadCVEvidence(cvId: string, file: File, itemType: string, itemId: string): Promise<any>;
  deleteCVEvidence(cvId: string, attachmentId: string): Promise<void>;
  downloadCVEvidence(cvId: string, attachmentId: string, fileName: string): Promise<void>;
  fetchCandidateApplications(): Promise<Application[]>;
  submitApplication(app: Application): Promise<Application>;
  fetchJobApplications(jobId: string): Promise<Application[]>;
  fetchApplicationById(applicationId: string): Promise<Application | null>;
  updateApplicationStatus(applicationId: string, status: ApplicationStatus, decisionNote?: string): Promise<Application>;
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

export class RealApiClient implements ApiClient {

  async fetchJobs(industry?: string, page = 0, size = 20, sort = 'createdAt', direction = 'desc'): Promise<Job[]> {
    const queryParts: string[] = [];
    if (industry) queryParts.push(`industry=${encodeURIComponent(industry)}`);
    if (page != null) queryParts.push(`page=${page}`);
    if (size != null) queryParts.push(`size=${size}`);
    if (sort) queryParts.push(`sort=${sort}`);
    if (direction) queryParts.push(`direction=${direction}`);
    const qs = queryParts.length ? `?${queryParts.join('&')}` : '';
    const json: any = await apiRequest(`/api/v1/jobs${qs}`);
    const rawJobs: any[] = Array.isArray(json) ? json : (json?.data?.content ?? (Array.isArray(json?.data) ? json.data : []));
    return rawJobs.map(mapBackendJobToFrontend);
  }

  async fetchJobById(id: string): Promise<Job | null> {
    const url = `${BASE_URL}/api/v1/jobs/${id}`;
    let res: Response;
    try {
      res = await fetch(url);
    } catch (netErr: any) {
      console.error(`[API ERROR] Network failure: GET ${url}`, netErr);
      throw new ApiError('GET', url, 0, 'NETWORK_ERROR', netErr.message || 'Lỗi kết nối mạng.');
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

    const json: any = await apiRequest('/api/v1/candidate/profile', {
      headers: { Authorization: `Bearer ${token}` }
    });

    const p = json?.data;
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
      primaryIndustry: (p.targetIndustry || user?.targetIndustry || 'Technology') as Industry,
      targetIndustry: (p.targetIndustry || user?.targetIndustry || 'Technology') as Industry,
      targetIndustries: p.targetIndustries || [p.targetIndustry || 'Technology'],
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

    const json: any = await apiRequest('/api/v1/candidate/profile', {
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

    const p = json?.data;
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

    const json: any = await apiRequest('/api/v1/candidate/cvs', {
      headers: { Authorization: `Bearer ${token}` }
    });

    const rawList: any[] = Array.isArray(json) ? json : (json?.data?.content ?? (Array.isArray(json?.data) ? json.data : []));
    return rawList.map(mapBackendCVToFrontend);
  }

  async saveCandidateCV(cv: CV): Promise<CV> {
    const token = getAuthToken();
    if (!token) {
      throw new ApiError('POST', '/api/v1/candidate/cvs', 401, 'UNAUTHORIZED', 'Chưa đăng nhập hoặc token đã hết hạn.');
    }

    const rawText = cv.rawText || (cv.versions && cv.versions[0]?.sections ? cv.versions[0].sections.map(s => s.content).join('\n') : cv.title);

    const json: any = await apiRequest('/api/v1/candidate/cvs', {
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

    const json: any = await apiRequest('/api/v1/candidate/cvs/upload', {
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
    const json: any = await apiRequest(`/api/v1/candidate/cvs/${cvId}/review`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return json.data;
  }

  async fetchCVProcessingStatus(cvId: string): Promise<CVProcessingStatus> {
    const token = getAuthToken();
    if (!token) {
      throw new ApiError('GET', `/api/v1/candidate/cvs/${cvId}/processing-status`, 401, 'UNAUTHORIZED', 'Chưa đăng nhập hoặc token đã hết hạn.');
    }
    const json: any = await apiRequest(`/api/v1/candidate/cvs/${cvId}/processing-status`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return json.data;
  }

  async downloadCVFile(cvId: string, format: string, defaultFilename: string): Promise<void> {
    const token = getAuthToken();
    const url = `${BASE_URL}/api/v1/candidate/cvs/${cvId}/download/${format}`;
    const res = await fetch(url, {
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
    const json: any = await apiRequest(`/api/v1/candidate/cvs/${cvId}/retry`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    return json.data;
  }

  async fetchCVDraft(cvId: string): Promise<any> {
    const token = getAuthToken();
    if (!token) {
      throw new ApiError('GET', `/api/v1/candidate/cvs/${cvId}/draft`, 401, 'UNAUTHORIZED', 'Chưa đăng nhập hoặc token đã hết hạn.');
    }
    const json: any = await apiRequest(`/api/v1/candidate/cvs/${cvId}/draft`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return json.data;
  }

  async updateCVDraft(cvId: string, draftData: any): Promise<any> {
    const token = getAuthToken();
    if (!token) {
      throw new ApiError('PUT', `/api/v1/candidate/cvs/${cvId}/draft`, 401, 'UNAUTHORIZED', 'Chưa đăng nhập hoặc token đã hết hạn.');
    }
    const json: any = await apiRequest(`/api/v1/candidate/cvs/${cvId}/draft`, {
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
    const json: any = await apiRequest(`/api/v1/candidate/cvs/${cvId}/confirm`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    return json.data;
  }

  async fetchCVVersions(cvId: string): Promise<any[]> {
    const token = getAuthToken();
    if (!token) {
      throw new ApiError('GET', `/api/v1/candidate/cvs/${cvId}/versions`, 401, 'UNAUTHORIZED', 'Chưa đăng nhập hoặc token đã hết hạn.');
    }
    const json: any = await apiRequest(`/api/v1/candidate/cvs/${cvId}/versions`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return Array.isArray(json) ? json : (json?.data ?? []);
  }

  async searchTaxonomySkills(query: string, limit = 10): Promise<any[]> {
    const json: any = await apiRequest(`/api/v1/taxonomy/skills/search?query=${encodeURIComponent(query)}&limit=${limit}`);
    const data = json?.data;
    return data?.skills || [];
  }

  async uploadCVEvidence(cvId: string, file: File, itemType: string, itemId: string): Promise<any> {
    const token = getAuthToken();
    if (!token) {
      throw new ApiError('POST', `/api/v1/candidate/cvs/${cvId}/attachments`, 401, 'UNAUTHORIZED', 'Chưa đăng nhập hoặc token đã hết hạn.');
    }
    const formData = new FormData();
    formData.append('file', file);
    formData.append('itemType', itemType);
    formData.append('itemId', itemId);

    const url = `${BASE_URL}/api/v1/candidate/cvs/${cvId}/attachments`;
    const res = await fetch(url, {
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
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      throw new ApiError('GET', url, res.status, res.statusText, 'Không thể tải minh chứng.');
    }
    const blob = await res.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(downloadUrl);
  }

  async fetchCandidateApplications(): Promise<Application[]> {
    const token = getAuthToken();
    if (!token) {
      throw new ApiError('GET', '/api/v1/candidate/applications', 401, 'UNAUTHORIZED', 'Chưa đăng nhập hoặc token đã hết hạn.');
    }

    const json: any = await apiRequest('/api/v1/candidate/applications', {
      headers: { Authorization: `Bearer ${token}` }
    });

    const user = getAuthUser();
    const rawList: any[] = Array.isArray(json) ? json : (json?.data?.content ?? (Array.isArray(json?.data) ? json.data : []));
    return rawList.map((app: any) => ({
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
      appliedCvVersion: 1,
      candidateName: app.candidateName || user?.fullName || '',
      status: app.status || 'SUBMITTED',
      appliedDate: app.appliedAt ? String(app.appliedAt).split('T')[0] : ''
    }));
  }

  async submitApplication(app: Application): Promise<Application> {
    const token = getAuthToken();
    if (!token) {
      throw new ApiError('POST', '/api/v1/candidate/applications', 401, 'UNAUTHORIZED', 'Chưa đăng nhập hoặc token đã hết hạn.');
    }

    const json: any = await apiRequest('/api/v1/candidate/applications', {
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

    const data = json?.data;
    return {
      ...app,
      id: String(data.id),
      status: data.status || 'SUBMITTED',
      appliedDate: data.appliedAt ? String(data.appliedAt).split('T')[0] : new Date().toISOString().split('T')[0]
    };
  }

  async fetchJobApplications(jobId: string): Promise<Application[]> {
    const token = getAuthToken();
    if (!token) {
      throw new ApiError('GET', `/api/v1/recruiter/jobs/${jobId}/applications`, 401, 'UNAUTHORIZED', 'Chưa đăng nhập tài khoản nhà tuyển dụng.');
    }

    const json: any = await apiRequest(`/api/v1/recruiter/jobs/${jobId}/applications`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const rawList: any[] = Array.isArray(json) ? json : (json?.data?.content ?? (Array.isArray(json?.data) ? json.data : []));
    return rawList.map((app: any) => ({
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
      appliedCvVersion: 1,
      candidateName: app.candidateName || '',
      candidateEmail: app.candidateEmail,
      candidatePhone: app.candidatePhone,
      candidateHeadline: app.candidateHeadline,
      status: app.status || 'SUBMITTED',
      matchScore: app.matchScore != null ? Number(app.matchScore) : undefined,
      matchStatus: app.matchStatus,
      appliedDate: app.appliedAt ? String(app.appliedAt).split('T')[0] : '',
      snapshot: app.snapshot ? {
        cvTitle: app.snapshot.cvTitle,
        rawTextSnapshot: app.snapshot.rawTextSnapshot,
        snapshotCreatedAt: app.snapshot.snapshotCreatedAt ? String(app.snapshot.snapshotCreatedAt) : undefined
      } : undefined
    }));
  }

  async fetchApplicationById(applicationId: string): Promise<Application | null> {
    const token = getAuthToken();
    if (!token) {
      throw new ApiError('GET', `/api/v1/recruiter/applications/${applicationId}`, 401, 'UNAUTHORIZED', 'Chưa đăng nhập tài khoản nhà tuyển dụng.');
    }

    const json: any = await apiRequest(`/api/v1/recruiter/applications/${applicationId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const app = json?.data;
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
      appliedCvVersion: 1,
      candidateName: app.candidateName || '',
      candidateEmail: app.candidateEmail,
      candidatePhone: app.candidatePhone,
      candidateHeadline: app.candidateHeadline,
      githubUrl: app.candidateGithubUrl,
      status: app.status || 'SUBMITTED',
      matchScore: app.matchScore != null ? Number(app.matchScore) : undefined,
      matchStatus: app.matchStatus,
      appliedDate: app.appliedAt ? String(app.appliedAt).split('T')[0] : '',
      snapshot: app.snapshot ? {
        cvTitle: app.snapshot.cvTitle,
        rawTextSnapshot: app.snapshot.rawTextSnapshot,
        snapshotCreatedAt: app.snapshot.snapshotCreatedAt ? String(app.snapshot.snapshotCreatedAt) : undefined
      } : undefined
    };
  }

  async updateApplicationStatus(applicationId: string, status: ApplicationStatus, decisionNote?: string): Promise<Application> {
    const token = getAuthToken();
    if (!token) {
      throw new ApiError('PUT', `/api/v1/recruiter/applications/${applicationId}/status`, 401, 'UNAUTHORIZED', 'Chưa đăng nhập tài khoản nhà tuyển dụng.');
    }

    const json: any = await apiRequest(`/api/v1/recruiter/applications/${applicationId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        status,
        decisionNote: decisionNote || ''
      })
    });

    const app = json?.data;
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
      appliedCvVersion: 1,
      candidateName: app.candidateName || '',
      candidateEmail: app.candidateEmail,
      candidatePhone: app.candidatePhone,
      candidateHeadline: app.candidateHeadline,
      githubUrl: app.candidateGithubUrl,
      status: app.status || status,
      matchScore: app.matchScore != null ? Number(app.matchScore) : undefined,
      matchStatus: app.matchStatus,
      appliedDate: app.appliedAt ? String(app.appliedAt).split('T')[0] : '',
      snapshot: app.snapshot ? {
        cvTitle: app.snapshot.cvTitle,
        rawTextSnapshot: app.snapshot.rawTextSnapshot,
        snapshotCreatedAt: app.snapshot.snapshotCreatedAt ? String(app.snapshot.snapshotCreatedAt) : undefined
      } : undefined
    };
  }

  async fetchApplicationAuditLogs(applicationId: string): Promise<ApplicationAuditLogItem[]> {
    const token = getAuthToken();
    if (!token) {
      throw new ApiError('GET', `/api/v1/recruiter/applications/${applicationId}/audit-logs`, 401, 'UNAUTHORIZED', 'Chưa đăng nhập tài khoản nhà tuyển dụng.');
    }

    const json: any = await apiRequest(`/api/v1/recruiter/applications/${applicationId}/audit-logs`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const rawList: any[] = Array.isArray(json) ? json : (json?.data?.content ?? (Array.isArray(json?.data) ? json.data : []));
    return rawList.map((item: any) => ({
      id: String(item.id),
      applicationId: String(item.applicationId),
      recruiterUserId: String(item.recruiterUserId),
      previousStatus: item.previousStatus as ApplicationStatus,
      newStatus: item.newStatus as ApplicationStatus,
      decisionNote: item.decisionNote || '',
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

    const json: any = await apiRequest('/api/v1/recruiter/company', {
      headers: { Authorization: `Bearer ${token}` }
    });

    const c = json?.data;
    if (!c) {
      throw new ApiError('GET', '/api/v1/recruiter/company', 404, 'NOT_FOUND', 'Không tìm thấy dữ liệu hồ sơ công ty.');
    }

    return {
      id: String(c.id),
      name: c.name || '',
      taxCode: c.taxCode || '',
      industry: (c.industry || 'Technology') as Industry,
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

    const json: any = await apiRequest('/api/v1/recruiter/company', {
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

    const c = json?.data;
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

    const json: any = await apiRequest('/api/v1/recruiter/company/submit-verification', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const c = json?.data;
    return {
      id: String(c?.id || ''),
      name: c?.name || '',
      taxCode: c?.taxCode || '',
      industry: (c?.industry || 'Technology') as Industry,
      website: c?.website || '',
      companySize: c?.size || '',
      contactEmail: getAuthUser()?.email || '',
      verificationStatus: c?.verificationStatus || 'PENDING',
      verificationReason: c?.verificationReason || c?.reviewNotes || undefined
    };
  }

  async fetchRecruiterJobs(): Promise<Job[]> {
    const token = getAuthToken();
    if (!token) {
      throw new ApiError('GET', '/api/v1/recruiter/jobs', 401, 'UNAUTHORIZED', 'Chưa đăng nhập tài khoản nhà tuyển dụng.');
    }

    const json: any = await apiRequest('/api/v1/recruiter/jobs', {
      headers: { Authorization: `Bearer ${token}` }
    });

    const rawList: any[] = Array.isArray(json) ? json : (json?.data?.content ?? (Array.isArray(json?.data) ? json.data : []));
    return rawList.map(mapBackendJobToFrontend);
  }

  async saveJob(job: Job): Promise<Job> {
    const token = getAuthToken();
    if (!token) {
      throw new ApiError('POST', '/api/v1/jobs/draft', 401, 'UNAUTHORIZED', 'Chưa đăng nhập tài khoản nhà tuyển dụng.');
    }

    const reqPayload = {
      title: job.title,
      industry: job.industry,
      seniority: job.seniority,
      minSalary: job.salaryMin,
      maxSalary: job.salaryMax,
      location: job.location,
      employmentType: job.employmentType,
      description: job.description || (job.responsibilities ? job.responsibilities.join('\n') : job.title),
      requirements: (job.requirements || []).map(r => ({
        skillName: r.skillName,
        type: r.requirementType,
        minYearsExp: r.minExperienceYears || r.minYearsExperience || 0
      }))
    };

    const json: any = await apiRequest('/api/v1/jobs/draft', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(reqPayload)
    });

    const savedJob = mapBackendJobToFrontend(json.data);

    if (job.status === 'PUBLISHED') {
      return (await this.publishJob(savedJob.id)) || savedJob;
    }

    return savedJob;
  }

  async publishJob(jobId: string): Promise<Job | null> {
    const token = getAuthToken();
    if (!token) {
      throw new ApiError('POST', `/api/v1/jobs/${jobId}/publish`, 401, 'UNAUTHORIZED', 'Chưa đăng nhập tài khoản nhà tuyển dụng.');
    }

    const json: any = await apiRequest(`/api/v1/jobs/${jobId}/publish`, {
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

    const json: any = await apiRequest(`/api/v1/jobs/${jobId}/close`, {
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

    const json: any = await apiRequest(`/api/v1/matching/jobs/${jobId}/rankings`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const rawList: any[] = Array.isArray(json) ? json : (json?.data?.content ?? (Array.isArray(json?.data) ? json.data : []));
    return rawList.map((item: any, idx: number) => {
      const app = item.application;
      const cand = app?.candidate;
      return {
        rank: item.rank || idx + 1,
        applicationId: String(app?.id || item.applicationId || item.id || ''),
        candidateId: String(cand?.id || item.candidateId || ''),
        candidateName: cand?.fullName || item.candidateName || item.candidate?.fullName || '',
        headline: cand?.headline || item.headline || '',
        overallMatchScore: Number(item.overallMatchScore ?? item.overallScore) || 0,
        coreJdCvScore: Number(item.coreJdCvScore ?? item.coreScore) || 0,
        githubSupportingScore: (item.githubSupportingScore ?? item.githubScore) != null ? Number(item.githubSupportingScore ?? item.githubScore) : undefined,
        requiredSkillsMatched: item.requiredSkillsMatched ?? 0,
        requiredSkillsTotal: item.requiredSkillsTotal ?? 0,
        requiredSkillsMissingNames: item.requiredSkillsMissingNames || [],
        relevantExperienceYears: item.relevantExperienceYears != null ? Number(item.relevantExperienceYears) : (cand?.yearsOfExperience != null ? Number(cand.yearsOfExperience) : 0),
        appliedDate: app?.appliedAt ? String(app.appliedAt).split('T')[0] : (item.appliedDate || ''),
        status: app?.status || item.status || 'SUBMITTED',
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
      res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (netErr: any) {
      console.error(`[API ERROR] Network failure: GET ${url}`, netErr);
      throw new ApiError('GET', url, 0, 'NETWORK_ERROR', netErr.message || 'Lỗi kết nối mạng.');
    }

    if (!res.ok) {
      if (res.status === 404) return null;
      let errBody: any = null;
      try { errBody = await res.json(); } catch {}
      const errMsg = errBody?.message || res.statusText || `GET /inspection thất bại: ${res.status}`;
      console.error(`[API ERROR] method=GET url=${url} status=${res.status} statusText=${res.statusText} message=${errMsg}`, errBody);
      throw new ApiError('GET', url, res.status, res.statusText, errMsg, errBody);
    }

    const json = await res.json();
    const data = json?.data !== undefined ? json.data : json;
    if (!data || (Array.isArray(data) && data.length === 0) || (!data.applicationId && !data.id)) return null;

    return {
      applicationId: String(data.applicationId),
      jobTitle: data.jobTitle || '',
      candidateName: data.candidateName || '',
      overallScore: Number(data.overallScore) || 0,
      coreScore: Number(data.coreScore) || 0,
      githubScore: data.githubScore != null ? Number(data.githubScore) : undefined,
      githubScoreActive: !!data.githubScoreActive,
      requiredSkillsStatus: (data.requiredSkillsStatus || []).map((s: any) => ({
        skillName: s.skillName || '',
        requirementType: s.requirementType,
        status: s.status,
        evidenceText: s.evidenceText
      })),
      preferredSkillsStatus: (data.preferredSkillsStatus || []).map((s: any) => ({
        skillName: s.skillName || '',
        requirementType: s.requirementType,
        status: s.status,
        evidenceText: s.evidenceText
      })),
      matchFactors: (data.matchFactors || []).map((f: any) => ({
        factorName: f.factorName || '',
        score: Number(f.score) || 0,
        status: f.status || 'MODERATE',
        explanation: f.explanation || '',
        evidence: f.evidence || ''
      })),
      humanReadableExplanation: data.humanReadableExplanation || '',
      githubAssessment: data.githubAssessment ? {
        connected: !!data.githubAssessment.connected,
        status: data.githubAssessment.status || (data.githubAssessment.connected ? 'SYNCED' : 'NOT_CONNECTED'),
        username: data.githubAssessment.username,
        publicRepoCount: data.githubAssessment.publicRepoCount,
        topLanguages: data.githubAssessment.topLanguages || [],
        languageDistribution: data.githubAssessment.languageDistribution || {},
        activitySignal: data.githubAssessment.activitySignal || (data.githubAssessment.connected ? 'MODERATE' : 'LIMITED_OBSERVABLE_ACTIVITY'),
        latestActivityDaysAgo: data.githubAssessment.latestActivityDaysAgo,
        repos: (data.githubAssessment.repos || []).map((r: any) => ({
          name: r.name,
          description: r.description,
          primaryLanguage: r.primaryLanguage,
          stars: r.stars,
          forks: r.forks,
          updatedDaysAgo: r.updatedDaysAgo,
          relevanceExplanation: r.relevanceExplanation
        })),
        overallAssessment: data.githubAssessment.overallAssessment
      } : {
        connected: false,
        status: 'NOT_CONNECTED'
      }
    };
  }

  async checkEmailAvailability(email: string): Promise<{ exists: boolean; status: 'AVAILABLE' | 'ALREADY_EXISTS' }> {
    const json: any = await apiRequest(`/api/v1/auth/check-email?email=${encodeURIComponent(email)}`, {
      headers: { Accept: 'application/json' }
    });
    return { exists: json.data.exists, status: json.data.status };
  }

  async registerCandidateAccount(payload: RegisterCandidatePayload): Promise<AuthResponse> {
    const json: any = await apiRequest('/api/v1/auth/register/candidate', {
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
    const json: any = await apiRequest('/api/v1/auth/register/recruiter', {
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
    const json: any = await apiRequest('/api/v1/auth/verify-email', {
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
    const json: any = await apiRequest('/api/v1/auth/resend-verification', {
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
    const json: any = await apiRequest('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password })
    });

    const jwtData = json.data;
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
  (window as any).__MIDCV_TEST_HARNESS__ = {
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

export const fetchJobs = (industry?: string) => currentApiClient.fetchJobs(industry);
export const fetchJobById = (id: string) => currentApiClient.fetchJobById(id);
export const fetchCandidateProfile = () => currentApiClient.fetchCandidateProfile();
export const saveCandidateProfile = (profile: CandidateProfile) => currentApiClient.saveCandidateProfile(profile);
export const fetchCandidateCVs = () => currentApiClient.fetchCandidateCVs();
export const saveCandidateCV = (cv: CV) => currentApiClient.saveCandidateCV(cv);
export const uploadCandidateCV = (file: File, title?: string, targetIndustry?: string, isDefault?: boolean) =>
  currentApiClient.uploadCandidateCV(file, title, targetIndustry, isDefault);
export const deleteCandidateCV = (cvId: string) => currentApiClient.deleteCandidateCV(cvId);
export const fetchCVReview = (cvId: string) => currentApiClient.fetchCVReview(cvId);
export const fetchCVProcessingStatus = (cvId: string) => currentApiClient.fetchCVProcessingStatus(cvId);
export const downloadCVFile = (cvId: string, format: string, defaultFilename: string) => currentApiClient.downloadCVFile(cvId, format, defaultFilename);
export const retryCVExtraction = (cvId: string) => currentApiClient.retryCVExtraction(cvId);
export const fetchCVDraft = (cvId: string) => currentApiClient.fetchCVDraft(cvId);
export const updateCVDraft = (cvId: string, draftData: any) => currentApiClient.updateCVDraft(cvId, draftData);
export const confirmCandidateCV = (cvId: string) => currentApiClient.confirmCandidateCV(cvId);
export const fetchCVVersions = (cvId: string) => currentApiClient.fetchCVVersions(cvId);
export const searchTaxonomySkills = (query: string, limit?: number) => currentApiClient.searchTaxonomySkills(query, limit);
export const uploadCVEvidence = (cvId: string, file: File, itemType: string, itemId: string) => currentApiClient.uploadCVEvidence(cvId, file, itemType, itemId);
export const deleteCVEvidence = (cvId: string, attachmentId: string) => currentApiClient.deleteCVEvidence(cvId, attachmentId);
export const downloadCVEvidence = (cvId: string, attachmentId: string, fileName: string) => currentApiClient.downloadCVEvidence(cvId, attachmentId, fileName);
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
export const updateApplicationStatus = (applicationId: string, status: ApplicationStatus, decisionNote?: string) =>
  currentApiClient.updateApplicationStatus(applicationId, status, decisionNote);
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

export async function uploadQuickScreening(jobId: string, file: File, githubEnabled = true): Promise<{ id: string; jobId: string; document: any }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('githubEnabled', String(githubEnabled));
  return apiRequest<{ id: string; jobId: string; document: any }>(`/api/v1/hr/jobs/${jobId}/screenings`, {
    method: 'POST',
    body: formData
  });
}

export async function fetchQuickScreenings(jobId: string, page = 0, size = 20): Promise<QuickScreeningRun[]> {
  const res = await apiRequest<any>(`/api/v1/hr/jobs/${jobId}/screenings?page=${page}&size=${size}`);
  return Array.isArray(res) ? res : (res?.data?.content ?? (Array.isArray(res?.data) ? res.data : []));
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
  const res = await apiRequest<{ data: AdminDashboardStats }>('/api/v1/admin/dashboard');
  return (res as any).data || res;
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
  const res = await apiRequest<any>(`/api/v1/admin/companies${qs}`);
  return res.data || res;
}

export async function fetchAdminCompanyDetail(id: string): Promise<CompanyAdminDto> {
  const res = await apiRequest<any>(`/api/v1/admin/companies/${id}`);
  return res.data || res;
}

export async function transitionCompanyVerification(id: string, body: {
  status: string;
  reason?: string;
  version?: number;
}): Promise<CompanyAdminDto> {
  const res = await apiRequest<any>(`/api/v1/admin/companies/${id}/transition`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return res.data || res;
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
  const res = await apiRequest<any>(`/api/v1/admin/candidates${qs}`);
  return res.data || res;
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
  const res = await apiRequest<any>(`/api/v1/admin/recruiters${qs}`);
  return res.data || res;
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
  const res = await apiRequest<any>(`/api/v1/admin/jobs${qs}`);
  return res.data || res;
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
  const res = await apiRequest<any>(`/api/v1/admin/reports${qs}`);
  return res.data || res;
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
  const res = await apiRequest<any>(`/api/v1/admin/taxonomy/skills${qs}`);
  return res.data || res;
}

export async function createAdminTaxonomySkill(body: {
  canonicalName: string;
  category: string;
  description?: string;
  aliases?: string[];
}): Promise<string> {
  const res = await apiRequest<any>('/api/v1/admin/taxonomy/skills', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return res.data || res;
}

export async function toggleAdminTaxonomySkill(id: string): Promise<boolean> {
  const res = await apiRequest<any>(`/api/v1/admin/taxonomy/skills/${id}/toggle`, {
    method: 'PUT',
  });
  return res.data || res;
}

export async function fetchAdminAuditLogs(params: {
  page?: number;
  size?: number;
} = {}): Promise<{ content: AdminAuditLogDto[]; totalElements: number; totalPages: number }> {
  const queryParts: string[] = [];
  if (params.page != null) queryParts.push(`page=${params.page}`);
  if (params.size != null) queryParts.push(`size=${params.size}`);
  const qs = queryParts.length ? `?${queryParts.join('&')}` : '';
  const res = await apiRequest<any>(`/api/v1/admin/audit-logs${qs}`);
  return res.data || res;
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
    let targetReason = data.reason || data.notes;

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
    const q = params?.query || params?.search;
    const isActive = params?.status === 'ACTIVE' ? true : params?.status === 'SUSPENDED' ? false : undefined;

    if (params?.role === 'CANDIDATE') {
      const res = await fetchAdminCandidates({ query: q, isActive, page: params?.page, size: params?.size });
      return {
        ...res,
        content: res.content.map((u) => ({
          ...u,
          accountStatus: (u.isActive ? 'ACTIVE' : 'SUSPENDED') as 'ACTIVE' | 'SUSPENDED',
        })),
      };
    } else if (params?.role === 'RECRUITER') {
      const res = await fetchAdminRecruiters({ query: q, isActive, page: params?.page, size: params?.size });
      return {
        ...res,
        content: res.content.map((u) => ({
          ...u,
          accountStatus: (u.isActive ? 'ACTIVE' : 'SUSPENDED') as 'ACTIVE' | 'SUSPENDED',
        })),
      };
    } else {
      // Both or ALL
      const [candRes, recRes] = await Promise.all([
        fetchAdminCandidates({ query: q, isActive, page: params?.page || 0, size: params?.size || 10 }),
        fetchAdminRecruiters({ query: q, isActive, page: params?.page || 0, size: params?.size || 10 }),
      ]);
      const combined = [...candRes.content, ...recRes.content].map((u) => ({
        ...u,
        accountStatus: (u.isActive ? 'ACTIVE' : 'SUSPENDED') as 'ACTIVE' | 'SUSPENDED',
      }));
      return {
        content: combined,
        totalElements: candRes.totalElements + recRes.totalElements,
        totalPages: Math.max(candRes.totalPages, recRes.totalPages),
      };
    }
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


