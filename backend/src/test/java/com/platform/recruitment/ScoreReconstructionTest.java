package com.platform.recruitment;

import com.platform.recruitment.matching.MatchFactor;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class ScoreReconstructionTest {

    @Test
    void testReconstructCoreScoreFromMatchFactors() {
        MatchFactor fReqSkill = MatchFactor.builder().factorType("SKILL_REQUIRED").score(BigDecimal.valueOf(100.0)).weight(BigDecimal.valueOf(0.32)).build();
        MatchFactor fPrefSkill = MatchFactor.builder().factorType("SKILL_PREFERRED").score(BigDecimal.valueOf(50.0)).weight(BigDecimal.valueOf(0.08)).build();
        MatchFactor fExp = MatchFactor.builder().factorType("EXPERIENCE").score(BigDecimal.valueOf(100.0)).weight(BigDecimal.valueOf(0.25)).build();
        MatchFactor fEdu = MatchFactor.builder().factorType("EDUCATION").score(BigDecimal.valueOf(100.0)).weight(BigDecimal.valueOf(0.10)).build();
        MatchFactor fProj = MatchFactor.builder().factorType("PROJECT").score(BigDecimal.valueOf(90.0)).weight(BigDecimal.valueOf(0.10)).build();
        MatchFactor fSem = MatchFactor.builder().factorType("SEMANTIC").score(BigDecimal.valueOf(85.0)).weight(BigDecimal.valueOf(0.15)).build();

        List<MatchFactor> factors = List.of(fReqSkill, fPrefSkill, fExp, fEdu, fProj, fSem);

        double reconstructedCore = factors.stream()
                .mapToDouble(f -> f.getScore().doubleValue() * f.getWeight().doubleValue())
                .sum();

        BigDecimal finalCore = BigDecimal.valueOf(reconstructedCore).setScale(2, RoundingMode.HALF_UP);

        // 32 + 4 + 25 + 10 + 9 + 12.75 = 92.75
        assertEquals(BigDecimal.valueOf(92.75), finalCore);
    }
}
