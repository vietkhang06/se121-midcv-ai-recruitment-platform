# ADR-008: CHIẾN LƯỢC XÁC THỰC VÀ PHÂN QUYỀN JWT + RBAC

## Status
**ACCEPTED**

## Context
Ứng dụng yêu cầu xác thực không lưu trạng thái (Stateless Authentication) cho REST API và phân quyền 2 vai trò chính: `CANDIDATE` và `HR`.

## Decision
Sử dụng **Stateless JWT Tokens** (Access Token 60m + Refresh Token 7d) kết hợp với **Spring Security Role-Based Access Control (RBAC)**.

## Consequences & Trade-offs
* **Ưu điểm:**
  * Access Token mang thông tin `userId` và `role` giúp Backend xác thực tức thì mà không cần truy vấn DB cho mỗi API call.
  * Tách biệt ranh giới bảo mật nghiêm ngặt giữa Candidate và HR.
* **Đánh đổi (Trade-offs):**
  * Cần quản lý việc thu hồi Refresh Token trong DB khi người dùng bấm Đăng xuất.
