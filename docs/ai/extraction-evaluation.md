# EXTRACTION EVALUATION BENCHMARK SPECIFICATION

Tài liệu này đặc tả Bộ Dataset Gán nhãn Đánh giá Mẫu và Đo lường Độ chính xác của AI Extraction Engine.

---

## BỘ DATASET ĐÁNH GIÁ MẪU (BENCHMARK EVALUATION DATASET)

* Tập dữ liệu được lưu trữ tại [`ai-worker/app/evaluation/dataset.json`](file:///c:/Users/Khang/OneDrive/Desktop/SE121/ai-recruitment-platform/ai-worker/app/evaluation/dataset.json).
* Script đo lường được chạy tự động thông qua [`ai-worker/app/evaluation/eval_runner.py`](file:///c:/Users/Khang/OneDrive/Desktop/SE121/ai-recruitment-platform/ai-worker/app/evaluation/eval_runner.py).
* Tiêu chí đo lường:
  1. Độ chính xác nhận diện phân đoạn tiêu đề.
  2. Độ chính xác phân tách kỹ năng bắt buộc `REQUIRED` vs ưu tiên `PREFERRED`.
  3. Tính chuẩn xác của trích dẫn minh chứng `Evidence` đối chiếu 100% với văn bản gốc.
