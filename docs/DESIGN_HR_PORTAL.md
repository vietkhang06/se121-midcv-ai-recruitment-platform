# MidCV — HR/Recruiter Portal Design & Implementation Contract

> Tài liệu chuẩn để Antigravity audit, thiết kế lại và triển khai giao diện HR/Recruiter của MidCV dựa trên các khung UX tốt trong frontend tham khảo. Đây không phải yêu cầu sao chép nguyên mã nguồn.

## 0. Cách sử dụng tài liệu

- Đặt file này tại `docs/DESIGN_HR_PORTAL.md` trong repository MidCV.
- Agent phải đọc toàn bộ file trước khi chỉnh sửa.
- Tên role chính thức của dự án là `RECRUITER`; URL chính thức dùng `/recruiter/...`, không đổi thành `EMPLOYER` hoặc `/employer`.
- Frontend đích là Next.js App Router hiện có. Không đưa React Router, Vite, React Bootstrap hoặc `mockStore` từ dự án tham khảo vào MidCV nếu chúng chưa thuộc stack hiện tại.
- Tài liệu này quy định UX, trạng thái, dữ liệu và tiêu chí nghiệm thu. Source hiện tại, migration, DTO và API thật mới là nguồn xác nhận tên file, kiểu dữ liệu và endpoint.

---

## 1. Mục tiêu

Nâng cấp khu vực HR/Recruiter thành một workspace tuyển dụng thống nhất, hỗ trợ luồng chính:

1. Xem tổng quan hoạt động tuyển dụng.
2. Tạo, chỉnh sửa, xem trước, xuất bản và đóng tin tuyển dụng/JD.
3. Xem ứng viên theo từng tin, tìm kiếm và lọc.
4. Xem xếp hạng JD–CV, điểm tổng, breakdown, bằng chứng và tín hiệu GitHub.
5. Đưa ra quyết định của con người và chuyển trạng thái hồ sơ.
6. Theo dõi pipeline tuyển dụng.
7. Quản lý lịch phỏng vấn nếu backend hiện có hoặc được triển khai đầy đủ.
8. Xem analytics từ dữ liệu thật.
9. Quản lý hồ sơ doanh nghiệp và hồ sơ Recruiter.

Kết quả phải giữ đúng trọng tâm đề tài: **nền tảng tuyển dụng thông minh hỗ trợ đối sánh ngữ nghĩa JD–CV và xác thực năng lực qua GitHub**. AI chỉ hỗ trợ ra quyết định; Recruiter là người quyết định cuối cùng.

---

## 2. Nguồn tham khảo UI và giới hạn kế thừa

Các khung UX được chọn từ frontend tham khảo:

| Khung tham khảo | Giá trị cần kế thừa | Cách áp dụng vào MidCV |
|---|---|---|
| Employer portal header | Tên công ty, trạng thái xác minh, mô tả workspace, CTA chính | Dùng dữ liệu company thật và quyền `RECRUITER` |
| Navigation theo tác vụ | Tổng quan, tin tuyển dụng, ứng viên, quy trình, phỏng vấn, phân tích, doanh nghiệp, hồ sơ HR | Dùng route Next.js thật; active state dựa trên pathname, không dùng URL hash |
| Overview KPI cards | Chỉ số dễ quét và hành động nhanh | KPI lấy từ API aggregate, không hard-code |
| Recruitment trend | Biểu đồ lượt xem/ứng tuyển theo thời gian | API thật + khoảng thời gian; có loading/empty/error |
| Top matched candidates | Card ứng viên có match score, kỹ năng, vị trí | Gắn với job/ranking thật; không tạo “ứng viên kho” ngoài quyền truy cập |
| Jobs table | Search, filter trạng thái, preview, thao tác theo dòng | Dùng enum/status backend và pagination server-side |
| Candidate grid/detail | Tóm tắt hồ sơ, match, kỹ năng, CV, quyết định | Hiển thị snapshot CV đã nộp, score breakdown, evidence, GitHub signal |
| Pipeline board | Nhìn ứng viên theo giai đoạn | Chuyển trạng thái qua API; server xác nhận; có audit trail |
| Interview calendar/list | Lọc ngày, trạng thái, tạo/hủy lịch | Chỉ bật khi có persistence và endpoint thật |
| Analytics | Funnel, nguồn ứng viên, thời gian tuyển dụng | Chỉ hiển thị số liệu tính từ DB, có định nghĩa metric |
| Company profile | Form + preview + phúc lợi | Giữ company tenant hiện tại; upload tài sản qua API thật |

