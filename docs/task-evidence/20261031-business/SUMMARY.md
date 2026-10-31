# Kết quả thực thi — 31/10/2026

- Backend: 205 ca được chọn, **180 pass, 25 skipped, 0 failure/error**.
- Trong 25 skipped: 15 HTTP/PostgreSQL + 9 Inbox/PostgreSQL/SMTP + 1 migration.
- Backend package: exit 0 trên JDK 21.
- Frontend: 33 contract test pass; TypeScript và production build exit 0.
- Worker runtime contract: 4 test pass, không gọi model thật.
- H2 repository/outbox/config tests dùng database/giao dịch thật; mail sender và provider loopback là fixture.
- Chưa thực thi nghiệm thu PostgreSQL, OAuth/SMTP/LLM thật hoặc restart tiến trình.

Chi tiết: `verification.json` và các log cùng thư mục.
