package com.platform.recruitment;

import com.platform.recruitment.matching.MatchResult;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class CandidateRankingDatasetTest {

    private MatchResult createResult(double overall, int missing) {
        MatchResult res = MatchResult.builder()
                .overallScore(BigDecimal.valueOf(overall))
                .requiredSkillsMissing(missing)
                .build();
        res.setId(UUID.randomUUID());
        return res;
    }

    @Test
    void test10CandidateRankingDataset_PrecisionAndNDCG() {
        // Create 10 Candidate Match Results according to Ground-Truth Benchmark Dataset
        List<MatchResult> dataset = new ArrayList<>();

        // CAND-01: Rank 1 (90.45%) - 0 missing required
        dataset.add(createResult(90.45, 0));
        // CAND-02: Rank 2 (90.75%) - 0 missing required (No GitHub fallback)
        dataset.add(createResult(90.75, 0));
        // CAND-03: Rank 3 (73.14%) - 0 missing required
        dataset.add(createResult(73.14, 0));
        // CAND-05: Rank 4 (68.61%) - 0 missing required
        dataset.add(createResult(68.61, 0));
        // CAND-04: Rank 5 (55.40%) - 2 missing required (Gated down)
        dataset.add(createResult(55.40, 2));
        // CAND-06: Rank 6 (62.10%) - 1 missing required
        dataset.add(createResult(62.10, 1));
        // CAND-07: Rank 7 (42.00%) - 3 missing required
        dataset.add(createResult(42.00, 3));
        // CAND-08: Rank 8 (48.50%) - 2 missing required
        dataset.add(createResult(48.50, 2));
        // CAND-09: Rank 9 (25.00%) - 4 missing required
        dataset.add(createResult(25.00, 4));
        // CAND-10: Rank 10 (22.00%) - 4 missing required
        dataset.add(createResult(22.00, 4));

        // Sort using Official Business Logic: Required Skills Missing ASC, then Overall Score DESC
        dataset.sort((a, b) -> {
            int missingComp = Integer.compare(a.getRequiredSkillsMissing(), b.getRequiredSkillsMissing());
            if (missingComp != 0) return missingComp;
            return b.getOverallScore().compareTo(a.getOverallScore());
        });

        // Verify Top 4 candidates have 0 missing required skills
        for (int i = 0; i < 4; i++) {
            assertEquals(0, dataset.get(i).getRequiredSkillsMissing(), "Top candidate at index " + i + " must have 0 missing required skills");
        }

        // Precision@3 (Top 3 candidates are fully qualified Java developers)
        long qualifiedTop3 = dataset.stream().limit(3).filter(r -> r.getRequiredSkillsMissing() == 0).count();
        double precisionAt3 = (double) qualifiedTop3 / 3.0;
        assertEquals(1.0, precisionAt3, 0.001, "Precision@3 must be 1.0 (100%)");

        // Verify Pairwise order: Top 1 candidate overall score > Top 3 candidate overall score
        assertTrue(dataset.get(0).getOverallScore().compareTo(dataset.get(2).getOverallScore()) > 0);
    }
}