Tuyệt đối không mang sang:

- `mockStore`, `mockData`, dữ liệu FPT/MatchaJob, ID dạng `COMP-01`.
- LocalStorage làm nguồn dữ liệu nghiệp vụ.
- Số KPI, biểu đồ, ứng viên, lịch phỏng vấn hoặc hóa đơn hard-code.
- React Router hash tabs.
- Bootstrap chỉ để giống giao diện nếu dự án hiện tại không sử dụng Bootstrap.
- “Fallback demo data” khi API lỗi.
- Billing/gói dịch vụ nếu không nằm trong scope đề cương và backend hiện tại.

---

## 3. Nguyên tắc kiến trúc bắt buộc

### 3.1. Giữ nguyên nền tảng hiện tại

- Next.js App Router và cấu trúc `frontend/src/app/recruiter/...`.
- API client tập trung hiện có, ví dụ `frontend/src/lib/api.ts`; không gọi `fetch` rải rác nếu dự án đã có abstraction.
- Spring Boot backend, PostgreSQL/pgvector, Flyway và Spring Security hiện có.
- Route guard phía frontend chỉ hỗ trợ UX; backend luôn là nơi thực thi authorization.
- Tiếp tục dùng navbar/layout Recruiter hiện có và nâng cấp dần, không tạo portal thứ hai chạy song song.
- Tái sử dụng component, token, icon, locale VI/EN và convention hiện có trước khi tạo mới.

### 3.2. Tenant isolation và bảo mật

- Mọi job, application, ranking, interview, company data phải được giới hạn theo company/recruiter được cấp quyền.
- Không nhận `companyId` từ client rồi tin trực tiếp; backend suy ra/đối chiếu từ principal.
- Recruiter không được xem hồ sơ của job thuộc công ty khác.
- Không hiển thị CV của một Candidate như “kho ứng viên chung” nếu Candidate chưa ứng tuyển hoặc chưa có cơ sở đồng ý hợp lệ trong scope dự án.
- Mọi mutation quan trọng phải có kiểm tra role, ownership, trạng thái hợp lệ và audit log phù hợp.

### 3.3. Một nguồn sự thật

- Enum/status lấy từ backend contract; frontend chỉ có mapping label/màu.
- Điểm matching, breakdown, evidence và GitHub verification lấy từ kết quả đã lưu hoặc API xử lý chính thức.
- Human decision tách khỏi AI score. Không tự động biến score cao thành `SHORTLISTED`.
- Analytics phải có định nghĩa và nguồn dữ liệu rõ ràng.

---

## 4. Information Architecture đề xuất

Agent phải đối chiếu route hiện có trước. Không xóa route đang được sử dụng; có thể redirect route cũ sang route canonical sau khi kiểm thử.

| Khu vực | Route canonical đề xuất | Mục đích |
|---|---|---|
| Tổng quan | `/recruiter` | KPI, xu hướng, việc cần xử lý, lịch gần nhất, ứng viên phù hợp |
| Tin tuyển dụng | `/recruiter/jobs` | Danh sách, search/filter/pagination, trạng thái và thao tác |
| Tạo tin | `/recruiter/jobs/new` | Composer JD có validate và preview |
| Chi tiết tin | `/recruiter/jobs/[id]` | JD, requirements, trạng thái, chỉ số |
| Hồ sơ theo tin | `/recruiter/jobs/[id]/applications` | Danh sách hồ sơ đã ứng tuyển vào job |
| Xếp hạng | `/recruiter/jobs/[id]/ranking` | Ranking, score breakdown, evidence, GitHub signal |
| Chi tiết đơn | `/recruiter/applications/[id]` | CV snapshot, matching, lịch sử trạng thái, quyết định HR |
| Pipeline | `/recruiter/pipeline` | Kanban/list theo job và giai đoạn |
| Phỏng vấn | `/recruiter/interviews` | Danh sách/lịch phỏng vấn nếu nghiệp vụ được hỗ trợ thật |
| Phân tích | `/recruiter/analytics` | Funnel và hiệu suất từ DB thật |
| Doanh nghiệp | `/recruiter/company` | Hồ sơ công ty và employer branding |
| Hồ sơ HR | `/recruiter/profile` | Thông tin cá nhân Recruiter, bảo mật tài khoản |

