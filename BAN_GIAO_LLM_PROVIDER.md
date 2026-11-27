# Bàn giao MidCV sử dụng LLM Provider

Bản này cập nhật ZIP MidCV do nhóm gửi và đối chiếu 10 nhóm công việc trong báo cáo ngày 27/11/2026. Trạng thái dưới đây áp dụng cho mã trong gói bàn giao này.

## Cấu hình và nâng cấp

1. Điền LLM_PRIMARY_BASE_URL, LLM_PRIMARY_API_KEY và LLM_PRIMARY_MODEL từ nhà cung cấp chat vào cấu hình máy chủ. Backend và AI Worker đều hỗ trợ API tương thích OpenAI. Mục Admin cấu hình chat cho backend, còn AI Worker đọc biến môi trường.
2. Dùng EMBEDDING_MODEL có khả năng trả đúng 1024 chiều. Mặc định là text-embedding-3-small. Nếu chat và embedding dùng hai nhà cung cấp, điền riêng EMBEDDING_BASE_URL và EMBEDDING_API_KEY.
3. Trên bản sao cơ sở dữ liệu, chạy Flyway đến V47 trước khi nâng cấp môi trường demo. V47 bảo toàn cấu hình cloud đã lưu, chuyển schema cấu hình sang provider và bỏ hai cột cấu hình mô hình cục bộ. Migration Flyway cũ giữ nguyên byte.
4. Khởi động lại backend và AI Worker. Chạy kiểm tra chat và embedding theo [LLM_PROVIDER_SETUP.md](docs/LLM_PROVIDER_SETUP.md). Với hồ sơ đã có vector từ model khác, làm mới vector của hai phiên bản CV–JD cần đối sánh.
5. Kiểm tra hành trình Candidate nộp CV, worker hoàn tất vector, HR mở hồ sơ và đọc điểm theo cùng application ID. Cấu hình và đầu ra nghiệm thu phải gắn với bản mã nhóm chọn bảo vệ.

Cấu hình chạy, Admin UI, API worker, health, Docker Compose, PowerShell, Postman và test đã chuyển sang provider. OCR vẫn đọc văn bản bằng thư viện xử lý tài liệu. Điểm đối sánh tạm khi thiếu vector vẫn có trạng thái riêng.

## Đối chiếu các nhóm nhiệm vụ

