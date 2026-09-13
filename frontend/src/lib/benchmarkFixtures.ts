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
  Industry
} from '@/types';
import {
  ApiClient,
  RegisterCandidatePayload,
  RegisterRecruiterPayload,
  AuthResponse,
  LoginResponse
} from './api';

// ============================================================
// DETERMINISTIC BENCHMARK SEED DATA (ISOLATED TEST-ONLY FIXTURES)
// ============================================================

export const SEED_COMPANY: Company = {
  id: 'comp-fpt-01',
  name: 'FPT Software Corporation',
  industry: 'Technology',
  website: 'https://fpt-software.com',
  companySize: '500-1000 nhân viên',
  contactEmail: 'hr@fpt-software.com',
  contactPhone: '+84 24 7300 7300',
  verificationStatus: 'VERIFIED',
  verificationReason: 'Doanh nghiệp đã được xác minh qua Giấy phép đăng ký kinh doanh và Mã số thuế chính thức.'
};

export const SEED_RECRUITER: RecruiterProfile = {
  id: 'rec-001',
  userId: 'usr-hr-01',
  fullName: 'Trần Thị Tuyển Dụng',
  email: 'recruiter@fpt-software.com',
  phone: '+84 912 345 678',
  company: SEED_COMPANY
};

export const SEED_JOBS: Job[] = [
  {
    id: 'job-001',
    title: 'Senior Java Backend Engineer (Spring Boot & Vector AI)',
    companyName: 'FPT Software Corporation',
    companyVerified: true,
    industry: 'Technology',
    employmentType: 'FULL_TIME',
    seniority: 'Senior',
    location: 'Hà Nội (Hybrid)',
    salaryMin: 2500,
    salaryMax: 4000,
    salaryRange: '$2,500 - $4,000 / tháng',
    department: 'AI & Cloud Transformation',
    publishedDate: '2026-08-15',
    description: 'Chúng tôi đang tìm kiếm Senior Java Backend Engineer thiết kế và vận hành hệ thống kiến trúc Microservices hiệu năng cao, tích hợp Vector Search Pgvector và thuật toán AI Matching Engine.',
    responsibilities: [
      'Thiết kế kiến trúc Spring Boot Microservices xử lý lưu lượng lớn.',
      'Phát triển RESTful API và gRPC streaming cho AI Matching Engine.',
      'Tối ưu hóa truy vấn PostgreSQL, chỉ mục Pgvector HNSW Indexing.',
      'Đóng gói Docker containers và triển khai Kubernetes cluster.'
    ],
    requirements: [
      { id: 'req-01', skillName: 'Java', requirementType: 'REQUIRED', minYearsExperience: 3, weight: 1.0 },
      { id: 'req-02', skillName: 'Spring Boot', requirementType: 'REQUIRED', minYearsExperience: 3, weight: 1.0 },
      { id: 'req-03', skillName: 'PostgreSQL', requirementType: 'REQUIRED', minYearsExperience: 2, weight: 0.9 },
      { id: 'req-04', skillName: 'Docker', requirementType: 'REQUIRED', minYearsExperience: 2, weight: 0.8 },
      { id: 'req-05', skillName: 'Redis', requirementType: 'PREFERRED', minYearsExperience: 1, weight: 0.5 },
      { id: 'req-06', skillName: 'TypeScript', requirementType: 'PREFERRED', minYearsExperience: 1, weight: 0.4 }
    ],
    status: 'PUBLISHED'
  },
  {
    id: 'job-002',
    title: 'Senior DevOps & Platform Engineer (Kubernetes & CI/CD)',
    companyName: 'VNG Corporation',
    companyVerified: true,
    industry: 'Technology',
    employmentType: 'FULL_TIME',
    seniority: 'Senior',
    location: 'Hồ Chí Minh',
    salaryMin: 2800,
    salaryMax: 4500,
    salaryRange: '$2,800 - $4,500 / tháng',
    department: 'Cloud Platform Infrastructure',
    publishedDate: '2026-08-20',
    description: 'Quản trị hạ tầng đám mây đa vùng, tự động hóa quy trình triển khai CI/CD và đảm bảo tính sẵn sàng cao.',
    responsibilities: [
      'Quản lý Kubernetes clusters trên AWS EKS và Bare-metal.',
      'Xây dựng GitOps pipeline bằng ArgoCD và Terraform.',
      'Thiết lập hệ thống giám sát Prometheus, Grafana và OpenTelemetry.'
    ],
    requirements: [
      { id: 'req-07', skillName: 'Kubernetes', requirementType: 'REQUIRED', minYearsExperience: 3, weight: 1.0 },
      { id: 'req-08', skillName: 'Docker', requirementType: 'REQUIRED', minYearsExperience: 3, weight: 0.9 },
      { id: 'req-09', skillName: 'AWS', requirementType: 'REQUIRED', minYearsExperience: 2, weight: 0.8 },
      { id: 'req-10', skillName: 'Terraform', requirementType: 'REQUIRED', minYearsExperience: 2, weight: 0.7 }
    ],
    status: 'PUBLISHED'
  },
  {
    id: 'job-003',
    title: 'Digital Marketing Growth Lead (B2B SaaS & Automation)',
    companyName: 'TopCV Vietnam',
    companyVerified: true,
    industry: 'Marketing',
    employmentType: 'FULL_TIME',
    seniority: 'Lead',
    location: 'Hà Nội',
    salaryMin: 1800,
    salaryMax: 3000,
    salaryRange: '$1,800 - $3,000 / tháng',
    department: 'Growth Marketing',
    publishedDate: '2026-08-22',
    description: 'Dẫn dắt chiến lược tăng trưởng người dùng B2B SaaS và tối ưu hóa phễu chuyển đổi qua dữ liệu thực tế.',
    responsibilities: [
      'Xây dựng chiến dịch Performance Marketing đa kênh.',
      'Phân tích phễu chuyển đổi bằng Google Analytics 4 và Mixpanel.',
      'Điều phối ngân sách quảng cáo và tối ưu hóa CAC/LTV.'
    ],
    requirements: [
      { id: 'req-11', skillName: 'Performance Marketing', requirementType: 'REQUIRED', minYearsExperience: 3, weight: 1.0 },
      { id: 'req-12', skillName: 'Google Analytics 4', requirementType: 'REQUIRED', minYearsExperience: 2, weight: 0.9 },
      { id: 'req-13', skillName: 'SEO', requirementType: 'REQUIRED', minYearsExperience: 2, weight: 0.8 }
    ],
    status: 'PUBLISHED'
  },
  {
    id: 'job-004',
    title: 'Senior UI/UX Product Designer (Design Systems)',
    companyName: 'MoMo E-Wallet',
    companyVerified: true,
    industry: 'Design',
    employmentType: 'FULL_TIME',
    seniority: 'Senior',
    location: 'Hồ Chí Minh (Hybrid)',
    salaryMin: 2000,
    salaryMax: 3500,
    salaryRange: '$2,000 - $3,500 / tháng',
    department: 'Product Experience',
    publishedDate: '2026-08-25',
    description: 'Thiết kế trải nghiệm người dùng thanh toán điện tử chuẩn hóa Design System đồng nhất trên iOS, Android và Web.',
    responsibilities: [
      'Xây dựng và bảo trì Design System toàn diện trong Figma.',
      'Nghiên cứu người dùng, phỏng vấn và kiểm thử khả năng sử dụng (Usability Testing).',
      'Phối hợp chặt chẽ với Frontend Developers để hiện thực hóa giao diện pixel-perfect.'
    ],
    requirements: [
      { id: 'req-14', skillName: 'Figma', requirementType: 'REQUIRED', minYearsExperience: 3, weight: 1.0 },
      { id: 'req-15', skillName: 'Design Systems', requirementType: 'REQUIRED', minYearsExperience: 2, weight: 1.0 },
      { id: 'req-16', skillName: 'User Research', requirementType: 'REQUIRED', minYearsExperience: 2, weight: 0.8 }
    ],
    status: 'PUBLISHED'
  }
];

