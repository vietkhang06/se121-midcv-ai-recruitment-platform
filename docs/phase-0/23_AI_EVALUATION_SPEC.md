# 23. KHUNG ĐÁNH GIÁ VÀ BỘ TEST BENCHMARK AI (AI EVALUATION SPECIFICATION)

Tài liệu này đặc tả bộ chỉ số đo lường hiệu năng của AI Engine (KPIs), phương pháp đánh giá định lượng và cấu trúc Bộ dữ liệu kiểm thử chuẩn (Benchmark Dataset).

---

## 1. BỘ CHỈ SỐ ĐÁNH GIÁ CHẤT LƯỢNG AI MATCHING (EVALUATION METRICS)

### 1.1 Độ chính xác Trích xuất Thực thể (Skill Extraction Precision & Recall)
So sánh danh sách kỹ năng do AI trích xuất ($S_{\text{AI}}$) với tập nhãn gán thủ công chuẩn ($S_{\text{GroundTruth}}$):

$$\text{Precision} = \frac{|S_{\text{AI}} \cap S_{\text{GroundTruth}}|}{|S_{\text{AI}}|}, \quad \text{Recall} = \frac{|S_{\text{AI}} \cap S_{\text{GroundTruth}}|}{|S_{\text{GroundTruth}}|}$$
$$\text{F1-Score} = 2 \times \frac{\text{Precision} \times \text{Recall}}{\text{Precision} + \text{Recall}}$$
* **Mục tiêu KPI:** $\text{F1-Score} \ge 90\%$.

### 1.2 Độ chính xác Xếp hạng Danh sách (Ranking Relevance - NDCG@10)
Sử dụng chỉ số **Normalized Discounted Cumulative Gain (NDCG@10)** để đo độ tương đồng giữa thứ tự xếp hạng do AI đưa ra và thứ tự do Chuyên gia HR xếp hạng:

$$\text{NDCG@10} = \frac{\text{DCG@10}}{\text{IDCG@10}}$$
* **Mục tiêu KPI:** $\text{NDCG@10} \ge 0.85$.

### 1.3 Tỷ lệ Minh chứng Trung thực (Explanation Factuality Rate)
Thống kê tỷ lệ các câu trích dẫn trong phần giải thích AI xuất hiện chính xác trong file CV gốc:

$$\text{Factuality Rate} = \frac{\text{Số trích dẫn tìm thấy chính xác trong CV}}{\text{Tổng số trích dẫn do AI đưa ra}} \times 100\%$$
* **Mục tiêu KPI:** **$100\%$ (Zero Hallucination)**.

---

## 2. CẤU TRÚC BỘ DỮ LIỆU BENCHMARK SAMPLE (BENCHMARK DATASET SCHEMA)

Bộ dữ liệu Benchmark gồm 20 cặp JD–CV mẫu được gán nhãn thủ công (Ground Truth) lưu trữ tại `tests/benchmark_dataset.json`:

```json
[
  {
    "benchmarkId": "BM-001",
    "jdId": "jd-java-senior-01",
    "cvId": "cv-backend-tran-van-b.pdf",
    "expectedGroundTruth": {
      "skills": ["Java", "Spring Boot", "PostgreSQL", "Docker", "REST API"],
      "missingSkills": ["AWS"],
      "experienceYears": 3,
      "humanExpertScore": 92.0,
      "expectedRank": 1
    }
  }
]
```
