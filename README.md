# Zirect Label — Backend

RESTful API server cho nền tảng quản lý và phân phối âm nhạc **Zirect Label**, được xây dựng với Node.js, Express, TypeScript và Prisma ORM.

## Tech Stack

| Công nghệ | Vai trò |
|-----------|---------|
| **Node.js + Express** | HTTP server & routing |
| **TypeScript** | Type safety |
| **Prisma ORM** | Database ORM & migrations |
| **PostgreSQL** | Cơ sở dữ liệu chính |
| **JWT** | Xác thực người dùng |
| **Cloudinary** | Lưu trữ ảnh bìa album, avatar |
| **Bcryptjs** | Mã hóa mật khẩu |
| **Helmet + CORS** | Bảo mật HTTP headers |

## Cấu trúc thư mục

```
zirect-label-backend/
├── prisma/
│   ├── migrations/         # Lịch sử thay đổi schema database
│   ├── schema.prisma       # Định nghĩa data model
│   └── seed.ts             # Dữ liệu mẫu khởi tạo
├── src/
│   ├── config/             # Cấu hình môi trường (DB, Cloudinary, ...)
│   ├── controllers/        # Xử lý logic nghiệp vụ cho từng tính năng
│   ├── middleware/         # Auth middleware, error handler
│   ├── models/             # Khởi tạo Prisma client
│   ├── routes/             # Định nghĩa API endpoints
│   ├── schemas/            # Validation schemas (express-validator)
│   ├── services/           # Tích hợp dịch vụ ngoài (Cloudinary, YouTube, Spotify)
│   ├── utils/              # Các hàm tiện ích dùng chung
│   ├── app.ts              # Khởi tạo Express app, middleware, routes
│   └── index.ts            # Entry point — khởi động server
├── .env.example            # Template biến môi trường
├── .env.development        # Cấu hình môi trường development
├── .env.production         # Cấu hình môi trường production
├── package.json
└── tsconfig.json
```

## API Endpoints

| Nhóm | Prefix | Mô tả |
|------|--------|-------|
| Auth | `/api/auth` | Đăng nhập, đăng ký, xác thực JWT |
| Artists | `/api/artists` | Quản lý hồ sơ nghệ sĩ |
| Albums | `/api/albums` | Quản lý album, track, upload |
| Revenue | `/api/revenue` | Doanh thu, thanh toán, lịch sử |
| Analytics | `/api/analytics` | Thống kê streams theo nền tảng |
| Dashboard | `/api/dashboard` | Tổng quan hệ thống (admin) |
| Sync | `/api/sync` | Đồng bộ dữ liệu Spotify / YouTube |
| Upload | `/api/upload` | Upload file lên Cloudinary |
| HomePage | `/api/homepage` | Quản lý nội dung trang chủ |
| Contracts | `/api/contracts` | Tiếp nhận hợp đồng nghệ sĩ mới |

## Database Schema

Hệ thống sử dụng **PostgreSQL** với các model chính:

- **User / Artist** — tài khoản và hồ sơ nghệ sĩ
- **Album / Track** — sản phẩm âm nhạc và các bài hát
- **TrackPlatform** — trạng thái phân phối trên từng nền tảng (Spotify, YouTube Music)
- **Analytics** — dữ liệu streams theo ngày / nền tảng / khu vực
- **PlatformRevenue / PlatformPayment** — doanh thu và thanh toán theo nền tảng
- **RevenueSplit / AlbumCollaborator** — chia doanh thu cho các nghệ sĩ cộng tác
- **PaymentLog** — lịch sử thanh toán qua PayPal
- **ContractSubmission** — đơn đăng ký hợp tác từ nghệ sĩ mới
- **HomePage / FeaturedRelease** — quản lý nội dung trang chủ

## Cài đặt & Chạy dự án

### Yêu cầu

- Node.js >= 18
- PostgreSQL >= 14
- pnpm (khuyến nghị) hoặc npm

### 1. Clone & cài đặt dependencies

```bash
git clone <repo-url>
cd zirect-label-backend
pnpm install
```

### 2. Cấu hình biến môi trường

```bash
cp .env.example .env
```

Chỉnh sửa file `.env` với thông tin thực tế của bạn:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/zirect_label"
JWT_SECRET=your-strong-secret-key-at-least-32-characters
JWT_EXPIRES_IN=7d

PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Cloudinary (upload ảnh)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# YouTube Data API v3
YOUTUBE_API_KEY=your_youtube_api_key

# Spotify Web API
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
```

### 3. Khởi tạo database

```bash
# Chạy migrations để tạo các bảng
pnpm db:deploy

# (Tùy chọn) Seed dữ liệu mẫu
pnpm db:seed
```

### 4. Chạy server

```bash
# Development (hot-reload)
pnpm dev

# Production
pnpm build
pnpm start
```

Server khởi động tại `http://localhost:5000`

## Scripts

| Lệnh | Mô tả |
|------|-------|
| `pnpm dev` | Chạy server development với hot-reload |
| `pnpm build` | Build TypeScript sang JavaScript |
| `pnpm start` | Chạy bản build production |
| `pnpm db:migrate` | Tạo migration mới (development) |
| `pnpm db:deploy` | Áp dụng migrations (production) |
| `pnpm db:seed` | Chạy seed dữ liệu mẫu |
| `pnpm db:studio` | Mở Prisma Studio xem/sửa data |
| `pnpm db:reset` | Reset toàn bộ database |
| `pnpm lint` | Kiểm tra lỗi ESLint |
| `pnpm format` | Format code với Prettier |

## Biến môi trường

Xem file [`.env.example`](./.env.example) để biết danh sách đầy đủ các biến cần cấu hình.

