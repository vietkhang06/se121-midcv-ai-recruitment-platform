import {
  Job,
  CV,
  CandidateProfile,
  Application,
  User,
  RecruiterProfile,
  Company,
  CandidateRankingItem,
  MatchInspectionData
} from '@/types';

// Mock Company Data
export const MOCK_COMPANY: Company = {
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

// Mock Recruiter User Data
export const MOCK_RECRUITER: RecruiterProfile = {
  id: 'rec-01',
  userId: 'user-rec-01',
  fullName: 'Tran Thi HR Manager',
  email: 'hr@fpt-software.com',
  phone: '0901234567',
  company: MOCK_COMPANY
};

// Mock Jobs for HR Recruiter
export const MOCK_RECRUITER_JOBS: Job[] = [
  {
    id: 'job-tech-01',
    title: 'Senior Java Backend Engineer (Spring Boot & Vector AI)',
    companyName: 'FPT Software Corporation',
    companyVerified: true,
    industry: 'Technology',
    employmentType: 'FULL_TIME',
    seniority: 'Senior',
    location: 'Hồ Chí Minh',
    salaryMin: 2200,
    salaryMax: 3500,
    publishedDate: '2026-08-28',
    description: 'Chúng tôi tìm kiếm Senior Java Backend Engineer thiết kế hệ thống Microservices xử lý dữ liệu Vector 1536 chiều và tích hợp LLM.',
    responsibilities: [
      'Thiết kế kiến trúc Spring Boot Microservices xử lý 100,000+ request/ngày.',
      'Tối ưu hóa cơ sở dữ liệu PostgreSQL + Pgvector HNSW Index.',
      'Tích hợp Python AI Worker qua RestClient và REST API.'
    ],
    requirements: [
      { id: 'req-1', skillName: 'Java', requirementType: 'REQUIRED', minExperienceYears: 3 },
      { id: 'req-2', skillName: 'Spring Boot', requirementType: 'REQUIRED', minExperienceYears: 3 },
      { id: 'req-3', skillName: 'PostgreSQL', requirementType: 'REQUIRED', minExperienceYears: 2 },
      { id: 'req-4', skillName: 'Docker', requirementType: 'REQUIRED', minExperienceYears: 1 },
      { id: 'req-5', skillName: 'Redis', requirementType: 'PREFERRED' },
      { id: 'req-6', skillName: 'TypeScript', requirementType: 'PREFERRED' }
    ],
    benefits: [
      'Thưởng hiệu suất năm lên tới 4 tháng lương.',
      'Bảo hiểm FPT Care cho bản thân và gia đình.',
      'Làm việc Hybrid 2 ngày/tuần.'
    ],
    applicationQuestions: [
      'Số năm kinh nghiệm làm việc thực tế với Java Backend?',
      'Bạn đã từng triển khai hệ thống nào với Pgvector hoặc Vector Database chưa?'
    ],
    status: 'PUBLISHED'
  },
  {
    id: 'job-mkt-02',
    title: 'Digital Performance Marketing Manager (Meta Ads & GA4)',
    companyName: 'FPT Software Corporation',
    companyVerified: true,
    industry: 'Marketing',
    employmentType: 'FULL_TIME',
    seniority: 'Manager',
    location: 'Hà Nội',
    salaryMin: 1800,
    salaryMax: 2800,
    publishedDate: '2026-08-25',
    description: 'Chịu trách nhiệm tối ưu ngân sách Performance Marketing cho các sản phẩm toàn cầu của FPT.',
    responsibilities: [
      'Quản lý ngân sách Meta Ads & Google Ads $50,000+/tháng.',
      'Theo dõi và tối ưu chỉ số ROAS, CPA, Conversion Rate.'
    ],
    requirements: [
      { id: 'req-10', skillName: 'Meta Ads', requirementType: 'REQUIRED', minExperienceYears: 2 },
      { id: 'req-11', skillName: 'GA4', requirementType: 'REQUIRED', minExperienceYears: 2 },
      { id: 'req-12', skillName: 'SEO', requirementType: 'PREFERRED' }
    ],
    benefits: ['Ngân sách thử nghiệm chiến dịch cao.', 'Chuyến du lịch hàng năm.'],
    status: 'PUBLISHED'
  },
  {
    id: 'job-draft-03',
    title: 'Senior AI Research Engineer (LLM & Embeddings) [Bản Nháp]',
    companyName: 'FPT Software Corporation',
    companyVerified: true,
    industry: 'Technology',
    employmentType: 'FULL_TIME',
    seniority: 'Senior',
    location: 'Hồ Chí Minh',
    salaryMin: 3000,
    salaryMax: 4500,
    publishedDate: '2026-08-30',
    description: 'Vị trí bản nháp chuẩn bị tuyển dụng kỹ sư nghiên cứu mô hình ngôn ngữ lớn LLM.',
    requirements: [
      { id: 'req-20', skillName: 'Python', requirementType: 'REQUIRED', minExperienceYears: 3 },
      { id: 'req-21', skillName: 'PyTorch', requirementType: 'REQUIRED', minExperienceYears: 2 }
    ],
    status: 'DRAFT'
  }
];

// Mock Candidate Rankings for Job 01 (Sourced from Phase 4 Backend)
export const MOCK_CANDIDATE_RANKINGS: CandidateRankingItem[] = [
  {
    rank: 1,
    applicationId: 'app-001',
    candidateId: 'cand-01',
    candidateName: 'Nguyen Van Java',
    headline: 'Senior Java Backend Engineer (3.5+ năm exp)',
    overallMatchScore: 90.45,
    coreJdCvScore: 90.75,
    githubSupportingScore: 88.75,
    requiredSkillsMatched: 4,
    requiredSkillsTotal: 4,
    requiredSkillsMissingNames: [],
    relevantExperienceYears: 3.5,
    appliedDate: '2026-08-29',
    status: 'SUBMITTED',
    gitHubConnected: true
  },
  {
    rank: 2,
    applicationId: 'app-002',
    candidateId: 'cand-02',
    candidateName: 'Tran Van Spring',
    headline: 'Java Backend Developer',
    overallMatchScore: 80.09,
    coreJdCvScore: 80.09,
    githubSupportingScore: undefined,
    requiredSkillsMatched: 3,
    requiredSkillsTotal: 4,
    requiredSkillsMissingNames: ['PostgreSQL'],
    relevantExperienceYears: 2.0,
    appliedDate: '2026-08-30',
    status: 'SUBMITTED',
    gitHubConnected: false
  }
];

// Mock Detailed Match Inspection for Application 001
export const MOCK_MATCH_INSPECTION_APP_001: MatchInspectionData = {
  applicationId: 'app-001',
  jobTitle: 'Senior Java Backend Engineer (Spring Boot & Vector AI)',
  candidateName: 'Nguyen Van Java',
  overallScore: 90.45,
  coreScore: 90.75,
  githubScore: 88.75,
  githubScoreActive: true,
  requiredSkillsStatus: [
    { skillName: 'Java', requirementType: 'REQUIRED', status: 'MATCH', evidenceText: 'CV -> Skills: "Java 21, Spring Boot". 3.5 năm kinh nghiệm.' },
    { skillName: 'Spring Boot', requirementType: 'REQUIRED', status: 'MATCH', evidenceText: 'CV -> Experience: "Lập trình Microservices Spring Boot xử lý 100k req/ngày".' },
    { skillName: 'PostgreSQL', requirementType: 'REQUIRED', status: 'MATCH', evidenceText: 'CV -> Skills: "PostgreSQL, Pgvector HNSW Indexing".' },
    { skillName: 'Docker', requirementType: 'REQUIRED', status: 'MATCH', evidenceText: 'CV -> Skills: "Docker, Docker Compose, Redis".' }
  ],
  preferredSkillsStatus: [
    { skillName: 'Redis', requirementType: 'PREFERRED', status: 'MATCH', evidenceText: 'CV -> Skills: "Redis Caching".' },
    { skillName: 'TypeScript', requirementType: 'PREFERRED', status: 'MISSING', evidenceText: 'Không tìm thấy minh chứng trực tiếp trong CV.' }
  ],
  matchFactors: [
    { factorName: 'Skill Score (40% Core)', score: 95.0, status: 'HIGH', explanation: 'Đáp ứng 100% Kỹ năng Bắt buộc (Required Skills) và 50% Kỹ năng Ưu tiên.', evidence: 'Java, Spring Boot, PostgreSQL, Docker, Redis' },
    { factorName: 'Experience Score (25% Core)', score: 88.0, status: 'HIGH', explanation: 'Kinh nghiệm làm việc thực tế 3.5 năm phù hợp chính xác chuyên ngành Backend.', evidence: 'Senior Java Engineer tại FPT Software (2023 - Nay)' },
    { factorName: 'Education Score (10% Core)', score: 90.0, status: 'HIGH', explanation: 'Bằng Cử nhân Công nghệ Thông tin đúng chuyên ngành.', evidence: 'Cử nhân CNTT - Đại học Bách Khoa (2019 - 2023)' },
    { factorName: 'Project Score (10% Core)', score: 92.0, status: 'HIGH', explanation: 'Dự án AI Matching Engine có minh chứng mã nguồn thực tế.', evidence: 'AI Matching Engine (github.com/candidate-java/ai-matching)' },
    { factorName: 'Semantic Vector Match (15% Core)', score: 86.5, status: 'HIGH', explanation: 'Độ tương đồng ngữ nghĩa Vector 1536D ở mức rất cao.', evidence: 'Pgvector Cosine Similarity 0.865' },
    { factorName: 'GitHub Supporting Score (15% Weight)', score: 88.75, status: 'HIGH', explanation: 'Tín hiệu bổ trợ từ GitHub công khai ấn tượng với Java là ngôn ngữ hàng đầu.', evidence: 'Language Match 95%, Technology Match 90%, Activity High' }
  ],
  humanReadableExplanation: 'Ứng viên Nguyễn Văn Java đáp ứng 100% các kỹ năng bắt buộc (Java, Spring Boot, PostgreSQL, Docker) và sở hữu 3.5 năm kinh nghiệm phù hợp chính xác với vị trí. Tín hiệu bổ trợ từ GitHub cá nhân rất mạnh mẽ với repository công khai chứa mã nguồn Java & Spring Boot hoạt động gần đây.',
  githubAssessment: {
    connected: true,
    username: 'candidate-java',
    publicRepoCount: 14,
    topLanguages: ['Java', 'TypeScript', 'Python'],
    languageDistribution: { Java: 65.0, TypeScript: 20.0, Python: 15.0 },
    activitySignal: 'HIGH',
    latestActivityDaysAgo: 3,
    repos: [
      {
        name: 'ai-recruitment-matching-engine',
        description: 'Thuật toán đối sánh JD-CV bằng Vector Embedding 1536D & Pgvector Cosine Similarity.',
        primaryLanguage: 'Java',
        stars: 42,
        forks: 12,
        updatedDaysAgo: 3,
        relevanceExplanation: 'Mã nguồn trực tiếp chứng minh năng lực thiết kế hệ thống Spring Boot & AI Matching.'
      },
      {
        name: 'microservice-ecommerce-backend',
        description: 'Hệ thống Microservices thương mại điện tử xử lý giao dịch cao.',
        primaryLanguage: 'Java',
        stars: 18,
        forks: 5,
        updatedDaysAgo: 15,
        relevanceExplanation: 'Minh chứng kinh nghiệm thiết kế kiến trúc phân tán.'
      }
    ],
    overallAssessment: 'Ứng viên có hoạt động mã nguồn mở tích cực. Ngôn ngữ chính Java khớp hoàn toàn với yêu cầu công việc. Có dự án AI Matching thực tế minh chứng năng lực.'
  }
};

// API Fetchers for HR Recruiter
export async function fetchRecruiterProfile(): Promise<RecruiterProfile> {
  return MOCK_RECRUITER;
}

export async function fetchRecruiterJobs(): Promise<Job[]> {
  return MOCK_RECRUITER_JOBS;
}

export async function fetchCandidateRankings(jobId: string): Promise<CandidateRankingItem[]> {
  return MOCK_CANDIDATE_RANKINGS;
}

export async function fetchMatchInspection(applicationId: string): Promise<MatchInspectionData> {
  return MOCK_MATCH_INSPECTION_APP_001;
}

// Global existing Candidate & Job exports for Phase 5 backward compatibility
export const MOCK_JOBS: Job[] = MOCK_RECRUITER_JOBS;

export const MOCK_CANDIDATE: CandidateProfile = {
  id: 'cand-01',
  fullName: 'Nguyen Van Java',
  email: 'nguyenvanjava@example.com',
  phone: '0912345678',
  age: 24,
  headline: 'Senior Java Backend Engineer',
  bio: 'Lập trình viên Backend với 3.5 năm kinh nghiệm Java 21, Spring Boot và PostgreSQL.',
  primaryIndustry: 'Technology',
  additionalIndustries: ['Finance'],
  skills: ['Java', 'Spring Boot', 'PostgreSQL', 'Docker', 'REST API', 'Redis'],
  experienceSummary: '3.5 năm kinh nghiệm Java Backend tại FPT Software.',
  educationSummary: 'Cử nhân CNTT - ĐH Bách Khoa',
  githubUrl: 'https://github.com/candidate-java',
  portfolioUrl: 'https://candidate-java.dev'
};

export const MOCK_CVS: CV[] = [
  {
    id: 'cv-01',
    title: 'CV Senior Java Backend Engineer (Tech Standard)',
    targetIndustry: 'Technology',
    targetRole: 'Senior Java Engineer',
    creationPath: 'BUILDER',
    isDefault: true,
    currentVersionNumber: 1,
    updatedAt: '2026-08-29',
    versions: [
      {
        id: 'ver-01',
        versionNumber: 1,
        summaryText: 'Backend Developer với 3.5 năm kinh nghiệm Java Spring Boot.',
        createdAt: '2026-08-29',
        sections: [
          { sectionType: 'SUMMARY', title: 'Tóm tắt bản thân', content: 'Lập trình viên Backend với 3.5 năm kinh nghiệm Java 21, Spring Boot và PostgreSQL. Đam mê thiết kế hệ thống Microservices quy mô lớn.' },
          { sectionType: 'SKILLS', title: 'Bộ kỹ năng', content: 'Java 21, Spring Boot, PostgreSQL, Docker, Redis, REST API, Git' },
          { sectionType: 'EXPERIENCE', title: 'Kinh nghiệm làm việc', content: '2023 - Nay: Senior Java Backend Engineer tại FPT Software\n- Thiết kế Microservices xử lý 100,000+ request/ngày.' },
          { sectionType: 'PROJECTS', title: 'Dự án GitHub', content: 'AI Matching Engine (https://github.com/candidate-java/ai-matching)' }
        ]
      }
    ]
  }
];

export const MOCK_APPLICATIONS: Application[] = [
  {
    id: 'app-001',
    job: MOCK_JOBS[0],
    appliedCvId: 'cv-01',
    appliedCvTitle: 'CV Senior Java Backend Engineer (Tech Standard)',
    appliedCvVersion: 1,
    status: 'SUBMITTED',
    appliedDate: '2026-08-29',
    expectedSalary: 2500,
    noticePeriodDays: 30,
    githubUrl: 'https://github.com/candidate-java',
    candidateNotes: 'Tôi rất hào hứng với vị trí này và sẵn sàng đi làm ngay.'
  }
];

export async function fetchJobs(): Promise<Job[]> {
  return MOCK_JOBS;
}

export async function fetchJobById(id: string): Promise<Job | null> {
  return MOCK_JOBS.find(j => j.id === id) || MOCK_JOBS[0];
}
