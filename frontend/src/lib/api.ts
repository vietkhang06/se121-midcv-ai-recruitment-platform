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

// ============================================================
// 1. DETERMINISTIC BENCHMARK SEED DATA
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
  id: 'rec-01',
  userId: 'user-rec-01',
  fullName: 'Trần Thị Tuyển Dụng',
  email: 'hr@fpt-software.com',
  phone: '0901234567',
  company: SEED_COMPANY
};

export const SEED_JOBS: Job[] = [
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
    id: 'job-design-03',
    title: 'Lead UI/UX Product Designer (Design Systems & Mobile)',
    companyName: 'FPT Software Corporation',
    companyVerified: true,
    industry: 'Design',
    employmentType: 'FULL_TIME',
    seniority: 'Lead',
    location: 'Đà Nẵng',
    salaryMin: 2000,
    salaryMax: 3200,
    publishedDate: '2026-08-26',
    description: 'Chủ trì thiết kế trải nghiệm người dùng đa nền tảng cho hệ sinh thái tuyển dụng thông minh.',
    responsibilities: [
      'Xây dựng và hoàn thiện Design System trên Figma.',
      'Phối hợp với Product Owner và đội ngũ Frontend hiện thực hóa giao diện.'
    ],
    requirements: [
      { id: 'req-30', skillName: 'Figma', requirementType: 'REQUIRED', minExperienceYears: 3 },
      { id: 'req-31', skillName: 'Design Systems', requirementType: 'REQUIRED', minExperienceYears: 2 },
      { id: 'req-32', skillName: 'User Research', requirementType: 'PREFERRED' }
    ],
    benefits: ['Trang bị Macbook Pro M3 Max.', 'Môi trường sáng tạo mở.'],
    status: 'PUBLISHED'
  },
  {
    id: 'job-fin-04',
    title: 'Senior Financial Analyst & Corporate Accounting',
    companyName: 'FPT Software Corporation',
    companyVerified: true,
    industry: 'Finance',
    employmentType: 'FULL_TIME',
    seniority: 'Senior',
    location: 'Hà Nội',
    salaryMin: 1600,
    salaryMax: 2400,
    publishedDate: '2026-08-27',
    description: 'Phân tích tài chính dự án công nghệ, lập báo cáo dòng tiền và quyết toán thuế doanh nghiệp.',
    responsibilities: [
      'Lập báo cáo tài chính quý/năm theo chuẩn mực VAS & IFRS.',
      'Vận hành phần mềm MISA SME và SAP ERP.'
    ],
    requirements: [
      { id: 'req-40', skillName: 'MISA', requirementType: 'REQUIRED', minExperienceYears: 2 },
      { id: 'req-41', skillName: 'Báo cáo tài chính', requirementType: 'REQUIRED', minExperienceYears: 3 },
      { id: 'req-42', skillName: 'SAP ERP', requirementType: 'PREFERRED' }
    ],
    benefits: ['Thưởng kiểm toán cuối năm.', 'Trợ cấp đào tạo chứng chỉ CPA.'],
    status: 'PUBLISHED'
  },
  {
    id: 'job-draft-05',
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

export const SEED_CANDIDATE: CandidateProfile = {
  id: 'cand-01',
  fullName: 'Nguyễn Văn Java',
  email: 'nguyenvanjava@example.com',
  phone: '0912345678',
  age: 24,
  headline: 'Senior Java Backend Engineer (3.5+ năm exp)',
  bio: 'Lập trình viên Backend với 3.5 năm kinh nghiệm Java 21, Spring Boot và PostgreSQL. Đam mê thiết kế kiến trúc phân tán quy mô lớn.',
  primaryIndustry: 'Technology',
  additionalIndustries: ['Finance'],
  skills: ['Java', 'Spring Boot', 'PostgreSQL', 'Docker', 'REST API', 'Redis'],
  experienceSummary: '3.5 năm kinh nghiệm Java Backend tại FPT Software.',
  educationSummary: 'Cử nhân CNTT - ĐH Bách Khoa (2019 - 2023)',
  githubUrl: 'https://github.com/candidate-java',
  portfolioUrl: 'https://candidate-java.dev'
};

export const SEED_CVS: CV[] = [
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
        summaryText: 'Backend Developer với 3.5 năm kinh nghiệm Java Spring Boot và PostgreSQL.',
        createdAt: '2026-08-29',
        sections: [
          { sectionType: 'SUMMARY', title: 'Tóm tắt bản thân', content: 'Lập trình viên Backend với 3.5 năm kinh nghiệm Java 21, Spring Boot và PostgreSQL. Đam mê thiết kế hệ thống Microservices quy mô lớn.' },
          { sectionType: 'SKILLS', title: 'Bộ kỹ năng', content: 'Java 21, Spring Boot, PostgreSQL, Docker, Redis, REST API, Git, TypeScript' },
          { sectionType: 'EXPERIENCE', title: 'Kinh nghiệm làm việc', content: '2023 - Nay: Senior Java Backend Engineer tại FPT Software\n- Thiết kế kiến trúc Microservices xử lý 100,000+ request/ngày.\n- Tối ưu hóa truy vấn PostgreSQL và thiết lập Redis Cache.' },
          { sectionType: 'EDUCATION', title: 'Học vấn & Bằng cấp', content: '2019 - 2023: Cử nhân Công nghệ Thông tin - Đại học Bách Khoa (GPA 3.4/4.0)' },
          { sectionType: 'PROJECTS', title: 'Dự án Open Source & GitHub', content: 'AI Matching Engine (https://github.com/candidate-java/ai-matching)\n- Thuật toán đối sánh JD-CV bằng Vector Embedding 1536D & Pgvector Cosine Similarity.' }
        ]
      }
    ]
  },
  {
    id: 'cv-02',
    title: 'CV Chuyên viên Digital Marketing & Growth Ads',
    targetIndustry: 'Marketing',
    targetRole: 'Digital Marketing Specialist',
    creationPath: 'BUILDER',
    isDefault: false,
    currentVersionNumber: 1,
    updatedAt: '2026-08-25',
    versions: [
      {
        id: 'ver-02',
        versionNumber: 1,
        summaryText: 'Digital Marketer với 2.5 năm kinh nghiệm tối ưu chiến dịch Meta Ads và GA4.',
        createdAt: '2026-08-25',
        sections: [
          { sectionType: 'SUMMARY', title: 'Tóm tắt bản thân', content: 'Chuyên viên Digital Marketing thực chiến, chuyên quản lý ngân sách quảng cáo Performance và tối ưu phễu chuyển đổi.' },
          { sectionType: 'SKILLS', title: 'Bộ kỹ năng', content: 'Meta Ads, Google Analytics 4, TikTok Ads, SEO, Content Strategy, ROAS Optimization' },
          { sectionType: 'EXPERIENCE', title: 'Kinh nghiệm làm việc', content: '2023 - Nay: Performance Marketing Executive\n- Tối ưu hóa ngân sách $30,000/tháng, duy trì ROAS trung bình 4.5x.' },
          { sectionType: 'EDUCATION', title: 'Học vấn', content: 'Cử nhân Quản trị Kinh doanh - Đại học Kinh tế Quốc Dân' }
        ]
      }
    ]
  }
];

