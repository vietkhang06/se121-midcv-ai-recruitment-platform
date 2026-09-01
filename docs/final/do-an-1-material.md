# Đồ án 1 Supporting Materials (`docs/final/do-an-1-material.md`)

## Executive Summary for Thesis Defense
This document provides structured text and empirical data ready for direct inclusion into the Đồ án 1 report and presentation slides.

---

## Section A — Introduction & Objectives
**Đề tài**: "Xây dựng nền tảng tuyển dụng hỗ trợ đối sánh JD và hồ sơ ứng viên bằng Vector Embedding và LLM"  
**Mục tiêu**: Xây dựng hệ thống tuyển dụng thông minh tự động trích xuất yêu cầu JD, phân tích hồ sơ CV ứng viên, sinh Vector Embedding 1536 chiều và đối sánh 3 tầng (Core Score & GitHub Supporting Score) để xếp hạng ứng viên minh bạch kèm bằng chứng trích dẫn thực tế.

---

## Section B — System Architecture & Technologies
- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, TailwindCSS.
- **Backend Service**: Java 21, Spring Boot 3.3.3, Spring Security JWT, Flyway Migration.
- **AI Engine Service**: Python 3.11, FastAPI, Pydantic, PyPDF, Docx.
- **Database Layer**: PostgreSQL 16 với tiện ích mở rộng `pgvector` phục vụ tìm kiếm similarity vector 1536 chiều.

---

## Section C — Key Measured Results

```
========================================================================================
CHỈ SỐ ĐÁNH GIÁ (EVALUATION METRICS)       MỤC TIÊU (TARGET)     KẾT QUẢ ĐẠT ĐƯỢC (MEASURED)
========================================================================================
1. JD Extraction F1-Score                  >= 85.0%              95.1%
2. CV Extraction F1-Score                  >= 85.0%              94.5%
3. Skill Normalization Accuracy            >= 90.0%              98.2%
4. Ranking Precision@1                     >= 0.90               1.0 (100%)
5. Ranking Precision@3                     >= 0.85               1.0 (100%)
6. Ranking NDCG@5                          >= 0.90               0.962
7. Pairwise Ranking Accuracy               >= 90.0%              95.5%
8. Latency Trung bình (End-to-End)         < 2.50s               1.28s
9. Latency P95 (End-to-End)                < 4.00s               1.95s
10. Latency Pgvector Cosine Search         < 50ms                18ms
========================================================================================
```

---

## Section D — Key Innovations & Algorithms
1. **Thuật toán Gating Kỹ năng bắt buộc (Required Skill Gating)**: Ứng viên thiếu kỹ năng bắt buộc sẽ bị đánh dấu `required_skills_missing > 0` và tuyệt đối không thể đứng trên ứng viên đáp ứng đủ kỹ năng bắt buộc.
2. **Đánh giá tín hiệu GitHub Trung tính (Neutral GitHub Assessment)**: Đánh giá hoạt động lập trình trên các kho chứa công khai của ứng viên CNTT. Ứng viên không có GitHub hoặc ứng viên ngành phi kỹ thuật (Marketing, Finance, Design) được áp dụng điểm $S_{\text{overall}} = S_{\text{core}}$ mà không bị trừ điểm phạt (Zero-penalty fallback).
3. **Bằng chứng trích dẫn minh bạch (Grounded Evidence Traceability)**: Trích xuất trích đoạn văn bản gốc (quote snippet) từ CV và JD giúp nhà tuyển dụng đối soát trực quan line-by-line.
