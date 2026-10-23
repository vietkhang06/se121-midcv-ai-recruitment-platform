# Báo cáo sửa build và startup backend — 22/10/2026

## Kết quả tóm tắt

Backend build và khởi động thành công bằng Maven trực tiếp và qua đúng chuỗi `start-dev.bat` → PowerShell → Maven. Test database dùng để xác minh là PostgreSQL disposable riêng, không phải database cấu hình chính. Đã áp dụng nâng cấp V20→V24 trên database disposable; Hibernate `ddl-auto=validate` khởi tạo thành công. Không chạy ứng dụng trên database chính.

| Hạng mục | Kết quả | Bằng chứng |
|---|---|---|
| JDK / Maven | PASS | JBR JDK 21.0.11; Maven 3.9.16 báo runtime JDK 21.0.11 |
| Clean compile | PASS | Maven biên dịch sạch 221 source chính và 83 source test với `release 21` |
| Test auth/OAuth | PASS | 19 tests, 0 failures/errors |
| Flyway upgrade disposable | PASS | `midcv_test` từ V20 lên V24, 4 migrations thành công |
| Hibernate schema validation | PASS | `EntityManagerFactory` khởi tạo; `ddl-auto: validate` giữ nguyên |
| Direct Maven startup | PASS | `Started RecruitmentApplication`, HTTP `GET /api/v1/jobs` trả 200 |
| `start-dev.bat` backend startup | PASS | backend-only diagnostic, cùng DB disposable, endpoint trả 200 |
| Full start-dev (worker/frontend) | NOT TESTED | Chế độ kiểm chứng chỉ chạy backend để không khởi chạy dịch vụ ngoài phạm vi |
| Fresh database migration | NOT TESTED | Đã kiểm chứng đường nâng cấp từ schema V20 trên database disposable có sẵn |
| OAuth Google/GitHub thật | NOT TESTED | Không nằm trong phần build/startup và không dùng provider credentials |

## Baseline và phạm vi dữ liệu

Branch `master`, HEAD `1c171a24bc4c1374ddef19f33306293135380da8`. Trước khi bắt đầu, Git status đã chứa nhiều thay đổi và file chưa track từ lượt trước. Các thay đổi đó được giữ nguyên; không reset, xóa, stage, commit hay push.

`.env` hiện cấu hình `localhost:5432/airecruit_db`. Chỉ đọc metadata container dự án: `airecruit-postgres-pgvector` healthy, DB `airecruit_db`, cổng 5432, Flyway phiên bản mới nhất V24. Không khởi động ứng dụng trên DB này và không chạy migration/schema validation vào đó. Kiểm chứng ghi thay đổi chỉ diễn ra trong container test riêng `midcv-w3w7-test-pg-20261018`, volume `midcv-w3w7-test-pgdata-20261018`, cổng 55432, database `midcv_test`. Container test ban đầu stopped, được khởi động để kiểm tra, được dừng lại sau đó; volume và dữ liệu giữ nguyên ở V24. Startup runner đã thêm một tài khoản bootstrap ADMIN vào database disposable; không có dữ liệu nào được xóa.

## Nguyên nhân và cách sửa

### OAuth entity/migration

- `OAuthPendingRegistration` không khai báo identifier dù `ticket_hash` là primary key trong V24. Đã đánh dấu chính `ticketHash` làm `@Id`; không thêm generated ID.
- Migration V21 khai báo `state_hash` và `oauth_login_tickets.ticket_hash` là `CHAR(64)`; V24 khai báo pending-registration `ticket_hash` cũng là `CHAR(64)`. Source đã có mapping CHAR cho state nhưng thiếu cho ticket và pending-registration. Đã rà cả ba và dùng `@JdbcTypeCode(SqlTypes.CHAR)` đúng các cột hash.
- `OAuthAccount` tiếp tục dùng khóa ghép tự nhiên `(provider, provider_subject)` như primary key V21 và `IdClass`; không thay ID hoặc quy tắc OAuth. Các repository vẫn dùng ID type tương ứng.
- Không sửa các migration đã có và không cần migration bổ sung. Disposable DB ở V20 đã validate rồi áp V21–V24; Hibernate sau đó validate toàn bộ entity mapping.

