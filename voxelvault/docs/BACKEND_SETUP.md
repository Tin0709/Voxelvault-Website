# Thiết lập backend VoxelVault

## 1. Kiến trúc đã chọn

- React gọi Supabase Auth để đăng ký/đăng nhập và giữ phiên.
- Node API xác minh access token bằng Supabase Auth trước các thao tác riêng tư.
- PostgreSQL lưu hồ sơ, bài, nguồn credit, file và trạng thái upload. RLS bảo vệ truy cập trực tiếp.
- Ảnh showcase: Supabase bucket `showcase` công khai, tối đa 50.000.000 byte/ảnh.
- File đính kèm ≤ 5.000.000 byte: Supabase bucket `attachments` riêng tư.
- File đính kèm > 5.000.000 và ≤ 50.000.000 byte: R2 Standard riêng tư.
- File lớn hơn: link ngoài, tách khỏi link credit và chỉ API chủ sở hữu trả về.
- API nhận file và kiểm tra số byte trước khi lưu, rồi kiểm tra metadata tại storage.
  Download file riêng tư cũng đi qua API, không phát URL công khai hoặc URL ký có thể chia sẻ.
  Máy chủ API cần chịu được request 50 MB, RAM cho tối đa 4 upload đồng thời và băng thông tải file.

Code đã được chuẩn bị; chưa có kết nối cloud thực tế khi chưa điền biến môi trường.

## 2. Tạo Supabase

1. Mở https://supabase.com/dashboard và tạo tài khoản/organization.
2. Tạo project `voxelvault`, chọn Free để bắt đầu, khu vực gần người dùng.
3. Tự đặt/lưu database password trong password manager. Không đưa password vào frontend/chat.
4. Trong Connect hoặc Settings → API Keys, lấy Project URL và publishable key (`sb_publishable_...`).
5. Điền vào `.env.local` (copy từ `.env.example` nếu chưa có):

   ```dotenv
   VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
   VITE_AUTH_PROVIDERS=google,facebook
   VITE_API_URL=
   ```

6. Lấy secret key phía server hoặc legacy `service_role` key ở API Keys. Điền riêng vào
   `.env.server.local` theo `.env.server.example`: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
   Tuyệt đối không đặt key này vào biến `VITE_*`. Nó có quyền bỏ qua RLS.
7. Mở SQL Editor, chạy **một lần** toàn bộ `supabase/migrations/202609220001_initial.sql`
   trên project mới/trống. Migration tạo các bảng, hàm, RLS và hai bucket; không tự tạo bucket trước.
8. Authentication → URL Configuration:
   - Site URL: `http://localhost:5173` khi phát triển.
   - Redirect URLs: thêm chính xác `http://localhost:5173/login`.
   - Khi triển khai, chuyển Site URL sang HTTPS thật và thêm `https://TEN-MIEN/login`.
9. Email/password đã được nối trong UI. Nếu bật Confirm email, cần xác nhận email trước
   khi đăng nhập. Cấu hình SMTP riêng trước khi mở đăng ký rộng rãi; dịch vụ email mặc định
   không phù hợp gửi email production cho mọi người.

Tài khoản mới được trigger tạo hồ sơ và quota, không tạo bài/file mẫu.
Quota khởi đầu trong migration là **200 MB/tài khoản**, gồm ảnh, file và upload đang chờ;
đây là cấu hình ban đầu có thể sửa, không phải dung lượng miễn phí nhà cung cấp cấp cho từng user.
Chỉ người quản trị thay đổi `storage_accounts.quota_bytes` bằng SQL; người dùng không tự tăng quota.

Nguồn: https://supabase.com/docs/guides/getting-started/quickstarts/reactjs
và https://supabase.com/docs/guides/storage/buckets/fundamentals

## 3. Google

1. Vào https://console.cloud.google.com/ tạo project cho VoxelVault.
2. Trong Google Auth Platform, khai báo Branding, Audience và thông tin liên hệ.
   Khi để Testing, thêm tài khoản Google của bạn vào danh sách test users nếu được yêu cầu.
3. Tạo OAuth client loại **Web application**.
4. Authorized JavaScript origins: `http://localhost:5173`.
5. Authorized redirect URIs: copy callback tại Supabase → Authentication → Sign In / Providers → Google.
   Với hosted project, dạng `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`.
   Đây là callback về Supabase, KHÔNG phải `/login` của React.
