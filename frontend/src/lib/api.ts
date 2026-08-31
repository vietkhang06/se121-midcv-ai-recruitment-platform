import { Job, CandidateProfile, CV, Application, User, Industry } from '@/types';

const API_BASE_URL = 'http://localhost:8080/api/v1';

export const MOCK_JOBS: Job[] = [
  {
    id: 'job-1',
    title: 'Senior Java Backend Engineer',
    companyName: 'TechCorp Global Solutions',
    companyVerified: true,
    industry: 'Technology',
    location: 'Hồ Chí Minh (Hybrid)',
    employmentType: 'FULL_TIME',
    seniority: 'SENIOR',
    salaryMin: 2000,
    salaryMax: 3500,
    salaryPublic: true,
    description: 'Chúng tôi đang tìm kiếm Senior Java Developer giàu kinh nghiệm làm việc với Microservices, Spring Boot và PostgreSQL.',
    responsibilities: [
      'Phát triển và tối ưu hóa hệ thống Microservices quy mô lớn.',
      'Thiết kế CSDL PostgreSQL và xử lý hạ tầng với Docker/Kubernetes.',
      'Tham gia xây dựng kiến trúc AI Matching Engine hỗ trợ đối sánh JD và CV.'
    ],
    benefits: ['Bonus 13-14 tháng lương', 'Bảo hiểm PVI gia đình', 'Cấp Laptop MacBook Pro M3'],
    publishedDate: '2026-08-30',
    requirements: [
      { id: 'req-1', skillName: 'Java', requirementType: 'REQUIRED', minExperienceYears: 3 },
      { id: 'req-2', skillName: 'Spring Boot', requirementType: 'REQUIRED' },
      { id: 'req-3', skillName: 'PostgreSQL', requirementType: 'REQUIRED' },
      { id: 'req-4', skillName: 'Docker', requirementType: 'PREFERRED' },
      { id: 'req-5', skillName: 'AWS', requirementType: 'PREFERRED' }
    ]
  },
  {
    id: 'job-2',
    title: 'Digital Marketing Performance Lead',
    companyName: 'OmniMedia Vietnam',
    companyVerified: true,
    industry: 'Marketing',
    location: 'Hà Nội (Onsite)',
    employmentType: 'FULL_TIME',
    seniority: 'LEAD',
    salaryMin: 1500,
    salaryMax: 2500,
    salaryPublic: true,
    description: 'Chịu trách nhiệm thực thi các chiến dịch Performance Marketing toàn diện trên các nền tảng Meta Ads, Google Ads và TikTok Ads.',
    responsibilities: [
      'Quản lý ngân sách Digital Marketing $50,000+/tháng.',
      'Phân tích đo lường chỉ số GA4, ROAS, CPA, CPL.',
      'Dẫn dắt đội ngũ 5 vị trí Media Executive.'
    ],
    benefits: ['Thưởng doanh số KPI hàng quý', 'Chuyến du lịch nước ngoài hàng năm'],
    publishedDate: '2026-08-29',
    requirements: [
      { id: 'req-6', skillName: 'Facebook Ads', requirementType: 'REQUIRED' },
      { id: 'req-7', skillName: 'Google Analytics 4', requirementType: 'REQUIRED' },
      { id: 'req-8', skillName: 'TikTok Ads', requirementType: 'PREFERRED' }
    ]
  },
  {
    id: 'job-3',
    title: 'UI/UX Product Designer',
    companyName: 'Fintech Mobile App Inc',
    companyVerified: true,
    industry: 'Design',
    location: 'Đà Nẵng (Remote)',
    employmentType: 'REMOTE',
    seniority: 'MID',
    salaryMin: 1200,
    salaryMax: 2000,
    salaryPublic: true,
    description: 'Thiết kế giao diện ứng dụng Tài chính di động hiện đại, ưu tiên trải nghiệm người dùng mượt mà và tối ưu hóa chuyển đổi.',
    responsibilities: [
      'Xây dựng Design System chuẩn chỉ trên Figma.',
      'Nghiên cứu hành vi người dùng User Research & A/B Testing.'
    ],
    benefits: ['Làm việc 100% Remote linh hoạt', 'Hỗ trợ chi phí mua trang thiết bị làm việc'],
    publishedDate: '2026-08-28',
    requirements: [
      { id: 'req-9', skillName: 'Figma', requirementType: 'REQUIRED' },
      { id: 'req-10', skillName: 'UI Design', requirementType: 'REQUIRED' },
      { id: 'req-11', skillName: 'Design System', requirementType: 'PREFERRED' }
    ]
  },
  {
    id: 'job-4',
    title: 'Senior Financial Accountant',
    companyName: 'VinaFinance Group',
    companyVerified: false,
    industry: 'Finance',
    location: 'Hồ Chí Minh',
    employmentType: 'FULL_TIME',
    seniority: 'SENIOR',
    salaryMin: 1000,
    salaryMax: 1800,
    salaryPublic: true,
    description: 'Quản lý sổ sách kế toán tổng hợp, lập báo cáo tài chính kiểm toán và quyết toán thuế doanh nghiệp.',
    responsibilities: [
      'Lập báo cáo tài chính quý và năm theo chuẩn MISA / SAP.',
      'Kê khai quyết toán thuế TNDN, TNCN, VAT.'
    ],
    benefits: ['Lương tháng 13', 'Thưởng các ngày lễ tết'],
    publishedDate: '2026-08-27',
    requirements: [
      { id: 'req-12', skillName: 'MISA', requirementType: 'REQUIRED' },
      { id: 'req-13', skillName: 'Quyết toán thuế', requirementType: 'REQUIRED' },
      { id: 'req-14', skillName: 'SAP', requirementType: 'PREFERRED' }
    ]
  }
];