### Compiler và bytecode

- Cấu hình Java 21 trước đây dựa vào release mặc định của Spring Boot parent, còn startup script chỉ nhìn Java trên PATH và không đặt `JAVA_HOME`. Nếu PATH và `JAVA_HOME` khác JDK, Maven có thể chạy bằng JDK khác (lịch sử đã từng chọn JDK 25), gây tương thích Lombok/compiler.
- POM giờ khai báo rõ `maven.compiler.release=21`, `lombok.version=1.18.34` dùng chung cho dependency và annotation processor. Không nâng dependencies khác.
- Startup script chọn JDK 21, đặt `JAVA_HOME` và prepend `PATH`, rồi xác nhận cả `java`, `javac` lẫn Java runtime báo bởi Maven đều là 21.
- Maven output dùng `target/classes-mvn` và `target/test-classes-mvn`; thư mục `backend/bin` là bản cũ, không nằm trong execution chain của script. Một lần gọi Maven không clean gặp `Access is denied` khi resources plugin ghi đè `target/classes-mvn/application.yml`, file đích có thuộc tính Windows ReadOnly. `start-dev` nay chạy `mvn clean spring-boot:run`, loại bỏ output cũ trước khi build. Direct commands dưới đây cũng dùng `clean`.
- `ClassFormatError: Invalid method Code length 0` không còn tái hiện. `javap` đọc được `AdminAuditLog.class` tại output cũ trước clean; clean build đã biên dịch lại toàn bộ và ứng dụng khởi tạo thành công. Không có bằng chứng để quy lỗi lịch sử cho source `AdminAuditLog`; không thay source/timestamp hoặc chép class cũ.
- `TypeTag :: UNKNOWN` không tái hiện với JDK 21.0.11 và Lombok 1.18.34.

### start-dev và database readiness

- Trước đây `start-dev.ps1` kiểm Java từ PATH nhưng không đồng bộ Maven runtime; không nạp `.env`; gọi Docker trước khi phân tích endpoint; và dùng compose/container hardcode. Đã thêm nạp `KEY=VALUE` an toàn (không evaluate nội dung, không in secrets, biến môi trường caller được ưu tiên), kiểm tra JDK/Maven, phân tích `DATABASE_URL`, chỉ in host/port/database, đợi TCP endpoint tối đa 60 giây và chỉ gọi compose nếu endpoint đúng local compose DB của repository.
- Compose lấy password từ `DATABASE_PASSWORD` khi cần tạo DB mới; volume/database hiện hữu không bị reset hay thay credentials.
- Backend chạy trong thư mục `backend` đã resolve, path được quote, dùng `mvn clean spring-boot:run`; port 8080 đang bị chiếm nhưng không phục vụ endpoint jobs thì script báo lỗi và không dừng process lạ.
- `start-dev.bat` nay chuyển tiếp tham số và trả lại exit code thật của PowerShell thay vì để `pause` biến lỗi thành exit 0.
- Thêm `-BackendOnly` và `-SkipLlmPreflight` để có thể kiểm chứng entry point mà không mở worker/frontend hoặc gọi dịch vụ LLM bên ngoài; mặc định launcher vẫn theo luồng worker/frontend hiện có.

## Lệnh và kết quả

Môi trường kiểm chứng: Windows 11, `C:\Users\Khang\.jdks\jbr-21.0.11`, JDK/Javac 21.0.11, Maven 3.9.16. Maven gọi từ console có in thêm dòng `Access is denied.` nhưng `mvn -version` trả exit 0, báo đúng runtime JDK 21; clean compile/start đều hoàn tất.

Lệnh test tập trung (PowerShell, tại `backend/`):

```powershell
$env:JAVA_HOME = 'C:\Users\Khang\.jdks\jbr-21.0.11'
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
mvn -o "-DargLine=-javaagent:C:\Users\Khang\.m2\repository\net\bytebuddy\byte-buddy-agent\1.14.18\byte-buddy-agent-1.14.18.jar" "-Dtest=OAuthEntityMappingTest,OAuthServiceStateTest,AuthServiceTest,JwtAuthenticationFilterTest" clean test
```

