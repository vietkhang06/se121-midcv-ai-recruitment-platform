import type { EvidenceItem } from '@/types';

export function evidencePresentation(evidence: EvidenceItem, locale: 'vi' | 'en') {
  const reviewed = evidence.provenance === 'CANDIDATE_REVIEWED_CV'
    || evidence.provenance === 'CANDIDATE_REVIEWED_CV_EXCERPT';
  const original = evidence.provenance === 'ORIGINAL_CV' || evidence.sourceType === 'ORIGINAL_CV';
  const labels = reviewed ? ['Bản ứng viên đã chỉnh', 'Candidate-reviewed CV']
    : original ? ['CV gốc', 'Original CV']
      : evidence.sourceType === 'CV' ? ['CV · chưa rõ nguồn cụ thể', 'CV · specific source unavailable']
        : evidence.sourceType === 'JD' ? ['JD', 'JD']
          : evidence.sourceType === 'GITHUB' ? ['GitHub', 'GitHub'] : ['Chưa rõ nguồn', 'Source unavailable'];
  const { quoteStartOffset: start, quoteEndOffset: end } = evidence;
  const hasAnchor = evidence.sourceVersionId && /^[a-f0-9]{64}$/i.test(evidence.contentSha256 ?? '')
    && start != null && end != null && Number.isInteger(start) && Number.isInteger(end)
    && start >= 0 && end > start && end - start === evidence.snippet.length;
  return { source: labels[locale === 'vi' ? 0 : 1], verbatim: Boolean(hasAnchor) };
}