export const SEED_CANDIDATE: CandidateProfile = {
  id: 'cand-01',
  fullName: 'Nguyễn Văn Java',
  email: 'nguyenvanjava@example.com',
  phone: '+84 901 234 567',
  headline: 'Senior Java Backend Engineer (Spring Boot & Vector AI)',
  bio: 'Kỹ sư phần mềm hơn 3.5 năm kinh nghiệm chuyên sâu về Java, Spring Boot microservices và thiết kế kiến trúc phân tán.',
  primaryIndustry: 'Technology',
  targetIndustry: 'Technology',
  targetIndustries: ['Technology'],
  skills: ['Java', 'Spring Boot', 'PostgreSQL', 'Docker', 'Redis', 'TypeScript', 'Kubernetes'],
  githubUrl: 'https://github.com/candidate-java',
  githubUsername: 'candidate-java',
  portfolioUrl: 'https://candidate-java.dev'
};

export const SEED_CVS: CV[] = [
  {
    id: 'cv-001',
    title: 'CV Chuyên Gia Backend Java & Cloud Infrastructure',
    targetIndustry: 'Technology',
    targetRole: 'Senior Java Backend Engineer',
    creationPath: 'BUILDER',
    isDefault: true,
    currentVersionNumber: 2,
    rawText: 'Nguyễn Văn Java - Senior Java Backend Engineer\nKỹ năng: Java, Spring Boot, PostgreSQL, Docker, Redis\nKinh nghiệm: 3.5 năm tại FPT Software',
    updatedAt: '2026-08-28',
    versions: [
      {
        id: 'cv-v-001',
        versionNumber: 2,
        title: 'Bản Cập Nhật Chứng Chỉ Cloud & Pgvector',
        createdAt: '2026-08-28',
        sections: [
          { id: 's1', sectionType: 'SUMMARY', title: 'Tóm tắt chuyên môn', content: 'Kỹ sư Backend giàu kinh nghiệm phát triển microservices bằng Java 21 và Spring Boot.' },
          { id: 's2', sectionType: 'SKILLS', title: 'Kỹ năng công nghệ', content: 'Java 21, Spring Boot, PostgreSQL, Docker, Redis, Kubernetes, Git.' }
        ]
      }
    ]
  }
];

