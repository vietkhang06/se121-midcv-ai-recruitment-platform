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
class GiaKhangTraceContractTest {
    CVVersion version(String json) {
        CVVersion version = CVVersion.builder().title("Synthetic CV").status("DRAFT").structuredJsonContent(json).build();
        version.setId(UUID.randomUUID()); return version;
    }

    @Test void traceRetainsOriginalJobRequirementsAndRejectsInventedQuote() {
        CVVersion cv = version("{}");
        Job job = Job.builder().title("Java Engineer").description("Java required").build();
        JobRequirement req = JobRequirement.builder().skillName("Java").requirementType(RequirementType.REQUIRED).build();
        String snapshot = MatchingInputTrace.snapshot("{}", cv, "Built Java API", job, List.of(req));
        job.setTitle("Changed title"); req.setSkillName("Python");
        var context = MatchingInputTrace.context(snapshot);
        assertEquals("Java Engineer", context.path("job_title").asText());
        assertEquals("Java", MatchingInputTrace.requirements(context).get(0).getSkillName());
        assertEquals(MatchingInputTrace.hash("Built Java API"), context.path("cv_text_sha256").asText());
        assertTrue(MatchingInputTrace.isQuote("Java API", "Built Java API"));
        assertFalse(MatchingInputTrace.isQuote("Expert in Java", "Built Java API"));
        assertFalse(MatchingInputTrace.isQuote("", "Built Java API"));
    }

}
