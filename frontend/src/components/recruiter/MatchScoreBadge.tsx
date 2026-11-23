import { formatMatchScore, matchPhaseLabels, matchPresentation } from '@/lib/matchPresentation';

export function MatchScoreBadge({ application, locale }: {
  application: Parameters<typeof matchPresentation>[0]; locale: 'vi' | 'en';
}) {
  const { phase, score } = matchPresentation(application);
  const tone = phase === 'PROVISIONAL' ? 'text-[var(--warning)]'
    : phase === 'FINAL' ? 'text-[var(--primary)]' : 'text-[var(--text-secondary)]';
  return <span className={`inline-block rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)] px-2 py-1 text-xs font-medium ${tone}`}>
    {matchPhaseLabels[phase][locale === 'vi' ? 0 : 1]}{score !== null && ` · ${formatMatchScore(score, locale)}`}
  </span>;
}
