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
        List<MatchResult> results = matchResultRepository.findByApplicationJobId(jobId);

        // Filter by minimum score if provided
        if (minScoreFilter != null) {
            results = results.stream()
                    .filter(r -> r.getOverallScore() != null && r.getOverallScore().compareTo(minScoreFilter) >= 0)
                    .collect(Collectors.toList());
        }

        // Ranking Safety Priority Order:
        return results.stream()
                .sorted(Comparator.comparing(MatchResult::getRequiredSkillsMissing, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(MatchResult::getOverallScore, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(MatchResult::getCoreScore, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(r -> r.getApplication().getCandidate().getId()))
                .collect(Collectors.toList());
    }
}