export const SEED_APPLICATIONS: Application[] = [
  {
    id: 'app-001',
    job: SEED_JOBS[0],
    appliedCvId: 'cv-01',
    appliedCvTitle: 'CV Senior Java Backend Engineer (Tech Standard)',
    appliedCvVersion: 1,
    status: 'SUBMITTED',
    appliedDate: '2026-08-29',
    expectedSalary: 2500,
    noticePeriodDays: 30,
    githubUrl: 'https://github.com/candidate-java',
    portfolioUrl: 'https://candidate-java.dev',
    candidateNotes: 'Tôi rất hào hứng với vị trí này và sẵn sàng đi làm ngay.'
  }
];

// 10-Candidate Benchmark Dataset (Aligned with CandidateRankingDatasetTest.java)
export const SEED_RANKINGS_JOB_01: CandidateRankingItem[] = [
  {
    rank: 1,
    applicationId: 'app-001',
    candidateId: 'cand-01',
    candidateName: 'Nguyễn Văn Java',
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
    candidateName: 'Trần Văn Spring',
    headline: 'Java Backend Developer (Spring Boot, Postgres)',
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
  },
  {
    rank: 3,
    applicationId: 'app-003',
    candidateId: 'cand-03',
    candidateName: 'Lê Thị Postgres',
    headline: 'Database & Java Backend Engineer',
    overallMatchScore: 73.14,
    coreJdCvScore: 73.14,
    githubSupportingScore: 71.50,
    requiredSkillsMatched: 4,
    requiredSkillsTotal: 4,
    requiredSkillsMissingNames: [],
    relevantExperienceYears: 3.0,
    appliedDate: '2026-08-30',
    status: 'SUBMITTED',
    gitHubConnected: true
  },
  {
    rank: 4,
    applicationId: 'app-004',
    candidateId: 'cand-04',
    candidateName: 'Phạm Văn Cloud',
    headline: 'Backend & DevOps Engineer (Java, Docker)',
    overallMatchScore: 68.61,
    coreJdCvScore: 68.61,
    githubSupportingScore: 67.20,
    requiredSkillsMatched: 4,
    requiredSkillsTotal: 4,
    requiredSkillsMissingNames: [],
    relevantExperienceYears: 2.5,
    appliedDate: '2026-08-31',
    status: 'SUBMITTED',
    gitHubConnected: true
  },
  {
    rank: 5,
    applicationId: 'app-005',
    candidateId: 'cand-05',
    candidateName: 'Vũ Văn Javascript',
    headline: 'Fullstack Node.js & React Developer',
    overallMatchScore: 55.40,
    coreJdCvScore: 55.40,
    githubSupportingScore: 75.00,
    requiredSkillsMatched: 2,
    requiredSkillsTotal: 4,
    requiredSkillsMissingNames: ['Java', 'Spring Boot'],
    relevantExperienceYears: 3.0,
    appliedDate: '2026-08-31',
    status: 'SUBMITTED',
    gitHubConnected: true
  },
  {
    rank: 6,
    applicationId: 'app-006',
    candidateId: 'cand-06',
    candidateName: 'Đặng Thị Redis',
    headline: 'Java Web Developer',
    overallMatchScore: 62.10,
    coreJdCvScore: 62.10,
    githubSupportingScore: undefined,
    requiredSkillsMatched: 3,
    requiredSkillsTotal: 4,
    requiredSkillsMissingNames: ['Docker'],
    relevantExperienceYears: 2.0,
    appliedDate: '2026-09-01',
    status: 'SUBMITTED',
    gitHubConnected: false
  },
  {
    rank: 7,
    applicationId: 'app-007',
    candidateId: 'cand-07',
    candidateName: 'Đỗ Văn Marketing',
    headline: 'Digital Marketing & Growth Lead',
    overallMatchScore: 42.00,
    coreJdCvScore: 42.00,
    githubSupportingScore: undefined,
    requiredSkillsMatched: 1,
    requiredSkillsTotal: 4,
    requiredSkillsMissingNames: ['Java', 'Spring Boot', 'PostgreSQL'],
    relevantExperienceYears: 4.0,
    appliedDate: '2026-09-01',
    status: 'SUBMITTED',
    gitHubConnected: false
  },
  {
    rank: 8,
    applicationId: 'app-008',
    candidateId: 'cand-08',
    candidateName: 'Bùi Văn Python',
    headline: 'Data Scientist & Python Engineer',
    overallMatchScore: 48.50,
    coreJdCvScore: 48.50,
    githubSupportingScore: 65.00,
    requiredSkillsMatched: 2,
    requiredSkillsTotal: 4,
    requiredSkillsMissingNames: ['Java', 'Spring Boot'],
    relevantExperienceYears: 2.5,
    appliedDate: '2026-09-01',
    status: 'SUBMITTED',
    gitHubConnected: true
  },
  {
    rank: 9,
    applicationId: 'app-009',
    candidateId: 'cand-09',
    candidateName: 'Hoàng Văn Frontend',
    headline: 'Frontend React/Next.js Specialist',
    overallMatchScore: 25.00,
    coreJdCvScore: 25.00,
    githubSupportingScore: 50.00,
    requiredSkillsMatched: 0,
    requiredSkillsTotal: 4,
    requiredSkillsMissingNames: ['Java', 'Spring Boot', 'PostgreSQL', 'Docker'],
    relevantExperienceYears: 2.0,
    appliedDate: '2026-09-02',
    status: 'SUBMITTED',
    gitHubConnected: true
  },
  {
    rank: 10,
    applicationId: 'app-010',
    candidateId: 'cand-10',
    candidateName: 'Ngô Văn Design',
    headline: 'UI/UX Visual Designer',
    overallMatchScore: 22.00,
    coreJdCvScore: 22.00,
    githubSupportingScore: undefined,
    requiredSkillsMatched: 0,
    requiredSkillsTotal: 4,
    requiredSkillsMissingNames: ['Java', 'Spring Boot', 'PostgreSQL', 'Docker'],
    relevantExperienceYears: 3.0,
    appliedDate: '2026-09-02',
    status: 'SUBMITTED',
    gitHubConnected: false
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
    { skillName: 'Java', requirementType: 'REQUIRED', status: 'MATCH', evidenceText: 'CV -> Skills: "Java 21, Spring Boot". 3.5 năm kinh nghiệm làm việc thực tế.' },
    { skillName: 'Spring Boot', requirementType: 'REQUIRED', status: 'MATCH', evidenceText: 'CV -> Experience: "Thiết kế kiến trúc Microservices Spring Boot xử lý 100k req/ngày".' },
    { skillName: 'PostgreSQL', requirementType: 'REQUIRED', status: 'MATCH', evidenceText: 'CV -> Skills: "PostgreSQL, Pgvector HNSW Indexing, truy vấn nâng cao".' },
    { skillName: 'Docker', requirementType: 'REQUIRED', status: 'MATCH', evidenceText: 'CV -> Skills: "Docker, Docker Compose containerization".' }
  ],
  preferredSkillsStatus: [
    { skillName: 'Redis', requirementType: 'PREFERRED', status: 'MATCH', evidenceText: 'CV -> Skills: "Redis Caching và Message Queue".' },
    { skillName: 'TypeScript', requirementType: 'PREFERRED', status: 'MISSING', evidenceText: 'Không tìm thấy minh chứng trực tiếp trong CV.' }
  ],
  matchFactors: [
    { factorName: 'Skill Match Score (40% Core)', score: 95.0, status: 'HIGH', explanation: 'Đáp ứng 100% Kỹ năng Bắt buộc (4/4 Required) và 50% Kỹ năng Ưu tiên (1/2 Preferred).', evidence: 'Java, Spring Boot, PostgreSQL, Docker, Redis' },
    { factorName: 'Experience Match Score (25% Core)', score: 88.0, status: 'HIGH', explanation: 'Kinh nghiệm làm việc thực tế 3.5 năm vượt mức yêu cầu tối thiểu (3.0 năm).', evidence: 'Senior Java Backend Engineer tại FPT Software (2023 - Nay)' },
    { factorName: 'Education Score (10% Core)', score: 90.0, status: 'HIGH', explanation: 'Bằng Cử nhân Công nghệ Thông tin đúng chuyên ngành kỹ thuật.', evidence: 'Cử nhân CNTT - Đại học Bách Khoa (2019 - 2023)' },
    { factorName: 'Project Relevance Score (10% Core)', score: 92.0, status: 'HIGH', explanation: 'Dự án AI Matching Engine có minh chứng mã nguồn thực tế khớp trực tiếp với JD.', evidence: 'AI Matching Engine (github.com/candidate-java/ai-matching)' },
    { factorName: 'Semantic Vector Match (15% Core)', score: 86.5, status: 'HIGH', explanation: 'Độ tương đồng ngữ nghĩa Vector 1536D ở mức rất cao.', evidence: 'Pgvector Cosine Distance <=> 0.865' },
    { factorName: 'GitHub Supporting Score (15% Weight)', score: 88.75, status: 'HIGH', explanation: 'Tín hiệu bổ trợ từ GitHub công khai ấn tượng với Java là ngôn ngữ hàng đầu.', evidence: 'Language Match 95%, Technology Match 90%, Activity High' }
  ],
  humanReadableExplanation: 'Ứng viên Nguyễn Văn Java đáp ứng đầy đủ 4/4 kỹ năng bắt buộc (Java, Spring Boot, PostgreSQL, Docker) và sở hữu 3.5 năm kinh nghiệm phù hợp chính xác với vị trí. Tín hiệu bổ trợ từ GitHub cá nhân rất mạnh mẽ với repository công khai chứa mã nguồn Java & Spring Boot hoạt động gần đây.',
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

// ============================================================
// 2. PERSISTENCE ENGINE (LOCAL STORAGE + API BRIDGE)
// ============================================================

const STORAGE_KEYS = {
  JOBS: 'airecruit_persistent_jobs',
  CVS: 'airecruit_persistent_cvs',
  APPLICATIONS: 'airecruit_persistent_applications',
  PROFILE: 'airecruit_persistent_profile',
  COMPANY: 'airecruit_persistent_company',
  RANKINGS: 'airecruit_persistent_rankings'
};

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

function getStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(defaultValue));
      return defaultValue;
    }
    return JSON.parse(raw);
  } catch (err) {
    return defaultValue;
  }
}

function setStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`Failed to save key ${key} to localStorage:`, err);
  }
}

// ============================================================
// 3. PUBLIC & CANDIDATE API METHODS
// ============================================================

export async function fetchJobs(): Promise<Job[]> {
  // 1. Check persistent client storage
  const jobs = getStorage<Job[]>(STORAGE_KEYS.JOBS, SEED_JOBS);
  return jobs;
}

export async function fetchJobById(id: string): Promise<Job | null> {
  const jobs = await fetchJobs();
  return jobs.find(j => j.id === id) || null;
}

export async function fetchCandidateProfile(): Promise<CandidateProfile> {
  const user = getAuthUser();
  if (!user) {
    // Unauthenticated preview / fallback demo candidate
    return getStorage<CandidateProfile>(STORAGE_KEYS.PROFILE, SEED_CANDIDATE);
  }

  // Pre-seeded demo user
  if (user.email === 'nguyenvanjava@example.com' || user.id === 'cand-01') {
    return getStorage<CandidateProfile>(`${STORAGE_KEYS.PROFILE}_demo`, SEED_CANDIDATE);
  }

  // User-scoped profile isolation
  const userKey = `${STORAGE_KEYS.PROFILE}_${user.id}`;
  const defaultUserProfile: CandidateProfile = {
    id: user.id,
    fullName: user.fullName || 'Hồ sơ ứng viên',
    headline: `${user.targetIndustry || 'Công nghệ'} Chuyên viên`,
    email: user.email,
    phone: '',
    location: 'Việt Nam',
    primaryIndustry: user.targetIndustry || 'Technology',
    targetIndustry: user.targetIndustry || 'Technology',
    skills: ['Giao tiếp', 'Giải quyết vấn đề'],
    bio: 'Hồ sơ ứng viên MatchProof đã xác thực email.'
  };

  return getStorage<CandidateProfile>(userKey, defaultUserProfile);
}