Không tạo `/recruiter/candidates` như kho dữ liệu toàn hệ thống nếu backend chưa có quy tắc truy cập hợp lệ. Nếu cần màn hình này, nó chỉ là aggregate của các application mà company hiện tại có quyền xem.

---

## 5. App shell và design system

### 5.1. Recruiter shell

- Navbar responsive, sticky khi phù hợp, active item rõ ràng.
- Desktop hiển thị các mục chính; màn hình hẹp chuyển sang menu hoặc overflow có chủ đích.
- Góc phải gồm ngôn ngữ, theme nếu dự án hỗ trợ, notification thật nếu có, menu tài khoản và đăng xuất.
- Không cung cấp “space switcher” cho phép đổi sang Admin/Candidate nếu tài khoản không có role tương ứng.
- Nội dung chính dùng max-width hợp lý hoặc full-width cho table/Kanban; giữ spacing đồng nhất.

### 5.2. Visual language

- Giữ nhận diện màu xanh–navy hiện tại của MidCV; không đổi thương hiệu thành MatchaJob.
- Chuẩn hóa token: background, surface, surface-muted, border, text, text-muted, primary, success, warning, danger và focus ring.
- Card bo góc vừa phải, shadow nhẹ, hierarchy rõ; tránh quá nhiều màu và gradient.
- Dùng Lucide/icon system hiện có; không trộn nhiều bộ icon.
- Có dark mode chỉ khi hệ thống hiện tại đã hỗ trợ đầy đủ.
- Mọi control phải có focus-visible và contrast đạt mức đọc được.

### 5.3. Component dùng chung nên có

Tên cụ thể phải theo convention repo sau khi audit:

- `RecruiterPageHeader`
- `MetricCard`
- `StatusBadge`
- `SearchAndFilterBar`
- `DataTable` hoặc table pattern thống nhất
- `Pagination`
- `EmptyState`
- `ErrorState` có retry
- `LoadingSkeleton`
- `ConfirmDialog`
- `MatchScoreBadge`
- `ScoreBreakdown`
- `EvidenceList`
- `GitHubSignalCard`
- `ApplicationStatusTimeline`
- `RecruitmentPipelineBoard`

Không tạo abstraction khi chỉ dùng một lần. Không copy-paste component gần giống nhau giữa nhiều page.

---

## 6. Đặc tả từng màn hình

### 6.1. Tổng quan Recruiter

Header:

- Tên công ty thật.
- Badge xác minh chỉ khi backend trả trạng thái verified.
- CTA `Tạo tin tuyển dụng`.
- `Xuất báo cáo` chỉ hoạt động khi có endpoint thật; nếu chưa có thì không render nút giả.

KPI ưu tiên:

1. Tin đang tuyển.
2. Hồ sơ mới cần xem.
3. Hồ sơ đang trong pipeline.
4. Lịch phỏng vấn sắp tới hoặc tỷ lệ xử lý hồ sơ.

Không dùng phần trăm tăng/giảm nếu API không trả baseline và khoảng thời gian. KPI phải có tooltip/label định nghĩa nếu có thể gây hiểu nhầm.

Các khối nội dung:

- Xu hướng lượt ứng tuyển/lượt xem theo 7 hoặc 30 ngày.
- Việc cần xử lý: hồ sơ mới, job draft, matching thất bại, lịch sắp tới.
- Ứng viên phù hợp nhất phải gắn với job cụ thể; hiển thị score, top matched skills và link xem bằng chứng.
- Hoạt động gần đây lấy từ audit/activity API; không hard-code câu chuyện.

### 6.2. Quản lý tin tuyển dụng

Danh sách:

- Search theo title/code.
- Filter theo status và khoảng ngày nếu backend hỗ trợ.
- Pagination/sort server-side khi dữ liệu lớn.
- Cột tối thiểu: title, status, created/published/closed date phù hợp, số application, thao tác.
- Action: xem, sửa khi trạng thái cho phép, xem hồ sơ, xem ranking, publish/close theo state machine.
- Xóa phải có confirm; ưu tiên archive/close nếu dữ liệu đã có application.