Kết quả: **19 tests passed, 0 failed, 0 errors**. Một lần chạy toàn bộ suite không gắn Byte Buddy agent bị ngắt khi test đầu tiên khởi tạo Mockito/dynamic agent; không ghi nhận đó là test pass. Test tập trung với agent chạy hết.

Direct startup đã chạy `mvn clean spring-boot:run` từ `backend/`, với `DATABASE_URL` chỉ override trong tiến trình để trỏ `127.0.0.1:55432/midcv_test` và credentials lấy nội bộ từ container test. Log ghi `Started RecruitmentApplication`; `GET http://127.0.0.1:8080/api/v1/jobs` trả **200**. Sau smoke check, đúng PID do lần chạy tạo đã dừng.

Qua entry point thật:

```powershell
. .\scripts\Import-MidcvEnv.ps1 -EnvFile .env -PreserveExistingEnvironment
# Trong cửa sổ kiểm chứng, DATABASE_URL/username/password được override trong process
# để trỏ database disposable; file .env không bị sửa.
.\start-dev.bat -BackendOnly -SkipLlmPreflight
```

Script xác nhận JDK 21, Maven JDK 21, DB endpoint responsive, báo backend ready; HTTP smoke check trả **200** và process còn sống đến sau smoke check. Process Java do lượt test tạo sau đó đã dừng. Một kiểm tra lỗi với cổng DB không tồn tại cũng trả exit code **1**, xác nhận batch giữ đúng trạng thái thất bại.

`mvn clean test` (đầy đủ) chưa được xác nhận hết toàn suite; lệnh kiểm thử xác nhận trong báo cáo là 19 test tập trung. `git diff --check` đạt; Git in cảnh báo line-ending LF→CRLF cho nhiều file dirty có từ baseline, không có whitespace error.

## File thay đổi của lượt sửa này

Các file source đã chỉnh:

- `backend/pom.xml`
- `backend/src/main/java/com/platform/recruitment/auth/OAuthAccount.java`
- `backend/src/main/java/com/platform/recruitment/auth/OAuthLoginTicket.java`
- `backend/src/main/java/com/platform/recruitment/auth/OAuthPendingRegistration.java`
- `docker-compose.yml`
- `scripts/Import-MidcvEnv.ps1`
- `scripts/start-dev.ps1`
- `start-dev.bat`

File mới của lượt này:

- `backend/src/test/java/com/platform/recruitment/auth/OAuthEntityMappingTest.java`
- `docs/BACKEND_BUILD_STARTUP_REPAIR_20261022.md` (báo cáo này)

File bị xóa: **không có**. Các file OAuth Java trên vốn đã có trong cây chưa track từ lượt trước; lượt này chỉ sửa mapping của chúng. Không sửa file migration, `.env`, `AdminAuditLog` hoặc dữ liệu DB chính.

## Cách chạy

Maven trực tiếp, từ `backend/`:

```powershell
$env:JAVA_HOME = 'C:\Users\Khang\.jdks\jbr-21.0.11'
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
mvn clean test
mvn clean spring-boot:run
```

Máy khác nên đặt `MIDCV_JDK21_HOME` trỏ tới thư mục JDK 21; launcher dùng giá trị đó trước `JAVA_HOME`/PATH. Chạy mặc định qua repository root bằng `.\start-dev.bat`. Chế độ chẩn đoán backend-only: `.\start-dev.bat -BackendOnly -SkipLlmPreflight`.

## Việc chưa nghiệm thu

- Chưa chạy fresh migration trên database mới; đã chạy upgrade V20→V24 và validate thành công trên disposable.
- Database chính đang V24 theo truy vấn metadata chỉ đọc, nhưng không khởi chạy app trên DB chính và không thực hiện Hibernate validation ở đó.
- Không chạy full start-dev gồm worker/frontend; chỉ kiểm chứng nhánh backend để cô lập mục tiêu và tránh khởi động dịch vụ ngoài phạm vi.
- Không kiểm tra browser/password-auth smoke trên bản chạy, nhưng `AuthServiceTest` và `JwtAuthenticationFilterTest` đều đạt.
- OAuth provider round-trip thật chưa được kiểm tra.