export const SEED_APPLICATIONS: Application[] = [
  {
    id: 'app-001',
    job: SEED_JOBS[0],
    appliedCvId: 'cv-001',
    appliedCvTitle: 'CV Chuyên Gia Backend Java & Cloud Infrastructure',
    appliedCvVersion: 2,
    candidateName: 'Nguyễn Văn Java',
    status: 'SUBMITTED',
    appliedDate: '2026-08-28',
    expectedSalary: 3200,
    noticePeriodDays: 30,
    githubUrl: 'https://github.com/candidate-java',
    portfolioUrl: 'https://candidate-java.dev',
    candidateNotes: 'Đã ứng tuyển qua hệ thống MidCV AI Engine.'
  }
];

export const SEED_RANKINGS_JOB_01: CandidateRankingItem[] = [
  {
    rank: 1,
    applicationId: 'app-001',
    candidateId: 'cand-01',
    candidateName: 'Nguyễn Văn Java',
    headline: 'Senior Java Backend Engineer (Spring Boot & Vector AI)',
    overallMatchScore: 90.45,
    coreJdCvScore: 90.75,
    githubSupportingScore: 88.75,
    requiredSkillsMatched: 4,
    requiredSkillsTotal: 4,
    requiredSkillsMissingNames: [],
    relevantExperienceYears: 3.5,
    appliedDate: '2026-08-28',
    status: 'SUBMITTED',
    gitHubConnected: true
  }
];

export const SEED_INSPECTION_APP_001: MatchInspectionData = {
  applicationId: 'app-001',
  jobTitle: 'Senior Java Backend Engineer (Spring Boot & Vector AI)',
  candidateName: 'Nguyễn Văn Java',
  overallScore: 90.45,
  coreScore: 90.75,
  githubScore: 88.75,
  githubScoreActive: true,
  requiredSkillsStatus: [
    { skillName: 'Java', requirementType: 'REQUIRED', status: 'MATCH', evidenceText: 'CV ghi nhận Java 21 với 3.5 năm kinh nghiệm thực tế.' },
    { skillName: 'Spring Boot', requirementType: 'REQUIRED', status: 'MATCH', evidenceText: 'Thiết kế microservices Spring Boot.' },
    { skillName: 'PostgreSQL', requirementType: 'REQUIRED', status: 'MATCH', evidenceText: 'Kinh nghiệm quản trị PostgreSQL.' },
    { skillName: 'Docker', requirementType: 'REQUIRED', status: 'MATCH', evidenceText: 'Sử dụng Docker và Docker Compose.' }
  ],
  preferredSkillsStatus: [
    { skillName: 'Redis', requirementType: 'PREFERRED', status: 'MATCH', evidenceText: 'Sử dụng Redis caching.' }
  ],
  matchFactors: [
    { factorName: 'Skill Match Score (40% Core)', score: 95.0, status: 'HIGH', explanation: 'Đáp ứng 4/4 kỹ năng bắt buộc.' },
    { factorName: 'Experience Match Score (25% Core)', score: 88.0, status: 'HIGH', explanation: '3.5 năm kinh nghiệm thực tế.' }
  ],
  humanReadableExplanation: 'Ứng viên Nguyễn Văn Java đáp ứng đầy đủ 4/4 kỹ năng bắt buộc (Java, Spring Boot, PostgreSQL, Docker) và sở hữu 3.5 năm kinh nghiệm.',
  githubAssessment: {
    connected: true,
    status: 'SYNCED',
    username: 'candidate-java',
    publicRepoCount: 14,
    topLanguages: ['Java', 'TypeScript'],
    activitySignal: 'HIGH',
    overallAssessment: 'Ứng viên có mã nguồn mở hoạt động gần đây.'
  }
};

