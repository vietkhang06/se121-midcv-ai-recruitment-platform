# ADR-001: LỰA CHỌN NEXT.JS / REACT CHO FRONTEND APPLICATION

## Status
**ACCEPTED**

## Context
Hệ thống tuyển dụng trực tuyến yêu cầu hai loại hình giao diện khác nhau:
1. **Public Job Search Pages:** Cần tốc độ tải trang nhanh, hỗ trợ SEO để nhà tuyển dụng và ứng viên dễ dàng chia sẻ tin tuyển dụng.
2. **HR Dashboard & Candidate App:** Giao diện mật độ thông tin cao, phản hồi tương tác mượt mà, hiển thị vòng tròn điểm số, bảng xếp hạng và modal minh chứng AI.

## Decision
Sử dụng **Next.js (App Router, TypeScript, React 19)** làm nền tảng phát triển Frontend.

## Consequences & Trade-offs
* **Ưu điểm:**
  * Hỗ trợ Hybrid Rendering: Server-Side Rendering (SSR) cho trang tin tuyển dụng công khai, Client-Side Rendering (CSR) cho Dashboard quản trị.
  * Router mạnh mẽ dựa trên cấu trúc file system (`app/`).
  * TypeScript mang lại sự an toàn kiểu dữ liệu cao, giảm thiểu lỗi runtime.
* **Đánh đổi (Trade-offs):**
  * Cần quản lý ranh giới rõ ràng giữa Server Components và Client Components (`"use client"` directive).
