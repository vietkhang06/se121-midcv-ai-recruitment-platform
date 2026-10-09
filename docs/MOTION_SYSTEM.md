# MidCV Motion System

Ngày kiểm kê: 04/10/2026

Tài liệu này ghi lại lớp chuyển động giao diện. Motion chỉ trình bày trạng thái đã tồn tại trong UI; nó không tạo dữ liệu, thay đổi API, chấm điểm, provenance, confirmation gate hay quyết định tuyển dụng.

## Inventory trước triển khai

| Khu vực / selector | Trigger hiện tại | Timing / easing | Trạng thái nghiệp vụ | Vấn đề trước triển khai |
| --- | --- | --- | --- | --- |
| `animate-fade-in` (18 vị trí / 12 file) | Mount / conditional render | Chưa định nghĩa | Modal, menu, dropdown, empty/error state | Class không tạo hiệu ứng trong CSS build. |
| `animate-scale-in` (1 vị trí) | Verify-email state mount | Chưa định nghĩa | Trạng thái xác minh email | Class không tạo hiệu ứng. |
| `animate-in fade-in` (2 vị trí) | Modal mount | Chưa định nghĩa | CV version history, extraction review | Utility không tồn tại trong source. |
| `transition-all` (31 vị trí / 19 file) | Hover, focus, state change | 100–1000 ms, easing không đồng nhất | Card, nút, progress, score ring | Có thể animate thuộc tính layout ngoài ý muốn. |
| `animate-spin` (23 vị trí) | Loading thật | Tailwind mặc định, infinite | Upload, extraction, submit, verify | Đang hoạt động; cần giữ text/status và dừng ở `FAILED`. |
| `animate-pulse` (7 vị trí) | Processing / active status | Tailwind mặc định, infinite | Processing, availability, DRAFT | Đang hoạt động nhưng cần reduced-motion và không được là tín hiệu duy nhất. |
| `CVUploadModal` | `isOpen` conditional mount | Overlay class chưa định nghĩa; progress 300 ms | IDLE → UPLOADING/PROCESSING → COMPLETED/FAILED | Unmount tức thì, chưa focus trap/return focus; delay đóng 600 ms không gắn với lifecycle exit. |
| `CVExtractionReviewModal` | `isOpen` conditional mount; tab conditional render | Utility chưa định nghĩa | Processing/ready/failed, review tabs | Unmount tức thì; tab đổi đột ngột; thiếu modal focus contract thống nhất. |
| `SkillAutocomplete` | Query mở dropdown; click/Enter thêm chip | Fade class chưa định nghĩa | Taxonomy suggestion → user action → selected skill | Dropdown bật tức thì; chip mới không có motion; keyboard logic đang đúng và phải giữ nguyên. |
| Candidate profile confirmation | Response `CONFIRMED` | Text bật tức thì; pulse ở DRAFT | Confirmation gate thật | Success phải chỉ xuất hiện sau API thành công; không được suy diễn provenance. |
| Job/CV cards và landing sections | Mount / hover | `transition-all`, không scroll reveal | Discovery / library | Thiếu reveal once, hover chưa giới hạn pointer-fine. |
| Match score ring / breakdown | Data render | `transition-all 1000ms` | Điểm tất định từ API | SVG thường mount ở giá trị cuối nên transition không đảm bảo chạy; accessible text phải luôn là điểm thật. |
| Recruiter ranking / evidence modals | Data render / open | Chủ yếu mount tức thì | Ranking và quyết định con người | Thiếu stagger có giới hạn và focus management thống nhất; không được thay sort/decision flow. |

## Bất biến SSOT

- Chỉ CV `CONFIRMED` mới được matching; success confirmation chỉ chạy sau `POST /api/v1/candidate/cvs/{cvId}/confirm` thành công.
- `CV_EXTRACTED`, `USER_ADDED`, `USER_CONFIRMED` và `GITHUB_VERIFIED` chỉ phản ánh state/data thật.
- Score, breakdown, reason code và ranking không bị motion sửa đổi; GitHub `NONE/LOW` không phải lỗi hay điều kiện loại.
- Kỹ năng khuyến nghị không tự chèn vào profile.
- Shortlist/interview/hire/reject chỉ xảy ra sau thao tác recruiter và response thành công.

## Inventory sau triển khai

