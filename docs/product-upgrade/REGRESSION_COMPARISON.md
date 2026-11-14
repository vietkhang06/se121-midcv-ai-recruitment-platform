# So sánh regression với source gốc

Cùng 95 lớp test cũ, cùng Java 21 và ByteBuddy premain (môi trường hạn chế self-attach):

| Kết quả | Source ZIP gốc | Bản nâng cấp |
|---|---:|---:|
| PASS | 376 | 376 |
| FAIL | 13 | 13 |
| ERROR | 62 | 62 |
| SKIP | 17 | 17 |
| Tổng | 468 | 468 |

Không có trường hợp từ PASS của bản gốc chuyển sang FAIL/ERROR trong phép so sánh này. Các fixture cũ mong chờ đối sánh được bổ sung đồng ý AI tường minh; fixture xác minh có đủ thông tin mới. Không đổi điều kiện mặc định false trong production để làm test xanh.

Bộ test cũ chưa xanh: có fixture dùng CV chưa CONFIRMED, mock repository không khớp luồng hiện tại, phần cần DB/worker thật chưa được cấu hình cho suite cũ. Kết quả này không được dùng làm bằng chứng hoàn thành nghiệp vụ.

Bằng chứng nghiệm thu nâng cấp là bộ 41 ca HTTP/SMTP/trình duyệt thật trong verification/live-results.json, trên DB riêng chạy đủ V1–V35. Sau thay đổi nhỏ bổ sung ẩn tin khi hồ sơ doanh nghiệp cần thẩm định lại, đã chạy lại build và bộ live; không lặp lại toàn bộ 95 lớp cho riêng thay đổi này.

Lệnh build backend dùng -DskipTests chỉ xác nhận biên dịch và đóng gói; không phải tuyên bố mọi assertion của mvn test đã qua.
