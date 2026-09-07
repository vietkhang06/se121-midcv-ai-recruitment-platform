/**
 * TEST FIXTURE ONLY - Controlled E2E Test Fixture for GitHub Assessment Verification
 * 
 * IMPORTANT: This fixture is strictly reserved for Playwright E2E testing in the
 * test environment. DO NOT import or use this fixture in production application runtime.
 */

import { Page } from '@playwright/test';

export interface GitHubTestUserFixture {
  username: string;
  candidateName: string;
  applicationId: string;
  jobId: string;
  jobTitle: string;
  publicRepoCount: number;
  activitySignal: 'HIGH' | 'MODERATE' | 'LOW' | 'LIMITED_OBSERVABLE_ACTIVITY';
  latestActivityDaysAgo: number;
  languages: string[];
  languageDistribution: Record<string, number>;
  repos: Array<{
    name: string;
    description: string;
    primaryLanguage: string;
    stars: number;
    forks: number;
    updatedDaysAgo: number;
    relevanceExplanation: string;
  }>;
  coreScore: number;
  githubScore: number;
  overallScore: number;
}

export const GITHUB_NEUTRAL_TEST_FIXTURE: GitHubTestUserFixture = {
  username: 'github-neutral-test-user',
  candidateName: 'Nguyễn Văn Java',
  applicationId: 'app-001',
  jobId: 'job-tech-01',
  jobTitle: 'Senior Java Backend Engineer (Spring Boot & Vector AI)',
  publicRepoCount: 6,
  activitySignal: 'HIGH',
  latestActivityDaysAgo: 3,
  languages: ['Java', 'TypeScript', 'Python'],
  languageDistribution: {
    Java: 60.0,
    TypeScript: 25.0,
    Python: 15.0
  },
  repos: [
    {
      name: 'repo-java',
      description: 'Production Spring Boot microservices with PostgreSQL & Vector DB integration.',
      primaryLanguage: 'Java',
      stars: 32,
      forks: 9,
      updatedDaysAgo: 3,
      relevanceExplanation: 'Mã nguồn trực tiếp minh chứng năng lực thiết kế kiến trúc Spring Boot & AI Matching.'
    },
    {
      name: 'repo-typescript',
      description: 'Web dashboard client built with Next.js and TypeScript.',
      primaryLanguage: 'TypeScript',
      stars: 14,
      forks: 4,
      updatedDaysAgo: 12,
      relevanceExplanation: 'Minh chứng năng lực phát triển giao diện TypeScript.'
    },
    {
      name: 'repo-python',
      description: 'Evaluation benchmarks and scoring tools.',
      primaryLanguage: 'Python',
      stars: 18,
      forks: 5,
      updatedDaysAgo: 20,
      relevanceExplanation: 'Minh chứng kỹ năng lập trình Python bổ trợ.'
    }
  ],
  coreScore: 90.75,
  githubScore: 88.75,
  overallScore: 90.45
};

export async function injectGitHubTestFixture(
  page: Page,
  fixture: GitHubTestUserFixture = GITHUB_NEUTRAL_TEST_FIXTURE
): Promise<void> {
  await page.addInitScript((f) => {
    const testMatchInspection = {
      applicationId: f.applicationId,
      jobTitle: f.jobTitle,
      candidateName: f.candidateName,
      overallScore: f.overallScore,
      coreScore: f.coreScore,
      githubScore: f.githubScore,
      githubScoreActive: true,
      requiredSkillsStatus: [
        {
          skillName: 'Java',
          requirementType: 'REQUIRED',
          status: 'MATCH',
          evidenceText: 'CV -> Skills: "Java 21, Spring Boot". 3.5 năm kinh nghiệm làm việc thực tế.'
        },
        {
          skillName: 'Spring Boot',
          requirementType: 'REQUIRED',
          status: 'MATCH',
          evidenceText: 'CV -> Experience: "Thiết kế kiến trúc Microservices Spring Boot".'
        },
        {
          skillName: 'PostgreSQL',
          requirementType: 'REQUIRED',
          status: 'MATCH',
          evidenceText: 'CV -> Skills: "PostgreSQL & Pgvector Cosine Similarity".'
        },
        {
          skillName: 'Docker',
          requirementType: 'REQUIRED',
          status: 'MATCH',
          evidenceText: 'CV -> Skills: "Docker containerization".'
        }
      ],
      preferredSkillsStatus: [
        {
          skillName: 'Redis',
          requirementType: 'PREFERRED',
          status: 'MATCH',
          evidenceText: 'CV -> Skills: "Redis Caching".'
        },
        {
          skillName: 'TypeScript',
          requirementType: 'PREFERRED',
          status: 'MATCH',
          evidenceText: 'CV -> Skills: "TypeScript & React frontend".'
        }
      ],
      matchFactors: [
        {
          factorName: 'Skill Match Score (40% Core)',
          score: 95.0,
          status: 'HIGH',
          explanation: 'Đáp ứng 100% Kỹ năng Bắt buộc (4/4 Required).',
          evidence: 'Java, Spring Boot, PostgreSQL, Docker'
        },
        {
          factorName: 'Experience Match Score (25% Core)',
          score: 88.0,
          status: 'HIGH',
          explanation: 'Kinh nghiệm làm việc thực tế 3.5 năm vượt mức yêu cầu tối thiểu.',
          evidence: '3.5 năm kinh nghiệm kỹ thuật'
        },
        {
          factorName: 'Education Score (10% Core)',
          score: 90.0,
          status: 'HIGH',
          explanation: 'Bằng Cử nhân CNTT đúng chuyên ngành.',
          evidence: 'Đại học Bách Khoa'
        },
        {
          factorName: 'Project Relevance Score (10% Core)',
          score: 92.0,
          status: 'HIGH',
          explanation: 'Dự án AI Matching Engine có minh chứng mã nguồn thực tế.',
          evidence: 'repo-java'
        },
        {
          factorName: 'Semantic Vector Match (15% Core)',
          score: 87.04,
          status: 'HIGH',
          explanation: 'Độ tương đồng ngữ nghĩa Vector 1536D ở mức cao.',
          evidence: 'Cosine Similarity: 87.04%'
        },
        {
          factorName: 'GitHub Supporting Score (15% Weight)',
          score: f.githubScore,
          status: 'HIGH',
          explanation: `Tín hiệu bổ trợ từ GitHub công khai: ${f.githubScore} điểm.`,
          evidence: `Languages: ${f.languages.join(', ')}`
        }
      ],
      humanReadableExplanation: `Ứng viên ${f.candidateName} đáp ứng đầy đủ kỹ năng bắt buộc. Tín hiệu bổ trợ từ GitHub cá nhân (${f.username}) hợp lệ và tham gia vào điểm tổng hợp với trọng số 15%.`,
      githubAssessment: {
        connected: true,
        username: f.username,
        publicRepoCount: f.publicRepoCount,
        topLanguages: f.languages,
        languageDistribution: f.languageDistribution,
        activitySignal: f.activitySignal,
        latestActivityDaysAgo: f.latestActivityDaysAgo,
        repos: f.repos,
        overallAssessment: `Ứng viên ${f.username} có hoạt động mã nguồn mở tích cực. Ngôn ngữ ${f.languages.join(', ')} được quan sát trong các repository công khai.`
      }
    };

    window.sessionStorage.setItem('e2e_test_fixture_match_inspection', JSON.stringify(testMatchInspection));
  }, fixture);
}