6. Copy Client ID và Client Secret vào provider Google trong Supabase, bật provider rồi Save.
7. Chỉ cần các scope đăng nhập cơ bản: openid, email, profile. Không xin quyền Google Drive.
8. Bật `google` trong `VITE_AUTH_PROVIDERS`, khởi động lại Vite, thử đăng nhập.

Nguồn: https://supabase.com/docs/guides/auth/social-login/auth-google

## 4. Facebook và provider khác

1. Vào https://developers.facebook.com/, tạo ứng dụng có Facebook Login.
2. Trong Facebook Login settings, thêm **Valid OAuth Redirect URI** lấy từ provider Facebook
   trong Supabase: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`.
3. Bật/configure quyền email theo hướng dẫn của Meta/Supabase.
4. Copy App ID và App Secret vào provider Facebook trong Supabase, bật rồi Save.
5. Trong giai đoạn Development, thử bằng tài khoản có vai trò admin/developer/tester của app.
6. Khi mở cho người dùng thật, hoàn tất các yêu cầu Live mode, privacy policy và data deletion
   mà Meta hiển thị cho app của bạn. Không giả định nút UI có nghĩa provider đã được duyệt.

Nguồn: https://supabase.com/docs/guides/auth/social-login/auth-facebook

UI cũng hỗ trợ `github`, `discord`, `azure` (Microsoft). Mỗi provider cần ứng dụng OAuth
và cấu hình riêng trong Supabase. Chỉ thêm provider đã cấu hình vào `VITE_AUTH_PROVIDERS`.
Danh sách: https://supabase.com/docs/guides/auth/social-login

## 5. Cloudflare R2 Standard

1. Tạo tài khoản tại https://dash.cloudflare.com/ và xác nhận email.
2. Mở **Storage & databases → R2 → Overview**, hoàn tất bước kích hoạt subscription.
   Nếu xuất hiện checkout/billing/thẻ/điều khoản, bạn tự xem và hoàn tất trên Cloudflare.
3. Create bucket → tên `voxelvault-private` → chọn **Standard**.
4. Giữ bucket riêng tư: không bật public `r2.dev`, không gắn public custom domain.
5. Trong R2 → Manage R2 API Tokens, tạo token với quyền **Object Read & Write**,
   giới hạn vào bucket `voxelvault-private`.
6. Lưu Access Key ID và Secret Access Key ngay khi tạo; secret thường chỉ được hiển thị lúc đó.
   Copy Account ID của tài khoản Cloudflare.
7. Điền vào `.env.server.local`:

   ```dotenv
   R2_ACCOUNT_ID=YOUR_ACCOUNT_ID
   R2_ACCESS_KEY_ID=YOUR_ACCESS_KEY_ID
   R2_SECRET_ACCESS_KEY=YOUR_SECRET_ACCESS_KEY
   R2_BUCKET=voxelvault-private
   APP_ORIGIN=http://localhost:5173
   PORT=8787
   ```

Không cần CORS trên bucket cho bản API này: trình duyệt gửi file tới Node, Node gọi R2.
Không cần tạo tài khoản AWS dù SDK có tên `@aws-sdk/client-s3`.

Tại thời điểm kiểm tra, free tier của R2 Standard gồm 10 GB-month storage, 1 triệu
Class A và 10 triệu Class B request/tháng. Vượt phần miễn phí sẽ phát sinh phí;
đây không phải gói tự chặn chi phí. Free tier không áp dụng Infrequent Access.
Theo dõi usage/billing, giới hạn số tài khoản thử nghiệm và quota trước khi mở công khai.

Nguồn:
- https://developers.cloudflare.com/r2/get-started/
- https://developers.cloudflare.com/r2/api/tokens/
- https://developers.cloudflare.com/r2/pricing/

## 6. Chạy local

Node 22.16+; mở hai terminal trong thư mục dự án:

```powershell
npm run server
```

```powershell
npm run dev
```

Nếu npm trên máy vẫn lỗi đường dẫn Roaming/npm, dùng trực tiếp:

```powershell
node --env-file-if-exists=.env.server.local server/index.js
node node_modules/vite/bin/vite.js
```

Vite proxy `/api` về `127.0.0.1:8787`. Sau khi đổi env phải khởi động lại cả server và Vite.
`http://127.0.0.1:8787/api/health` chỉ trả trạng thái cấu hình, không trả secret;
`configured: true` chưa chứng minh credentials đúng hoặc migration đã được chạy.

