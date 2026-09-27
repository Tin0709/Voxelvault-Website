# VoxelVault

React/Vite frontend + Node API, Supabase Auth/database/storage và Cloudflare R2.

## Development

`npm ci`, cấu hình `.env.local` và `.env.server.local` theo các file example, rồi chạy `npm run server` và `npm run dev` ở hai terminal.

## Kiểm tra

`npm run lint`, `npm test`, `npm run build`.

## Production

`npm start` phục vụ `dist` cùng `/api`; cần build trước và khai báo biến môi trường server.

Xem [hướng dẫn Render Free](docs/DEPLOY.md) và [cấu hình backend](docs/BACKEND_SETUP.md).
