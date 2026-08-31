package com.platform.recruitment.matching;

import com.platform.recruitment.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/matching")
@RequiredArgsConstructor
public class MatchingController {

    private final MatchingEngineService matchingEngineService;
    private final CandidateRankingService candidateRankingService;

    @PostMapping("/jobs/{jobId}/candidates/{candidateId}")
    public ResponseEntity<ApiResponse<MatchResult>> calculateMatchScore(
            @PathVariable UUID jobId,
            @PathVariable UUID candidateId) {
        MatchResult result = matchingEngineService.calculateAndPersistMatchResult(jobId, candidateId);
        return ResponseEntity.ok(ApiResponse.success("Match score calculated successfully", result));
    }

    @GetMapping("/jobs/{jobId}/rankings")
    public ResponseEntity<ApiResponse<List<MatchResult>>> getCandidateRankings(
            @PathVariable UUID jobId,
            @RequestParam(required = false) BigDecimal minScore) {
        List<MatchResult> ranked = candidateRankingService.getRankedCandidatesForJob(jobId, minScore);
        return ResponseEntity.ok(ApiResponse.success("Candidate rankings retrieved successfully", ranked));
    }
}
