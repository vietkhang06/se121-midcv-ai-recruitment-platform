package com.platform.recruitment.cv;

import com.platform.recruitment.candidate.CandidateProfile;
import com.platform.recruitment.common.CustomException;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class ConfirmedCvInputTest {
    private CVVersion version(String status, CandidateProfile candidate, String json) {
        CV cv = CV.builder().candidate(candidate).title("Test CV").build();
        cv.setId(UUID.randomUUID());
        CVVersion version = CVVersion.builder().cv(cv).versionNumber(1).title("Test CV v1")
                .status(status).structuredJsonContent(json).build();
        version.setId(UUID.randomUUID());
        return version;
    }

    @Test
    void matchingTextUsesReviewedProfessionalSectionsAndExcludesPiiAndProvenance() {
        CandidateProfile candidate = CandidateProfile.builder().fullName("Sensitive Candidate Name").build();
        candidate.setId(UUID.randomUUID());
        CVVersion version = version("CONFIRMED", candidate, """
                {
                  "personal_info":{"name":"Sensitive Candidate Name","email":"private@example.invalid","phone":"0900000000"},
                  "summary":{"value":"Backend engineer with Java experience","origin":"USER_CONFIRMED"},
                  "skills":[{"name":{"value":"Spring Boot","origin":"USER_CONFIRMED"},"evidence":"raw OCR noise","source":"OCR","id":"internal-id"}],
                  "work_experience":[{"company":"Example Corp","position":"Backend Engineer","description":"Built APIs"}],
                  "raw_structured":{"skills":["InjectedSkill"],"evidence":"unreviewed"},
                  "warnings":["OCR needs review"]
                }
                """);

        String scoringText = ConfirmedCvInput.text(version);
        assertTrue(scoringText.contains("Backend engineer with Java experience"));
        assertTrue(scoringText.contains("Spring Boot"));
        assertTrue(scoringText.contains("Example Corp"));
        assertFalse(scoringText.contains("Sensitive Candidate Name"));
        assertFalse(scoringText.contains("private@example.invalid"));
        assertFalse(scoringText.contains("0900000000"));
        assertFalse(scoringText.contains("raw OCR noise"));
        assertFalse(scoringText.contains("InjectedSkill"));
        assertFalse(scoringText.contains("internal-id"));
    }

    @Test
    void draftAndForeignCandidateVersionsCannotBeUsedForMatching() {
        CandidateProfile owner = CandidateProfile.builder().build(); owner.setId(UUID.randomUUID());
        CandidateProfile another = CandidateProfile.builder().build(); another.setId(UUID.randomUUID());
        CVVersion draft = version("DRAFT", owner, "{\"skills\":[\"Java\"]}");
        CVVersion foreign = version("CONFIRMED", another, "{\"skills\":[\"Java\"]}");

        assertThrows(CustomException.class, () -> ConfirmedCvInput.requireConfirmed(draft, owner.getId()));
        assertThrows(CustomException.class, () -> ConfirmedCvInput.requireConfirmed(foreign, owner.getId()));
    }

    @Test
    void malformedOrEmptyProfessionalContentIsRejected() {
        CandidateProfile owner = CandidateProfile.builder().build(); owner.setId(UUID.randomUUID());
        CVVersion malformed = version("CONFIRMED", owner, "not-json");
        CVVersion piiOnly = version("CONFIRMED", owner, "{\"personal_info\":{\"email\":\"private@example.invalid\"}}");

        assertThrows(CustomException.class, () -> ConfirmedCvInput.requireConfirmed(malformed, owner.getId()));
        assertThrows(CustomException.class, () -> ConfirmedCvInput.requireConfirmed(piiOnly, owner.getId()));
    }
}
