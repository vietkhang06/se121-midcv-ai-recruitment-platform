# Problem Statement (`docs/final/problem-statement.md`)

## 1. Problem Context
Traditional recruitment platforms rely on naive keyword search, leading to high false-positive rates, high screening latency for HR teams, and lack of objective evidence validation. Candidate CVs often contain inconsistent formats, unstandardized skill naming (e.g., `SpringBoot` vs `Spring Boot`), and vague skill claims.

## 2. Core Challenges Addressed
1. **Semantic Ambiguity**: Pure string matching fails when candidates list synonymous technologies or abbreviated titles.
2. **Black-box AI Scoring**: Conventional AI screening tools output arbitrary scores without explaining *why* a candidate was ranked high or low.
3. **Required vs Preferred Skill Overriding**: Naive weighted averages allow non-essential bonus skills to artificially boost candidates missing mandatory core qualifications.
4. **Developer Code Evidence**: HR recruiters cannot easily assess actual programming activity on developer public repositories (GitHub).
