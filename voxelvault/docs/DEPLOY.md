# Deploy VoxelVault trên Render Free

## Phương án đã chuẩn bị

Một Web Service Node chạy frontend đã build và `/api` cùng domain HTTPS. Giữ Supabase database/Auth/storage và R2 hiện có. Không tạo database Render, không cần volume, không tạo cron trả phí. `render.yaml` đặt rõ `plan: free`, region Singapore, Node 22 và giới hạn một upload đồng thời để giảm RAM. Dockerfile là phương án thay thế nếu chuyển sang hosting Docker; không cần Docker cho cấu hình Render này.

## Các bước triển khai

1. Đưa code đã kiểm tra lên GitHub của bạn. Repo hiện có ứng dụng trong thư mục `voxelvault/`; Blueprint path là `voxelvault/render.yaml`, Root Directory là `voxelvault`. Nếu tách repo chỉ chứa ứng dụng thì bỏ `rootDir` và dùng Blueprint path `render.yaml`.
2. Render → New → Blueprint, chọn repo và Blueprint path bên trên. Rà lại service có gói **Free** trước khi tạo. Không tạo Postgres/cron/disk trả phí. Chưa có tài nguyên Render hoặc bản public nào được tạo trong lần chuẩn bị này.
3. Nhập các giá trị `sync: false` được yêu cầu (bảng dưới). Build command là `npm ci --include=dev && npm run build`; start command `npm start`; healthcheck `/api/health`. Nếu tạo Web Service thủ công, dùng cùng các giá trị đó và Node runtime.
4. Render tự cấp domain HTTPS. Server dùng `RENDER_EXTERNAL_URL` làm `APP_ORIGIN` nếu bạn chưa đặt origin. Với custom domain, đặt `APP_ORIGIN=https://<domain>` không có dấu `/` cuối; thêm domain Render vào `APP_ORIGINS` nếu vẫn muốn dùng cả hai.
5. Supabase Authentication → URL Configuration: Site URL là domain HTTPS chính thức; Redirect URLs thêm `https://<domain>/login`. Giữ localhost nếu còn phát triển. Callback trong Google/Facebook vẫn là URL Supabase. Kiểm tra OAuth, email xác nhận và reset password trên domain mới.
6. Mở trang chủ, Explore, View as posts, search và refresh trang con. Đăng nhập, upload, Finish later, mở nháp từ phiên khác, tải attachment và xóa file để kiểm tra quota. Healthcheck chỉ xác nhận tiến trình/cấu hình, không xác nhận kết nối cloud.

## Biến môi trường

Nhập vào Render Environment, không commit hoặc gửi secret qua chat. Các file `.env*` thật không được Git theo dõi và bị loại khỏi Docker context.

| Biến | Nguồn / ý nghĩa |
| --- | --- |
| `VITE_SUPABASE_URL` | `.env.local`, URL dự án |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `.env.local`, public browser key |
| `VITE_AUTH_PROVIDERS` | `google,facebook` hoặc provider đã bật thật |
| `SUPABASE_URL` | `.env.server.local`, cùng dự án với frontend |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env.server.local`, chỉ server |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | `.env.server.local`, chỉ server |
| `IMAGE_SIGNING_SECRET` | Tùy chọn, khóa ổn định; mặc định dùng service-role key |
| `APP_ORIGIN`, `APP_ORIGINS` | Theo domain ở bước 4; origin phụ phân cách dấu phẩy |

Giữ `VITE_API_URL` và `PUBLIC_API_URL` trống vì web/API cùng domain. `NODE_ENV=production`, `HOST=0.0.0.0`, `MAX_CONCURRENT_UPLOADS=1` đã khai báo trong Blueprint. Không chép `HOST=127.0.0.1` hoặc `APP_ORIGIN=http://localhost:5173` từ máy lên hosting. Dùng `PORT` do Render cấp. Thay đổi `VITE_*` cần rebuild.

## Chi phí và giới hạn miễn phí

Render Free ngủ sau 15 phút không hoạt động; lần mở lại thường mất khoảng một phút. Mỗi workspace có 750 giờ Free/tháng. Băng thông và build minutes có hạn; nếu không có payment method thì dịch vụ/build bị tạm dừng khi hết mức, còn có payment method có thể bị tính phí vượt. Không tự nâng gói hoặc thêm dịch vụ trả phí.

Ảnh riêng/R2 đang stream qua backend, vì vậy lưu lượng ảnh/file cũng dùng băng thông Render. Render có thể tạm dừng Free service nếu lưu lượng đi tới database/object storage bên ngoài quá cao. Đây là phương án bắt đầu với ít traffic, không cam kết miễn phí vô hạn. Supabase/R2 vẫn có quota và chính sách tính phí riêng. Không dùng ping giữ service thức.

File người dùng nằm trên Supabase/R2 nên không mất khi Render ngủ/redeploy. Không tạo Render Postgres Free vì không cần thiết và loại database đó hết hạn sau 30 ngày.

## Dọn file và vận hành

Cleanup được gọi khi lưu/xóa bài, xóa nháp và xem storage. Upload bỏ dở/chờ xóa có thể được dọn bằng `npm run storage:cleanup` từ máy với cấu hình server hiện tại, chạy định kỳ thủ công khi cần. Chưa cấu hình lịch cloud tự động; không tạo cron trả phí. File còn gắn với bài, hồ sơ hoặc nháp được bảo vệ bởi database.

Rollback bằng deployment trước trong Render; không rollback/xóa database để sửa lỗi frontend. Migration 006/007 đã áp dụng, không chạy lại. Secret nên nhập trực tiếp vào Environment; không đưa service role hay R2 key vào biến `VITE_*`.

## Kiểm thử

- `npm run lint`
- `npm test` (gồm HTTP production routes/cache/HEAD, chặn đường dẫn secret/source và API không bị SPA fallback)
- `npm run build`
- `npm audit --omit=dev`
- `node tests/smoke-production.js --run`: khởi động production tạm tại 127.0.0.1:18787, đọc feed thật, kiểm tra route và không có secret server trong bundle, rồi tắt tiến trình test. Chỉ đọc dữ liệu cloud.
- `node tests/live-backend.js --run --profiles`: test cloud tạo dữ liệu tạm và tự dọn, dùng API development 5173. Đã đạt ngày 26/09/2026; không mặc định trỏ production.

Chạy thủ công production: `node --env-file=.env.server.local server/index.js --production`, đặt đúng origin/port của lần thử. `npm start` đọc biến runtime, không tự đọc file secret local. Node 22.12+; Docker dùng Node 22. Docker image chưa build thử vì Docker Engine chưa chạy trên máy.

## Tài liệu chính thức

- https://render.com/docs/free
- https://render.com/docs/blueprint-spec
- https://render.com/docs/configure-environment-variables
- https://vite.dev/guide/static-deploy