export const MOCK_CANDIDATE: CandidateProfile = {
  id: 'cand-1',
  fullName: 'Nguyen Van Java',
  email: 'nguyenvanjava@example.com',
  phone: '0901234567',
  age: 26,
  headline: 'Senior Fullstack / Backend Developer',
  bio: 'Lập trình viên Backend với 3.5 năm kinh nghiệm chuyên sâu về Java 21, Spring Boot, Microservices và PostgreSQL. Đam mê thiết kế phần mềm sạch và tích hợp AI.',
  primaryIndustry: 'Technology',
  additionalIndustries: ['Finance', 'Design'],
  targetRoles: ['Backend Developer', 'Java Engineer', 'Fullstack Developer'],
  skills: ['Java', 'Spring Boot', 'PostgreSQL', 'Docker', 'REST API', 'Microservices', 'TypeScript'],
  githubUrl: 'https://github.com/candidate-java',
  portfolioUrl: 'https://candidatejava.dev',
  experienceYears: 3
};

export const MOCK_CVS: CV[] = [
  {
    id: 'cv-1',
    title: 'CV Backend Engineer - Technology Standard',
    targetIndustry: 'Technology',
    targetRole: 'Senior Java Backend Engineer',
    creationPath: 'BUILDER',
    isDefault: true,
    currentVersionNumber: 1,
    updatedAt: '2026-08-30',
    versions: [
      {
        id: 'ver-1',
        versionNumber: 1,
        summaryText: 'Backend Developer 3+ năm kinh nghiệm Java & Spring Boot.',
        createdAt: '2026-08-30',
        sections: [
          { sectionType: 'SUMMARY', title: 'Tóm tắt bản thân', content: 'Lập trình viên Java Backend tài năng với kinh nghiệm xây dựng ứng dụng quy mô lớn.' },
          { sectionType: 'SKILLS', title: 'Kỹ năng chuyên môn', content: 'Java 21, Spring Boot, PostgreSQL, Docker, Redis, REST API, Git' },
          { sectionType: 'EXPERIENCE', title: 'Kinh nghiệm làm việc', content: '2023 - Nay: Backend Engineer tại FPT Software (Xây dựng Microservices Java Spring Boot)' },
          { sectionType: 'EDUCATION', title: 'Học vấn', content: 'Cử nhân Công nghệ Thông tin - Đại học Bách Khoa (2019 - 2023)' },
          { sectionType: 'GITHUB_PROJECTS', title: 'Dự án Open Source & GitHub', content: 'AI Matching Engine - Java Spring Boot & Pgvector Engine (https://github.com/candidate-java/ai-matching)' }
        ]
      }
    ]
  }
];

export const MOCK_APPLICATIONS: Application[] = [
  {
    id: 'app-1',
    job: MOCK_JOBS[0],
    appliedCvId: 'cv-1',
    appliedCvTitle: 'CV Backend Engineer - Technology Standard',
    appliedCvVersion: 1,
    status: 'SUBMITTED',
    appliedDate: '2026-08-31'
  }
];

// Helper functions connecting Backend APIs with Fallback Mocking
export async function fetchJobs(params?: { keyword?: string; industry?: string; location?: string }): Promise<Job[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/jobs`);
    if (res.ok) {
      const data = await res.json();
      return data.data || data;
    }
  } catch (err) {
    console.warn('Backend API unavailable, utilizing production mock dataset.');
  }

  let filtered = [...MOCK_JOBS];
  if (params?.keyword) {
    const k = params.keyword.toLowerCase();
    filtered = filtered.filter(j => j.title.toLowerCase().includes(k) || j.description.toLowerCase().includes(k) || j.companyName.toLowerCase().includes(k));
  }
  if (params?.industry) {
    filtered = filtered.filter(j => j.industry === params.industry);
  }
  if (params?.location) {
    filtered = filtered.filter(j => j.location.toLowerCase().includes(params.location!.toLowerCase()));
  }
  return filtered;
}

export async function fetchJobById(id: string): Promise<Job | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/jobs/${id}`);
    if (res.ok) {
      const data = await res.json();
      return data.data || data;
    }
  } catch (err) {
    console.warn('Backend API unavailable, utilizing fallback job detail.');
  }
  return MOCK_JOBS.find(j => j.id === id) || MOCK_JOBS[0];
}
