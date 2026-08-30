# AI ARCHITECTURE SPECIFICATION (REVISED)

Tài liệu này đặc tả Kiến trúc Xử lý AI, ranh giới giữa Xử lý AI (LLM / Embeddings) và Tính toán Định hình (Deterministic Java Backend Engine).

---

## 1. RANH GIỚI TRÁCH NHIỆM AI VÀ DETERMINISTIC CODE

```mermaid
graph TD
    subgraph AI Service Responsibilities [LLM & Embedding Engine]
        A1["Text Extraction from PDF/DOCX"]
        A2["Entity Extraction (Skills, Exp, Edu) -> JSON Schema"]
        A3["Vector Embedding Generation (1536 dim)"]
        A4["Industry-Aware CV Template Recommendation"]
        A5["Evidence Snippet Retrieval from CV Text"]
    end
    
    subgraph Code Responsibilities [Deterministic Java Backend Engine]
        C1["Core JD-CV Score Calculation (S_core: 0 - 100%)"]
        C2["GitHub Supporting Score Calculation (S_github: 0 - 100%)"]
        C3["Overall Match Score Computation (S_overall = w_core * S_core + w_github * S_github)"]
        C4["Available-Data Normalization Fallback Strategy"]
        C5["Raw Substring Evidence Verification Guardrail"]
        C6["GitHub Language Ranking & Activity Signal Logic"]
    end
    
    AI Service Responsibilities -->|Provide Parsed Data & Vectors| Code Responsibilities
```

### NGUYÊN TẮC CỐT LÕI (CORE PRINCIPLE):
* **AI / LLM:** Chỉ dùng cho việc hiểu ngôn ngữ tự nhiên, trích xuất dữ liệu từ văn bản phi định hình và sinh Vector Embedding.
* **Deterministic Java Backend Engine:** Đảm nhiệm 100% công thức tính toán điểm số $S_{\text{core}}$, $S_{\text{github}}$, $S_{\text{overall}}$, quy tắc trọng số và thuật toán xếp hạng.
* **TUYỆT ĐỐI KHÔNG** dùng LLM để tự gán điểm ngẫu nhiên (Zero LLM Black-Box Scoring).
