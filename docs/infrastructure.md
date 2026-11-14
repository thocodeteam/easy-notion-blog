# Hạ tầng và triển khai

Thông tin dưới đây đọc từ Vercel API và DNS công khai (10/2026). Không có giá trị bí mật nào trong tài liệu này.

## Sơ đồ

```
  Người đọc
     │  https://thocode.com  ──308──>  https://www.thocode.com
     ▼
  DNS (Porkbun)
     │  thocode.com      A     76.76.21.21
     │  www.thocode.com  CNAME cname.vercel-dns.com
     ▼
  Vercel Edge (CDN, cache trang ISR)
     │
     ▼
  Vercel Serverless Functions (region iad1, Washington D.C.)
     │  render ISR, /api/blocks, /api/url-metadata
     ▼
  Notion API  (database bài viết)        Google Analytics 4 (phía trình duyệt)
```

## Thành phần

| Thành phần | Nhà cung cấp | Định danh |
|---|---|---|
| Mã nguồn | GitHub | `thocodeteam/easy-notion-blog`, nhánh `main` |
| Hosting, CDN, function | Vercel | project `thocode-easy-notion-blog` (`prj_Bg0ui1PPfA93OLGSHQHRkpJkvuIY`), team `team_9Wh2VN1JYWaAUaPoj3rFsaAP` |
| Tên miền, DNS | Porkbun | nameserver `curitiba`, `fortaleza`, `maceio`, `salvador` `.ns.porkbun.com` |
| Nội dung | Notion | database `DATABASE_ID`, integration `NOTION_API_SECRET` |
| Phân tích | Google Analytics 4 | `NEXT_PUBLIC_GA_TRACKING_ID` |
| CI | GitHub Actions | `.github/workflows/lint.yml`, `test.yml` |

## Vercel project

| Setting | Giá trị | Ghi chú |
|---|---|---|
| Framework preset | Next.js | |
| Build / Install / Output command | mặc định (để trống) | Vercel chạy `npm install` rồi `npm run build` |
| Root directory | gốc repo | |
| Node.js version (dashboard) | 18.x | Bị override bởi `engines.node: "24.x"` trong `package.json`; build log có warning, bình thường |
| Function region | `iad1` | |
| Production branch | `main` | |

### Domain

| Domain | Vai trò | Cấu hình DNS |
|---|---|---|
| `www.thocode.com` | Domain production chính | CNAME `cname.vercel-dns.com` |
| `thocode.com` | Redirect 308 sang `www.thocode.com` (setting trong Vercel) | A `76.76.21.21` |
| `thocode-easy-notion-blog.vercel.app` | Domain mặc định của Vercel | — |

Vercel đánh dấu cả hai domain riêng là `misconfigured: false`. Vercel có gợi ý giá trị DNS mới (A `216.198.79.1`, CNAME `f71adab2624682b8.vercel-dns-017.com`) với trạng thái `optional-change`; giá trị cũ vẫn chạy, đổi hay không là tuỳ chọn.

### Biến môi trường

| Biến | Đã đặt trên Vercel | Môi trường | Dùng cho |
|---|---|---|---|
| `NOTION_API_SECRET` | có | Production, Preview, Development | Gọi Notion API. Thiếu thì build throw. |
| `DATABASE_ID` | có | Production, Preview, Development | Database bài viết. Thiếu thì build throw. |
| `NEXT_PUBLIC_GA_TRACKING_ID` | có | Production, Preview, Development | GA4 |
| `NEXT_PUBLIC_URL` | **không** | — | `og:url`, `canonical`, `og:image` mặc định, nút chia sẻ. Xem [known-issues.md](known-issues.md). |

Biến `NEXT_PUBLIC_*` được nhúng vào bundle lúc build: sau khi đổi giá trị phải deploy lại (push commit mới, hoặc Redeploy để build lại với env mới).

Để xem/sửa: Vercel dashboard → project → *Settings* → *Environment Variables*.

## Quy trình deploy

### Production