Composer:

- Chia section: thông tin cơ bản, mô tả, responsibilities, requirements, skills/taxonomy, kinh nghiệm, học vấn, địa điểm/hình thức, salary nếu thuộc scope, deadline.
- Có validation theo backend contract.
- Preview dùng cùng dữ liệu form, không tạo object giả.
- Autosave chỉ khi có API draft và xử lý race/version; nếu không, dùng lưu draft thủ công rõ ràng.
- Không dùng LLM để tự bịa JD. Nếu có AI assist, nội dung phải ở trạng thái đề xuất và Recruiter xác nhận.

### 6.3. Applications và ranking

Danh sách hồ sơ:

- Chỉ lấy application thật của job/company hiện tại.
- Filter theo status, score range, kỹ năng và thời gian nếu API hỗ trợ.
- Không coi API error là danh sách rỗng.
- Có loading, empty, error/retry riêng biệt.

Ranking:

- Hiển thị rank, candidate/application, total score, semantic/skill/experience/education/GitHub components nếu backend thực sự trả.
- Hiển thị `Required Skills Gate` hoặc điều kiện loại bắt buộc nếu engine có.
- Mỗi score phải mở được evidence: trích đoạn CV/JD hoặc dữ liệu GitHub liên quan.
- Nếu matching đang xử lý, hiển thị trạng thái và progress/polling có timeout; không hiện score tạm bịa.
- Nếu matching thất bại, hiển thị mã theo dõi và retry được kiểm soát.

Chi tiết application:

- Dùng CV snapshot bất biến tại thời điểm nộp, không lấy draft CV mới nhất để thay thế.
- Thông tin ứng viên, CV structured view, file gốc nếu có quyền.
- Score breakdown + evidence + warnings.
- GitHub public signal có trạng thái: not provided, pending, verified/processed, partial, failed.
- Human decision và ghi chú nội bộ tách khỏi AI result.
- Timeline trạng thái, người thực hiện và thời gian.
- Mọi nút chuyển trạng thái phải tuân thủ transition backend; lỗi phải rollback UI.

### 6.4. Pipeline

- Cho chọn job trước; không trộn ứng viên nhiều job mà không ghi rõ.
- Các cột phải map từ enum/state machine backend, ví dụ `SUBMITTED`, `SCREENING`, `SHORTLISTED`, `INTERVIEW`, `OFFERED`, `HIRED`, `REJECTED` theo đúng source thực tế.
- Không tự đặt enum tiếng Việt trong payload. UI chỉ dịch label.
- Bản đầu có thể dùng nút chuyển bước thay vì drag-and-drop để giảm lỗi.
- Nếu dùng drag-and-drop: chỉ cập nhật UI sau server success hoặc optimistic update có rollback; chống thao tác lặp; có accessibility bằng bàn phím.
- Rejection yêu cầu lý do theo contract và hiển thị confirm.

### 6.5. Phỏng vấn

Chỉ triển khai đầy đủ nếu repo có hoặc Agent đồng thời bổ sung đúng domain/backend/migration/API/test:

- List + mini calendar/month view.
- Tạo lịch từ một application hợp lệ.
- Candidate, job, start/end time, timezone, format, location/meeting URL, panel/notes, status.
- Tránh double booking nếu yêu cầu nghiệp vụ có.
- Trạng thái và thao tác cancel/reschedule/complete theo backend.
- Không gửi email/notification giả. Chỉ báo thành công sau response thật.

Nếu backend chưa hỗ trợ và task không được phép mở rộng backend, ghi rõ GAP và hoãn màn hình; không dựng demo bằng hard-code.

### 6.6. Analytics

- Filter khoảng thời gian và job/company scope.
- Funnel dựa trên lịch sử trạng thái, không đếm từ array frontend không đầy đủ.
- Các metric phải định nghĩa được: application count, stage conversion, time-to-review, time-to-hire, source distribution nếu có nguồn.
- API trả numerator/denominator hoặc count giúp kiểm chứng tỷ lệ.
- Empty state khi chưa đủ dữ liệu.
- Không hiển thị cost-per-hire hoặc offer acceptance nếu schema không có dữ liệu tương ứng.

