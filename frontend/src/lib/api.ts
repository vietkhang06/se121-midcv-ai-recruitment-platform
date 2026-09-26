import {
  Job,
  CV,
  CandidateProfile,
  Application,
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
  QuickScreeningDetail
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
  return localStorage.getItem('auth_token');
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
  fetchCandidateApplications(): Promise<Application[]>;
  submitApplication(app: Application): Promise<Application>;
  fetchJobApplications(jobId: string): Promise<Application[]>;
  fetchRecruiterProfile(): Promise<RecruiterProfile>;
  fetchRecruiterCompany(): Promise<Company>;
  saveCompanyProfile(company: Company): Promise<Company>;
  fetchRecruiterJobs(): Promise<Job[]>;
  saveJob(job: Job): Promise<Job>;
  publishJob(jobId: string): Promise<Job | null>;
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

export class RealApiClient implements ApiClient {
  async fetchJobs(industry?: string): Promise<Job[]> {
    const endpoint = industry
      ? `/api/v1/jobs?industry=${encodeURIComponent(industry)}`
      : '/api/v1/jobs';
    const json: any = await apiRequest(endpoint);
    const rawJobs: any[] = Array.isArray(json) ? json : (json?.data ?? []);
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

    const rawList: any[] = Array.isArray(json) ? json : (json?.data ?? []);
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

  async fetchCandidateApplications(): Promise<Application[]> {
    const token = getAuthToken();
    if (!token) {
      throw new ApiError('GET', '/api/v1/candidate/applications', 401, 'UNAUTHORIZED', 'Chưa đăng nhập hoặc token đã hết hạn.');
    }

    const json: any = await apiRequest('/api/v1/candidate/applications', {
      headers: { Authorization: `Bearer ${token}` }
    });

    const user = getAuthUser();
    const rawList: any[] = Array.isArray(json) ? json : (json?.data ?? []);
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

    const rawList: any[] = Array.isArray(json) ? json : (json?.data ?? []);
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
      status: app.status || 'SUBMITTED',
      appliedDate: app.appliedAt ? String(app.appliedAt).split('T')[0] : ''
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
      industry: (c.industry || 'Technology') as Industry,
      website: c.website || '',
      companySize: c.size || '',
      contactEmail: getAuthUser()?.email || '',
      verificationStatus: c.verificationStatus || 'PENDING',
      verificationReason: c.verificationStatus === 'VERIFIED' ? 'Doanh nghiệp đã được xác thực.' : undefined
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
      verificationStatus: c?.verificationStatus || company.verificationStatus
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

    const rawList: any[] = Array.isArray(json) ? json : (json?.data ?? []);
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

  async fetchCandidateRankings(jobId: string): Promise<CandidateRankingItem[]> {
    const token = getAuthToken();
    if (!token) {
      throw new ApiError('GET', `/api/v1/matching/jobs/${jobId}/rankings`, 401, 'UNAUTHORIZED', 'Chưa đăng nhập tài khoản nhà tuyển dụng.');
    }

    const json: any = await apiRequest(`/api/v1/matching/jobs/${jobId}/rankings`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const rawList: any[] = Array.isArray(json) ? json : (json?.data ?? []);
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
export const fetchCandidateApplications = () => currentApiClient.fetchCandidateApplications();
export const submitApplication = (app: Application) => currentApiClient.submitApplication(app);
export const fetchJobApplications = (jobId: string) => currentApiClient.fetchJobApplications(jobId);
export const fetchRecruiterProfile = () => currentApiClient.fetchRecruiterProfile();
export const fetchRecruiterCompany = () => currentApiClient.fetchRecruiterCompany();
export const saveCompanyProfile = (company: Company) => currentApiClient.saveCompanyProfile(company);
export const fetchRecruiterJobs = () => currentApiClient.fetchRecruiterJobs();
export const saveJob = (job: Job) => currentApiClient.saveJob(job);
export const publishJob = (jobId: string) => currentApiClient.publishJob(jobId);
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
  return apiRequest<AiSettings>('/api/admin/ai-settings');
}

export async function updateAiSettings(body: Partial<AiSettings> & { cloudApiKey?: string }): Promise<AiSettings> {
  return apiRequest<AiSettings>('/api/admin/ai-settings', {
    method: 'PUT',
    body: JSON.stringify(body)
  });
}

export async function testAiSettings(body: Partial<AiSettings> & { cloudApiKey?: string }): Promise<{ healthy: boolean; latencyMs?: number; message?: string; error?: string }> {
  return apiRequest<{ healthy: boolean; latencyMs?: number; message?: string; error?: string }>('/api/admin/ai-settings/test', {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

export async function uploadQuickScreening(jobId: string, file: File, githubEnabled = true): Promise<{ id: string; jobId: string; document: any }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('githubEnabled', String(githubEnabled));
  return apiRequest<{ id: string; jobId: string; document: any }>(`/api/hr/jobs/${jobId}/screenings`, {
    method: 'POST',
    body: formData
  });
}

export async function fetchQuickScreenings(jobId: string, page = 0, size = 20): Promise<QuickScreeningRun[]> {
  return apiRequest<QuickScreeningRun[]>(`/api/hr/jobs/${jobId}/screenings?page=${page}&size=${size}`);
}

export async function fetchScreeningDetail(screeningId: string): Promise<QuickScreeningDetail> {
  return apiRequest<QuickScreeningDetail>(`/api/hr/screenings/${screeningId}`);
}

export async function rematchScreening(screeningId: string): Promise<{ jobId: string }> {
  return apiRequest<{ jobId: string }>(`/api/hr/screenings/${screeningId}/match`, {
    method: 'POST'
  });
}