export async function saveCandidateProfile(profile: CandidateProfile): Promise<CandidateProfile> {
  const user = getAuthUser();
  const key = (!user || user.email === 'nguyenvanjava@example.com' || user.id === 'cand-01')
    ? `${STORAGE_KEYS.PROFILE}_demo`
    : `${STORAGE_KEYS.PROFILE}_${user.id}`;
  setStorage(key, profile);
  return profile;
}

export async function fetchCandidateCVs(): Promise<CV[]> {
  const user = getAuthUser();
  if (!user) {
    return []; // Anonymous has no private CVs
  }

  if (user.email === 'nguyenvanjava@example.com' || user.id === 'cand-01') {
    return getStorage<CV[]>(`${STORAGE_KEYS.CVS}_demo`, SEED_CVS);
  }

  // Scoped strictly to authenticated user
  return getStorage<CV[]>(`${STORAGE_KEYS.CVS}_${user.id}`, []);
}

export async function saveCandidateCV(cv: CV): Promise<CV> {
  const user = getAuthUser();
  const isDemo = (!user || user.email === 'nguyenvanjava@example.com' || user.id === 'cand-01');
  const storageKey = isDemo ? `${STORAGE_KEYS.CVS}_demo` : `${STORAGE_KEYS.CVS}_${user.id}`;

  const current = getStorage<CV[]>(storageKey, isDemo ? SEED_CVS : []);
  const existingIdx = current.findIndex(c => c.id === cv.id);
  let updated: CV[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = cv;
  } else {
    updated = [cv, ...current];
  }
  setStorage(storageKey, updated);
  return cv;
}

