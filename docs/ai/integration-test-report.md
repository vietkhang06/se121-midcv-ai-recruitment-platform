# SPRING BOOT ↔ PYTHON AI WORKER INTEGRATION TEST REPORT

Tài liệu này báo cáo chi tiết kết quả Kiểm thử Tích hợp End-to-End giữa Spring Boot Backend và Python AI Worker Microservice.

---

## 1. MÔ HÌNH KIỂM THỬ TÍCH HỢP (INTEGRATION TEST ARCHITECTURE)

```mermaid
sequenceDiagram
    participant SpringTest as AiWorkerIntegrationTest
    participant Client as AiWorkerClient (Spring RestClient)
    participant Worker as Python AI Worker (FastAPI Port 8000)
    participant Lifecycle as ProcessingLifecycleService
    participant DB as Postgres JPA Repositories

    SpringTest->>Client: trigger processJobDescription(jobId)
    Client->>Worker: POST /internal/ai/extract-jd (JSON Payload + Correlation-ID)
    Worker-->>Client: 200 OK (Extracted Structured JSON)
    Client-->>Lifecycle: Return Result Map
    Lifecycle->>DB: Delete draft requirements (Idempotency)
    Lifecycle->>DB: Save JobRequirements (REQUIRED & PREFERRED)
    DB-->>SpringTest: Assert Repository Save Operations Succeeded
```

---

## 2. KẾT QUẢ KIỂM THỬ TỰ ĐỘNG END-TO-END

* **Tệp test:** [`AiWorkerIntegrationTest.java`](file:///c:/Users/Khang/OneDrive/Desktop/SE121/ai-recruitment-platform/backend/src/test/java/com/platform/recruitment/AiWorkerIntegrationTest.java) & [`ProcessingIdempotencyTest.java`](file:///c:/Users/Khang/OneDrive/Desktop/SE121/ai-recruitment-platform/backend/src/test/java/com/platform/recruitment/ProcessingIdempotencyTest.java).
* **Kết quả:** **PASS 100%**. Toàn bộ 17/17 Spring Boot Unit & Integration Tests vượt qua thành công (`mvn test` BUILD SUCCESS).
* **Kiểm định:** Truyền thành công Correlation ID, chuyển đổi Pydantic JSON Schema, cập nhật trạng thái vòng đời xử lý và bảo đảm tính Idempotency không sinh ra dữ liệu rác khi gọi lại.
