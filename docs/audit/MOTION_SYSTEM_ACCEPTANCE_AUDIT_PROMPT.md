# Prompt kiểm thử nghiệm thu — MidCV Animation System v2.0

Bạn là QA Lead, UX Motion Reviewer và Next.js Performance Engineer. Hãy đánh giá repository MidCV hiện tại so với **MASTER PROMPT — MIDCV ANIMATION SYSTEM v2.0**. Chỉ đánh giá animation/UX motion; không mở rộng sang redesign, nghiệp vụ, API, backend, database, AI hoặc thay đổi nhận diện.

## Nguyên tắc bằng chứng

1. Đọc source hiện hành, `docs/MOTION_SYSTEM.md`, package scripts và test trước khi kết luận.
2. Mỗi tiêu chí phải có bằng chứng: file/line, lệnh đã chạy, test output, screenshot hoặc trace.
3. Không suy diễn PASS từ việc code “có vẻ đúng”. Nếu chưa chạy hoặc không thể kiểm chứng, ghi `UNVERIFIED`.
4. Phân biệt lỗi baseline có sẵn với regression do motion.
5. Bảo vệ thay đổi chưa commit; không reset, không chỉnh backend/API/nghiệp vụ.

## Checklist bắt buộc

### A0 — Audit và baseline

- [ ] Branch, commit SHA, working tree được ghi nhận.
- [ ] Next.js/React version, dependencies motion và scripts được xác minh.
- [ ] Root layout, nested layout, `template.tsx`, global CSS, motion components, loading boundaries và route list được quét.
- [ ] Có inventory trước/sau và vấn đề thực tế từ source.

### A1 — Motion foundation

- [ ] Token duration/easing tập trung, không có bộ token cạnh tranh.
- [ ] `prefers-reduced-motion` làm nội dung hiển thị đầy đủ, tắt parallax/smooth movement/stagger mạnh.
- [ ] Không hydration mismatch, không biến Server Component thành Client Component không cần thiết.
- [ ] Animation chủ yếu dùng `transform`/`opacity`; không có RAF/listener leak.

### A2 — Directional page transition

- [ ] Forward vào từ phải trong khoảng 300–450ms.
- [ ] Backward vào từ trái trong khoảng 300–450ms.
- [ ] Sibling/deep link có fallback crossfade hợp lý.
- [ ] Browser Back/Forward, dynamic route, redirect và điều hướng liên tục không làm trắng màn hình.
- [ ] Query/filter/pagination không remount transition nếu chỉ đổi dữ liệu trong cùng màn hình.
- [ ] Không freeze router, không artificial navigation delay, không dùng router internals không được hỗ trợ.
- [ ] Header/sidebar/layout persistent không bị reset ngoài ý muốn.

### A3 — Sequential content entrance

- [ ] Thứ tự tiêu đề → mô tả → công cụ → nội dung → card.
- [ ] Stagger có cap, không chạy lại vì re-render.
- [ ] Không lồng root reveal và section reveal gây double motion.

### A4/A5 — Scroll, parallax, reveal

- [ ] Smooth scroll phản hồi nhanh, nested scroll không hỏng.
- [ ] Scroll reveal once, không nhấp nháy khi scroll ngược.
- [ ] Parallax chỉ áp lên visual có sẵn, không áp lên form/bảng/editor/navigation.
- [ ] Không horizontal overflow, clipping, CLS hoặc scroll jank đáng kể.

### A6 — Component refinement

- [ ] Modal/drawer: enter/exit, Escape, overlay click, focus trap, return focus, body scroll lock.
- [ ] Tabs/cards/lists/buttons giữ nguyên state, stable keys, keyboard và accessibility.
- [ ] Loading/error/status không giả dữ liệu, spinner dừng đúng trạng thái lỗi.

### A7 — Coverage và bảo toàn UI

- [ ] Route coverage được liệt kê từ source thật.
- [ ] Static UI sau animation giống trước: layout, màu, typography, spacing, border, shadow, icon, content.
- [ ] Không thay đổi backend/API/database/auth/AI scoring.

### A8/A9/A10 — Performance, accessibility, regression

- [ ] TypeScript, lint phạm vi motion, production build và targeted Playwright đều được chạy.
- [ ] Reduced Motion, keyboard, screen reader semantics, mobile/desktop được kiểm tra.
- [ ] CLS/INP/LCP/FPS/bundle chỉ báo cáo khi đã đo; không bịa số liệu.
- [ ] Visual regression và functional regression có kết quả PASS/FAIL/BLOCKED riêng.

## Quy tắc chấm điểm

- `PASS`: có bằng chứng trực tiếp và đạt acceptance criterion.
- `PARTIAL`: đã triển khai nhưng thiếu bằng chứng hoặc chỉ đạt fallback.
- `FAIL`: có regression hoặc không đáp ứng criterion.
- `BLOCKED`: không thể kiểm chứng vì môi trường/fixture/backend; phải nêu blocker cụ thể.

Kết luận hệ thống:

- `PASS` chỉ khi tất cả P0 và quality gates đạt, không có regression chưa xử lý.
- `PARTIAL` nếu còn tiêu chí P0 chưa đạt/chưa kiểm chứng nhưng không có blocker kỹ thuật tuyệt đối.
- `BLOCKED` nếu không thể tiếp tục kiểm thử do blocker môi trường sau khi đã thử phương án thay thế có cơ sở.

## Định dạng báo cáo đầu ra

1. Executive summary.
2. Bảng tiêu chí: `ID | Criterion | Evidence | Status | Risk/Next action`.
3. Route coverage.
4. Test commands và output thực tế.
5. Before/after và static UI preservation.
6. Performance/accessibility findings; chỉ ghi metric đã đo.
7. Scope audit: file motion đã đổi và file ngoài phạm vi không bị đổi bởi lượt này.
8. Final verdict: chỉ `PASS`, `PARTIAL` hoặc `BLOCKED`.