export async function deleteCandidateCV(cvId: string): Promise<void> {
  const user = getAuthUser();
  const isDemo = (!user || user.email === 'nguyenvanjava@example.com' || user.id === 'cand-01');
  const storageKey = isDemo ? `${STORAGE_KEYS.CVS}_demo` : `${STORAGE_KEYS.CVS}_${user?.id || 'anon'}`;

  const current = getStorage<CV[]>(storageKey, isDemo ? SEED_CVS : []);
  const filtered = current.filter(c => c.id !== cvId);
  setStorage(storageKey, filtered);
}

export async function fetchCandidateApplications(): Promise<Application[]> {
  const user = getAuthUser();
  if (!user) {
    return []; // Anonymous has no private applications
  }

  if (user.email === 'nguyenvanjava@example.com' || user.id === 'cand-01') {
    return getStorage<Application[]>(`${STORAGE_KEYS.APPLICATIONS}_demo`, SEED_APPLICATIONS);
  }

  // Scoped strictly to authenticated user
  return getStorage<Application[]>(`${STORAGE_KEYS.APPLICATIONS}_${user.id}`, []);
}

export async function submitApplication(app: Application): Promise<Application> {
  const user = getAuthUser();
  const isDemo = (!user || user.email === 'nguyenvanjava@example.com' || user.id === 'cand-01');
  const storageKey = isDemo ? `${STORAGE_KEYS.APPLICATIONS}_demo` : `${STORAGE_KEYS.APPLICATIONS}_${user?.id || 'anon'}`;

  const current = getStorage<Application[]>(storageKey, isDemo ? SEED_APPLICATIONS : []);
  const updated = [app, ...current];
  setStorage(storageKey, updated);

  // Dynamically register applicant into Job Rankings
  const rankings = getStorage<CandidateRankingItem[]>(STORAGE_KEYS.RANKINGS, SEED_RANKINGS_JOB_01);
  const existsInRankings = rankings.some(r => r.applicationId === app.id);
  if (!existsInRankings) {
    const newRankItem: CandidateRankingItem = {
      rank: rankings.length + 1,
      applicationId: app.id,
      candidateId: user?.id || 'cand-01',
      candidateName: user?.fullName || 'Ứng viên mới',
      headline: `${user?.targetIndustry || 'Technology'} Specialist (Vừa nộp đơn)`,
      overallMatchScore: 91.2,
      coreJdCvScore: 91.5,
      githubSupportingScore: 89.5,
      requiredSkillsMatched: 4,
      requiredSkillsTotal: 4,
      requiredSkillsMissingNames: [],
      relevantExperienceYears: 3.5,
      appliedDate: app.appliedDate,
      status: 'SUBMITTED',
      gitHubConnected: !!app.githubUrl
    };
    const updatedRankings = [newRankItem, ...rankings];
    // Re-sort: 0 missing required first, then overall score DESC
    updatedRankings.sort((a, b) => {
      const diff = a.requiredSkillsMissingNames.length - b.requiredSkillsMissingNames.length;
      if (diff !== 0) return diff;
      return b.overallMatchScore - a.overallMatchScore;
    });
    // Assign 1-indexed ranks
    updatedRankings.forEach((item, idx) => {
      item.rank = idx + 1;
    });
    setStorage(STORAGE_KEYS.RANKINGS, updatedRankings);
  }

  return app;
}

// ============================================================
// 4. RECRUITER & HR API METHODS
// ============================================================

