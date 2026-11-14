# Phát triển local

## Yêu cầu

- Node.js 24 (khớp `engines.node` trong `package.json`) và npm.
- Quyền đọc database Notion: một `NOTION_API_SECRET` có quyền vào database (có thể là integration riêng cho dev, share cùng database).
- Git.

## Cài đặt

```sh
git clone https://github.com/thocodeteam/easy-notion-blog.git
cd easy-notion-blog
npm install            # .npmrc đã bật legacy-peer-deps
```

Trên Windows, `npm install` fail ở package native `re2` (cần Python + MSVC). Dùng:

```sh
npm install --ignore-scripts
```

Chỉ ảnh hưởng máy local; Vercel chạy Linux có bản build sẵn.

Tạo `.env.local` ở thư mục gốc (đã nằm trong `.gitignore`, không commit):

```sh
NOTION_API_SECRET=<token integration>
DATABASE_ID=<id database>
# tuỳ chọn
NEXT_PUBLIC_URL=http://localhost:3000
NEXT_PUBLIC_GA_TRACKING_ID=
# chỉ cần khi thử form /lien-he
CONTACT_DATABASE_ID=
TURNSTILE_SECRET_KEY=
TURNSTILE_HOSTNAMES=localhost
```

Muốn thử form ở local, `localhost` phải có trong danh sách domain của widget Turnstile. Không có ba biến cuối thì `/api/contact` trả 503, phần còn lại của site vẫn chạy.

## Script

| Lệnh | Việc làm |
|---|---|
| `npm run dev` | Dev server tại `http://localhost:3000`, hiện cả bài chưa publish |
| `npm run build` | Build production đầy đủ (tạo cache Notion → `next build` → xoá cache). Thiếu `NOTION_API_SECRET`/`DATABASE_ID` thì `next.config.js` throw. |
| `npm start` | Chạy bản đã build |
| `npm run lint` | `next lint` (ESLint) |
| `npx jest --ci` | Chạy test một lần |
| `npm test` | Jest ở chế độ watch |
| `npx jest --updateSnapshot` | Cập nhật snapshot sau khi đổi HTML có chủ đích |

**Không chạy `npm run format`.** Code đang format theo kiểu prettier 1.x (`arrowParens: "avoid"`, viết `item => ...`), còn devDependency là prettier 2 với mặc định `"always"`. Chạy lệnh này sẽ đổi format hàng trăm dòng không liên quan. Nếu cần format, thêm `"arrowParens": "avoid"` vào `.prettierrc.json` trước.

Cảnh báo `Invalid next.config.js options detected` (do key `resolve`) là vô hại.

## Test

- Jest 27 + Testing Library, cấu hình `jest.config.js` (dùng `next/jest`, môi trường jsdom).
- `__mocks__/@notionhq/client.js` thay Notion client bằng fixture JSON trong `__tests__/fixtures/`; `src/lib/notion/__mocks__/blog-index-cache.js` mock cache. Test không gọi mạng và không cần token.
- Hiện có 10 suite, 29 test, 6 snapshot (`__tests__/pages/**/__snapshots__`).
- Fixture chỉ có 3 bài nên `numberOfPages = 1` và `Pagination` render `null`; snapshot không chứa markup phân trang.

## Quy ước code

- TypeScript với `strict: false`. ESLint: `next/core-web-vitals` + `@typescript-eslint/recommended`, cấm biến không dùng và `any` tường minh.
- Prettier: `singleQuote`, không `semi`, `trailingComma: es5`, arrow function một tham số không có ngoặc.
- Commit message theo Conventional Commits (`feat(blog): ...`, `fix(build): ...`).
- Nội dung hiển thị viết tiếng Việt.
- `SITE_TITLE`, `SITE_DESCRIPTION` chỉ khai trong `src/components/document-head.tsx`.
- Mọi truy vấn Notion đặt trong `src/lib/notion/client.ts` và phải có cả nhánh cache lẫn nhánh trực tiếp (xem [architecture.md](architecture.md#hai-chế-độ-đọc-dữ-liệu)).
- Sinh URL qua các hàm trong `src/lib/blog-helpers.ts`, không ghép chuỗi tay.
- Hằng số server (`NUMBER_OF_POSTS_PER_PAGE`, đường dẫn cache, biến môi trường) ở `src/lib/notion/server-constants.js`, viết CommonJS để script Node và `next.config.js` `require` được.

## Dependency

Repo chưa commit lockfile (`package-lock.json` đã sinh ở local nhưng chưa commit), mọi dependency là range `^`. Mỗi lần build trên Vercel có thể kéo version mới hơn. Các ràng buộc sau đã được đặt để chặn lỗi build, đừng nới ra:

| Ràng buộc | Lý do |
|---|---|
| `"engines": { "node": "24.x" }` | Vercel đã ngừng Node 18. Giá trị này override setting trên dashboard. |
| `.npmrc`: `legacy-peer-deps=true` | `react-katex@2.0.2` khai peer `react ^15 \|\| ^16`, project dùng React 17 → npm ERESOLVE |
| `"mermaid": "9.1.7"` (pin cứng) | mermaid 9.4.x kéo `cytoscape` mới, bản đó bỏ path `./dist/cytoscape.umd.js` khỏi `exports` → webpack báo `Module not found` |

Commit `package-lock.json` sẽ giải quyết dứt điểm việc version trôi.
