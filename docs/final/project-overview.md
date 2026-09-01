# Project Overview (`docs/final/project-overview.md`)

## 1. Overview
The **AI Recruitment Platform** is an intelligent web application designed to transform traditional recruitment workflows by leveraging **LLM Document Parsing**, **1536-Dimensional Vector Embeddings (Pgvector)**, and **Developer Profile GitHub Analysis** to evaluate, match, and rank candidate profiles against Job Descriptions (JDs) with explainable AI evidence.

## 2. Key Highlights
- **3-Tier Match Engine**: Evaluates Core JD-CV Relevance ($S_{\text{core}}$) and GitHub Supporting Signals ($S_{\text{github}}$) with 85% / 15% weighted allocation.
- **Required Skill Gating**: Missing mandatory skills directly penalize candidates and gate top rankings regardless of preferred skills or GitHub activity.
- **Neutral Non-Technical & Missing GitHub Fallback**: Candidates without a GitHub profile or applying for non-technical roles (Marketing, Finance, Design) receive $S_{\text{overall}} = S_{\text{core}}$ without zero penalties.
- **Transparent Evidence Traceability**: Extracts exact quotes from CVs and JDs, enabling recruiters to audit match scores line-by-line.