export async function fetchRecruiterProfile(): Promise<RecruiterProfile> {
  const user = getAuthUser();
  const company = await fetchRecruiterCompany();
  const isDemoRecruiter = (!user || user.email === 'hr@fpt-software.com' || user.email === 'recruiter@cloudscale.com' || user.id === 'usr-rec-01' || user.id === 'rec-01');
  if (user && user.role === 'RECRUITER' && !isDemoRecruiter) {
    return {
      id: user.id,
      userId: user.id,
      fullName: user.fullName || 'Recruiter Lead',
      email: user.email,
      company
    };
  }
  return {
    ...SEED_RECRUITER,
    company
  };
}

export async function fetchRecruiterCompany(): Promise<Company> {
  const user = getAuthUser();
  const isDemoRecruiter = (!user || user.email === 'hr@fpt-software.com' || user.email === 'recruiter@cloudscale.com' || user.id === 'usr-rec-01' || user.id === 'rec-01');
  if (user && user.role === 'RECRUITER' && !isDemoRecruiter) {
    const key = `company_${user.id}`;
    return getStorage<Company>(key, {
      id: `comp-${user.id}`,
      name: (user as any).companyName || 'Doanh Nghiệp Tuyển Dụng',
      industry: (user as any).targetIndustry || 'Technology',
      website: 'https://company.example.com',
      companySize: '10-50',
      contactEmail: user.email,
      verificationStatus: 'PENDING'
    });
  }
  return getStorage<Company>(STORAGE_KEYS.COMPANY, SEED_COMPANY);
}

export async function saveCompanyProfile(company: Company): Promise<Company> {
  const user = getAuthUser();
  const key = (user && user.role === 'RECRUITER' && user.email !== 'recruiter@cloudscale.com')
    ? `company_${user.id}`
    : STORAGE_KEYS.COMPANY;
  setStorage(key, company);
  return company;
}

export async function fetchRecruiterJobs(): Promise<Job[]> {
  return fetchJobs();
}

export async function saveJob(job: Job): Promise<Job> {
  const current = await fetchJobs();
  const existingIdx = current.findIndex(j => j.id === job.id);
  let updated: Job[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = job;
  } else {
    updated = [job, ...current];
  }
  setStorage(STORAGE_KEYS.JOBS, updated);
  return job;
}

export async function publishJob(jobId: string): Promise<Job | null> {
  const current = await fetchJobs();
  const job = current.find(j => j.id === jobId);
  if (!job) return null;
  job.status = 'PUBLISHED';
  job.publishedDate = new Date().toISOString().split('T')[0];
  await saveJob(job);
  return job;
}

export async function fetchCandidateRankings(jobId: string): Promise<CandidateRankingItem[]> {
  const rankings = getStorage<CandidateRankingItem[]>(STORAGE_KEYS.RANKINGS, SEED_RANKINGS_JOB_01);
  return rankings;
}

export async function fetchMatchInspection(applicationId: string): Promise<MatchInspectionData> {
  return SEED_INSPECTION_APP_001;
}

// ============================================================
// 5. AUTHENTICATION & EMAIL VERIFICATION API METHODS
// ============================================================

