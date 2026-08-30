# ADR-002: LỰA CHỌN JAVA SPRING BOOT 3 CHO CORE BACKEND SERVICE

## Status
**ACCEPTED**

## Context
Hệ thống cần một Backend làm nền tảng xử lý logic nghiệp vụ tuyển dụng (Doanh nghiệp, Đơn ứng tuyển, Phân quyền RBAC, JWT, Chấm điểm toán học Hybrid Scoring). Cần đảm bảo độ tin cậy doanh nghiệp, dễ mở rộng và bảo mật cao.

## Decision
Lựa chọn **Java 21 & Spring Boot 3** để xây dựng Core Business Backend API.

## Consequences & Trade-offs
* **Ưu điểm:**
  * Hệ sinh thái Spring Security mạnh mẽ trong việc phân quyền RBAC và xử lý JWT.
  * Tích hợp Spring Data JPA tuyệt vời giúp quản lý các giao dịch (Transactions) ACID an toàn.
  * Tính tương thích cao với kiến trúc Layered / Modular Monolith, code dễ bảo trì.
* **Đánh đổi (Trade-offs):**
  * Tốn bộ nhớ RAM ban đầu nhỉnh hơn so với các runtime nhẹ như Node.js. Tuy nhiên Java 21 Virtual Threads giải quyết rất tốt vấn đề I/O concurrency.
