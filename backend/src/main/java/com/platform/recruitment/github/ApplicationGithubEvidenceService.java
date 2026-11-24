package com.platform.recruitment.github;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.platform.recruitment.application.Application;
import com.platform.recruitment.auth.OAuthService;
import com.platform.recruitment.common.CustomException;
import com.platform.recruitment.common.ErrorCode;
import com.platform.recruitment.matching.MatchInspectionResponse;
import com.platform.recruitment.matching.SkillNormalizer;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.Duration;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/** Application-bound, public-only GitHub evidence. No LLM scoring or private repository access. */
@Service
@RequiredArgsConstructor
public class ApplicationGithubEvidenceService {
    public static final String CONTRACT = "public-evidence-v1";
    private final JdbcTemplate jdbc;
    private final GithubClient client;
    private final OAuthService oauth;
    private final ObjectMapper mapper;
    private final SkillNormalizer normalizer;

    public static boolean technical(String industry, String description) {
        String domain = Objects.toString(industry, "").trim().toLowerCase(Locale.ROOT);
        String text = Objects.toString(description, "").toLowerCase(Locale.ROOT);
        return Set.of("it", "technology", "software", "information technology", "công nghệ thông tin").contains(domain)
                && List.of("helpdesk", "it support", "technical support", "recruiter", "no coding required", "no github required")
                   .stream().noneMatch(text::contains);
    }

    /** The worker calls this outside the scoring transaction. A successful observation is immutable. */
    public void capture(UUID applicationId) {
        var rows = jdbc.queryForList("""
            SELECT a.github_username_snapshot,a.github_snapshot_contract,a.github_scan_snapshot,
                   a.ai_analysis_consent,a.ai_scoring_eligible_snapshot,a.status,c.user_id,
                   COALESCE(v.normalized->>'industry',j.industry) AS industry,
                   COALESCE(v.normalized->>'description',j.description) AS description,
                   COALESCE(p.is_github_active,true) AND COALESCE(p.github_weight,0.15)>0 AS enabled
              FROM applications a JOIN candidate_profiles c ON c.id=a.candidate_id
              JOIN jobs j ON j.id=a.job_id
              LEFT JOIN document_versions v ON v.id=a.applied_jd_version_id AND v.document_id=j.id
              LEFT JOIN job_matching_policies p ON p.job_id=j.id WHERE a.id=?
            """, applicationId);
        if (rows.isEmpty()) return;
        var row = rows.getFirst();
        if (!CONTRACT.equals(row.get("github_snapshot_contract")) || !Boolean.TRUE.equals(row.get("ai_analysis_consent"))
                || Boolean.FALSE.equals(row.get("ai_scoring_eligible_snapshot")) || "WITHDRAWN".equals(row.get("status"))) return;
        JsonNode old = parse((String) row.get("github_scan_snapshot"));
        if ("AVAILABLE".equals(old.path("status").asText()) && "OWNED".equals(old.path("ownership_status").asText()) && !old.path("language_partial").asBoolean()) return;
        String handle = GithubClient.sanitizeUsername((String) row.get("github_username_snapshot"));
        ObjectNode snapshot = mapper.createObjectNode();
        snapshot.put("username", handle);
        snapshot.put("fetched_at", Instant.now().toString());
        if (!Boolean.TRUE.equals(row.get("enabled")) || !technical(Objects.toString(row.get("industry"), ""), Objects.toString(row.get("description"), ""))) {
            snapshot.put("status", "NOT_APPLICABLE");
        } else if (handle == null) {
            snapshot.put("status", "NOT_CONNECTED");
        } else {
            try {
                JsonNode response = client.fetch(handle);
                if (response == null || !response.isObject() || !"AVAILABLE".equals(response.path("status").asText())
                        || !handle.equalsIgnoreCase(response.path("username").asText()) || !response.path("repos").isArray()) {
                    snapshot.put("status", "API_UNAVAILABLE");
                } else {
                    snapshot = ((ObjectNode) response).deepCopy();
                    boolean owned = oauth.matchesGithubIdentity((UUID) row.get("user_id"), handle, response.path("github_user_id").asText());
                    snapshot.put("ownership_status", owned ? "OWNED" : "UNVERIFIED_PUBLIC");
                    if (!owned) snapshot.put("status", "PUBLIC_ONLY");
                    else if (response.path("repos").isEmpty()) snapshot.put("status", "PRIVATE_ONLY");
                }
            } catch (CustomException error) {
                snapshot.put("status", error.getErrorCode() == ErrorCode.RATE_LIMIT_EXCEEDED ? "RATE_LIMITED"
                        : error.getErrorCode() == ErrorCode.RESOURCE_NOT_FOUND ? "NOT_FOUND" : "API_UNAVAILABLE");
            }
        }
        // CAS: do not overwrite a concurrent worker's snapshot or a withdrawn application.
        jdbc.update("UPDATE applications SET github_scan_snapshot=? WHERE id=? AND ai_analysis_consent=true "
                + "AND status<>'WITHDRAWN' AND github_scan_snapshot IS NOT DISTINCT FROM ?",
                snapshot.toString(), applicationId, row.get("github_scan_snapshot"));
    }

