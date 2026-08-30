# 20. ĐẶC TẢ GIẢI THÍCH KẾT QUẢ AI VÀ TRÍCH DẪN MINH CHỨC (EXPLANATION & EVIDENCE SPEC)

Tài liệu này đặc tả cơ chế XAI (Explainable AI), quy tắc bắt buộc không ảo giác (Zero Hallucination Grounding), cấu trúc JSON của báo cáo giải thích và cách hiển thị minh chứng trích đoạn từ CV.

---

## 1. NGUYÊN TẮC RÀNG BUỘC MINH CHỨC (GROUNDING CONSTRAINTS)

Để ngăn chặn tuyệt đối hiện tượng LLM tự bịa ra thông tin không có trong hồ sơ (Hallucination):

1. **Exact String Verification:** Mọi câu trích dẫn minh chứng (`cv_quote_snippet`) được LLM đề xuất phải đi qua hàm kiểm tra chuỗi (`string.contains()`) trên văn bản thô `cvs.raw_text`. Nếu đoạn trích dẫn không tìm thấy trong văn bản CV gốc, hệ thống lập tức loại bỏ đoạn minh chứng đó.
2. **Page Number Attribution:** Mỗi trích dẫn minh chứng phải đính kèm số trang (Page Number) nơi đoạn văn bản xuất hiện trong file CV PDF để HR đối soát nhanh.
3. **Clear Status Classification:** Phân loại rõ ràng 3 trạng thái đáp ứng tiêu chí:
   * `MATCHED` (Đạt - Màu xanh): Kỹ năng/kinh nghiệm có trong CV và khớp với JD.
   * `PARTIAL` (Đạt một phần - Màu vàng): Có kỹ năng liên quan hoặc số năm kinh nghiệm chưa đủ.
   * `MISSING` (Thiếu - Màu đỏ): Yêu cầu có trong JD nhưng hoàn toàn không xuất hiện trong CV.

---

## 2. STRUCTURAL JSON SCHEMA DÀNH CHO EXPLANATION REPORT

```json
{
  "applicationId": "f491f1ee-6c54-4b01-90e6-d701748f0900",
  "overallMatchScore": 91.70,
  "matchCategory": "HIGH_MATCH",
  "skillAnalysis": {
    "matchedRequiredSkills": [
      { "skill": "Java", "evidenceSnippet": "Developed backend core API using Java 17", "page": 1 },
      { "skill": "Spring Boot", "evidenceSnippet": "Built microservices architecture using Spring Boot framework", "page": 1 },
      { "skill": "PostgreSQL", "evidenceSnippet": "Designed relational schema and optimized queries on PostgreSQL", "page": 2 }
    ],
    "matchedPreferredSkills": [
      { "skill": "Docker", "evidenceSnippet": "Containerized applications using Docker and Docker Compose", "page": 2 }
    ],
    "missingRequiredSkills": ["AWS"],
    "missingPreferredSkills": []
  },
  "experienceAnalysis": {
    "requiredYears": 2,
    "candidateYears": 3,
    "isMet": true,
    "evidenceSnippet": "Software Engineer at Tech Corp (Jan 2023 - Present, 3 years)",
    "page": 1
  },
  "executiveSummary": "Ứng viên có năng lực chuyên môn đáp ứng xuất sắc các yêu cầu kỹ thuật chính của JD (Java, Spring Boot, PostgreSQL) và có số năm kinh nghiệm thực tế vượt yêu cầu tối thiểu. Thiếu hụt duy nhất là kỹ năng Cloud AWS."
}
```

---

## 3. THIẾT KẾ CÁC KHỐI TRÌNH BÀY MINH CHỨC (UI EVIDENCE DISPLAY PATTERN)

```text
+-----------------------------------------------------------------------------------+
|  [✓ MATCHED] Java & Spring Boot                                                  |
|  Evidence (Page 1): "Built microservices architecture using Spring Boot framework"|
+-----------------------------------------------------------------------------------+
|  [✗ MISSING] AWS Cloud Platform                                                  |
|  Reason: Skill not found in parsed CV text.                                       |
+-----------------------------------------------------------------------------------+
```
