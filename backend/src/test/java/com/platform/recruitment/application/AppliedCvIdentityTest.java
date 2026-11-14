package com.platform.recruitment.application;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class AppliedCvIdentityTest {
    @Test
    void readsOnlyPinnedSnapshotAndUnwrapsReviewedFields() {
        ApplicationCVSnapshot snapshot = ApplicationCVSnapshot.builder().structuredJsonSnapshot("""
                {"schema_version":"2.0","personal_info":{
                  "full_name":{"value":"CV Person","origin":"USER_CONFIRMED"},
                  "email":{"value":"cv@example.test"},"phone":{"value":"0123"},
                  "github_url":{"value":"https://github.com/cv-person"}},
                  "summary":{"content":{"value":"Java developer"}}}
                """).build();
        AppliedCvIdentity identity = AppliedCvIdentity.fromSnapshot(snapshot);
        assertEquals("CV Person", identity.fullName);
        assertEquals("cv@example.test", identity.email);
        assertEquals("0123", identity.phone);
        assertEquals("https://github.com/cv-person", identity.githubUrl);
    }

    @Test
    void missingOrInvalidSnapshotNeverUsesAnAccountFallback() {
        assertNull(AppliedCvIdentity.fromSnapshot(null).fullName);
        ApplicationCVSnapshot invalid = ApplicationCVSnapshot.builder()
                .structuredJsonSnapshot("not json").build();
        assertNull(AppliedCvIdentity.fromSnapshot(invalid).email);
    }
}
