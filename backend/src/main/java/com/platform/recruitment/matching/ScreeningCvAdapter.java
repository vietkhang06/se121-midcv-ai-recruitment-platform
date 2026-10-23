package com.platform.recruitment.matching;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.*;

/** Pure adapter from extraction CVData to existing midcv-score-v1 input; never writes extraction data. */
public final class ScreeningCvAdapter {
    private ScreeningCvAdapter() {}

    public static JsonNode adapt(JsonNode extracted, ObjectMapper mapper) {
        if (extracted.path("experience").isObject()) return extracted.deepCopy(); // legacy scoring schema
        ObjectNode out = mapper.createObjectNode();
        out.put("schemaVersion", "screening-cv-adapter-v1");
        out.put("title", extracted.path("headline").asText(""));
        out.put("summary", extracted.path("summary").asText(""));
        var skills = out.putArray("skills");
        for (JsonNode s : extracted.path("skills")) {
            String name = s.isTextual() ? s.asText() : s.path("name").asText("");
            if (name.isBlank()) continue;
            ObjectNode item = skills.addObject();
            item.put("name", name); item.put("canonical", name); item.put("priority", "MENTIONED");
            item.put("evidence", name);
        }
        var exp = out.putObject("experience");
        exp.set("entries", extracted.path("experience").deepCopy());
        Double years = completedYears(extracted.path("experience"));
        if (years == null) { exp.putNull("years"); exp.putNull("evidence"); }
        else { exp.put("years", years); exp.put("evidence", "Non-overlapping completed date intervals in extracted experience"); }
        var education = out.putArray("education");
        for (JsonNode e : extracted.path("education")) {
            ObjectNode item = education.addObject();
            String degree = e.path("degree").asText("");
            item.put("level", level(degree));
            if (e.path("fieldOfStudy").isTextual()) item.put("field", e.path("fieldOfStudy").asText());
            else item.putNull("field");
            item.put("priority", "MENTIONED");
            item.put("evidence", (e.path("institution").asText("") + " " + degree + " "
                    + e.path("fieldOfStudy").asText("")).strip());
        }
        var projects = out.putArray("projects");
        for (JsonNode p : extracted.path("projects")) {
            ObjectNode item = projects.addObject();
            item.put("name", p.path("name").asText(""));
            item.put("description", p.path("description").asText(""));
            item.set("technologies", p.path("techStack").isArray() ? p.path("techStack").deepCopy() : mapper.createArrayNode());
            item.put("evidence", p.path("description").asText(""));
        }
        out.putArray("otherRequirements");
        String github = extracted.path("personalInfo").path("githubUrl").asText("");
        java.util.regex.Matcher handle = java.util.regex.Pattern.compile("^https?://(?:www\\.)?github\\.com/([A-Za-z0-9-]+)(?:/)?$").matcher(github);
        if (handle.matches()) out.put("githubUsername", handle.group(1)); else out.putNull("githubUsername");
        return out;
    }

    private static String level(String degree) {
        String d = java.text.Normalizer.normalize(degree, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT).replace('đ', 'd');
        if (d.contains("doctor") || d.contains("phd") || d.contains("tien si")) return "DOCTORATE";
        if (d.contains("master") || d.contains("thac si")) return "MASTER";
        if (d.contains("bachelor") || d.contains("cu nhan") || d.contains("ky su")) return "BACHELOR";
        if (d.contains("associate") || d.contains("cao dang")) return "ASSOCIATE";
        if (d.contains("high school") || d.contains("trung hoc")) return "HIGH_SCHOOL";
        return "OTHER";
    }

    static Double completedYears(JsonNode entries) {
        if (!entries.isArray() || entries.isEmpty()) return null;
        List<long[]> intervals = new ArrayList<>();
        for (JsonNode e : entries) {
            // Do not guess year-only dates, missing dates, or the end date of a current role.
            String start = e.path("startDate").asText(""), end = e.path("endDate").asText("");
            if (!start.matches("\\d{4}-\\d{2}(?:-\\d{2})?") || !end.matches("\\d{4}-\\d{2}(?:-\\d{2})?")) return null;
            try {
                YearMonth a = YearMonth.parse(start.substring(0,7)), b = YearMonth.parse(end.substring(0,7));
                if (b.isBefore(a)) return null;
                intervals.add(new long[]{a.getYear()*12L+a.getMonthValue()-1, b.getYear()*12L+b.getMonthValue()-1});
            } catch (RuntimeException ex) { return null; }
        }
        intervals.sort(Comparator.comparingLong(a -> a[0]));
        long total=0, a=intervals.get(0)[0], b=intervals.get(0)[1];
        for (int i=1;i<intervals.size();i++) {
            long[] next=intervals.get(i);
            if (next[0]<=b) b=Math.max(b,next[1]);
            else { total+=b-a; a=next[0]; b=next[1]; }
        }
        return (total+b-a)/12.0;
    }
}
