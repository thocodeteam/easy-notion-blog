# Hạ tầng và triển khai

## Sơ đồ

```
  Người đọc
     │  https://thocode.com  ──308──>  https://www.thocode.com
     ▼
  DNS (nhà đăng ký tên miền)
     │  thocode.com      A     (IP Vercel)
     │  www.thocode.com  CNAME (CNAME Vercel)
     ▼
  Vercel Edge (CDN, cache trang ISR)
     │
     ▼
  Vercel Serverless Functions
     │  render ISR, /api/blocks, /api/url-metadata
     ▼
  Notion API (database bài viết, database liên hệ)
  Cloudflare Turnstile siteverify (form /lien-he)
                                        Google Analytics 4 (phía trình duyệt)
```

## Thành phần

| Thành phần | Dùng gì |
|---|---|
| Mã nguồn | GitHub, nhánh production `main` |
| Hosting, CDN, function | Vercel (gói Hobby là đủ) |
| Tên miền, DNS | Nhà đăng ký bất kỳ; trỏ A/CNAME về Vercel |
| Nội dung | Một database Notion + một Notion integration |
| Phân tích | Google Analytics 4 (tuỳ chọn) |
| Chống spam form liên hệ | Cloudflare Turnstile (chỉ dùng widget, DNS không cần qua Cloudflare) |
| CI | GitHub Actions (`.github/workflows/lint.yml`, `test.yml`) |

## Dựng một bản deploy mới

1. Chuẩn bị database Notion theo [notion-cms.md](notion-cms.md) và lấy `DATABASE_ID`, `NOTION_API_SECRET`.
2. Trên Vercel: *Add New → Project*, import repo GitHub. Framework preset Next.js, để trống Build/Install/Output command.
3. Thêm biến môi trường (bảng dưới) cho Production, Preview và Development.
4. Deploy. Lần build đầu sẽ gọi Notion để sinh sẵn mọi trang.
5. Gắn domain trong *Settings → Domains*, rồi tạo bản ghi DNS theo giá trị Vercel hiển thị.

### Biến môi trường

| Biến | Bắt buộc | Dùng cho |
|---|---|---|
| `NOTION_API_SECRET` | có | Gọi Notion API. Thiếu thì `next.config.js` throw khi build. |
| `DATABASE_ID` | có | Database bài viết. Thiếu thì build throw. |
| `NEXT_PUBLIC_URL` | nên có | URL gốc của site, ví dụ `https://www.thocode.com`. Cần cho `og:url`, `canonical`, `og:image` mặc định và nút chia sẻ. Thiếu thì các phần này bị bỏ qua, không báo lỗi. |
| `NEXT_PUBLIC_GA_TRACKING_ID` | không | Measurement ID của GA4 |
| `CONTACT_DATABASE_ID` | cho form liên hệ | Database Notion nhận form `/lien-he` (xem [notion-cms.md](notion-cms.md#database-liên-hệ)) |
| `TURNSTILE_SECRET_KEY` | cho form liên hệ | Secret key của widget Cloudflare Turnstile. Đánh dấu *Sensitive* trên Vercel. |
| `TURNSTILE_HOSTNAMES` | cho form liên hệ | Danh sách hostname hợp lệ, cách nhau bởi dấu phẩy, ví dụ `thocode.com,www.thocode.com`. Không đưa `localhost` vào giá trị production. |

Thiếu một trong ba biến của form liên hệ thì site vẫn build và chạy bình thường, chỉ `/api/contact` trả 503. Mỗi hostname trong `TURNSTILE_HOSTNAMES` cũng phải nằm trong danh sách domain của widget trên Cloudflare dashboard, nếu không widget không hiện.

Biến `NEXT_PUBLIC_*` được nhúng vào bundle lúc build: đổi giá trị xong phải deploy lại.

### Phiên bản Node

`package.json` khai `"engines": { "node": "24.x" }`. Giá trị này override setting Node.js trên dashboard Vercel; nếu dashboard ghi phiên bản khác thì build log có warning, bình thường.

## Quy trình deploy

### Production

1. Merge hoặc push vào `main`.
2. Vercel nhận webhook, chạy `npm install` (đọc `.npmrc`) và `npm run build`.
3. Build xong, deployment được gán vào domain production.

Một lần build gọi Notion để lấy danh sách bài và nội dung block của từng bài. Notion API giới hạn khoảng 3 request/giây; với vài chục bài thì không sao, nhưng số bài tăng nhiều sẽ làm build chậm hoặc dính rate limit.

Nút **Redeploy** trên dashboard build lại **commit cũ** của deployment đó. Dùng nó khi chỉ đổi biến môi trường, không dùng để lấy code mới.

### Preview

Vercel mặc định build preview cho mọi nhánh khác `main` và mọi PR. Preview dùng cùng biến môi trường nên đọc cùng database nội dung với production, trừ khi bạn đặt `DATABASE_ID` riêng cho môi trường Preview.

### Nội dung

Viết/sửa bài trên Notion không cần deploy. ISR tự cập nhật trong vòng 60 giây (3600 giây với URL cũ `/before/`). Chi tiết ở [notion-cms.md](notion-cms.md#bao-lâu-thì-thay-đổi-lên-site).

### Rollback

Vercel dashboard → *Deployments* → chọn deployment `READY` trước đó → *Promote to Production* (hoặc *Instant Rollback*). Thao tác này chỉ chuyển domain về bản build cũ, không đổi code trên GitHub; lần push `main` tiếp theo sẽ deploy lại code mới nhất. Muốn rollback lâu dài thì `git revert` rồi push.

## CI (GitHub Actions)

| Workflow | Trigger | Việc làm |
|---|---|---|
| `lint.yml` | push / PR vào `main` | `yarn install` → `yarn lint` |
| `test.yml` | push / PR vào `main` | `yarn install` → `yarn jest --ci`, với `NEXT_PUBLIC_URL=http://localhost` |

- Chạy trên `ubuntu-latest`, dùng Node có sẵn của runner (không có bước `setup-node`).
- Yarn 1 không bắt buộc peer deps nên không cần `.npmrc`.
- CI không nối với Vercel: Vercel vẫn deploy dù CI đỏ.

## Debug production

- **Lỗi build:** Vercel → *Deployments* → chọn deployment → *Build Logs*.
- **Lỗi khi chạy:** *Logs* / *Runtime Logs*. `console.log` trong `getStaticProps` và API route hiện ở đây, kể cả lỗi khi ISR render lại trang.
- **Kiểm tra HTML:** `curl -sL https://<domain>/<path>` rồi tìm chuỗi cần kiểm tra. Với thay đổi CSS, mở file trong `/_next/static/css/` để xem selector đã build đúng chưa.
- **Cache:** header `x-vercel-cache` cho biết trang lấy từ cache (`HIT`, `STALE`) hay vừa render (`MISS`).

### Lỗi build đã gặp

| Thông báo | Nguyên nhân | Cách sửa |
|---|---|---|
| `Found invalid or discontinued Node.js Version` | Vercel ngừng Node 18 | `engines.node: "24.x"` (đã có) |
| `npm ERR! ERESOLVE` liên quan `react-katex` | Peer deps React 16 | `.npmrc` `legacy-peer-deps=true` (đã có) |
| `Module not found: Package path ./dist/cytoscape.umd.js is not exported` | mermaid 9.4 + cytoscape mới | Pin `mermaid` 9.1.7 (đã có) |
| `NOTION_API_SECRET is missing from env` / `DATABASE_ID is missing` | Env var chưa đặt cho môi trường đang build | Thêm biến trên Vercel rồi Redeploy |