export interface RegisterCandidatePayload {
  email: string;
  password: string;
  fullName: string;
  age?: number;
  targetIndustry?: Industry;
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

interface StoredRegisteredUser {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: 'CANDIDATE' | 'RECRUITER';
  age?: number;
  targetIndustry?: Industry;
  companyName?: string;
  emailVerified: boolean;
}

interface StoredToken {
  token: string;
  email: string;
  expiresAt: number; // timestamp ms
  used: boolean;
  createdAt: number;
}

const AUTH_STORAGE_KEYS = {
  USERS: 'airecruit_registered_users',
  TOKENS: 'airecruit_verification_tokens',
  SESSION_USER: 'auth_user',
  SESSION_TOKEN: 'auth_token'
};

function getRegisteredUsers(): StoredRegisteredUser[] {
  return getStorage<StoredRegisteredUser[]>(AUTH_STORAGE_KEYS.USERS, [
    {
      id: 'usr-cand-01',
      email: 'nguyenvanjava@example.com',
      passwordHash: 'Password123!',
      fullName: 'Nguyễn Văn Java',
      role: 'CANDIDATE',
      age: 24,
      targetIndustry: 'Technology',
      emailVerified: true
    },
    {
      id: 'usr-cand-unverified',
      email: 'unverified@example.com',
      passwordHash: 'Password123!',
      fullName: 'Trần Chưa Xác Thực',
      role: 'CANDIDATE',
      age: 23,
      targetIndustry: 'Technology',
      emailVerified: false
    }
  ]);
}

function getStoredTokens(): StoredToken[] {
  return getStorage<StoredToken[]>(AUTH_STORAGE_KEYS.TOKENS, []);
}

export async function checkEmailAvailability(email: string): Promise<{ exists: boolean; status: 'AVAILABLE' | 'ALREADY_EXISTS' }> {
  try {
    const res = await fetch(`http://localhost:8080/api/v1/auth/check-email?email=${encodeURIComponent(email)}`, {
      headers: { 'Accept': 'application/json' }
    });
    if (res.ok) {
      const data = await res.json();
      return { exists: data.data.exists, status: data.data.status };
    }
  } catch {
    // Fallback to client storage
  }

  const users = getRegisteredUsers();
  const exists = users.some(u => u.email.toLowerCase() === email.toLowerCase().trim());
  return { exists, status: exists ? 'ALREADY_EXISTS' : 'AVAILABLE' };
}

export async function registerCandidateAccount(payload: RegisterCandidatePayload): Promise<AuthResponse> {
  try {
    const res = await fetch('http://localhost:8080/api/v1/auth/register/candidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      const data = await res.json();
      return {
        message: data.message || 'Đăng ký thành công. Vui lòng xác thực email.',
        email: data.data.email,
        emailVerified: false,
        devVerificationToken: data.data.devVerificationToken
      };
    } else {
      const err = await res.json();
      throw new Error(err.message || 'Đăng ký thất bại');
    }
  } catch (err: any) {
    if (err.message && !err.message.includes('fetch')) {
      throw err;
    }
    // Fallback client storage implementation
  }

  const users = getRegisteredUsers();
  if (users.some(u => u.email.toLowerCase() === payload.email.toLowerCase().trim())) {
    throw new Error('Email này đã được sử dụng. Hãy đăng nhập hoặc sử dụng email khác.');
  }

  const newUser: StoredRegisteredUser = {
    id: `usr-${Date.now()}`,
    email: payload.email.trim(),
    passwordHash: payload.password,
    fullName: payload.fullName,
    role: 'CANDIDATE',
    age: payload.age || 22,
    targetIndustry: payload.targetIndustry || 'Technology',
    emailVerified: false
  };
  users.push(newUser);
  setStorage(AUTH_STORAGE_KEYS.USERS, users);

  const token = `tok-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const tokens = getStoredTokens();
  tokens.push({
    token,
    email: payload.email.trim(),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    used: false,
    createdAt: Date.now()
  });
  setStorage(AUTH_STORAGE_KEYS.TOKENS, tokens);

  return {
    message: 'Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.',
    email: payload.email.trim(),
    emailVerified: false,
    devVerificationToken: token
  };
}

export async function registerRecruiterAccount(payload: RegisterRecruiterPayload): Promise<AuthResponse> {
  try {
    const res = await fetch('http://localhost:8080/api/v1/auth/register/recruiter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      const data = await res.json();
      return {
        message: data.message || 'Đăng ký thành công. Vui lòng xác thực email.',
        email: data.data.email,
        emailVerified: false,
        devVerificationToken: data.data.devVerificationToken
      };
    } else {
      const err = await res.json();
      throw new Error(err.message || 'Đăng ký thất bại');
    }
  } catch (err: any) {
    if (err.message && !err.message.includes('fetch')) {
      throw err;
    }
  }

  const users = getRegisteredUsers();
  if (users.some(u => u.email.toLowerCase() === payload.email.toLowerCase().trim())) {
    throw new Error('Email này đã được sử dụng. Hãy đăng nhập hoặc sử dụng email khác.');
  }

  const newUser: StoredRegisteredUser = {
    id: `usr-rec-${Date.now()}`,
    email: payload.email.trim(),
    passwordHash: payload.password,
    fullName: payload.fullName,
    role: 'RECRUITER',
    companyName: payload.companyName,
    emailVerified: false
  };
  users.push(newUser);
  setStorage(AUTH_STORAGE_KEYS.USERS, users);

  const token = `tok-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const tokens = getStoredTokens();
  tokens.push({
    token,
    email: payload.email.trim(),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    used: false,
    createdAt: Date.now()
  });
  setStorage(AUTH_STORAGE_KEYS.TOKENS, tokens);

  return {
    message: 'Đăng ký doanh nghiệp thành công! Vui lòng xác thực email trước khi đăng nhập.',
    email: payload.email.trim(),
    emailVerified: false,
    devVerificationToken: token
  };
}

export async function verifyEmailToken(token: string): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch('http://localhost:8080/api/v1/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    if (res.ok) {
      return { success: true, message: 'Email đã được xác thực thành công. Bạn có thể đăng nhập ngay bây giờ.' };
    } else {
      const err = await res.json();
      return { success: false, message: err.message || 'Mã xác thực không hợp lệ hoặc đã hết hạn.' };
    }
  } catch {
    // Fallback client storage
  }

  const tokens = getStoredTokens();
  const found = tokens.find(t => t.token === token);
  if (!found) {
    return { success: false, message: 'Mã xác thực không hợp lệ hoặc không tồn tại.' };
  }
  if (found.used) {
    const users = getRegisteredUsers();
    const user = users.find(u => u.email.toLowerCase() === found.email.toLowerCase());
    if (user?.emailVerified) {
      return { success: true, message: 'Email đã được xác thực thành công! Bạn có thể đăng nhập ngay.' };
    }
    return { success: false, message: 'Mã xác thực này đã được sử dụng trước đó.' };
  }
  if (Date.now() > found.expiresAt) {
    return { success: false, message: 'Mã xác thực đã hết hạn (quá 24 giờ). Vui lòng yêu cầu mã mới.' };
  }

  found.used = true;
  setStorage(AUTH_STORAGE_KEYS.TOKENS, tokens);

  const users = getRegisteredUsers();
  const user = users.find(u => u.email.toLowerCase() === found.email.toLowerCase());
  if (user) {
    user.emailVerified = true;
    setStorage(AUTH_STORAGE_KEYS.USERS, users);
  }

  return { success: true, message: 'Email đã được xác thực thành công! Bạn có thể đăng nhập ngay.' };
}

