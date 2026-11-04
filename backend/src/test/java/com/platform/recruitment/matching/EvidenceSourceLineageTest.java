package com.platform.recruitment.matching;

import com.platform.recruitment.document.Documents;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

/** Tests the persisted evidence metadata contract, not a live Postgres acceptance test. */
class EvidenceSourceLineageTest {
    @Test
    void reviewedCvEvidenceSpanAndHashAreReconstructable() {
        String reviewed = "Skills: Java, Spring Boot, PostgreSQL";
        String quote = "Spring Boot";
        int start = reviewed.indexOf(quote);
        Evidence evidence = Evidence.builder()
                .sourceType("CV")
                .sourceVersionId(UUID.randomUUID())
                .snippet(quote)
                .quoteStartOffset(start)
                .quoteEndOffset(start + quote.length())
                .contentSha256(Documents.shaHex(reviewed))
                .provenance("CANDIDATE_REVIEWED_CV")
                .policyVersion(3)
                .build();
        assertNotNull(evidence.getSourceVersionId());
        assertEquals(quote, reviewed.substring(evidence.getQuoteStartOffset(), evidence.getQuoteEndOffset()));
        assertEquals(Documents.shaHex(reviewed), evidence.getContentSha256());
        assertEquals(3, evidence.getPolicyVersion());
    }
}
