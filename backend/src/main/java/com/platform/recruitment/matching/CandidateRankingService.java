package com.platform.recruitment.matching;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@org.springframework.transaction.annotation.Transactional(readOnly = true)
@RequiredArgsConstructor
public class CandidateRankingService {

    private final MatchResultRepository matchResultRepository;

    /**
     * Ranks candidates for a specific Job by S_overall DESC with Ranking Safety:
     * 1. requiredSkillsMissing ASC (Candidates satisfying all Required skills rank higher than candidates missing Required skills)
     * 2. S_overall DESC
     * 3. S_core DESC
     * 4. Candidate UUID ASC (Stable system tie-breaker)
     */
    public List<MatchResult> getRankedCandidatesForJob(UUID jobId, BigDecimal minScoreFilter) {
        // Fetch the relationships needed for ranking and DTO construction while the
        // repository transaction is active. The plain derived query leaves these
        // associations lazy and can fail when the service is called without OSIV.
        List<MatchResult> results = matchResultRepository.findByApplicationJobIdWithCandidate(jobId);

        // Pending recomputations must not appear as fresh policy-compliant ranks.
        results = results.stream()
                .filter(r -> !"STALE_POLICY".equals(r.getStatus()) && !"INSUFFICIENT_DATA".equals(r.getStatus()))
                .filter(r -> r.getApplication() == null || (!Boolean.FALSE.equals(r.getApplication().getAiScoringEligibleSnapshot())
                        && (!"quick-apply-v1".equals(r.getApplication().getAiConsentVersion()) || Boolean.TRUE.equals(r.getApplication().getAiAnalysisConsent()))))
                .collect(Collectors.toList());

        // Filter by minimum score if provided
        if (minScoreFilter != null) {
            results = results.stream()
                    .filter(r -> r.getOverallScore() != null && r.getOverallScore().compareTo(minScoreFilter) >= 0)
                    .collect(Collectors.toList());
        }

        // Ranking Safety Priority Order:
        return results.stream()
                .sorted(Comparator.<MatchResult, Boolean>comparing(r -> !"PGVECTOR_READY".equals(r.getStatus()))
                        .thenComparing(MatchResult::getRequiredSkillsMissing, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(MatchResult::getOverallScore, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(MatchResult::getCoreScore, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(r -> r.getApplication().getCandidate().getId()))
                .collect(Collectors.toList());
    }

    public static final java.util.Set<String> ALLOWED_RANKING_SORT_FIELDS = java.util.Set.of(
            "overallScore", "coreScore", "githubScore", "requiredSkillsMatched", "createdAt"
    );

    public com.platform.recruitment.common.PageResponse<CandidateRankingResponse> getRankedCandidatesPage(
            UUID jobId, BigDecimal minScoreFilter, int page, int size, String sortField, String direction) {
        org.springframework.data.domain.Pageable pageable =
                com.platform.recruitment.common.PaginationUtils.createPageable(
                        page, size, sortField, direction, ALLOWED_RANKING_SORT_FIELDS, "overallScore");

        List<MatchResult> allRanked = getRankedCandidatesForJob(jobId, minScoreFilter);

        int total = allRanked.size();
        int start = (int) Math.min(pageable.getOffset(), total);
        int end = Math.min(start + pageable.getPageSize(), total);
        List<MatchResult> pagedList = (start <= total) ? allRanked.subList(start, end) : List.of();

        List<CandidateRankingResponse> dtoList = new java.util.ArrayList<>();
        for (int i = 0; i < pagedList.size(); i++) {
            MatchResult r = pagedList.get(i);
            int rank = start + i + 1;
            var app = r.getApplication();
            var cand = app != null ? app.getCandidate() : null;
            var user = cand != null ? cand.getUser() : null;

            dtoList.add(CandidateRankingResponse.builder()
                    .id(r.getId())
                    .rank(rank)
                    .applicationId(app != null ? app.getId() : null)
                    .candidateId(cand != null ? cand.getId() : null)
                    .candidateName(cand != null && cand.getFullName() != null ? cand.getFullName() : (user != null ? user.getEmail() : "Ứng viên"))
                    .candidateAvatarId(user != null ? user.getAvatarId() : null)
                    .headline(cand != null ? cand.getHeadline() : null)
                    .overallScore(r.getOverallScore())
                    .coreScore(r.getCoreScore())
                    .githubScore(r.getGithubScore())
                    .requiredSkillsMatched(r.getRequiredSkillsMatched())
                    .requiredSkillsTotal(r.getRequiredSkillsTotal())
                    .requiredSkillsMissing(r.getRequiredSkillsMissing())
                    .preferredSkillsMatched(r.getPreferredSkillsMatched())
                    .preferredSkillsTotal(r.getPreferredSkillsTotal())
                    .isGithubActive(r.getIsGithubActive())
                    .githubFallbackApplied(r.getGithubFallbackApplied())
                    .status(r.getStatus())
                    .calculationStatus(r.getStatus())
                    .applicationStatus(app != null ? app.getStatus() : null)
                    .matchingAlgorithmVersion(r.getMatchingAlgorithmVersion())
                    .aiSummary(r.getAiSummary())
                    .appliedAt(app != null ? app.getAppliedAt() : null)
                    .build());
        }

        org.springframework.data.domain.Page<CandidateRankingResponse> pageResult =
                new org.springframework.data.domain.PageImpl<>(dtoList, pageable, total);

        String activeSort = (sortField == null || sortField.isBlank()) ? "overallScore" : sortField;
        String activeDir = (direction == null || direction.isBlank()) ? "desc" : direction.toLowerCase();
        return com.platform.recruitment.common.PageResponse.of(pageResult, activeSort, activeDir);
    }
}
