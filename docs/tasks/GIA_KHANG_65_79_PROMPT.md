# Prompt thực thi — Gia Khang STT 65–79, loại 71

Bạn là kỹ sư phụ trách hoàn thiện và kiểm thử các task Gia Khang của MidCV. Áp dụng nguyên văn prompt này cho triển khai, không chỉ tạo kế hoạch.

## Phạm vi và nguồn sự thật

- Chỉ làm tại `D:\UIT-2026_2027_HK1\DoAn1\1-11-2026\se121-midcv-ai-recruitment-platform`.
- Nguồn task: bảng `Phân công công việc`, STT 65–79 trong spreadsheet `1334mFmZ15O-qLM50yAnjHBnzRfEOP68mkkw_xBgeXrQ`, loại STT 71/C02 của Việt Khang. Tổng cộng 14 task. Chỉ đọc bảng, không tự đánh dấu nghiệm thu.
- Đọc AGENTS.md, sáu SSOT trong docs, DECISION_LOG.md, hợp đồng remediation và hướng dẫn thư mục liên quan trước khi sửa. Đối chiếu yêu cầu mới với các quyết định đã duyệt. Nếu có xung đột thực sự: ghi rõ, hỏi người dùng và cập nhật DECISION_LOG sau xác nhận, trước khi sửa phần xung đột. Tiếp tục phần độc lập.
- Kiểm kê Git và thay đổi có sẵn; không ghi đè công việc của người khác. Không commit/push/deploy hay thay đổi dữ liệu vận hành.
- Giữ kiến trúc, công thức và phiên bản scoring hiện hành, hai engine candidate/application và HR screening riêng theo DEC-08. Không làm C02, mở rộng nghiệp vụ, thiết kế lại UI hay nâng cấp dependency ngoài nhu cầu trực tiếp.

## Bất biến bắt buộc

Extraction local không gọi LLM; giữ file gốc, raw text và extraction snapshot bất biến. LLM chỉ cấu trúc hóa, đưa đề xuất hoặc diễn giải; không bịa kỹ năng/GPA/taxonomy ID, tính điểm hoặc quyết định tuyển dụng. Candidate chỉ matching từ phiên bản CONFIRMED. Application giữ applied version/snapshot; chỉnh sửa tạo draft mới. Gợi ý học không tự thêm vào CV. Tôn trọng ownership/tenant hiện có. Không ghi secret/PII vào log hoặc báo cáo.

## Các task và tiêu chí kiểm chứng

