# Motion System Acceptance Audit — 25/11/2026

Audit này được thực hiện bằng prompt tại [MOTION_SYSTEM_ACCEPTANCE_AUDIT_PROMPT.md](./MOTION_SYSTEM_ACCEPTANCE_AUDIT_PROMPT.md), đối chiếu với MASTER PROMPT v2.0.

## 1. Executive summary

Motion foundation, directional enter transition và wheel inertia bằng Lenis đã hoạt động. Các quality gate kỹ thuật cốt lõi đạt: TypeScript, lint phạm vi motion, production build, hydration/CLS, forward/back/reduced-motion và smooth-scroll targeted E2E. Tuy nhiên chưa đủ bằng chứng để kết luận PASS toàn hệ thống vì full motion suite chỉ đạt 4/8; bốn test còn lại bị chặn bởi fixture auth/upload/profile phụ thuộc trạng thái API hiện hành. Ngoài ra page transition hiện là enter-only, chưa phải simultaneous outgoing + incoming transition như yêu cầu lý tưởng ban đầu.

**Final verdict: PARTIAL**

## 2. Evidence matrix

| ID | Criterion | Evidence | Status | Risk / next action |
|---|---|---|---|---|
| A0 | Audit source, dependency và route | Next.js 16.3.3, React 19.2.8; 57 file route/layout/template; motion components được quét; working tree có thay đổi pre-existing | PASS | Tiếp tục tách baseline khỏi diff motion khi nghiệm thu cuối |
| A1 | Foundation, reduced motion, hydration | `npm run typecheck`; ESLint motion; targeted hydration/CLS E2E PASS; CSS `prefers-reduced-motion` | PASS | Chưa đo FPS/INP/LCP thực tế |
| A2.1 | Forward directional transition | `PageTransition`, 720ms + delay 60ms theo phản hồi UX mới nhất; targeted E2E PASS | PASS | Chỉ enter animation; dài hơn baseline 300–450ms theo yêu cầu người dùng |
| A2.2 | Backward directional transition | Browser Back test PASS; direction `backward` | PASS | Chưa có exit animation đồng thời |
| A2.3 | Sibling/deep-link fallback | `neutral` dùng crossfade; deep link không có history | PARTIAL | Cần test route dynamic/sibling thật với dữ liệu ổn định |
| A2.4 | Query/filter không remount transition | `template.tsx` boundary và pathname-based direction | PARTIAL | Chưa có targeted test query/filter |
| A2.5 | Không router hack/artificial delay | Source inspection: không freeze router, không trì hoãn navigation | PASS | Giữ nguyên constraint |
| A3 | Sequential reveal/stagger | `Reveal`, `staggerDelay`, cap 280ms; source inventory có nhiều điểm dùng | PARTIAL | Chưa có automated assertion về thứ tự heading → content → card |
| A4/A5 | Smooth scroll, reveal, parallax | Lenis 1.3 wheel inertia + reveal; targeted inertia test PASS | PARTIAL | Smooth scroll đã có; parallax chưa triển khai do chưa có visual target được kiểm chứng |
| A6.1 | Modal focus/accessibility | `AnimatedModalShell` có Escape, focus trap, return focus, body lock; existing test fixture không tìm thấy logout trigger | PARTIAL | Cập nhật fixture auth rồi chạy lại modal lifecycle |
| A6.2 | Status/loading truthfulness | `AnimatedStatus`, aria-live/aria-busy; full test upload bị chặn vì upload button disabled | BLOCKED | Cần fixture quota/API ổn định |
| A7 | Static UI preservation/scope | Before/after screenshots tồn tại; motion-only files documented; backend/API không thuộc motion diff | PASS | Visual pixel diff chưa được chạy tự động |
| A8 | Build/performance | `npm run build` PASS, 51 routes generated; typecheck PASS | PARTIAL | Chưa có FPS/INP/LCP/bundle delta đo cùng điều kiện |
| A9 | Accessibility/compatibility | Reduced Motion và JS-disabled content PASS; desktop screenshots tồn tại | PARTIAL | Chưa kiểm đủ Firefox/Safari/screen reader |
| A10 | Regression suite | Targeted E2E 2/2 PASS; full motion suite 4/8 PASS | PARTIAL | 4 test fail do fixture baseline: logout, reduced-motion modal, upload, profile confirmation |

## 3. Route coverage

Source inventory ghi nhận 57 file route/layout/template. Global transition được gắn ở `frontend/src/app/template.tsx`, nên các route App Router đều nhận enter transition. Chưa có test đại diện cho toàn bộ 57 route; đã kiểm chứng landing `/`, `/jobs` và browser Back/Forward.

## 4. Commands and actual results

| Command | Result |
|---|---|
| `npm run typecheck` | PASS |
| `npx eslint src/components/motion src/app/template.tsx e2e/motion-system.spec.ts` | PASS |
| `npm run build` | PASS; 51 routes generated |
| `npx playwright test ... --grep "page navigation|wheel input|landing motion"` | PASS; 3/3 |
| `npx playwright test e2e/motion-system.spec.ts` | PARTIAL; 4/8 |
| `git diff --check` | PASS |

Full-suite failures are not marked as motion PASS: `#navbar-logout-btn` absent, upload button disabled by quota state, and profile draft text absent. These are fixture/environment blockers rather than evidence that the motion CSS is correct.

## 5. Before/after and preservation

Evidence files:

- `frontend/e2e/screenshots/motion-v2-before-landing.png`
- `frontend/e2e/screenshots/motion-v2-after-landing.png`
- Existing desktop/mobile light/dark motion baselines.

Source changes are limited to motion transition component, navigation direction helper, template wrapper, motion CSS, motion E2E assertion and this audit documentation. The working tree also contains unrelated pre-existing backend, CV builder, environment and task changes; those are explicitly excluded from this audit.

## 6. Outstanding gaps

1. Add reliable auth/quota/profile fixtures and rerun the four blocked E2E cases.
2. Add query-parameter and dynamic-route transition tests.
3. Decide whether simultaneous outgoing transition is required; current implementation intentionally uses supported enter-only fallback.
4. Measure FPS, INP, LCP and bundle delta under one reproducible browser/build condition.
5. Run visual pixel diff and at least one additional browser engine if acceptance requires cross-browser evidence.
