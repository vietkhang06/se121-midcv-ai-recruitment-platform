# ADR-007: CẤU TRÚC KHO MÃ NGUỒN (REPOS STRATEGY: MONOREPO)

## Status
**ACCEPTED**

## Context
Dự án bao gồm ứng dụng Frontend (Next.js), Backend Core (Spring Boot), AI Service (Python FastAPI), bộ tài liệu đặc tả (Docs) và cấu hình Docker. Cần lựa chọn giữa Monorepo hay Multi-repo.

## Decision
Sử dụng cấu trúc **Monorepo** (`ai-recruitment-platform/`) chứa tất cả các thành phần trong 1 kho mã nguồn duy nhất.

## Consequences & Trade-offs
* **Ưu điểm:**
  * Đồng bộ quản lý phiên bản mã nguồn, tài liệu specs và cấu hình Docker Compose.
  * Đơn giản hóa quy trình CI/CD và kiểm thử E2E local.
  * Phù hợp hoàn hảo cho đội ngũ phát triển tinh gọn trong giai đoạn MVP.
* **Đánh đổi (Trade-offs):**
  * Kích thước repo tăng dần theo thời gian. Đã khắc phục bằng cách thiết lập `.gitignore` chuẩn hóa cho từng công nghệ.