### 6.7. Hồ sơ doanh nghiệp

- Form dùng dữ liệu company thật; có dirty state và validation.
- Các trường chỉ thêm khi schema/backend hỗ trợ: name, industry, size, location/address, website, recruitment email/phone, description, benefits/perks, logo/banner.
- Upload logo/banner phải có validation MIME/size, ownership, storage và typed error.
- Preview dùng state đang chỉnh sửa nhưng save chỉ thành công sau API response.
- Recruiter không được đổi company ownership hoặc verification state từ UI thông thường.

### 6.8. Hồ sơ Recruiter

- Lấy thông tin account/profile thật.
- Cho sửa các trường backend cho phép.
- Đổi mật khẩu dùng endpoint bảo mật thật.
- Không dựng toggle 2FA/device alert nếu backend chưa hỗ trợ.

---

## 7. Data contract và trạng thái UI

### 7.1. Không đoán endpoint

Trước khi code, Agent phải tạo bảng traceability dựa trên source:

| Screen/action | Frontend file hiện tại | API function | HTTP endpoint | Backend controller/service | Entity/table | Status |
|---|---|---|---|---|---|---|

Status chỉ nhận một trong: `EXISTS`, `PARTIAL`, `MISSING`, `BROKEN`.

Nếu endpoint thiếu:

- Không tự viết tên endpoint rồi giả sử nó tồn tại.
- Đề xuất contract cụ thể.
- Chỉ triển khai backend sau khi đã tìm đúng domain hiện hữu và bảo đảm migration additive.
- Nếu chưa được phép mở rộng scope, ghi GAP và tiếp tục phần không phụ thuộc.

### 7.2. Trạng thái bắt buộc cho mọi request

- Initial/idle khi thích hợp.
- Loading skeleton/spinner.
- Success có dữ liệu.
- Empty hợp lệ.
- Error có thông báo, correlation/tracking ID nếu server trả và nút retry an toàn.
- Unauthorized/forbidden tách khỏi not-found.

Không dùng catch để trả `[]`, `null` hoặc dữ liệu seed. Không swallow error.

### 7.3. Mutation

- Disable nút trong lúc gửi.
- Chống double submit.
- Thành công chỉ báo sau response 2xx hợp lệ.
- Error giữ lại input hợp lệ và hiển thị nguyên nhân phù hợp.
- Optimistic update phải rollback khi lỗi.
- Mutation nhạy cảm có confirmation.

---

## 8. Yêu cầu backend/database khi UI cần dữ liệu chưa có

Agent không được mở rộng DB chỉ vì UI tham khảo có trường đó. Chỉ thêm khi đáp ứng use case MidCV và đã audit schema.

Các nhóm có thể cần bổ sung sau audit:

- Aggregate dashboard/analytics query hoặc endpoint.
- Application status history/audit trail.
- Recruiter decision/internal note.
- Interview/schedule domain.
- Company benefits/assets nếu chưa có.

Quy tắc:

- Không sửa migration Flyway đã chạy; tạo version mới.
- Migration additive, có constraint/index/foreign key phù hợp.
- Không tạo bảng trùng với entity/domain đã tồn tại.
- Backward compatibility cho API hiện có nếu chưa có kế hoạch migration client.
- Test tenant isolation, authorization, transition và data integrity.

Billing/subscription không thuộc mặc định của lần nâng cấp này.

---

## 9. Responsive, accessibility và i18n

- Desktop, tablet và mobile phải sử dụng được.
- Table trên mobile có chiến lược scroll/card view; không cắt mất action.
- Kanban dùng horizontal scroll có nhãn rõ.
- Modal/drawer không vượt viewport và có focus trap.
- Form có label, error association và keyboard navigation.
- Icon-only button có accessible name/title.
- Không dùng màu làm tín hiệu duy nhất.
- Tôn trọng locale VI/EN hiện có; không hard-code tiếng Việt rải rác nếu dự án đã dùng locale files.
- Chuẩn hóa encoding UTF-8; không chấp nhận mojibake.

---

## 10. Kế hoạch triển khai bắt buộc

### Phase 0 — Audit, không sửa code nghiệp vụ