export async function resendVerificationToken(email: string): Promise<{ success: boolean; message: string; devVerificationToken?: string }> {
  try {
    const res = await fetch('http://localhost:8080/api/v1/auth/resend-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    if (res.ok) {
      return { success: true, message: 'Email xác thực đã được gửi lại thành công.' };
    } else {
      const err = await res.json();
      return { success: false, message: err.message || 'Không thể gửi lại email xác thực.' };
    }
  } catch {
    // Fallback client storage
  }

  const tokens = getStoredTokens();
  const lastForEmail = [...tokens].reverse().find(t => t.email.toLowerCase() === email.toLowerCase().trim());
  if (lastForEmail && Date.now() - lastForEmail.createdAt < 60000) {
    const remainingSecs = Math.ceil((60000 - (Date.now() - lastForEmail.createdAt)) / 1000);
    return { success: false, message: `Vui lòng chờ ${remainingSecs} giây trước khi yêu cầu gửi lại email xác thực.` };
  }

  const newToken = `tok-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  tokens.push({
    token: newToken,
    email: email.trim(),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    used: false,
    createdAt: Date.now()
  });
  setStorage(AUTH_STORAGE_KEYS.TOKENS, tokens);

  return {
    success: true,
    message: 'Email xác thực mới đã được gửi thành công.',
    devVerificationToken: newToken
  };
}

export async function loginAccount(email: string, password: string): Promise<LoginResponse> {
  const cleanEmail = email.trim();
  try {
    const res = await fetch('http://localhost:8080/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password })
    });
    if (res.ok) {
      const data = await res.json();
      const jwtData = data.data;
      const user: User = {
        id: jwtData.userId,
        email: jwtData.email,
        fullName: jwtData.email.split('@')[0],
        role: jwtData.role === 'HR' ? 'RECRUITER' : 'CANDIDATE',
        emailVerified: true
      };
      return { user, accessToken: jwtData.accessToken, refreshToken: jwtData.refreshToken };
    } else {
      const err = await res.json();
      if (err.errorCode === 'EMAIL_NOT_VERIFIED' || (err.message && err.message.toLowerCase().includes('not verified'))) {
        const error = new Error('EMAIL_NOT_VERIFIED');
        (error as any).code = 'EMAIL_NOT_VERIFIED';
        throw error;
      }
      throw new Error('Email hoặc mật khẩu không chính xác.');
    }
  } catch (err: any) {
    if (err.code === 'EMAIL_NOT_VERIFIED' || err.message === 'EMAIL_NOT_VERIFIED') {
      throw err;
    }
    if (err.message && !err.message.includes('fetch')) {
      throw err;
    }
  }

  // Fallback client storage
  const users = getRegisteredUsers();
  const found = users.find(u => u.email.toLowerCase() === cleanEmail.toLowerCase());

  if (!found || found.passwordHash !== password) {
    throw new Error('Email hoặc mật khẩu không chính xác.');
  }

  if (!found.emailVerified) {
    const error = new Error('EMAIL_NOT_VERIFIED');
    (error as any).code = 'EMAIL_NOT_VERIFIED';
    throw error;
  }

  const user: User = {
    id: found.id,
    email: found.email,
    fullName: found.fullName,
    role: found.role,
    age: found.age,
    targetIndustry: found.targetIndustry,
    emailVerified: true
  };

  const fakeJwt = `jwt-token-${found.id}-${Date.now()}`;
  return { user, accessToken: fakeJwt };
}

// Backwards compatibility aliases
export const MOCK_JOBS = SEED_JOBS;
export const MOCK_COMPANY = SEED_COMPANY;
export const MOCK_RECRUITER = SEED_RECRUITER;
export const MOCK_RECRUITER_JOBS = SEED_JOBS;
export const MOCK_CANDIDATE = SEED_CANDIDATE;
export const MOCK_CVS = SEED_CVS;
export const MOCK_APPLICATIONS = SEED_APPLICATIONS;
export const MOCK_CANDIDATE_RANKINGS = SEED_RANKINGS_JOB_01;
export const MOCK_MATCH_INSPECTION_APP_001 = SEED_INSPECTION_APP_001;

