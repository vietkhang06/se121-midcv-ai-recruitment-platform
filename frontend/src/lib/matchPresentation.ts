type ScoreInput = { matchScore?: number | null; matchStatus?: string | null; aiAnalysisConsent?: boolean | null };
type MatchPhase = 'FINAL' | 'PROVISIONAL' | 'PENDING' | 'DECLINED' | 'UNAVAILABLE';

export function matchPresentation(input: ScoreInput): { phase: MatchPhase; score: number | null } {
  const { matchStatus: status, matchScore, aiAnalysisConsent } = input;
  const score = typeof matchScore === 'number' && Number.isFinite(matchScore) ? matchScore : null;
  if (aiAnalysisConsent === false || status === 'CONSENT_NOT_GIVEN') return { phase: 'DECLINED', score: null };
  if (status === 'PGVECTOR_READY') return { phase: 'FINAL', score };
  if (status === 'FALLBACK_USED' || (status === 'PENDING_VECTOR' && score !== null))
    return { phase: 'PROVISIONAL', score };
  if (!status || status === 'PENDING_VECTOR' || status === 'STALE_POLICY') return { phase: 'PENDING', score: null };
  return { phase: 'UNAVAILABLE', score: null };
}

export const matchPhaseLabels: Record<MatchPhase, readonly [string, string]> = {
  FINAL: ['Đã chấm', 'Scored'],
  PROVISIONAL: ['Điểm tạm', 'Provisional score'],
  PENDING: ['Đang chờ chấm', 'Awaiting score'],
  DECLINED: ['Ứng viên không chọn phân tích AI', 'Candidate opted out of AI analysis'],
  UNAVAILABLE: ['Chưa có kết quả khả dụng', 'Result unavailable'],
};

export function formatMatchScore(score: number | null, locale: 'vi' | 'en'): string {
  return score === null ? '—' : `${new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
    minimumFractionDigits: 1, maximumFractionDigits: 1,
  }).format(score)}%`;
}

export function compareMatchScores(a: ScoreInput, b: ScoreInput): number {
  const left = matchPresentation(a);
  const right = matchPresentation(b);
  const group = (entry: typeof left) => entry.phase === 'FINAL' && entry.score !== null ? 0 : entry.phase === 'PROVISIONAL' && entry.score !== null ? 1 : entry.phase === 'PENDING' ? 2 : entry.phase === 'DECLINED' ? 4 : 3;
  const groupOrder = group(left) - group(right);
  if (groupOrder !== 0) return groupOrder;
  return left.score !== null && right.score !== null ? right.score - left.score : 0;
}
