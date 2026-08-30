# 05. ĐẶC TẢ YÊU CẦU CHỨC NĂNG (FUNCTIONAL REQUIREMENTS)

Tài liệu này đặc tả chi tiết toàn bộ các Chức năng của Hệ thống theo định dạng chuẩn hóa.

---

## 1. NHÓM TÍNH NĂNG XÁC THỰC VÀ BẢO MẬT (FR-AUTH)

### FR-AUTH-001: Đăng ký Tài khoản Người dùng
* **ID:** `FR-AUTH-001`
* **Name:** Đăng ký tài khoản hệ thống.
* **Description:** Cho phép ứng viên (Candidate) hoặc nhà tuyển dụng (HR) khởi tạo tài khoản mới với email, mật khẩu và vai trò (Role).
* **Actor:** Candidate, HR.
* **Precondition:** Người dùng truy cập trang Đăng ký, chưa đăng nhập.
* **Main Flow:**
  1. Người dùng nhập Email, Mật khẩu, Mật khẩu xác nhận, Họ tên và Chọn vai trò (`CANDIDATE` hoặc `HR`).
  2. Hệ thống kiểm tra định dạng email và độ mạnh mật khẩu ($\ge 8$ ký tự, có chữ hoa, chữ thường, số, ký tự đặc biệt).
  3. Hệ thống kiểm tra tính duy nhất của Email trong CSDL.
  4. Hệ thống mã hóa mật khẩu bằng BCrypt/Argon2 và lưu người dùng mới.
  5. Hệ thống tạo Profile rỗng tương ứng (`CandidateProfile` hoặc `RecruiterProfile`).
  6. Hệ thống trả về thông báo thành công và chuyển hướng đến trang Đăng nhập.
* **Alternative Flow:** Không có.
* **Exception:**
  * Email đã tồn tại: Hệ thống báo lỗi "Email đã được sử dụng".
  * Mật khẩu không đủ mạnh: Hệ thống hiển thị quy tắc mật khẩu không hợp lệ.
* **Postcondition:** Tài khoản người dùng được lưu vào CSDL (`users`), Profile tương ứng được khởi tạo.
* **Priority:** High (MVP Mandatory)
* **Acceptance Criteria:**
  * Mật khẩu lưu trong DB bắt buộc phải được mã hóa BCrypt với salt factor $\ge 10$.
  * Không cho phép tạo tài khoản trùng email.

### FR-AUTH-002: Đăng nhập & Tạo Phiên đăng nhập (JWT Authentication)
* **ID:** `FR-AUTH-002`
* **Name:** Đăng nhập hệ thống.
* **Description:** Xác thực thông tin người dùng và cấp mã định danh Access Token (JWT) cùng Refresh Token.
* **Actor:** Candidate, HR.
* **Precondition:** Người dùng đã có tài khoản trên hệ thống.
* **Main Flow:**
  1. Người dùng nhập Email và Mật khẩu.
  2. Hệ thống kiểm tra Email và so sánh hash mật khẩu.
  3. Khi chính xác, Hệ thống sinh `AccessToken` (thời hạn 60 phút) chứa `userId`, `email`, `role` và `RefreshToken` (thời hạn 7 ngày).
  4. Hệ thống trả về Token cho Frontend và lưu RefreshToken vào CSDL.
* **Alternative Flow:** Không có.
* **Exception:** Sai Email hoặc Mật khẩu: Hệ thống trả về HTTP 401 Unauthorized với thông báo "Thông tin đăng nhập không chính xác".
* **Postcondition:** Người dùng đăng nhập thành công, Frontend lưu JWT để gọi API.
* **Priority:** High (MVP Mandatory)
* **Acceptance Criteria:** AccessToken có chữ ký HMAC-SHA256, được đính kèm ở header `Authorization: Bearer <token>`.

---

## 2. NHÓM TÍNH NĂNG HỒ SƠ ỨNG VIÊN VÀ CV (FR-CAND & FR-CV)

### FR-CAND-001: Quản lý Thông tin Cá nhân Candidate
* **ID:** `FR-CAND-001`
* **Name:** Quản lý Profile Ứng viên.
* **Description:** Cho phép Candidate cập nhật thông tin cá nhân, tiêu đề công việc, số điện thoại, địa chỉ, mô tả bản thân.
* **Actor:** Candidate.
* **Precondition:** Candidate đã đăng nhập.
* **Main Flow:**
  1. Candidate truy cập trang "Hồ sơ cá nhân".
  2. Candidate chỉnh sửa các trường: Họ tên, Số điện thoại, Headline, Location, Bio, Website/Portfolio URL.
  3. Candidate nhấn "Lưu thay đổi".
  4. Hệ thống validate thông tin và cập nhật bảng `candidate_profiles`.