// ============================================================
// BENCHMARK FIXTURE CLIENT (TEST-ONLY ADAPTER)
// ============================================================

export class BenchmarkFixtureClient implements ApiClient {
  async fetchJobs(industry?: string): Promise<Job[]> {
    if (industry) {
      return SEED_JOBS.filter(j => j.industry.toLowerCase() === industry.toLowerCase());
    }
    return [...SEED_JOBS];
  }

  async fetchJobById(id: string): Promise<Job | null> {
    return SEED_JOBS.find(j => j.id === id) || null;
  }

  async fetchCandidateProfile(): Promise<CandidateProfile> {
    return { ...SEED_CANDIDATE };
  }

  async saveCandidateProfile(profile: CandidateProfile): Promise<CandidateProfile> {
    return { ...profile };
  }

  async fetchCandidateCVs(): Promise<CV[]> {
    return [...SEED_CVS];
  }

  async saveCandidateCV(cv: CV): Promise<CV> {
    return { ...cv };
  }

  async uploadCandidateCV(file: File, title?: string, targetIndustry?: string, isDefault?: boolean): Promise<CV> {
    return {
      id: `cv-uploaded-${Date.now()}`,
      title: title || file.name,
      targetIndustry: (targetIndustry || 'Technology') as Industry,
      creationPath: 'UPLOAD',
      isDefault: !!isDefault,
      currentVersionNumber: 1,
      updatedAt: new Date().toISOString().split('T')[0],
      versions: []
    };
  }

  async deleteCandidateCV(_cvId: string): Promise<void> {
    return;
  }

  async fetchCandidateApplications(): Promise<Application[]> {
    return [...SEED_APPLICATIONS];
  }

  async submitApplication(app: Application): Promise<Application> {
    return { ...app, id: `app-${Date.now()}`, status: 'SUBMITTED' };
  }

  async fetchJobApplications(jobId: string): Promise<Application[]> {
    return SEED_APPLICATIONS.filter(a => a.job?.id === jobId);
  }

  async fetchRecruiterProfile(): Promise<RecruiterProfile> {
    return { ...SEED_RECRUITER };
  }

  async fetchRecruiterCompany(): Promise<Company> {
    return { ...SEED_COMPANY };
  }

  async saveCompanyProfile(company: Company): Promise<Company> {
    return { ...company };
  }

  async fetchRecruiterJobs(): Promise<Job[]> {
    return [...SEED_JOBS];
  }

  async saveJob(job: Job): Promise<Job> {
    return { ...job };
  }

  async publishJob(jobId: string): Promise<Job | null> {
    const job = SEED_JOBS.find(j => j.id === jobId);
    return job ? { ...job, status: 'PUBLISHED' } : null;
  }

  async fetchCandidateRankings(_jobId: string): Promise<CandidateRankingItem[]> {
    return [...SEED_RANKINGS_JOB_01];
  }

  async fetchMatchInspection(_applicationId: string): Promise<MatchInspectionData | null> {
    return { ...SEED_INSPECTION_APP_001 };
  }

  async checkEmailAvailability(email: string): Promise<{ exists: boolean; status: 'AVAILABLE' | 'ALREADY_EXISTS' }> {
    const exists = email.toLowerCase() === 'nguyenvanjava@example.com';
    return { exists, status: exists ? 'ALREADY_EXISTS' : 'AVAILABLE' };
  }

  async registerCandidateAccount(payload: RegisterCandidatePayload): Promise<AuthResponse> {
    return {
      message: 'Đăng ký thành công.',
      email: payload.email,
      emailVerified: false,
      devVerificationToken: 'benchmark-token'
    };
  }

  async registerRecruiterAccount(payload: RegisterRecruiterPayload): Promise<AuthResponse> {
    return {
      message: 'Đăng ký thành công.',
      email: payload.email,
      emailVerified: false,
      devVerificationToken: 'benchmark-token'
    };
  }

  async verifyEmailToken(_token: string): Promise<{ success: boolean; message: string }> {
    return { success: true, message: 'Xác thực email thành công.' };
  }

  async resendVerificationToken(_email: string): Promise<{ success: boolean; message: string; devVerificationToken?: string }> {
    return { success: true, message: 'Đã gửi lại email xác thực.', devVerificationToken: 'benchmark-token' };
  }

  async loginAccount(email: string, _password: string): Promise<LoginResponse> {
    const user: User = {
      id: 'usr-cand-01',
      email: email,
      fullName: 'Nguyễn Văn Java',
      role: 'CANDIDATE',
      emailVerified: true
    };
    return { user, accessToken: 'benchmark-jwt-token' };
  }
}
