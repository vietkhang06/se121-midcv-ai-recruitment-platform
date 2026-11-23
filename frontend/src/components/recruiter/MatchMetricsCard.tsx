import { Sparkles } from 'lucide-react';
import type { Application } from '@/types';
import { HIGH_MATCH_THRESHOLD, summarizeMatchScores } from '@/lib/applicationWorkflow';
import { formatMatchScore } from '@/lib/matchPresentation';
import { MetricCard } from './MetricCard';

export function MatchMetricsCard({ applications, locale }: { applications: readonly Application[]; locale: 'vi' | 'en' }) {
  const { average, count, highCount } = summarizeMatchScores(applications);
  const vi = locale === 'vi';
  return <MetricCard
    label={vi ? 'Điểm đối sánh trung bình' : 'Average match score'}
    value={formatMatchScore(average, locale)}
    subtext={count > 0
      ? vi ? `${count} hồ sơ đã chấm · ${highCount} phù hợp cao (≥${HIGH_MATCH_THRESHOLD}%)`
        : `${count} scored · ${highCount} high-fit (≥${HIGH_MATCH_THRESHOLD}%)`
      : vi ? 'Chưa có điểm hoàn tất để tính.' : 'No completed scores to report.'}
    icon={Sparkles}
    variant="primary"
  />;
}