1. Đọc `README`, requirements, verification, decision log và migration.
2. Kiểm tra Git status; không đè thay đổi ngoài task.
3. Liệt kê route, layout, navbar, API client, auth/RBAC, locale, component và test Recruiter hiện có.
4. Truy vết backend controllers/services/entities/repositories liên quan job/application/matching/company/interview/analytics.
5. Lập traceability matrix và gap list.
6. Báo rõ phần nào từ UI tham khảo sẽ dùng, điều chỉnh hoặc loại bỏ.

Không commit Phase 0 nếu chỉ sinh báo cáo tạm; nếu tạo tài liệu audit hữu ích trong repo thì commit riêng.

### Phase 1 — Shell và shared UI

- Nâng cấp Recruiter layout/navbar/header và reusable states/components.
- Giữ route và API behavior hiện tại.
- Kiểm thử responsive, role guard, locale và navigation.

Commit gợi ý:

`feat(recruiter-ui): establish responsive recruiter portal shell`

### Phase 2 — Dashboard và jobs

- Dashboard từ dữ liệu thật.
- Jobs list/composer/detail/preview theo API thật.
- Nếu aggregate API thiếu, bổ sung tối thiểu và test backend.

Commit gợi ý:

`feat(recruiter): upgrade dashboard and job management workspace`

### Phase 3 — Applications, ranking và candidate detail

- Danh sách applications, ranking, evidence, CV snapshot, GitHub signal, human decision.
- Tuyệt đối không thay thế API lỗi bằng empty/mock.

Commit gợi ý:

`feat(recruiter): integrate evidence-backed candidate ranking workflow`

### Phase 4 — Pipeline và interviews

- Pipeline theo state machine thật.
- Interviews chỉ khi persistence/API hoàn chỉnh.

Commit gợi ý:

`feat(recruiter): add persistent hiring pipeline and interview workflow`

Nếu chỉ có pipeline thì đổi message cho đúng phạm vi; không ghi interview nếu chưa làm.

### Phase 5 — Analytics, company và profile

- Analytics thật, company/profile forms thật.
- Không triển khai billing mặc định.

Commit gợi ý:

`feat(recruiter): add recruitment analytics and profile management`

### Phase 6 — Hardening và verification

- Accessibility/responsive, error states, RBAC/tenant tests, full regression.
- Cập nhật tài liệu verification/traceability.

Commit gợi ý:

`test(recruiter): verify portal workflows and tenant isolation`

---

## 11. Quy tắc kiểm thử — không mock thành công giả

### Frontend

- Typecheck/lint/build phải pass.
- Component/unit test cho mapping trạng thái và điều kiện render quan trọng nếu framework hiện có.
- Playwright chạy với frontend + backend + PostgreSQL thật theo cấu hình CI/local.
- Có thể seed fixture có kiểm soát vào DB test; không dùng `page.route().fulfill()` để biến API thành công giả trong E2E luồng chính.
- Không test chỉ bằng text hard-code mà bỏ qua persistence.

### Backend

- Unit/integration test cho ownership, RBAC, status transition và aggregate query.
- Test Recruiter công ty A không đọc/sửa job/application công ty B.
- Test AI score không tự đổi human decision.
- Test application detail dùng CV snapshot đúng.
- Nếu có interview: test create/reschedule/cancel và application/company ownership.

### E2E tối thiểu

1. Login bằng tài khoản `RECRUITER` fixture thật.
2. Dashboard tải KPI từ DB và phân biệt empty với error.
3. Tạo draft job → chỉnh sửa → publish → xuất hiện trong jobs list.
4. Mở job có application → xem ranking → mở score evidence.
5. Mở application → xem CV snapshot → chuyển trạng thái hợp lệ → reload vẫn giữ dữ liệu.
6. Recruiter không truy cập dữ liệu công ty khác.
7. API 500 hiển thị error/retry, không hiện seed hoặc empty state.
8. Responsive smoke test ở desktop và mobile.
9. Nếu interview được triển khai: tạo lịch → reload → lịch còn tồn tại → cancel/reschedule hoạt động.

Agent phải ghi lệnh, exit code và số test pass/fail. Không được tuyên bố “pass” nếu chưa chạy.

---

## 12. Quy tắc Git và báo cáo