* **Alternative Flow:** Không có.
* **Exception:** Số điện thoại sai định dạng: Trả về lỗi validation HTTP 400.
* **Postcondition:** Thông tin profile ứng viên được cập nhật.
* **Priority:** Medium (MVP Mandatory)
* **Acceptance Criteria:** Dữ liệu cập nhật ngay lập tức và hiển thị chính xác khi xem lại.

### FR-CV-001: Tải lên và Lưu trữ File CV
* **ID:** `FR-CV-001`
* **Name:** Upload CV (PDF/DOCX).
* **Description:** Candidate tải file CV dạng PDF hoặc DOCX lên hệ thống.
* **Actor:** Candidate.
* **Precondition:** Candidate đã đăng nhập, chọn tập tin từ máy tính.
* **Main Flow:**
  1. Candidate bấm chọn file CV hoặc kéo thả vào vùng upload.
  2. Hệ thống kiểm tra MIME type (chỉ chấp nhận `application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`) và dung lượng ($\le 10\text{ MB}$).
  3. Hệ thống lưu trữ file vào thư mục bảo mật/Object Storage và lưu đường dẫn vào bảng `cvs`.
  4. Kích hoạt sự kiện trích xuất dữ liệu tự động (`FR-AI-001`).
* **Alternative Flow:** Candidate chọn thay thế CV cũ bằng CV mới.
* **Exception:** File không đúng định dạng hoặc vượt quá 10MB: Trả về lỗi HTTP 400 và thông báo rõ nguyên nhân.
* **Postcondition:** Bản ghi `CV` được tạo với trạng thái `PENDING_PARSING`.
* **Priority:** High (MVP Mandatory)
* **Acceptance Criteria:** File lưu trữ không public URL trực tiếp; truy cập phải qua API kiểm tra quyền truy cập.

---

## 3. NHÓM TÍNH NĂNG NHÀ TUYỂN DỤNG VÀ QUẢN LÝ JOB (FR-HR & FR-JOB)

### FR-HR-001: Quản lý Thông tin Nhà tuyển dụng / Công ty
* **ID:** `FR-HR-001`
* **Name:** Cập nhật Profile Nhà tuyển dụng & Công ty.
* **Description:** HR cập nhật thông tin tên công ty, quy mô, địa chỉ, website, mô tả công ty.
* **Actor:** HR.
* **Precondition:** HR đã đăng nhập.
* **Main Flow:**
  1. HR vào mục "Thông tin Công ty".
  2. Nhập/Sửa Tên công ty, Website, Quy mô, Địa chỉ trụ sở, Mô tả.
  3. Hệ thống lưu vào bảng `companies` và liên kết với `recruiter_profiles`.
* **Alternative Flow:** Không có.
* **Exception:** Tên công ty để trống: Báo lỗi validation.
* **Postcondition:** Dữ liệu công ty được lưu trữ, hiển thị trong các tin tuyển dụng do HR tạo.
* **Priority:** Medium (MVP Mandatory)
* **Acceptance Criteria:** Tin tuyển dụng hiển thị tên công ty chuẩn xác.

### FR-JOB-001: Tạo và Đăng bài Tuyển dụng (Create & Publish Job)
* **ID:** `FR-JOB-001`
* **Name:** Tạo và Đăng JD mới.
* **Description:** Cho phép HR nhập chi tiết JD công việc hoặc dán văn bản thô để AI tự động phân tích thành cấu trúc.
* **Actor:** HR.
* **Precondition:** HR đã đăng nhập và có hồ sơ công ty.
* **Main Flow:**
  1. HR chọn "Tạo tin tuyển dụng".
  2. HR nhập Tiêu đề (Job Title), Địa điểm, Mức lương, Cấp bậc (Seniority), Loại hình (Full-time/Part-time).
  3. HR chọn chế độ nhập JD:
     * *Chế độ Form:* Nhập thủ công Required Skills, Preferred Skills, Số năm kinh nghiệm, Trình độ học vấn, Mô tả công việc.
     * *Chế độ AI Parsing:* Dán đoạn văn bản JD thô $\rightarrow$ Bấm "Phân tích JD bằng AI" $\rightarrow$ Hệ thống tự động điền các trường cấu trúc.
  4. HR rà soát thông tin và bấm "Đăng bài" (Publish).
  5. Hệ thống kích hoạt tạo Vector Embedding cho JD (`FR-AI-002`).