    public record Evaluation(BigDecimal score, MatchInspectionResponse.GitHubAssessmentInfo assessment) {}

    public Evaluation evaluate(Application app, String industry, String description, List<String> requirements, boolean enabled) {
        if (Boolean.FALSE.equals(app.getAiAnalysisConsent()) || Boolean.FALSE.equals(app.getAiScoringEligibleSnapshot())) return new Evaluation(null,
                MatchInspectionResponse.GitHubAssessmentInfo.builder().status("NOT_APPLICABLE").scoringEligible(false).build());
        if (!CONTRACT.equals(app.getGithubSnapshotContract())) return new Evaluation(null,
                MatchInspectionResponse.GitHubAssessmentInfo.builder().status("LEGACY_MISSING_DATA").build());
        JsonNode raw = parse(app.getGithubScanSnapshot());
        String status = !enabled || !technical(industry, description) ? "NOT_APPLICABLE" : raw.path("status").asText("PENDING");
        if (app.getGithubUsernameSnapshot() == null && "PENDING".equals(status)) status = "NOT_CONNECTED";
        if (!"AVAILABLE".equals(status) && !"PUBLIC_ONLY".equals(status)) return new Evaluation(null,
                MatchInspectionResponse.GitHubAssessmentInfo.builder().connected(app.getGithubUsernameSnapshot()!=null)
                    .username(app.getGithubUsernameSnapshot()).status(status).ownershipStatus(raw.path("ownership_status").asText(null))
                    .fetchedAt(raw.path("fetched_at").asText(null)).scoringEligible(false).build());
        Map<String,Long> bytes = new TreeMap<>();
        Set<String> required = new TreeSet<>();
        for (String req : requirements) if (req != null && !req.isBlank()) required.add(normalizer.getCanonicalName(req));
        Set<String> languageHits = new TreeSet<>(), metadataHits = new TreeSet<>();
        List<MatchInspectionResponse.RepoItem> relevant = new ArrayList<>();
        Instant fetched = instant(raw.path("fetched_at").asText());
        Integer latestDays = null;
        for (JsonNode repo : raw.path("repos")) {
            if (repo.path("fork").asBoolean(true) || repo.path("archived").asBoolean(true)) continue;
            String name = repo.path("name").asText("");
            String url = repo.path("url").asText("");
            String username = raw.path("username").asText("");
            if (name.isBlank() || !url.equalsIgnoreCase("https://github.com/"+username+"/"+name)) continue;
            Set<String> repoLang = new TreeSet<>(), repoMeta = new TreeSet<>();
            for (var it=repo.path("languages").fields(); it.hasNext();) {
                var entry = it.next();
                if (!entry.getValue().isIntegralNumber() || entry.getValue().asLong() <= 0) continue;
                bytes.merge(entry.getKey(),entry.getValue().asLong(),Long::sum);
                String canonical = normalizer.getCanonicalName(entry.getKey());
                if (required.contains(canonical)) repoLang.add(canonical);
            }
            for (JsonNode topic : repo.path("topics")) {
                String canonical = normalizer.getCanonicalName(topic.asText());
                if (!required.contains(canonical)) canonical = normalizer.getCanonicalName(topic.asText().replace('-', ' '));
                if (required.contains(canonical)) repoMeta.add(canonical);
            }
            // Metadata is explicitly weaker than observed language bytes, not proof of proficiency.
            if (repoLang.isEmpty() && repoMeta.isEmpty()) continue;
            languageHits.addAll(repoLang); metadataHits.addAll(repoMeta);
            Integer days = daysBetween(instant(repo.path("pushed_at").asText()), fetched);
            if (days != null && (latestDays == null || days < latestDays)) latestDays = days;
            relevant.add(MatchInspectionResponse.RepoItem.builder().name(name).url(url)
                .description(repo.path("description").asText("")).primaryLanguage(repo.path("language").asText(null))
                .stars(repo.path("stars").asInt()).forks(repo.path("forks").asInt()).updatedDaysAgo(days)
                .relevanceExplanation("Language bytes: "+String.join(", ",repoLang)+"; public topics: "+String.join(", ",repoMeta))
                .build());
        }
        long total = bytes.values().stream().mapToLong(Long::longValue).sum();
        Map<String,Double> distribution = new LinkedHashMap<>();
        if (total>0) bytes.entrySet().stream().sorted(Map.Entry.<String,Long>comparingByValue().reversed())
                .forEach(e -> distribution.put(e.getKey(), e.getValue()*100.0/total));
        BigDecimal score = null;
        // Require actual language evidence, OAuth stable identity and relevant JD criteria.
        // No GitHub score if evidence is absent; missing activity redistributes its weight.
        if ("AVAILABLE".equals(status) && "OWNED".equals(raw.path("ownership_status").asText())
                && !languageHits.isEmpty() && !required.isEmpty() && !raw.path("language_partial").asBoolean()) {
            Set<String> combined = new HashSet<>(languageHits); combined.addAll(metadataHits);
            double language = 100.0 * languageHits.size()/required.size();
            double technology = 100.0 * combined.size()/required.size();
            double weighted = .40*language + .35*technology;
            double weight = .75;
            if (latestDays != null) {
                double activity = latestDays<=14?100:latestDays<=60?85:latestDays<=180?60:40;
                weighted += .25*activity; weight += .25;
            }
            score = BigDecimal.valueOf(weighted/weight).setScale(2,RoundingMode.HALF_UP);
        }
        var assessment = MatchInspectionResponse.GitHubAssessmentInfo.builder().connected(true)
            .status("AVAILABLE".equals(status) ? "SYNCED" : status).username(raw.path("username").asText(null))
            .ownershipStatus(raw.path("ownership_status").asText(null)).scoringEligible(score!=null)
            .publicRepoCount(raw.path("public_repos").isIntegralNumber()?raw.path("public_repos").asInt():null)
            .topLanguages(new ArrayList<>(distribution.keySet())).languageDistribution(distribution).repos(relevant)
            .latestActivityDaysAgo(latestDays).activitySignal(latestDays==null?null:latestDays<=14?"HIGH":latestDays<=60?"MODERATE":latestDays<=180?"LOW":"LIMITED_OBSERVABLE_ACTIVITY")
            .fetchedAt(raw.path("fetched_at").asText(null)).scanScope(raw.path("scope").asText(null))
            .overallAssessment("Public repository metadata and language bytes; push date is repository activity, not proof of individual contribution. "
                    + (score==null?"No eligible supporting score; Core is retained.":"Supporting score: "+score+"; matched JD criteria: "+languageHits+"; topic signals: "+metadataHits)
                    + (raw.path("truncated").asBoolean()?"; repository list truncated":"")
                    + (raw.path("language_partial").asBoolean()?"; language requests incomplete":""))
            .build();
        return new Evaluation(score,assessment);
    }
    public String serialize(MatchInspectionResponse.GitHubAssessmentInfo data) {
        try { return mapper.writeValueAsString(data); } catch(Exception ex) { throw new IllegalStateException("GitHub assessment serialization failed",ex); }
    }
    public MatchInspectionResponse.GitHubAssessmentInfo readAssessment(String json) {
        if (json == null) return MatchInspectionResponse.GitHubAssessmentInfo.builder().status("LEGACY_MISSING_DATA").build();
        try { return mapper.readValue(json,MatchInspectionResponse.GitHubAssessmentInfo.class); }
        catch(Exception ex) { return MatchInspectionResponse.GitHubAssessmentInfo.builder().status("LEGACY_MISSING_DATA").build(); }
    }
    private JsonNode parse(String json) {
        try { if(json!=null) { JsonNode node = mapper.readTree(json); if (node != null && node.isObject()) return node; } } catch(Exception ignored) {}
        return mapper.createObjectNode();
    }
    private static Instant instant(String value) { try {return Instant.parse(value);} catch(Exception ex){return null;} }
    private static Integer daysBetween(Instant earlier, Instant later) {
        return earlier==null||later==null||earlier.isAfter(later)?null:(int)Math.min(Integer.MAX_VALUE,Duration.between(earlier,later).toDays());
    }
}
