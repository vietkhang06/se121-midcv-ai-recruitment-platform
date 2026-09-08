# WP-04 Checkpoint Report — CV Extraction Detail & Non-Fabrication Guarantee

**Work Package**: WP-04  
**Requirements Covered**: `CV-01`, `CV-02`  
**Standard**: Non-Fabrication Guarantee, Verbatim Substring Traceability, High-Fidelity Schema  
**Status**: **COMPLETED & 100% VERIFIED**  
**Date**: September 7, 2026  

---

## 1. Executive Summary & Objective

In this work package, the CV extraction pipeline (`ai-worker/app/services/cv_parser.py`, `ai-worker/app/services/llm_client.py`, and `ai-worker/app/schemas/cv.py`) was systematically hardened to eliminate phantom entity generation and guarantee high-fidelity, grounded extraction.

Previous baseline implementations exhibited mock fallbacks that injected fixed mock entities (e.g. hardcoding TechCorp Vietnam, VNU-HCM University of Technology, Senior Backend Engineer) whenever LLM outputs were sparse or unparseable. Under WP-04:
- All hardcoded phantom entities were eliminated.
- Strict anti-fabrication prompt constraints were implemented.
- An anti-hallucination verification filter was added to check every candidate entity against `raw_text`.
- Verbatim substring grounding was enforced for all evidence snippets (`evidence.snippet in raw_text == True`).
- Sparse CVs are guaranteed to return strictly empty arrays (`[]`) for unmentioned sections.

---

## 2. Technical Implementation Details

### 2.1 Schema Upgrades (`ai-worker/app/schemas/cv.py`)
- Added `ContactInfo` schema model (`email`, `phone`, `linkedin_url`, `github_url`, `portfolio_url`, `location`).
- Enhanced `CVExtractResponse` with `contact_info: Optional[ContactInfo]`, `email: Optional[str]`, `phone: Optional[str]`.
- Enforced complete 6-section schema:
  1. **Identity & Contact**: `full_name`, `headline`, `bio`, `email`, `phone`, `contact_info`, `github_url`, `portfolio_url`
  2. **Skills**: `ExtractedSkill` (`skill_name`, `normalized_name`, `years_exp`, `section`)
  3. **Work Experience**: `ExtractedExperience` (`company_name`, `position`, `start_date`, `end_date`, `is_current`, `description`, `technologies`)
  4. **Education**: `ExtractedEducation` (`institution`, `degree`, `field_of_study`, `start_year`, `end_year`)
  5. **Projects**: `ExtractedProject` (`name`, `role`, `description`, `tech_stack`)
  6. **Languages**: `ExtractedLanguage` (`language_name`, `proficiency_level`)
  7. **Evidences**: `CVEvidence` (`field_name`, `section`, `snippet`, `normalized_value`)

### 2.2 Strict Anti-Fabrication & Anti-Hallucination (`ai-worker/app/services/cv_parser.py`)
- **System Instruction Hardening**:
  - Extract ONLY entities explicitly present in raw text.
  - NEVER invent companies, degrees, dates, job titles, or skills.
  - If a section is absent, return `[]` or `null`.
- **Pre-extraction Regex Grounding**:
  - Exact regex matching for Email, Phone, and GitHub URLs.
- **Post-Extraction Reality Verification Filter**:
  - `experiences`: Retained only if `company_name` or `position` appears in `raw_text.lower()`.
  - `educations`: Retained only if `institution` or institution key tokens appear in `raw_text.lower()`.
  - `projects`: Retained only if project name appears in `raw_text.lower()`.
  - `languages`: Retained only if language name appears in `raw_text.lower()`.
  - `skills`: Retained only if skill name or normalized name appears in `raw_text.lower()`.
- **Verbatim Substring Guarantee for Evidences**:
  - For each extracted skill, the evidence snippet is extracted as an exact slice from `raw_text`.
  - `snippet in raw_text` is verified as strictly `True` before inclusion in `evidences`.

### 2.3 Acronym & Skill Normalization (`ai-worker/app/services/normalizer.py`)
- Added canonical acronym entries to `ALIAS_MAP`:
  - `"sql": "SQL"`
  - `"css": "CSS"`
  - `"html": "HTML"`
  - `"api": "API"`
  - `"rest": "REST"`
  - `"ci/cd": "CI/CD"`