* **Alternative Flow:** HR lưu ở dạng "Nháp" (Draft).
* **Exception:** Thiếu tiêu đề hoặc danh sách kỹ năng bắt buộc: Báo lỗi validation.
* **Postcondition:** Bản ghi `Job` được tạo với trạng thái `PUBLISHED`.
* **Priority:** High (MVP Mandatory)
* **Acceptance Criteria:** JD sau khi tạo phải được đánh chỉ mục vector thành công trong `pgvector`.

---

## 4. NHÓM TÍNH NĂNG ỨNG TUYỂN (FR-APP)

### FR-APP-001: Ứng tuyển Công việc (Apply Job)
* **ID:** `FR-APP-001`
* **Name:** Nộp hồ sơ ứng tuyển.
* **Description:** Candidate nộp hồ sơ ứng tuyển cho một Job đang mở bằng CV đã tải lên.
* **Actor:** Candidate.
* **Precondition:** Job có trạng thái `PUBLISHED`, Candidate đã đăng nhập và có CV hợp lệ.
* **Main Flow:**
  1. Candidate xem chi tiết Job và nhấn nút "Ứng tuyển ngay".
  2. Candidate chọn bản CV sẵn có hoặc chọn upload CV mới.
  3. Candidate xác nhận nộp hồ sơ.
  4. Hệ thống kiểm tra xem Candidate đã từng nộp cho Job này chưa.
  5. Hệ thống tạo bản ghi `Application` với trạng thái `SUBMITTED`.
  6. Hệ thống kích hoạt luồng AI Matching bất đồng bộ giữa JD và CV (`FR-MATCH-001`).
* **Alternative Flow:** Không có.
* **Exception:** Candidate đã nộp đơn cho Job này trước đó: Trả về lỗi HTTP 409 Conflict "Bạn đã nộp hồ sơ cho công việc này".
* **Postcondition:** Đơn ứng tuyển lưu thành công, AI Matching engine tính toán Match Score.
* **Priority:** High (MVP Mandatory)
* **Acceptance Criteria:** Không cho phép nộp trùng đơn cho cùng 1 Job ID.

---

## 5. NHÓM TÍNH NĂNG AI PARSING, MATCHING, RANKING & EXPLANATION (FR-AI, FR-MATCH, FR-RANK, FR-EXPLAIN)

### FR-AI-001: Parsing & Trích xuất Thực thể CV / JD
* **ID:** `FR-AI-001`
* **Name:** AI Document Text Parsing.
* **Description:** Trích xuất văn bản thô từ file PDF/DOCX và dùng LLM chuyển đổi văn bản thành dữ liệu cấu trúc (Skills, Experience Years, Education, Projects).
* **Actor:** System (AI Pipeline).
* **Precondition:** File CV đã upload hoặc văn bản JD thô đã nhập.
* **Main Flow:**
  1. Service đọc văn bản từ file bằng PyPDF2/python-docx.
  2. Làm sạch văn bản (xóa khoảng trắng thừa, ký tự dị biệt).
  3. Gửi Prompt trích xuất đến LLM với JSON Output Schema nghiêm ngặt.
  4. Chuẩn hóa tên kỹ năng theo từ điển chuẩn (Normalization Dictionary).
  5. Lưu thông tin cấu trúc vào các bảng tương ứng (`cv_sections`, `candidate_skills`, `experiences`, `job_requirements`).
* **Alternative Flow:** Nếu LLM trả về JSON lỗi: Gọi lại LLM lần 2 với retry prompt.
* **Exception:** File hỏng hoặc không trích xuất được text: Ghi log lỗi, đánh dấu trạng thái `PARSING_FAILED`.
* **Postcondition:** CV/JD được phân tích thành các trường cấu trúc sạch.
* **Priority:** High (MVP Mandatory)
* **Acceptance Criteria:** Tỷ lệ trích xuất đúng thực thể kỹ năng và kinh nghiệm $\ge 90\%$.

### FR-MATCH-001: AI Hybrid Matching Engine
* **ID:** `FR-MATCH-001`
* **Name:** Đánh giá & Tính điểm Đối sánh JD–CV.
* **Description:** Thực hiện tính điểm phù hợp giữa JD và CV dựa trên mô hình Scoring Hybrid kết hợp Structured Matching & Semantic Vector Similarity.
* **Actor:** System.
* **Precondition:** JD và CV đã được trích xuất dữ liệu cấu trúc và tạo Vector Embedding.
* **Main Flow:**
  1. **Tính Structured Skill Score:** So sánh danh sách Required Skills và Preferred Skills giữa JD và CV.
  2. **Tính Experience Score:** So sánh tổng số năm kinh nghiệm thực tế với số năm JD yêu cầu.
  3. **Tính Education & Cert Score:** So sánh bằng cấp và chứng chỉ.
  4. **Tính Semantic Relevance Score:** Tìm khoảng cách Cosine giữa Vector JD và Vector CV trong `pgvector`.
  5. **Tổng hợp Match Score:** Nhân với bảng trọng số hệ thống để cho ra điểm tổng từ 0–100%.
  6. Lưu bản ghi kết quả vào `match_results` và `match_factors`.
