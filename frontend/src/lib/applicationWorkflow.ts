import type { Application, ApplicationStatus } from '@/types';
import { matchPresentation } from './matchPresentation';

export const APPLICATION_STATUSES = [
  'SUBMITTED',
  'REVIEWED',
  'MATCHED',
  'SHORTLISTED',
  'INTERVIEWING',
  'HIRED',
  'REJECTED',
] as const;

export const APPLICATION_STATUS_LABELS: Record<
  ApplicationStatus,
  readonly [string, string]
> = {
  SUBMITTED: ['Mới nộp', 'Submitted'],
  REVIEWED: ['Đã xem', 'Reviewed'],
  MATCHED: ['Đã đối sánh (lịch sử)', 'Matched (legacy)'],
  SHORTLISTED: ['Đã vào danh sách chọn', 'Shortlisted'],
  INTERVIEWING: ['Đang phỏng vấn', 'Interviewing'],
  HIRED: ['Đã tuyển', 'Hired'],
  REJECTED: ['Đã từ chối', 'Rejected'],
  UNKNOWN: ['Trạng thái chưa xác định', 'Unknown status'],
};

export const APPLICATION_TRANSITIONS: Record<
  ApplicationStatus,
  readonly ApplicationStatus[]
> = {
  SUBMITTED: ['REVIEWED', 'SHORTLISTED', 'REJECTED'],
  REVIEWED: ['SHORTLISTED', 'REJECTED'],
  MATCHED: ['SHORTLISTED', 'REJECTED'],
  SHORTLISTED: ['INTERVIEWING', 'REJECTED'],
  INTERVIEWING: ['HIRED', 'REJECTED'],
  HIRED: [],
  REJECTED: ['REVIEWED'],
  UNKNOWN: [],
};

export function toApplicationStatus(
  value: unknown
): ApplicationStatus {
  const status = APPLICATION_STATUSES.find(
    candidate => candidate === value
  );

  if (status) return status;

  console.warn(
    '[MidCV] Unexpected application status',
    typeof value === 'string' ? value : typeof value
  );

  return 'UNKNOWN';
}

// Reporting counts finalized numeric match scores available to the recruiter.
export const HIGH_MATCH_THRESHOLD = 75;

export function summarizeMatchScores(
  applications: readonly Application[]
) {
  const scores = applications.flatMap(application => {
    const { phase, score } = matchPresentation(application);

    return phase === 'FINAL' && score !== null
      ? [score]
      : [];
  });

  return {
    count: scores.length,
    average: scores.length
      ? scores.reduce((sum, score) => sum + score, 0) / scores.length
      : null,
    highCount: scores.filter(
      score => score >= HIGH_MATCH_THRESHOLD
    ).length,
  };
}

export class IncompleteApplicationsError extends Error {
  constructor(public readonly jobTitles: string[]) {
    super(jobTitles.join(', '));
    this.name = 'IncompleteApplicationsError';
  }
}

export async function loadApplicationsForJobs(
  jobs: readonly { id: string; title: string }[],
  load: (jobId: string) => Promise<Application[]>,
): Promise<Application[]> {
  const results = await Promise.allSettled(
    jobs.map(job => load(job.id))
  );

  const failedTitles = jobs.flatMap((job, index) =>
    results[index].status === 'rejected'
      ? [job.title || job.id]
      : []
  );

  if (failedTitles.length) {
    throw new IncompleteApplicationsError(failedTitles);
  }

  return results.flatMap(result =>
    result.status === 'fulfilled' ? result.value : []
  );
}

export function applicationsLoadMessage(
  error: unknown,
  locale: 'vi' | 'en'
): string {
  if (error instanceof IncompleteApplicationsError) {
    const prefix = locale === 'vi'
      ? 'Chưa tải được hồ sơ của các tin sau'
      : 'Applications could not be loaded for';

    return `${prefix} · ${error.jobTitles.join(', ')}`;
  }

  return locale === 'vi'
    ? 'Chưa tải được dữ liệu tuyển dụng.'
    : 'Recruitment data could not be loaded.';
}