- Preserved existing distinct pair boundaries (`java` vs `javascript`, `c` vs `c++`, `go` vs `google analytics`).

---

## 3. Verification & Test Evidence

### 3.1 Dedicated Test Suite: `ai-worker/tests/test_cv_non_fabrication.py`
Five focused test cases were implemented:
1. `test_rich_cv_high_fidelity_extraction` (`CV-01`):
   - Rich CV input with all 6 sections.
   - Verified that Identity, Contact Info, Skills (Java, Spring Boot, PostgreSQL, Docker), Experience (TechCorp Vietnam), Education (University of Science), Projects (E-commerce Core Engine), Languages (English, Vietnamese), and Evidences are extracted.
   - **Result**: `PASSED`.
2. `test_sparse_cv_zero_fabrication_guarantee` (`CV-02`):
   - Sparse CV with only Name, Email, and 3 skills (Python, React, SQL).
   - Verified that `experiences == []`, `educations == []`, `projects == []`, `languages == []`, and `github_url is None`. Zero fabricated entities.
   - **Result**: `PASSED`.
3. `test_grounded_evidence_substring_guarantee` (`CV-02`):
   - Verified that every single snippet in `res.evidences` is an exact verbatim substring of `raw_text` (`ev.snippet in raw_text == True`).
   - **Result**: `PASSED`.
4. `test_non_technical_domain_cv_no_hallucination` (`CV-01`, `CV-02`):
   - Marketing CV with digital marketing skills.
   - Verified that domain skills are extracted, while tech skills (Java, Spring Boot, Docker, Kubernetes) are NOT hallucinated.
   - **Result**: `PASSED`.
5. `test_github_url_grounding` (`CV-01`):
   - Verified GitHub URL is extracted when present and strictly `None` when absent.
   - **Result**: `PASSED`.

### 3.2 AI Worker Test Suite Execution
```
============================= test session starts =============================
platform win32 -- Python 3.11.9, pytest-9.1.1, pluggy-1.6.0
collected 35 items

tests\test_academic_evaluation.py ....                                   [ 11%]
tests\test_api_endpoints.py ....                                         [ 22%]
tests\test_cv_non_fabrication.py .....                                   [ 37%]
tests\test_cv_parser.py ..                                               [ 42%]
tests\test_extraction_quality.py ..                                      [ 48%]
tests\test_failure_resilience.py ..                                      [ 54%]
tests\test_github_analyzer.py ....                                       [ 65%]
tests\test_idempotency_lifecycle.py ..                                   [ 71%]
tests\test_jd_parser.py .                                                [ 74%]
tests\test_normalizer.py ..                                              [ 80%]
tests\test_prompt_injection.py .                                         [ 82%]
tests\test_reality_manipulation.py ......                                [100%]

============================= 35 passed in 0.91s ==============================
```
- **Total AI Tests**: 35 passed, 0 failed (100% pass rate).

---

## 4. Requirement Traceability Matrix Status

| ID | Requirement | Implementation | Test | Evidence | Status |
|:---|:---|:---|:---|:---|:---:|
| `CV-01` | High-fidelity CV extraction schema | `cv_parser.py`, `cv.py`, `llm_client.py` | `test_cv_non_fabrication.py` | 5/5 non-fabrication tests, 35/35 AI worker tests | **PASSED** |
| `CV-02` | Non-fabrication guarantee | `cv_parser.py`, `llm_client.py` | `test_sparse_cv_zero_fabrication_guarantee`, `test_grounded_evidence_substring_guarantee` | Sparse CV test `[]`, verbatim substring `True` | **PASSED** |

---

## 5. Next Work Package

With WP-04 fully verified and completed, the active focus shifts to:
- **WP-05**: **IMMUTABLE CV VERSION CREATION & SAVE** (`CVVER-01`)
  - Auto-incrementing versioning upon save (`cv_version_id`, `version_number`).
  - Immutable version history in candidate CV management.
  - Ensuring modifications create new versions rather than overwriting prior ones.
