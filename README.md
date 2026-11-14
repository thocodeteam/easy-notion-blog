# Tạp chí Thợ Code

Mã nguồn của [thocode.com](https://www.thocode.com): blog viết trên Notion, render bằng Next.js, chạy trên Vercel.

> Code gì cũng được, miễn có lương thiện là được!

## Bắt đầu nhanh

```sh
npm install     # Windows: npm install --ignore-scripts
npm run dev     # http://localhost:3000
```

Trước khi chạy, tạo file `.env.local` ở thư mục gốc với ít nhất `NOTION_API_SECRET` và `DATABASE_ID` (chi tiết ở [docs/development.md](docs/development.md)).

Deploy: push lên `main`, Vercel tự build production. Bài mới trên Notion tự lên site sau khoảng 60 giây, không cần deploy.

## Tài liệu

Toàn bộ tài liệu ở [`docs/`](docs/README.md):

- [Kiến trúc](docs/architecture.md): luồng dữ liệu, cache lúc build, ISR, route, component
- [Notion làm CMS](docs/notion-cms.md): schema database, quy tắc hiển thị bài, block được hỗ trợ
- [Phát triển local](docs/development.md): cài đặt, script, test, quy ước, dependency bị ghim
- [Hạ tầng và triển khai](docs/infrastructure.md): Vercel, domain, DNS, biến môi trường, CI, debug, rollback
- [Vấn đề đã biết](docs/known-issues.md)

## Nguồn gốc

Fork từ [otoyo/easy-notion-blog](https://github.com/otoyo/easy-notion-blog) (MIT), vốn dựa trên [ijjk/notion-blog](https://github.com/ijjk/notion-blog). README gốc tiếng Nhật: [README.ja.md](README.ja.md).
