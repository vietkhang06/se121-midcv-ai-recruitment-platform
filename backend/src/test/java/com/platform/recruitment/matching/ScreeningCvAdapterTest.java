package com.platform.recruitment.matching;

import com.fasterxml.jackson.databind.*;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class ScreeningCvAdapterTest {
    ObjectMapper mapper=new ObjectMapper();
    @Test void adaptsNameSkillsAndPreservesOriginalPayload() throws Exception {
        JsonNode raw=mapper.readTree("{\"skills\":[{\"name\":\"Java\"}],\"experience\":[],\"education\":[]}");
        JsonNode result=ScreeningCvAdapter.adapt(raw,mapper);
        assertEquals("Java",result.path("skills").get(0).path("canonical").asText());
        assertFalse(raw.path("skills").get(0).has("canonical"));
        assertTrue(result.path("experience").path("years").isNull());
        JsonNode jd=mapper.readTree("{\"skills\":[{\"canonical\":\"Java\",\"priority\":\"REQUIRED\",\"evidence\":\"Java\"}],\"experience\":{\"years\":null},\"education\":[],\"projects\":[],\"otherRequirements\":[]}");
        Scoring.Result score=new Scoring().calculate(result,jd,100,mapper.createObjectNode().put("status","NOT_PROVIDED"));
        assertEquals(100.0,score.baseScore());
    }
    @Test void overlappingDateIntervalsAreCountedOnce() throws Exception {
        JsonNode entries=mapper.readTree("[{\"startDate\":\"2020-01\",\"endDate\":\"2022-01\"},{\"startDate\":\"2021-01\",\"endDate\":\"2023-01\"}]");
        assertEquals(3.0,ScreeningCvAdapter.completedYears(entries));
    }
    @Test void incompleteDatesDoNotInventYears() throws Exception {
        assertNull(ScreeningCvAdapter.completedYears(mapper.readTree("[{\"startDate\":\"2020\",\"endDate\":\"2022\"}]")));
        assertNull(ScreeningCvAdapter.completedYears(mapper.readTree("[{\"startDate\":\"2020-01\",\"is_current\":true}]")));
    }
    @Test void legacyNormalizedSchemaRemainsCompatible() throws Exception {
        JsonNode legacy=mapper.readTree("{\"experience\":{\"years\":2},\"skills\":[{\"canonical\":\"Java\"}]}");
        assertEquals(legacy,ScreeningCvAdapter.adapt(legacy,mapper));
    }
}
