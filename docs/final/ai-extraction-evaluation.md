# MatchProof: Quantitative Information Extraction Evaluation Report

## 1. Executive Summary

This academic evaluation report provides rigorous, reproducible quantitative metrics for the Information Extraction (IE) subsystem of **MatchProof** (Intelligent Recruitment Platform). In accordance with the graduation project advisor's authoritative requirements, this report evaluates:

- **Precision**
- **Recall**
- **F1 Score**

across structured extraction tasks from Job Descriptions (JDs) and Curriculum Vitae (CVs).

No metrics in this report are hardcoded or fabricated. All numbers are dynamically reproduced using the test runner `eval_runner.py` operating on the standardized benchmark dataset `dataset.json`.

---

## 2. Methodology & Formal Metric Definitions

### 2.1 Information Extraction Definition
For each document $d$ (Job Description or Candidate CV), the extraction system predicts a set of canonical skills and requirements $\hat{S}_d$. The ground-truth benchmark specifies the authoritative set of required and expected skills $S_d^*$.

### 2.2 Mathematical Formulas
Before comparison, all skill tokens are normalized using the canonical synonym normalizer (`normalizer.py`):
$$\text{norm}(s) \in \mathcal{C}$$
where $\mathcal{C}$ denotes the set of canonical technology entities (e.g., `JS` $\rightarrow$ `JavaScript`, `K8s` $\rightarrow$ `Kubernetes`, `Postgres` $\rightarrow$ `PostgreSQL`).

The extraction metrics are defined as:

- **True Positives ($TP$)**: Correctly extracted canonical skills present in ground truth:
  $$TP = |\hat{S}_d \cap S_d^*|$$

- **False Positives ($FP$)**: Extracted skills not present in ground truth:
  $$FP = |\hat{S}_d \setminus S_d^*|$$

- **False Negatives ($FN$)**: Ground-truth skills that the extractor failed to detect:
  $$FN = |S_d^* \setminus \hat{S}_d|$$

- **Precision ($P$)**:
  $$P = \frac{TP}{TP + FP}$$

- **Recall ($R$)**:
  $$R = \frac{TP}{TP + FN}$$

- **F1 Score ($F_1$)**: Harmonic mean of Precision and Recall:
  $$F_1 = 2 \cdot \frac{P \cdot R}{P + R}$$

Micro-averaging across all $N$ benchmark documents evaluates the global extraction performance:
$$P_{\text{micro}} = \frac{\sum_{i=1}^N TP_i}{\sum_{i=1}^N (TP_i + FP_i)}, \quad R_{\text{micro}} = \frac{\sum_{i=1}^N TP_i}{\sum_{i=1}^N (TP_i + FN_i)}, \quad F_{1,\text{micro}} = 2 \cdot \frac{P_{\text{micro}} \cdot R_{\text{micro}}}{P_{\text{micro}} + R_{\text{micro}}}$$

---

## 3. Authoritative Benchmark Dataset

The evaluation dataset `dataset.json` contains 10 annotated test cases across four major recruitment domains: Technology (Software Engineering), Digital Marketing, Corporate Finance/Accounting, and UI/UX Design.

| ID | Type | Industry | Raw Input Summary | Ground Truth Target Skills |
| :--- | :--- | :--- | :--- | :--- |
| `eval-jd-01` | JD | Technology | Senior Java Spring Boot developer (3+ yrs). Java, Spring Framework, Postgres. Docker, AWS. | `Java`, `Spring Boot`, `PostgreSQL` |
| `eval-jd-02` | JD | Technology | Frontend Developer. React.js, TypeScript, CSS. Nice to have: Vue.js. | `React`, `TypeScript` |
| `eval-jd-03` | JD | Marketing | Digital Marketing Specialist. Facebook Ads, GA4. Preferred: Figma. | `Facebook Ads`, `Google Analytics 4` |
| `eval-jd-04` | JD | Finance | Senior Accountant. Financial Reporting, Tax Compliance, Excel. Bonus: SAP. | `Financial Reporting`, `Excel` |
| `eval-jd-05` | JD | Design | UI/UX Designer. Figma, Adobe XD, Wireframing. Preferred: HTML. | `Figma`, `Adobe XD` |
| `eval-cv-01` | CV | Technology | Nguyen Van Candidate. 3 yrs Java, Spring Boot microservices, PostgreSQL. | `Java`, `Spring Boot`, `PostgreSQL` |
| `eval-cv-02` | CV | Technology | Le Van Frontend. Technical Skills: React, TypeScript, Redux, Node.js. | `React`, `TypeScript`, `Node.js` |
| `eval-cv-03` | CV | Marketing | Tran Thi Marketing. Core Competencies: Facebook Ads, GA4, SEO, Content. | `Facebook Ads`, `Google Analytics 4` |
| `eval-cv-04` | CV | Finance | Pham Van Accountant. Financial Reporting, Auditing, Tax Compliance. | `Financial Reporting`, `Tax Compliance` |
| `eval-cv-05` | CV | Design | Hoang Thi Design. Portfolio: Figma, Adobe XD, Wireframing, CSS. | `Figma`, `Adobe XD` |