| Khu vực | Sau triển khai | Ràng buộc được giữ |
| --- | --- | --- |
| Motion foundation | Token `100/160/220/360/480 ms`, easing standard/emphasized; utility fade, scale, slide-up, chip-in được định nghĩa trong `globals.css`. | Không thêm motion library; không đổi token màu/typography. |
| Progressive reveal | `Reveal` dùng `IntersectionObserver`, mặc định once, offset 14 px (mobile 8 px), delay tối đa 280 ms; nội dung SSR/JS-disabled luôn hiện. | Không gây content invisibility khi JavaScript lỗi/tắt. |
| Stagger | `staggerDelay()` dùng bước 60 ms, giới hạn 50–70 ms và cap 280 ms. | Không thay sort/ranking; chỉ áp lên thứ tự render hiện có. |
| Modal | `AnimatedModalShell` dùng overlay fade + panel scale `.98`, hỗ trợ enter/exit, Escape, click overlay, focus trap, trả focus và khóa body scroll. | Handler đóng/xác nhận cũ được giữ; modal không tự tạo success. |
| Status / upload | `AnimatedStatus`, `aria-live`, `aria-busy`, progressbar thật; spinner dừng ở `FAILED`, lỗi thật và correlation id vẫn hiển thị. | Không giả progress; polling và response API không đổi. |
| Candidate confirm | Success motion chỉ mount sau response có `status === 'CONFIRMED'`. | Giữ đúng `POST /candidate/cvs/{cvId}/confirm`; DRAFT không tự chuyển trạng thái. |
| Skills | Dropdown fade/slide, chip enter, combobox/listbox semantics; click/Enter/keyboard logic không đổi. | Suggestion không tự thêm và không tự gán provenance. |
| Cards / landing | Reveal once theo viewport; hover lift chỉ cho thiết bị `hover:hover` + `pointer:fine`; các `transition-all` trong phạm vi đã sửa được thay bằng thuộc tính cụ thể. | Không đổi link, CRUD handler hay dữ liệu card. |
| Ranking / score | Row/breakdown stagger có cap; progress dùng transform; score ring draw từ presentation layer, text/ARIA giữ điểm cuối ngay khi render. | Không đổi công thức, threshold, sort, reason code hoặc GitHub neutral behavior. |
| Reduced motion | Toàn bộ animation/transition được rút về gần 0; spin/pulse bị tắt; reveal/modal/status bỏ transform và giữ opacity 1. | Nội dung, trạng thái và control vẫn hiện/hoạt động. |

Số liệu source sau triển khai: `animate-in fade-in` không hợp lệ giảm từ 2 xuống 0; `transition-all` toàn source giảm từ 31 xuống 22; có 13 điểm tích hợp `motion-reveal` và 3 điểm dùng `motion-score-ring`. Các utility `animate-fade-in`/`animate-scale-in` cũ nay có keyframe thật thay vì class rỗng.

## Kiểm thử thực tế

| Lệnh / phạm vi | Kết quả |
| --- | --- |
| `npx tsc --noEmit` | Đạt. |
| ESLint riêng `src/components/motion` và hai spec motion/modal | Đạt. |
| `npm run lint` | Không đạt do baseline hiện hữu: 369 vấn đề (142 error, 227 warning), chủ yếu `no-explicit-any`, `set-state-in-effect`, unused và unescaped entities ngoài motion foundation. |
| `npm run build` và `npx next build --webpack` | Bị chặn trước compilation: SWC không canonicalize được `baseUrl` do `Access denied` trong môi trường Windows hiện tại; tái hiện cả ở bản sao workspace. |
| `motion-system.spec.ts` / Chromium | 7/7 đạt: modal lifecycle/focus, reduced motion, JS-disabled visibility, FAILED upload, confirmation gate, hydration/CLS, 4 baseline viewport/theme. |
| `logout-modal-positioning.spec.ts` / Chromium | 4/4 đạt ở desktop, scrolled desktop, tablet và mobile. |
| HR ranking fixture cũ (test 5–10) | Không chạy được độc lập với backend như tên test mô tả; hiện gọi localhost thật và nhận 500/403. Không sửa product hoặc dùng dữ liệu giả để che lỗi fixture. |

Ảnh baseline được lưu trong `frontend/e2e/screenshots/`: desktop/mobile × light/dark. Test CLS ghi nhận trong ngân sách `≤ 0.1`, không phát hiện lỗi hydration/uncaught trên landing flow đã kiểm.

## Phạm vi thay đổi nghiệp vụ

Không có file backend, API client, matching/scoring hoặc schema/data lineage nào được sửa trong phần triển khai motion. Các thay đổi ở trang nghiệp vụ chỉ thêm class/style trình bày, ARIA, component wrapper motion và test; dữ liệu hiển thị vẫn lấy từ cùng state/response hiện có.
