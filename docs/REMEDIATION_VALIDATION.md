# Validation của bản sửa đã duyệt

## Kết quả thực tế

| Kiểm tra | Kết quả | Phạm vi chứng minh |
|---|---|---|
| JDK21 javac main | PASS,213 Java source files | Compile source chính với Lombok và artifact theo dependency dự án |
| JDK21 javac test | PASS,80 Java test source files | Compile test; không có nghĩa đã chạy80 test files |
| JUnit selected regression |56 passed,0 failed,0 skipped |5 class mới và3 class hiện có; unit/service tests, SQL trên H2; không phải PostgreSQL E2E |
| Frontend production build | PASS, Next16.3.3 | Compile/TypeScript/prerender production; chưa là browser E2E |
| Frontend client contract |11 passed,0 failed | Thực thi client thực bằng Node với HTTP response tổng hợp; count0/2, invalid payload, version1/2/3/null |
| Worker targeted |51 passed,1 warning |8 test grounding mới cùng fallback/repair/client suites; provider được mock |
| Worker full, bản sửa |219 passed,9 failed,7 skipped | Danh tính9 test fail trùng baseline trong cùng môi trường |
| Worker full, bản gốc đối chứng |211 passed,9 failed,7 skipped | Source gốc chạy trong bản sao khác; không sửa ZIP baseline |
| Compose YAML parse | PASS | Cú pháp YAML, chưa chạy Docker |
| Maven chuẩn | BLOCKED / interrupted130 | Direct networking/resolution không hoàn tất trong runtime; không ghi mvn build/test PASS |
| PostgreSQL/pgvector, live LLM/OAuth, browser/SSE E2E | NOT TESTED | Cần môi trường live được cấu hình và fixture tổng hợp |

Maven được thử với JDK21 và repo riêng, nhưng Java networking/resolution chưa hoàn tất; invocation được dừng trước khi có kết quả compile. Đã dùng javac và JUnit console với artifact theo version của POM/BOM để kiểm tra code thực, không dùng chúng thay lời khẳng định `mvn test` đã pass. Nạp trước Byte Buddy agent để Mockito hoạt động trong runtime hạn chế self-attach. Không sửa pom/dependency version để né lỗi.

Environment đã dùng: Amazon Corretto21.0.12.1, Node24.19.0/npm11.9.0, Python3.12. Worker environment freeze được lưu trong evidence của gói bàn giao; requirements gốc không được thay phiên bản. Lượt test bỏ biến proxy của runtime khỏi subprocess mock-only vì proxy SOCKS của runtime không thuộc dependency dự án. Không thêm dependency SOCKS vào sản phẩm.

## Regression classes đã chạy

- AuditRemediationRegressionTest
- AuditDocumentAccessSqlTest (H2 execution of production authorization SQL)
- AuditCvLifecycleRegressionTest
- AuditScreeningPipelineRegressionTest (mock AI/JDBC; kiểm contract tạo vector)
- matching.ScreeningCvAdapterTest
- CandidateCvConfirmationIntegrationTest (Mockito service tests)
- CandidateCvDraftAndEvidenceIntegrationTest (Mockito service tests)
- EndToEndCoreProductFlowIntegrationTest (mocked lifecycle; không gọi nó là full E2E)

## Giới hạn và rủi ro còn lại

Không khẳng định đã khởi chạy toàn bộ ứng dụng trên PostgreSQL thật. Tính rollback transaction, cạnh tranh confirm/worker, live SSE, OCR ground truth, OAuth và provider availability chưa đạt acceptance. Full backend Maven suite chưa chạy; nhiều fixture legacy scoring còn tạo raw CV không có applied CONFIRMED version và cần được chuyển theo contract mới, không bật raw fallback để làm chúng pass.

9 worker failures có sẵn liên quan health/provider/OCR/GitHub/DOC contract hoặc runtime; giữ ngoài phạm vi18 defect đã được duyệt, ghi rõ danh tính trong evidence. Không gọi chúng RESOLVED. Không gọi lỗi có sẵn là regression của patch; không giấu rằng full suite chưa xanh.

Grounding mới chỉ kiểm bảo thủ skill/GPA/email/phone trong extraction, không chứng minh mọi employer/date/paraphrase đúng. Alias không xuất hiện nguyên văn có thể bị bỏ và cần người dùng review. Screening adapter không đoán năm kinh nghiệm nếu date không đủ. Candidate semantic vector chỉ được tái dùng khi extraction JSON khớp confirmed input; nếu không có vector phù hợp, cơ chế fallback có tên hiện có được dùng. Không gọi fallback TF/concept là embedding model thật.

Historical snapshots thiếu nguồn không được backfill từ CV hiện tại. Attachment ownership/cleanup cũ không bị rewrite; bất biến file minh chứng qua nhiều phiên bản vẫn cần test riêng. Windows PowerShell helper và Docker Compose mới chỉ được đọc/parse tại đây, chưa chạy Windows/Docker.

## Đính chính bằng chứng audit trước

Archive thực tế có các báo cáo Surefire lịch sử trong `backend/bin/target/surefire-reports`; cách tìm kiếm bỏ qua thư mục ignored đã bỏ sót chúng. Nhận định trước rằng archive không có báo cáo test cần được sửa thành: có báo cáo lịch sử, chưa đối chiếu được Git/source hiện tại và không chứng minh live15-step pipeline. Các file lịch sử được giữ nguyên; kết quả mới dùng log/evidence riêng.

Tên biến frontend thực tế là NEXT_PUBLIC_API_URL. Một số nhãn trong audit dùng NEXT_PUBLIC_API_BASE_URL; nguyên nhân ghép lặp /api/v1 vẫn hiện diện ở ví dụ README dùng biến thực tế. Bản sửa chỉnh đúng NEXT_PUBLIC_API_URL thành origin-only.

## Trạng thái defect

Tất cả18 mục đã có thay đổi source/tài liệu tương ứng. Đây là IMPLEMENTED theo phạm vi được duyệt; chỉ các kiểm tra ghi trên được đánh dấu PASS. Live acceptance còn pending; không gắn toàn bộ dự án hoặc Phase10 là VERIFIED/production ready.