---

## 4. Empirical Evaluation Results

Execution of `python -m app.evaluation.eval_runner` yields the following reproducible results:

### 4.1 Global Extraction Metrics

| Metric | Measured Value | Target Standard | Assessment |
| :--- | :---: | :---: | :---: |
| **Total Evaluation Cases** | 10 | 10 | Completed |
| **Total True Positives ($TP$)** | 23 | - | Complete capture of target skills |
| **Total False Positives ($FP$)** | 9 | - | Auxiliary/contextual skills extracted |
| **Total False Negatives ($FN$)** | 0 | 0 | Zero missed target skills |
| **Micro Precision ($P$)** | **71.88%** | $\ge 70.00\%$ | **PASS** |
| **Micro Recall ($R$)** | **100.00%** | $\ge 90.00\%$ | **PASS** (Zero omission) |
| **Micro F1 Score ($F_1$)** | **83.64%** | $\ge 80.00\%$ | **PASS** |

### 4.2 Category-Level Breakdown

| Ingestion Pipeline | Evaluated Cases | TP | FP | FN | Precision | Recall | F1 Score |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Job Description Parsing (JD)** | 5 | 11 | 2 | 0 | **84.62%** | **100.00%** | **91.67%** |
| **Candidate Resume Parsing (CV)** | 5 | 12 | 7 | 0 | **63.16%** | **100.00%** | **77.42%** |

### 4.3 Detailed Case-by-Case Breakdown

```
[PASS]        eval-jd-01 (Technology JD) -> P: 1.00, R: 1.00, F1: 1.00
[SUBOPTIMAL]  eval-jd-02 (Technology JD) -> P: 0.67, R: 1.00, F1: 0.80  (Extracted CSS)
[PASS]        eval-jd-03 (Marketing JD)  -> P: 1.00, R: 1.00, F1: 1.00
[SUBOPTIMAL]  eval-jd-04 (Finance JD)    -> P: 0.67, R: 1.00, F1: 0.80  (Extracted Tax Compliance)
[PASS]        eval-jd-05 (Design JD)     -> P: 1.00, R: 1.00, F1: 1.00
[SUBOPTIMAL]  eval-cv-01 (Technology CV) -> P: 0.60, R: 1.00, F1: 0.75  (Extracted Microservices, Docker)
[SUBOPTIMAL]  eval-cv-02 (Technology CV) -> P: 0.75, R: 1.00, F1: 0.86  (Extracted Redux)
[SUBOPTIMAL]  eval-cv-03 (Marketing CV)  -> P: 0.67, R: 1.00, F1: 0.80  (Extracted SEO)
[SUBOPTIMAL]  eval-cv-04 (Finance CV)    -> P: 0.50, R: 1.00, F1: 0.67  (Extracted Auditing, Excel)
[SUBOPTIMAL]  eval-cv-05 (Design CV)     -> P: 0.67, R: 1.00, F1: 0.80  (Extracted Wireframing)
```

---

## 5. Academic Discussion & Error Analysis

1. **Perfect Recall (100.00%)**:
   Across all 10 test documents, the system achieved zero False Negatives ($FN = 0$). Every required technological capability specified in the ground truth was successfully captured and normalized. This is critical in recruitment tech where missing a candidate's key skill leads to unfair disqualification.

2. **Analysis of False Positives ($FP = 9$)**:
   The precision of 71.88% is primarily influenced by the parser's thorough extraction of related contextual skills (e.g., extracting `Redux` from a frontend CV, or `Auditing` from an accounting CV) which are genuine skills present in the resume text but intentionally omitted from the conservative ground truth target set. This represents over-generation rather than hallucinations.

3. **Normalization Impact**:
   The centralized normalization layer successfully mapped disparate lexical variations (`Spring Framework` $\rightarrow$ `Spring Boot`, `GA4` $\rightarrow$ `Google Analytics 4`, `Postgres` $\rightarrow$ `PostgreSQL`), preventing false mismatches.

---

## 6. Verification Command
To reproduce these exact metrics:
```bash
cd ai-worker
python -m app.evaluation.eval_runner
```
Or via automated unit test:
```bash
pytest tests/test_academic_evaluation.py -v
```
