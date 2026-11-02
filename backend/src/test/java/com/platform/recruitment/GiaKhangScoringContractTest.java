package com.platform.recruitment;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.platform.recruitment.common.*;
import com.platform.recruitment.cv.*;
import com.platform.recruitment.job.*;
import com.platform.recruitment.matching.*;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

/** Unit contracts, not PostgreSQL/provider acceptance. All data is synthetic. */
class GiaKhangScoringContractTest {
    CVVersion version(String json) {
        CVVersion version = CVVersion.builder().title("Synthetic CV").status("DRAFT").structuredJsonContent(json).build();
        version.setId(UUID.randomUUID()); return version;
    }

    @Test void experienceIsNotGuessedFromSeniorityOrMissingDates() {
        ExperienceMatcher matcher = new ExperienceMatcher();
        assertEquals(0, BigDecimal.ZERO.compareTo(matcher.evaluateExperience("3+ years Java", "Senior Java developer")));
        CVVersion unknown = version("{\"work_experience\":[{\"position\":\"Senior developer\",\"start_date\":\"2020\"}]}");
        assertEquals(0, BigDecimal.ZERO.compareTo(matcher.evaluateExperience("3+ years Java", unknown)));
    }

    @Test void experienceMergesOverlapsAndUsesStableCompletedDates() {
        CVVersion cv = version("{\"work_experience\":[{\"start_date\":\"2020-01\",\"end_date\":\"2022-01\"},{\"start_date\":\"2021-01\",\"end_date\":\"2023-01\"}]}");
        assertEquals(new BigDecimal("75.00"), new ExperienceMatcher().evaluateExperience("4+ years experience", cv));
    }

    @Test void screeningGoldenScoreUsesItsOwnVersionAndIsRepeatable100Times() throws Exception {
        ObjectMapper mapper = new ObjectMapper(); Scoring engine = new Scoring();
        var cv = mapper.readTree("{\"skills\":[{\"canonical\":\"Java\"}],\"experience\":{\"years\":null}}");
        var jd = mapper.readTree("{\"skills\":[{\"canonical\":\"Java\",\"priority\":\"REQUIRED\"},{\"canonical\":\"Docker\",\"priority\":\"REQUIRED\"}],\"experience\":{\"years\":null}}");
        var github = mapper.readTree("{\"status\":\"UNAVAILABLE\"}");
        // 30*50 required skills + 20*80 semantic; assessed weight=50 => 62.
        for (int i=0; i<100; i++) {
            var result = engine.calculate(cv, jd, 80, github);
            assertEquals(62, result.score()); assertEquals(0, result.githubBonus());
            assertEquals(Scoring.VERSION, result.details().get("algorithm"));
            assertEquals("HR_REVIEW_REQUIRED", result.details().get("decision"));
        }
        assertThrows(CustomException.class, () -> engine.calculate(cv, jd, Double.NaN, github));
    }
}
