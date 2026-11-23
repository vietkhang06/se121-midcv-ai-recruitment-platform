import type { Application, ApplicationStatus } from '@/types';

export const APPLICATION_STATUSES = [
  'SUBMITTED', 'REVIEWED', 'MATCHED', 'SHORTLISTED', 'INTERVIEWING', 'HIRED', 'REJECTED',
] as const;

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, readonly [string, string]> = {
  SUBMITTED: ['Mới nộp', 'Submitted'],
  REVIEWED: ['Đã xem', 'Reviewed'],
  MATCHED: ['Đã đối sánh (lịch sử)', 'Matched (legacy)'],
  SHORTLISTED: ['Đã vào danh sách chọn', 'Shortlisted'],
  INTERVIEWING: ['Đang phỏng vấn', 'Interviewing'],
  HIRED: ['Đã tuyển', 'Hired'],
  REJECTED: ['Đã từ chối', 'Rejected'],
  UNKNOWN: ['Trạng thái chưa xác định', 'Unknown status'],
};

export const APPLICATION_TRANSITIONS: Record<ApplicationStatus, readonly ApplicationStatus[]> = {
  SUBMITTED: ['REVIEWED', 'SHORTLISTED', 'REJECTED'],
  REVIEWED: ['SHORTLISTED', 'REJECTED'],
  MATCHED: ['SHORTLISTED', 'REJECTED'],
  SHORTLISTED: ['INTERVIEWING', 'REJECTED'],
  INTERVIEWING: ['HIRED', 'REJECTED'],
  HIRED: [],
  REJECTED: ['REVIEWED'],
  UNKNOWN: [],
};

export function toApplicationStatus(value: unknown): ApplicationStatus {
  const status = APPLICATION_STATUSES.find(candidate => candidate === value);
  if (status) return status;
  console.warn('[MidCV] Unexpected application status', typeof value === 'string' ? value : typeof value);
  return 'UNKNOWN';
}

// Shared reporting threshold. This metric counts visible numeric match scores.
export const HIGH_MATCH_THRESHOLD = 75;

export function summarizeMatchScores(applications: readonly Application[]) {
  const scores = applications.flatMap(({ matchScore }) =>
    typeof matchScore === 'number' && Number.isFinite(matchScore) ? [matchScore] : []);
  return {
    count: scores.length,
    average: scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null,
    highCount: scores.filter(score => score >= HIGH_MATCH_THRESHOLD).length,
  };
}

export async function loadApplicationsForJobs(
  jobs: readonly { id: string; title: string }[],
  load: (jobId: string) => Promise<Application[]>,
): Promise<Application[]> {
  const results = await Promise.allSettled(jobs.map(job => load(job.id)));
  const failedTitles = jobs.flatMap((job, index) => results[index].status === 'rejected' ? [job.title || job.id] : []);
  if (failedTitles.length) throw new Error(failedTitles.join(', '));
  return results.flatMap(result => result.status === 'fulfilled' ? result.value : []);
}