- Bắt đầu bằng `git status -sb`, `git branch -vv`, `git log -n 10 --oneline --decorate`.
- Không reset, restore, xóa hoặc format hàng loạt file không thuộc task.
- Mỗi phase hoàn tất, test pass và chỉ chứa file của phase đó mới được commit.
- Trước commit: `git diff --check`, xem `git diff`, chạy test liên quan, xem `git status --short`.
- Không `git push`, force-push, merge hoặc rebase nếu người dùng chưa yêu cầu.
- Nếu working tree có thay đổi của người dùng chồng lên file cần sửa, dừng và báo chính xác.
- Không commit secret, `.env`, artifact build, screenshot/test-results không cần thiết.

Báo cáo sau mỗi phase:

1. Chức năng đã hoàn thành.
2. File đã thay đổi.
3. API/backend/schema liên quan.
4. Lệnh test và kết quả thật.
5. Hạn chế/gap còn lại.
6. Commit hash và message.

---

## 13. Điều kiện hoàn thành

Chỉ coi nhiệm vụ hoàn tất khi:

- HR portal giữ đúng role `RECRUITER` và `/recruiter/...`.
- Không còn mock/seed fallback trong production path của các trang đã nâng cấp.
- Navigation, dashboard, jobs, applications/ranking và company/profile dùng API thật.
- Pipeline/interview/analytics chỉ hiển thị chức năng có dữ liệu thật.
- Match score có breakdown/evidence và tách khỏi human decision.
- CV hiển thị theo application snapshot.
- RBAC và tenant isolation được kiểm thử.
- Loading/empty/error/forbidden được phân biệt.
- UI responsive, truy cập bàn phím được và đồng bộ VI/EN theo hệ thống hiện có.
- Build và test liên quan pass với bằng chứng.
- Không làm hỏng luồng Candidate/Admin/CV extraction vừa ổn định.

---

## 14. Prompt khởi chạy dành cho Antigravity

Sao chép nguyên văn phần dưới để bắt đầu:

```text
Bạn đang làm việc trực tiếp trên repository MidCV hiện tại.

Hãy đọc TOÀN BỘ `docs/DESIGN_HR_PORTAL.md` và tuân thủ nó như implementation contract. Mục tiêu là nâng cấp giao diện HR/Recruiter dựa trên UX của frontend tham khảo, nhưng phải giữ đúng Next.js App Router, role `RECRUITER`, route `/recruiter/...`, Spring Boot API, PostgreSQL và kiến trúc hiện hữu của MidCV.

Bắt đầu CHỈ với Phase 0:
1. Kiểm tra Git và đọc tài liệu dự án.
2. Audit đầy đủ frontend Recruiter, API client, RBAC, locale, backend controller/service/entity/repository và Flyway liên quan.
3. Dùng `rg` hoặc `git grep`, không đoán tên file hay endpoint.
4. Tạo traceability matrix Screen → frontend → API function → endpoint → backend → table → trạng thái EXISTS/PARTIAL/MISSING/BROKEN.
5. Đối chiếu từng module trong DESIGN_HR_PORTAL.md và đề xuất danh sách file chính xác cho Phase 1–6.
6. Chỉ ra rõ phần nào có thể triển khai ngay bằng API thật; phần nào cần backend/migration; phần nào phải loại khỏi scope.

Ràng buộc tuyệt đối:
- Không bịa code, file, API, schema, test result hoặc trạng thái hoàn thành.
- Không dùng mockStore, dữ liệu seed, localStorage hay fallback demo trong production path.
- Không làm lại hoặc phá luồng Candidate/Admin/CV extraction đang ổn định.
- Không sửa migration Flyway đã áp dụng.
- Không tự push/merge/rebase/force-push.
- Chưa được sửa code nghiệp vụ ở Phase 0. Sau khi báo cáo Phase 0, dừng để tôi review và approve Phase 1.
- Nếu phát hiện thay đổi chưa commit chồng lên phạm vi task, dừng và báo cụ thể.

Đầu ra Phase 0 phải chứa bằng chứng lệnh đã chạy, file thật đã đọc, traceability matrix, gap list, kế hoạch theo phase và tiêu chí kiểm thử thật. Không viết báo cáo chung chung.
```

