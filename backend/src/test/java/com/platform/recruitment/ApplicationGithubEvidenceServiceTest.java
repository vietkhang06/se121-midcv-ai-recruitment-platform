package com.platform.recruitment;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.platform.recruitment.application.Application;
import com.platform.recruitment.auth.OAuthService;
import com.platform.recruitment.github.ApplicationGithubEvidenceService;
import com.platform.recruitment.github.GithubClient;
import com.platform.recruitment.matching.SkillNormalizer;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import java.util.*;
import java.math.BigDecimal;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ApplicationGithubEvidenceServiceTest {
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final GithubClient client = mock(GithubClient.class);
    private final OAuthService oauth = mock(OAuthService.class);
    private final ObjectMapper mapper = new ObjectMapper();
    private final ApplicationGithubEvidenceService service = new ApplicationGithubEvidenceService(jdbc, client, oauth, mapper, new SkillNormalizer());
    private Application app(String raw) {
        return Application.builder().aiAnalysisConsent(true).aiScoringEligibleSnapshot(true)
                .githubSnapshotContract(ApplicationGithubEvidenceService.CONTRACT).githubUsernameSnapshot("fixture").githubScanSnapshot(raw).build();
    }
    private String scan(String language, boolean fork, boolean archived, String ownership, boolean partial) {
        return """
            {"status":"AVAILABLE","username":"fixture","ownership_status":"%s","public_repos":1,
            "fetched_at":"2026-11-22T00:00:00Z","language_partial":%s,"repos":[
              {"name":"backend-api","url":"https://github.com/fixture/backend-api","fork":%s,"archived":%s,
              "languages":{"%s":100},"topics":["spring-boot"],"pushed_at":"2026-11-21T00:00:00Z"}]}
            """.formatted(ownership, partial, fork, archived, language);
    }
    @Test void realLanguageBytesAndExactJdCriteriaProduceReconstructibleScore() {
        var e = service.evaluate(app(scan("Java",false,false,"OWNED",false)),"Technology","Backend",List.of("Java","Spring Boot"),true);
        assertEquals(new BigDecimal("80.00"),e.score());
        assertTrue(e.assessment().isScoringEligible());
        assertEquals("https://github.com/fixture/backend-api",e.assessment().getRepos().getFirst().getUrl());
        assertEquals("OWNED",service.readAssessment(service.serialize(e.assessment())).getOwnershipStatus());
    }
    @Test void javascriptAndGenericRepoNameDoNotProveJava() {
        assertNull(service.evaluate(app(scan("JavaScript",false,false,"OWNED",false)),"Technology","Backend",List.of("Java"),true).score());
    }
    @Test void missingIdentityForkArchivePartialNonItAndNoConsentStayNeutral() {
        for (String raw : List.of(scan("Java",true,false,"OWNED",false),scan("Java",false,true,"OWNED",false),
                scan("Java",false,false,"UNVERIFIED_PUBLIC",false),scan("Java",false,false,"OWNED",true),"{\"status\":\"RATE_LIMITED\"}","null")) {
            assertNull(service.evaluate(app(raw),"Technology","Backend",List.of("Java"),true).score());
        }
        var a = app(scan("Java",false,false,"OWNED",false));
        assertNull(service.evaluate(a,"Marketing","SEO",List.of("Java"),true).score());
        a.setAiAnalysisConsent(false);
        assertNull(service.evaluate(a,"Technology","Backend",List.of("Java"),true).score());
    }
    @Test void noConsentDoesNotMakeProviderRequest() {
        UUID id = UUID.randomUUID();
        Map<String,Object> row = new HashMap<>();
        row.put("github_snapshot_contract",ApplicationGithubEvidenceService.CONTRACT);
        row.put("ai_analysis_consent",false);
        when(jdbc.queryForList(anyString(),eq(id))).thenReturn(List.of(row));
        service.capture(id);
        verifyNoInteractions(client,oauth);
    }
}