| Nhóm | Phần đã sửa hoặc kiểm tra được | Điều kiện còn mở |
|---|---|---|
| NAV | Kiểm tra các quy tắc portal, URL nội bộ, mục đích nộp đơn và phục hồi application ID bằng contract tests. | Nghiệm thu đăng nhập và liên kết OAuth thật, các ca đổi phiên trong trình duyệt và toàn hành trình CV. |
| APP-AI | Preview kiểm quyền gói và hạn JD. Quick Apply truyền revision JD và phiên bản CV để phát hiện thay đổi. Hồ sơ phân biệt opt-out và job thiếu điều kiện AI. Worker đọc lại trạng thái dưới khóa trước khi lưu điểm. | Fault injection khi lưu đơn và queue, các ca hai tab, rút đơn, AI lỗi và snapshot v1/v2 trên database thật. |
| GH | Giữ dữ liệu công khai, thông tin lần quét và OAuth identity. Kiểm thử hồi quy GitHub trong nhóm backend tập trung. | Ca GitHub OAuth sở hữu thật, revoke/rename, hạn mức, timeout và scope mẫu lớn. |
| GHS | Phân biệt lần quét rỗng và hiển thị thiếu kho công khai. Bổ sung tín hiệu mô tả công việc tiếng Việt. Điểm Core vẫn áp dụng khi GitHub thiếu bằng chứng đủ điều kiện. | Kiểm tra coding/non-coding đa ngôn ngữ đầy đủ, tác động của mẫu số kỹ năng, kiểm tra lại cách phân loại ngành, ablation và độ công bằng. |
| EXT | CV/JD đi qua provider client. Kiểm schema và một lần yêu cầu sửa JSON có giới hạn. Test OCR và grounding offline hoạt động. | Corpus ẩn danh gắn nhãn theo format và ngành, chất lượng OCR và trích xuất trên provider thật. |
| EMB | Gọi API embedding của provider. Kiểm model, dimension, checksum và vector hữu hạn. Ghép cặp Pgvector mới yêu cầu model đang cấu hình. EMBED kiểm lease trước ghi. | Native SQL và trạng thái PENDING_VECTOR → PGVECTOR_READY trên cùng đơn. Diễn tập đổi model, cold/warm, tải và query plan. |
| MAT | Bỏ mặc định số năm của CV và JD. Dùng thời lượng nêu rõ trong ngữ cảnh liên quan và mức lớn nhất để tránh cộng trùng. | Đánh giá các CV nêu khoảng ngày, thời gian bán phần, giáo dục, dự án, bằng chứng đa ngôn ngữ và tái dựng điểm từ API và DB. |
| UI-AI | Chỉ hiện điểm FINAL khi score hữu hạn trong khoảng 0–100. Chi tiết hồ sơ tải riêng với báo cáo AI. Quyền truy cập, 404 và lỗi tạm có thông báo riêng. | Đồng bộ toàn bộ KPI, refresh/polling theo trạng thái, nhiều tab, khả năng truy cập và đầy đủ kịch bản responsive. |
| EVA | Script ranking đọc rank chính thức từ backend, báo độ phủ, số ca đủ K và metric từng JD. Báo cáo lịch sử có ghi nguồn và giới hạn. | Bộ nhãn độc lập, export thực tế, P/R/F1, P@K/NDCG@K, đối chiếu minh chứng, baseline và ablation đa ngành. |
| REL | Kiểm lease trước ghi vector, thử lại MATCH/EMBED hết lease tối đa 3 lần, hoàn tất job và xếp MATCH trong cùng giao dịch. Test các phần backend và CI module được chọn. | Full suite với PostgreSQL, nâng cấp Flyway V46→V47 có dữ liệu cũ, restore, concurrency/restart và E2E Candidate→HR. |

## Kết quả kiểm thử

| Kiểm tra | Kết quả và giới hạn |
|---|---|
| Frontend typecheck, production build, hợp đồng | Typecheck và build thành công. 74 contract tests đạt. ESLint 0 errors, 54 warnings. |
| Backend compile và kiểm thử tập trung | Maven test-compile thành công. 70 test bằng JUnit Console đạt, gồm cấu hình provider, matching, GitHub, snapshot, Pgvector contract và phân quyền. Maven Surefire không tải được một dependency trong môi trường này. |
| Backend full suite | Lần chạy riêng bị dừng khi không kết nối được PostgreSQL tại localhost:5432. |
| AI Worker | 240 offline tests đạt, 7 skipped và 2 live deselected. Có test đối chiếu request 1024 chiều và từ chối model sai, vector sai chiều hoặc vector rỗng. |
| Python scripts | 22 tests đạt, gồm xếp hạng theo rank API, backup và baseline. |
| V47 | Chạy thành công SQL V47 với bảng cấu hình cũ trong PostgreSQL WASM. Xác nhận giữ URL/model/key của provider đã có và bỏ các cột cũ. Cần kiểm thử toàn bộ Flyway trên DB demo sao lưu. |
| Kiểm tra kiến trúc | Module boundary check đạt. Migration gốc khớp từng byte với ZIP gửi lên. |
| Trình duyệt fixture | 27/28 ca đạt ở lượt đầu. Ca tiếng Anh 768 px có assertion dùng câu báo lỗi cũ. Sau khi cập nhật assertion theo nội dung hiển thị, ca này chạy lại đạt. |
| Provider/GitHub/Pgvector live và số liệu AI | Chưa nghiệm thu trên bản này. Cần endpoint và credentials của môi trường thử nghiệm, PostgreSQL/Pgvector có dữ liệu thử và bộ gold label độc lập của nhóm. |

Chỉ đánh dấu PASS cho từng DoD sau khi có kết quả tương ứng. Với L01–L10, lưu SHA, ID đơn được phép sử dụng, kết quả UI/API/DB/queue và log đã che thông tin cá nhân. Tính metric từ bản xuất backend và nhãn đánh giá độc lập.