| STT | Task | Kết quả và kiểm thử bắt buộc |
|---|---|---|
|65|R02 Đồng bộ timeout và hủy/tái kết nối|Phân biệt timeout HTTP, deadline job và thời gian chờ UI; job >60 giây vẫn có thể hoàn tất; SSE lỗi chuyển polling/reconnect; AbortSignal/ngắt modal dừng chờ và không cập nhật UI cũ. Hủy chờ không được tuyên bố hủy job server nếu chưa có API.|
|66|O01 Hợp đồng test DOC|Fixture .doc phải đúng định dạng đã khai báo; binary DOC cần converter khả dụng hoặc lỗi unsupported rõ ràng; không thành công với nội dung rác. Test xác minh nội dung, metadata và trạng thái.|
|67|O02 Hậu xử lý OCR có kiểm soát|Thực hiện ở bước đề xuất riêng sau extraction, không trong extractor. Prompt chống chèn lệnh; giữ raw text/checksum; đề xuất có before/after, offset/diff, provider/model, cảnh báo; người dùng duyệt rõ ràng trước khi dùng đề xuất cho draft. Không tự sửa file/raw snapshot. Test từ chối sửa số/email/URL/kỹ năng không có bằng chứng, response sai schema, stale source và thao tác từ chối.|
|68|O03 Benchmark có nhãn|Dataset synthetic có nguồn và ground truth rõ, gồm ảnh/PDF text/scan, Việt/Anh và lỗi khó. Runner đo CER/WER từng mẫu trước/sau đề xuất được duyệt; lưu cấu hình, version, thời gian và lỗi. Không bịa mức cải thiện hay gọi nhãn synthetic là chuyên gia gán nhãn.|
|69|L01 Provider/schema/grounding|Trace provider/model, retry/repair/fallback và lý do; 400/401/403/404 fail-fast; transient mới fallback; JSON repair tối đa 1 lần; schema và grounding kiểm soát output, che secret. Test provider thành công và lỗi có đối chứng.|
|70|C01 Draft-confirm không mất dữ liệu|Save/reload đủ card/UUID/trường ẩn/provenance; chặn save/confirm race và stale revision; confirm đúng version; checksum file gốc giữ nguyên. Test đồng thời và rollback với DB thật khi khả dụng.|
|72|C03 Builder/template/export|Builder lưu/reload nội dung và template, preview lấy cùng dữ liệu, export file thực mở/đọc được, nội dung không mất hoặc lẫn CV khác. Kiểm thử lỗi lưu/xuất và luồng browser.|
|73|T01 Taxonomy đa tầng đối kháng|Exact→alias→fuzzy→vector; test Việt/Anh, Java/JavaScript, C/C++/C#, React/React Native, chuỗi ngắn, không rõ; LLM chỉ chọn ID trong Top-K. Không ép unknown thành skill.|
|74|M01 Vector đồng nhất/invalidation|Cùng model/dimension cho từng phép so sánh; vector hữu hạn, không zero/NaN; không tái dùng embedding stale sau thay nội dung/model. Query cosine qua pgvector thật và test version/model invalidation.|
|75|M02 Scoring/ranking thực|Golden scores theo engine thực, tái dựng từ factors/weights, chạy lặp 100 lần, required gating, tie ổn định, policy/recalculate đúng version và không tạo quyết định tuyển dụng tự động.|
|76|M03 Đo engine sản phẩm|Predictions phải lấy backend thật, không hàm toy/điểm hardcode. Nhãn relevance độc lập score. Tính NDCG với IDCG từ toàn bộ tập nhãn (không chỉ Top-K dự đoán), precision/recall, tie và candidate thiếu. Xuất raw predictions và metadata engine.|
|77|M04 JD→gap→roadmap|Đối chiếu scope Phase 8 có sẵn; nối worker/backend/frontend cho JD đích cụ thể, năm nhóm gap, roadmap đúng kỹ năng thiếu, trạng thái loading/error/retry và không chèn gợi ý vào CV. Test snapshot và profile không bị thay đổi.|
|78|M05 Screening/application|Screening độc lập không tạo candidate/application; phân biệt engine/version/score/state; retry idempotent; application snapshot giữ nguyên khi CV/JD thay đổi.|
|79|M06 Giải thích truy vết|Điểm tái dựng được từ factors/weights đã lưu; reason codes và quote kiểm tra trên đúng snapshot đã dùng, không CV hiện tại; không nhận quote bịa/điểm LLM tự sửa.|

## Quy trình thực hiện và testing

1. Lập ma trận 14 task → code hiện có → khoảng trống → thay đổi → test → bằng chứng; ưu tiên sửa nguyên nhân gốc. Không viết lại phần đã đúng.
2. Thực hiện theo dependency: lifecycle/document/provider, draft/builder, taxonomy/vector, scoring/evaluation/gap/explanation. Mỗi sửa đổi phải nằm trong 14 task.
3. Viết test hồi quy có khả năng bắt lỗi nghiệp vụ, gồm happy path, lỗi, race/stale, biên và chống bịa. Phân loại rõ unit/contract (mock), integration DB/provider thật và browser E2E. Không dùng test kiểm tra chuỗi source để thay cho hành vi.
4. Kiểm tra runtime sẵn có; dùng DB/container/port/storage dùng riêng cho kiểm thử, không reset DB người dùng. Không in nội dung .env. Chạy test thực và lưu log, exit code, timestamp, phiên bản/config không nhạy cảm. Với dependency thiếu, thử cách phù hợp sẵn có; ghi BLOCKED cùng lệnh tái hiện, không thay bằng số đo giả.
5. Chạy các suite phù hợp Python/Java/TypeScript, kiểm tra build/type/lint các phần sửa; chạy các luồng live và browser cần cho nghiệm thu. Chỉ mở rộng test khi có thay đổi hoặc dấu hiệu lỗi mới.
6. Kiểm tra diff, không lẫn file sinh/secrets, cập nhật tài liệu API và trạng thái trong phạm vi thay đổi. Tạo báo cáo nghiệm thu từng STT, phân biệt IMPLEMENTED, VERIFIED và BLOCKED. Không đánh dấu VERIFIED chỉ vì compile/unit tests pass.
7. Bàn giao prompt này, thay đổi chính, test thật kèm số pass/fail/skip và log, checklist 14 task cùng blocker cụ thể. Không tuyên bố hoàn thành toàn bộ nếu thiếu bằng chứng bắt buộc.
