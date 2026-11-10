package com.platform.recruitment.matching;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

/** Deterministic unit tests, not semantic embedding acceptance. */
class SkillNormalizerBoundaryTest {
    private final SkillNormalizer matcher = new SkillNormalizer();

    @Test void noFalseTechnologyEquivalence() {
        assertFalse(matcher.matchesSkill("Java", "JavaScript developer"));
        assertFalse(matcher.matchesSkill("JavaScript", "Java 21 developer"));
        assertFalse(matcher.matchesSkill("C", "C++ and C# developer"));
        assertFalse(matcher.matchesSkill("React", "React Native developer"));
        assertFalse(matcher.matchesSkill("Spring Boot", "Spring Framework engineer"));
        assertFalse(matcher.matchesSkill("PostgreSQL", "MySQL administrator"));
        assertFalse(matcher.matchesSkill("SQL", "MySQL administrator"));
    }

    @Test void groundedAliasMatching() {
        assertEquals("ReactJS", matcher.findEvidence("React", "ReactJS developer").orElse(null));
        assertEquals("SpringBoot", matcher.findEvidence("Spring Boot", "SpringBoot service").orElse(null));
        assertEquals("Java", matcher.findEvidence("Java", "Java Spring Boot").orElse(null));
        assertEquals("Postgres", matcher.findEvidence("PostgreSQL", "Postgres database").orElse(null));
    }
}
