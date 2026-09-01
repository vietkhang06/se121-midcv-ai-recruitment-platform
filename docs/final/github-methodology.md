# GitHub Methodology (`docs/final/github-methodology.md`)

## 1. Neutral Signal Assessment
GitHub evaluation measures supporting public activity for technical developer candidates. It evaluates:
1. **Language Distribution** (40%): Overlap between repository language ratios and JD tech stack.
2. **Technology Evidence** (35%): Number of public repositories matching required tech stack.
3. **Activity Signal** (15%): Recency of observable commit/push events (`HIGH`, `MODERATE`, `LOW`, `LIMITED_OBSERVABLE_ACTIVITY`).
4. **Recency** (10%): Days elapsed since last public contribution.

## 2. Zero-Penalty Fallback Policy
Candidates without a GitHub profile or applying to non-technical industries (Marketing, Finance, Design) are **NOT penalized**. The system outputs `S_github = null` and sets $S_{\text{overall}} = S_{\text{core}}$.
