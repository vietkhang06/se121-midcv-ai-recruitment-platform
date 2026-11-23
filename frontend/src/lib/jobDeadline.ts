export function recruitmentDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function isJobExpired(deadline?: string | null, now = new Date()): boolean {
  return Boolean(deadline && deadline < recruitmentDate(now));
}

export function displayJobStatus(job: { status: string; applicationDeadline?: string | null }): string {
  return job.status === 'PUBLISHED' && isJobExpired(job.applicationDeadline) ? 'EXPIRED' : job.status;
}

export function formatJobDeadline(deadline: string, locale: 'vi' | 'en'): string {
  return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-GB', {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC',
  }).format(new Date(`${deadline}T00:00:00Z`));
}
