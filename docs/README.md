# Tài liệu dự án Tạp chí Thợ Code

Blog `thocode.com` dùng Notion làm CMS, chạy Next.js 12 trên Vercel. Fork từ [otoyo/easy-notion-blog](https://github.com/otoyo/easy-notion-blog).

| Tài liệu | Nội dung | Đọc khi |
|---|---|---|
| [architecture.md](architecture.md) | Luồng dữ liệu Notion → Next.js, cache lúc build, ISR, route, component | Sửa code, thêm tính năng |
| [notion-cms.md](notion-cms.md) | Cấu trúc database Notion, quy tắc một bài được hiển thị, block được hỗ trợ | Viết bài, sửa schema Notion |
| [development.md](development.md) | Cài đặt local, script, test, lint, quy ước code, bẫy môi trường Windows | Làm việc trên máy local |
| [infrastructure.md](infrastructure.md) | Vercel, domain, DNS, biến môi trường, quy trình deploy, CI, debug, rollback | Deploy, đổi domain, điều tra sự cố production |
| [known-issues.md](known-issues.md) | Lỗi và điểm yếu đã xác nhận nhưng chưa sửa | Trước khi sửa lỗi hoặc khi gặp hành vi lạ |

## Tóm tắt một trang

- **Repo:** `github.com/thocodeteam/easy-notion-blog`, nhánh production `main` (còn nhánh `dev` trên remote).
- **Stack:** Next.js 12.3 (pages router), React 17, TypeScript, CSS Modules, `@notionhq/client` v1.
- **Nội dung:** một database Notion; mỗi trang Notion là một bài. Khoảng 44 bài, 10 bài/trang.
- **Hosting:** Vercel project `thocode-easy-notion-blog`, region function `iad1`.
- **Domain:** `www.thocode.com` là domain chính; `thocode.com` redirect 308 sang `www`. DNS đặt ở Porkbun.
- **Deploy:** push lên `main` → Vercel tự build production. Bài mới trên Notion tự xuất hiện sau tối đa khoảng 60 giây nhờ ISR, không cần deploy.
- **CI:** GitHub Actions chạy ESLint và Jest trên push/PR vào `main`. CI không chặn deploy.