## 7. Kiểm tra kết nối thật sau cấu hình

1. Đăng ký/Google login; My Posts trống, dung lượng 0; Explore trống nếu chưa có bài nào.
2. Tạo bài với một ảnh, file 1 MB, file 6 MB, một link ngoài và credit.
3. Preview → Publish. Thanh tiến trình là byte đã gửi tới API; sau đó chờ xác minh storage.
4. Kiểm tra ảnh và file nhỏ trong Supabase, file 6 MB trong R2. File đúng 50 MB được nhận,
   50 MB + 1 byte bị chặn; chọn file không hợp lệ làm ảnh bị API từ chối.
5. Reload; bài vẫn tồn tại. Tải file và so sánh nội dung/hash với bản gốc.
6. Dùng tài khoản thứ hai: xem được ảnh; không thấy link ngoài/file riêng tư; gọi trực tiếp
   `/api/files/FILE_ID` với token tài khoản thứ hai phải nhận 404; sửa/xóa bài cũng bị từ chối.
7. Sửa bài, bỏ file rồi Save; xóa bài. Dung lượng chỉ giảm sau khi object thực sự bị xóa.
8. Ngắt mạng khi upload, thử Retry save. Upload thành công trong lần thử trước được tái sử dụng
   trong phiên editor hiện tại; file mồ côi được dọn sau 24 giờ.

Lệnh dọn file (cần cấu hình chạy định kỳ, ví dụ mỗi giờ trên host backend):

```powershell
npm run storage:cleanup
```

Job xử lý file đã đánh dấu xóa và upload không gắn bài sau 24 giờ. Nếu provider lỗi,
record vẫn còn để lần sau thử lại và dung lượng chưa được trả về quota.

## 8. Trước production

- Chạy API trên host Node có HTTPS/reverse proxy; backend này không phải Cloudflare Worker.
- Cấu hình `HOST=0.0.0.0` nếu host/container yêu cầu; local mặc định bind 127.0.0.1.
- Cấu hình APP_ORIGIN đúng một origin frontend; cấu hình frontend API URL hoặc reverse proxy `/api`.
- Giới hạn body ít nhất 50 MB, timeout phù hợp và rate limit tại proxy; API giới hạn 4 upload
  đồng thời mỗi process. Theo dõi RAM và băng thông vì download đi qua API.
- Chạy cleanup định kỳ, theo dõi failure; không xóa object bằng tay vì sẽ làm metadata lệch.
- Quota tài khoản không thay thế giới hạn chi phí toàn dịch vụ; phải theo dõi tổng usage.
- Kiểm tra đủ OAuth, SMTP, policy và hai tài khoản thật trước khi mở đăng ký công khai.
- Chưa hỗ trợ resume/multipart upload, xóa tài khoản tự phục vụ, quên mật khẩu hay quản trị quota qua UI.

Các bài test cục bộ sử dụng PostgreSQL nhúng với schema auth/storage giả lập.
Chúng kiểm tra SQL và RLS của ứng dụng; không thay thế kiểm thử Supabase Auth/Storage/R2 thật.

## 9. Kiểm thử tích hợp với dịch vụ thật

Khi Vite (5173) và API (8787) đang chạy với cấu hình hiện tại:

```powershell
node tests/live-backend.js --run
```

Lệnh này đọc hai file môi trường trên máy, tạo hai tài khoản kiểm thử được xác nhận
qua Admin API (không gửi email), upload một ảnh PNG, một file nhỏ và một file
5.000.001 byte. Nó tạo một bài công khai tạm, kiểm tra quyền truy cập qua API và
RLS, so sánh SHA-256 khi tải file, sửa bài, từ chối phiên bản cũ, xóa bài và kiểm
tra object đã được xóa cùng quota trở về 0. Khối `finally` dọn dữ liệu và tài khoản
do chính lần chạy tạo ra. Không ngắt tiến trình giữa chừng vì có thể làm dở cleanup.
Không chạy cùng bộ test cục bộ mặc định; chỉ chạy khi chủ động kiểm tra dịch vụ thật.

Ngày 22/09/2026: toàn bộ kịch bản trên đã đạt với cấu hình phát triển hiện tại,
bao gồm upload/download Supabase và R2, và dữ liệu kiểm thử đã được xóa.
Kiểm thử này không điều khiển trình duyệt: vẫn cần kiểm tra kéo thả, tiến trình
upload trên giao diện, mobile và hành vi retry khi mạng gián đoạn.
