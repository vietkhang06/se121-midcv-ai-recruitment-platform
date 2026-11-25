import type { UserRole } from '@/types';

export function normalizeRole(value: unknown): UserRole | null {
  if (value === 'HR') return 'RECRUITER';
  return value === 'CANDIDATE' || value === 'RECRUITER' || value === 'ADMIN' ? value : null;
}

export function portalHome(role: UserRole): string {
  return { CANDIDATE: '/candidate', RECRUITER: '/recruiter', ADMIN: '/admin' }[role];
}

// Accept only canonical same-origin paths. Query parameters may contain encoded values,
// but the path must not hide separators, dot segments, control characters or a host.
export function internalPath(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 2048 || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u0020\u007f]/.test(value)) return null;
  const raw = value.split(/[?#]/, 1)[0];
  if (/%|\/\/|(?:^|\/)\.{1,2}(?:\/|$)/.test(raw)) return null;
  try {
    const url = new URL(value, 'https://midcv.invalid');
    if (url.origin !== 'https://midcv.invalid' || url.pathname !== raw) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch { return null; }
}

const inPortal = (path: string, root: string) => path === root || path.startsWith(`${root}/`);
export function destinationForRole(role: UserRole, requested: unknown): string {
  const safe = internalPath(requested);
  if (!safe) return portalHome(role);
  const path = safe.split(/[?#]/, 1)[0];
  if (inPortal(path, portalHome(role))) return safe;
  if (role === 'CANDIDATE' && (path === '/' || inPortal(path, '/jobs'))) return safe;
  return portalHome(role);
}

export function jobReturnPath(value: unknown): string | null {
  const safe = internalPath(value);
  return safe && /^\/jobs\/[A-Za-z0-9_-]+(?:\?apply=1)?$/.test(safe) ? safe.split('?')[0] : null;
}

export function applyPath(jobId: string): string {
  return `/jobs/${encodeURIComponent(jobId)}?apply=1`;
}

export function cvLibraryPath(returnTo: string | null): string {
  const job = jobReturnPath(returnTo);
  return job ? `/candidate/cvs?returnTo=${encodeURIComponent(job)}` : '/candidate/cvs';
}

export function resumeAfterCv(returnTo: unknown): string | null {
  const job = jobReturnPath(returnTo);
  return job ? `${job}?apply=1` : null;
}

// Only accept a ranking back-link belonging to the application's actual JD.
export function rankingReturnPath(value: unknown, jobId: string): string | null {
  const safe = internalPath(value);
  if (!safe) return null;
  const url = new URL(safe, 'https://midcv.invalid');
  if (url.pathname !== `/recruiter/jobs/${encodeURIComponent(jobId)}/ranking` || url.hash) return null;
  const score = url.searchParams.get('minScore');
  const full = url.searchParams.get('fullRequired');
  const query = new URLSearchParams();
  if (score !== null && ['70', '80', '85', '90'].includes(score)) query.set('minScore', score);
  if (full === '1') query.set('fullRequired', '1');
  return `${url.pathname}${query.size ? `?${query}` : ''}`;
}

const LINK_KEY = 'midcv:pending-profile-link';
export function rememberProfileLink(userId: string, provider: string): void {
  sessionStorage.setItem(LINK_KEY, JSON.stringify({ userId, provider, expires: Date.now() + 600_000 }));
}
export function hasProfileLink(userId: string): boolean {
  try {
    const raw = sessionStorage.getItem(LINK_KEY);
    const item = raw ? JSON.parse(raw) : null;
    return !!item && item.userId === userId && typeof item.expires === 'number' && item.expires > Date.now();
  } catch { return false; }
}
export function clearProfileLink(): void { try { sessionStorage.removeItem(LINK_KEY); } catch { /* Storage may be unavailable. */ } }

const CV_CHOICE_KEY = 'midcv:resume-cv-choice';
export function rememberCvChoice(userId: string, returnTo: unknown, cvId: string): void {
  const job = jobReturnPath(returnTo);
  if (!job || !userId || !cvId) return;
  try { sessionStorage.setItem(CV_CHOICE_KEY, JSON.stringify({ userId, job, cvId, expires: Date.now() + 600_000 })); }
  catch { /* Choosing again is safe when storage is unavailable. */ }
}
export function takeCvChoice(userId: string, jobId: string): string | null {
  try {
    const raw = sessionStorage.getItem(CV_CHOICE_KEY);
    if (!raw) return null;
    const item = JSON.parse(raw);
    if (!item || typeof item.expires !== 'number' || item.expires <= Date.now() || item.userId !== userId) {
      sessionStorage.removeItem(CV_CHOICE_KEY);
      return null;
    }
    if (item.job !== `/jobs/${encodeURIComponent(jobId)}`) return null;
    sessionStorage.removeItem(CV_CHOICE_KEY);
    return typeof item.cvId === 'string' && item.cvId ? item.cvId : null;
  } catch { return null; }
}