1. Merge hoặc push vào `main` trên GitHub.
2. Vercel nhận webhook, clone commit, chạy `npm install` (đọc `.npmrc`) và `npm run build`.
3. Build xong, deployment được gán vào các domain production.

Một lần build gọi Notion để lấy danh sách bài và nội dung block của từng bài. Notion API giới hạn khoảng 3 request/giây; với vài chục bài thì không thành vấn đề, nhưng số bài tăng nhiều sẽ làm build chậm hoặc dính rate limit.

Nút **Redeploy** trên dashboard build lại **commit cũ** của deployment đó. Dùng nó khi chỉ đổi biến môi trường, không dùng để lấy code mới.

### Preview

Vercel mặc định build preview cho mọi nhánh khác `main` và mọi PR (ví dụ nhánh `dev`). Preview dùng cùng `NOTION_API_SECRET`/`DATABASE_ID`, tức đọc cùng database nội dung với production.

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

### Từ dashboard

Vercel → project → *Deployments* → chọn deployment → *Build Logs* (lỗi build) hoặc *Runtime Logs* / *Logs* (lỗi khi ISR render, `console.log` trong `getStaticProps` và API route).

### Từ terminal

Tạo token cá nhân ở <https://vercel.com/account/tokens>, lưu vào biến môi trường user `VERCEL_TOKEN` (không commit, không dán vào log). Gọi API với header `Authorization: Bearer <token>`:

| Endpoint | Trả về |
|---|---|
| `GET https://api.vercel.com/v9/projects/<projectId>` | Setting project, `nodeVersion`, repo, tên các env var |
| `GET https://api.vercel.com/v6/deployments?projectId=<projectId>&limit=5` | Deployment gần nhất: `state` (`READY`, `ERROR`, `BUILDING`), commit sha |
| `GET https://api.vercel.com/v3/deployments/<dpl_id>/events?builds=1&direction=forward&limit=500` | Toàn bộ build log |
| `GET https://api.vercel.com/v9/projects/<projectId>/domains` | Domain và redirect |
| `GET https://api.vercel.com/v6/domains/<domain>/config` | Trạng thái cấu hình DNS |

Ví dụ PowerShell:

```powershell
$t = (Get-ItemProperty HKCU:\Environment -Name VERCEL_TOKEN).VERCEL_TOKEN
$h = @{ Authorization = "Bearer $t" }
$id = 'prj_Bg0ui1PPfA93OLGSHQHRkpJkvuIY'
(Invoke-RestMethod -Headers $h "https://api.vercel.com/v6/deployments?projectId=$id&limit=5").deployments |
  Select-Object uid, state, target, @{n='sha'; e={$_.meta.githubCommitSha}}
```

`setx` chỉ ghi registry; terminal đang mở không thấy biến mới, nên đọc thẳng từ `HKCU\Environment` như trên hoặc mở terminal mới.

### Kiểm tra sau deploy

- Mở `https://www.thocode.com/blog` và một bài bất kỳ.
- `curl -sL https://www.thocode.com/<path>` rồi tìm chuỗi cần kiểm tra trong HTML.
- Với thay đổi CSS: mở file trong `/_next/static/css/` để kiểm tra selector đã build đúng.
- Header `x-vercel-cache` cho biết trang lấy từ cache (`HIT`, `STALE`) hay vừa render (`MISS`).

### Lỗi build đã gặp

| Thông báo | Nguyên nhân | Cách sửa |
|---|---|---|
| `Found invalid or discontinued Node.js Version` | Node 18 bị Vercel ngừng | `engines.node: "24.x"` (đã có) |
| `npm ERR! ERESOLVE` liên quan `react-katex` | Peer deps React 16 | `.npmrc` `legacy-peer-deps=true` (đã có) |
| `Module not found: Package path ./dist/cytoscape.umd.js is not exported` | mermaid 9.4 + cytoscape mới | Pin `mermaid` 9.1.7 (đã có) |
| `NOTION_API_SECRET is missing from env` / `DATABASE_ID is missing` | Env var chưa đặt cho môi trường đang build | Thêm biến trên Vercel rồi Redeploy |
