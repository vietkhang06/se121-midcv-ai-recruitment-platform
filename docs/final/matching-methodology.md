# Matching Methodology (`docs/final/matching-methodology.md`)

## 1. 3-Tier Match Score Formulas

### Core Score ($S_{\text{core}}$)
Allocated weights:
- Required Skill Score: **40%** (within which Required Skills contribute 80%, Preferred Skills contribute 20%)
- Experience Relevance Score: **30%**
- Education Relevance Score: **15%**
- Project Relevance Score: **15%**

$$S_{\text{core}} = 0.40 \cdot S_{\text{skill}} + 0.30 \cdot S_{\text{exp}} + 0.15 \cdot S_{\text{edu}} + 0.15 \cdot S_{\text{proj}}$$

### Overall Score ($S_{\text{overall}}$)
For technical jobs with active GitHub profiles:
$$S_{\text{overall}} = 0.85 \cdot S_{\text{core}} + 0.15 \cdot S_{\text{github}}$$

For non-technical jobs or candidates without GitHub:
$$S_{\text{overall}} = S_{\text{core}}$$

## 2. Required Skill Gating Rule
Missing mandatory required skills directly increase `required_skills_missing` and gate candidate rankings. Candidates missing required skills can **NEVER** rank above candidates with all required skills satisfied, regardless of preferred skills or GitHub activity.
