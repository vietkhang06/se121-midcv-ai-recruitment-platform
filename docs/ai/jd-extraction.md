# JD EXTRACTION & NORMALIZATION SPECIFICATION

Tài liệu này đặc tả Quy trình Xử lý và Trích xuất Yêu cầu Tuyển dụng (Job Description) từ văn bản phi định hình sang dữ liệu cấu trúc chuẩn hóa.

---

## 1. PHÂN TÁCH KỸ NĂNG BẮT BUỘC (REQUIRED) VS ƯU TIÊN (PREFERRED)

Hệ thống phân tách nghiêm ngặt 2 loại yêu cầu kỹ năng:
* **REQUIRED (Bắt buộc):** Các kỹ năng/năm kinh nghiệm tối thiểu mà ứng viên bắt buộc phải đáp ứng.
* **PREFERRED (Ưu tiên / Nice to have):** Các kỹ năng cộng điểm bổ sung.

```json
{
  "required_skills": [
    {
      "skill_name": "Java",
      "normalized_name": "Java",
      "requirement_type": "REQUIRED",
      "min_years_exp": 3,
      "section": "Requirements",
      "snippet": "experience with Java for at least 3 years"
    }
  ],
  "preferred_skills": [
    {
      "skill_name": "Docker",
      "normalized_name": "Docker",
      "requirement_type": "PREFERRED",
      "min_years_exp": 1,
      "section": "Nice to have",
      "snippet": "Familiarity with Docker containerization"
    }
  ]
}
```

---

## 2. CHUẨN HÓA ĐỒNG NGHĨA KỸ THUẬT (ALIAS NORMALIZATION)

Tất cả các tên gọi kỹ thuật được đưa về tên đại diện chuẩn hóa (Canonical Name):
* `Spring Framework` / `Spring Boot` $\rightarrow$ **`Spring Boot`**
* `Postgres` / `PostgreSQL` $\rightarrow$ **`PostgreSQL`**
* `GA4` / `Google Analytics` $\rightarrow$ **`Google Analytics 4`**
* `TS` / `TypeScript` $\rightarrow$ **`TypeScript`**
