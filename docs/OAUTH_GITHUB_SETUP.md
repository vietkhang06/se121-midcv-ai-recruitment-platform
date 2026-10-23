# Cấu hình OAuth và GitHub — MidCV

Ngày cập nhật: 21/10/2026

## Biến môi trường backend

Đặt các biến trong môi trường chạy backend (không đặt secret trong `frontend/.env*`):

- `BACKEND_PUBLIC_URL`: origin backend; local mặc định `http://localhost:8080`.
- `FRONTEND_PUBLIC_URL`: origin frontend; local mặc định `http://localhost:3000`.
- `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`.
- `GITHUB_OAUTH_CLIENT_ID`, `GITHUB_OAUTH_CLIENT_SECRET`.

Giá trị ví dụ đã được thêm vào `.env.example`; file này không chứa thông tin đăng nhập dùng được. Không gửi secret qua chat, URL, log hoặc mã nguồn.

## Callback URL chính xác

Đăng ký callback sau trong cấu hình ứng dụng OAuth của provider:

- Google: `${BACKEND_PUBLIC_URL}/api/v1/auth/oauth/google/callback` (local: `http://localhost:8080/api/v1/auth/oauth/google/callback`).
- GitHub: `${BACKEND_PUBLIC_URL}/api/v1/auth/oauth/github/callback` (local: `http://localhost:8080/api/v1/auth/oauth/github/callback`).

Đặt Authorized JavaScript origins của Google theo frontend origin khi Google Console yêu cầu; luồng token/callback vẫn chạy server-side qua backend. Khi triển khai HTTPS, cấu hình URL public HTTPS chính xác đồng thời ở provider và biến môi trường.

## Tạo ứng dụng provider

### Google

1. Mở Google Cloud Console, chọn project, vào **APIs & Services → OAuth consent screen**. Hoàn tất thông tin ứng dụng và thêm tài khoản của bạn vào **Test users** nếu publishing status là Testing.
2. Vào **APIs & Services → Credentials → Create Credentials → OAuth client ID**, chọn **Web application**.
3. Thêm `http://localhost:3000` vào **Authorized JavaScript origins** và `http://localhost:8080/api/v1/auth/oauth/google/callback` vào **Authorized redirect URIs**. Redirect URI phải khớp chính xác.
4. Sao chép client ID và client secret vào biến backend `GOOGLE_OAUTH_CLIENT_ID` và `GOOGLE_OAUTH_CLIENT_SECRET`.

### GitHub

1. Mở GitHub **Settings → Developer settings → OAuth Apps → New OAuth App** (hoặc chọn app hiện có).
2. Điền Homepage URL `http://localhost:3000` và Authorization callback URL `http://localhost:8080/api/v1/auth/oauth/github/callback`, sau đó lưu.
3. Tạo/reset client secret nếu cần. Đặt Client ID và secret ở backend lần lượt là `GITHUB_OAUTH_CLIENT_ID` và `GITHUB_OAUTH_CLIENT_SECRET`.

### Chạy cục bộ

Trong file `.env` ở root repository (không commit), đặt `BACKEND_PUBLIC_URL=http://localhost:8080` và `FRONTEND_PUBLIC_URL=http://localhost:3000` cùng bốn biến client ID/secret ở trên. Không đặt secret trong `frontend/.env*`. Khởi động lại backend sau khi đổi env; giữ frontend ở origin `http://localhost:3000`. Không gửi giá trị secret qua chat. Khi bạn báo đã cấu hình, có thể kiểm tra sự hiện diện của tên biến (không đọc/in giá trị) rồi thực hiện provider round-trip thật cùng bạn.

Tài liệu chính thức: [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect), [Google OIDC reference](https://developers.google.com/identity/openid-connect/reference), [GitHub OAuth authorization](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps), [GitHub OAuth best practices](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/best-practices-for-creating-an-oauth-app).

## Quy tắc tài khoản và GitHub scan

- Nút OAuth đi tới `GET /api/v1/auth/oauth/{google|github}/start`; callback dùng state dùng một lần, PKCE (GitHub/Google code challenge nếu hỗ trợ), OIDC nonce và kiểm tra chữ ký/issuer/audience/expiry/email_verified của Google.
- Callback cấp ticket ngẫu nhiên dùng một lần, thời hạn 60 giây; frontend đổi ticket lấy phiên ứng dụng bằng `POST /api/v1/auth/oauth/exchange`. Ticket không phải access token và không nằm trong query redirect.
- Email trùng không tự gộp tài khoản. Liên kết tài khoản đã đăng nhập qua `POST /api/v1/auth/oauth/{provider}/link`, sau đó hoàn tất provider flow.
- Email GitHub private/thiếu đi tới `/oauth/complete` để nhập email và đi theo bước xác minh email hiện có. Provider không thể cấp role recruiter/admin; OAuth đăng ký candidate.
- GitHub account connection chỉ xác minh quyền sở hữu danh tính public, không cấp quyền private repository. Username nhập tay vẫn là public-only. Nối tài khoản xong, ứng viên cần đồng bộ lại GitHub để trạng thái/điểm được tính lại.
- Nếu hủy consent, provider từ chối, callback hết hạn hoặc tài khoản xung đột, quay lại trang đăng nhập với thông báo tổng quát. Không tự xóa liên kết; đăng xuất/kết nối lại bằng trang tài khoản.

## Trạng thái kiểm chứng

Source và kiểm thử mock/unit đã được chạy; chưa có OAuth client credentials nên chưa thực hiện consent/callback round-trip thật. Xem báo cáo triển khai và checklist nghiệm thu để phân biệt kiểm thử tự động với nghiệm thu provider thật.
