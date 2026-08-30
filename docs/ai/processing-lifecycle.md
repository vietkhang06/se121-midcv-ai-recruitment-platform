# PROCESSING LIFECYCLE & IDEMPOTENCY SPECIFICATION

Tài liệu này đặc tả Vòng đời Xử lý Tài liệu (Processing Lifecycle), quản lý trạng thái và nguyên tắc Idempotency.

---

## 1. MÔ HÌNH TRẠNG THÁI VÒNG ĐỜI (PROCESSING LIFECYCLE STATES)

```mermaid
stateDiagram-v2
    [*] --> QUEUED: Trigger Extraction Event
    QUEUED --> PROCESSING: Spring Boot Dispatch Request
    PROCESSING --> COMPLETED: AI Worker Processing Success
    PROCESSING --> FAILED: Permanently Invalid Data
    PROCESSING --> RETRYING: Transient Network Error / Rate Limit
    RETRYING --> PROCESSING: Exponential Backoff Retry
    COMPLETED --> [*]
    FAILED --> [*]
```

---

## 2. NGUYÊN TẮC IDEMPOTENCY (IDEMPOTENCY STRATEGY)

* Khi xử lý lại một `CVVersion` hoặc `Job` đã tồn tại, hệ thống thực hiện làm sạch dữ liệu trích xuất cũ thuộc phiên bản tương ứng trước khi lưu dữ liệu trích xuất mới.
* Tuyệt đối không sinh ra dữ liệu trùng lặp khi gọi lại API trích xuất.