* **Alternative Flow:** Không có.
* **Exception:** Thiếu dữ liệu vector: Kích hoạt tạo lại vector khẩn cấp trước khi matching.
* **Postcondition:** Bản ghi `MatchResult` được lưu trữ hoàn chỉnh.
* **Priority:** High (MVP Mandatory)
* **Acceptance Criteria:** Điểm số nằm trong khoảng $[0, 100]$, phản ánh chính xác sự chênh lệch kỹ năng.

### FR-RANK-001: Xếp hạng Danh sách Ứng viên (Candidate Ranking)
* **ID:** `FR-RANK-001`
* **Name:** Hiển thị Danh sách Xếp hạng Ứng viên cho HR.
* **Description:** Cung cấp cho HR danh sách ứng viên đã nộp đơn cho một Job, tự động sắp xếp theo `Match Score` từ cao xuống thấp.
* **Actor:** HR.
* **Precondition:** HR truy cập danh sách ứng tuyển của Job.
* **Main Flow:**
  1. HR chọn một Job cụ thể trong Dashboard.
  2. Hệ thống truy vấn danh sách `Application` thuộc Job đó, join với `MatchResult`.
  3. Sắp xếp danh sách theo `overall_score DESC`. Tiêu chí phụ khi bằng điểm: `applied_at ASC`.
  4. Hiển thị thông tin Card từng ứng viên: Họ tên, Headline, Match Score %, Kỹ năng trùng (Matching Skills), Kỹ năng thiếu (Missing Skills).
  5. Hỗ trợ lọc theo Threshold (Ví dụ: Score $\ge 70\%$) và lọc theo kỹ năng bắt buộc.
* **Alternative Flow:** Không có ứng viên nộp đơn: Hiển thị Empty State với hình ảnh minh họa và thông điệp rõ ràng.
* **Exception:** Lỗi kết nối CSDL: Hiển thị Error State với nút "Thử lại" (Retry).
* **Postcondition:** HR xem được danh sách ứng viên được xếp hạng trực quan.
* **Priority:** High (MVP Mandatory)
* **Acceptance Criteria:** Tốc độ tải danh sách Top 50 ứng viên đã xếp hạng $< 1\text{ giây}$.

### FR-EXPLAIN-001: Trình diễn Minh chứng & Giải thích AI Matching
* **ID:** `FR-EXPLAIN-001`
* **Name:** Xem Báo cáo Giải thích AI Matching.
* **Description:** Hiển thị bảng phân tích chuyên sâu giải thích vì sao ứng viên đạt số điểm tương ứng, đính kèm trích dẫn văn bản thực tế trong CV làm minh chứng.
* **Actor:** HR.
* **Precondition:** HR nhấn chọn vào một Ứng viên trong bảng xếp hạng.
* **Main Flow:**
  1. HR chọn nút "Xem chi tiết AI Matching" của ứng viên.
  2. Hệ thống tải thông tin chi tiết từ `match_results`, `match_factors`, và `evidences`.
  3. Hiển thị Giao diện Modal/Detail:
     * **Badge Match Score:** Vòng tròn màu (Xanh lá $\ge 80\%$, Vàng $50-79\%$, Đỏ $< 50\%$).
     * **Bảng Kỹ năng:** Danh sách Kỹ năng trùng khớp (có tích xanh $\checkmark$) và Kỹ năng còn thiếu (dấu $\times$ đỏ).
     * **So sánh Kinh nghiệm:** Yêu cầu JD (VD: 3 năm) vs CV (VD: 4 năm) $\Rightarrow$ Trạng thái Đạt.
     * **Khu vực Trích dẫn Minh chứng (Evidence Snippets):** Trích văn bản nguyên gốc trong CV (VD: *"Đã xây dựng hệ thống Microservices bằng Java Spring Boot cho 500k users..."*).
     * **Tóm tắt đánh giá của AI:** 2–3 câu nhận xét tổng quan không ảo giác.
* **Alternative Flow:** Không có.
* **Exception:** Chưa hoàn tất matching: Hiển thị trạng thái "Đang phân tích AI..." kèm Spinner.
* **Postcondition:** HR nắm rõ căn cứ đánh giá của AI mà không cần đọc lại toàn bộ file CV.
* **Priority:** High (MVP Mandatory)
* **Acceptance Criteria:** 100% trích dẫn minh chứng hiển thị phải khớp chính xác với đoạn văn bản xuất hiện trong CV của ứng viên.
