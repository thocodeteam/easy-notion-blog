# Kiến trúc

## Tổng quan

```
 Notion database ──(Notion API, NOTION_API_SECRET)──┐
                                                    │
   lúc build:  scripts/set-blog-index-cache.js ─────┤──> .blog_index_data (JSON, tạm thời)
               next build  (đọc .blog_index_data)    │
               scripts/expire-blog-index-cache.js ───┘    (xoá file)

   lúc chạy:   ISR regenerate (revalidate)  ──> query Notion trực tiếp
               /api/blocks                  ──> query Notion trực tiếp
               /api/url-metadata            ──> tải HTML trang ngoài
```

Site là một ứng dụng Next.js pages router. Hầu hết trang được sinh tĩnh bằng `getStaticProps` + `getStaticPaths` và tái tạo định kỳ bằng ISR. Không có database riêng: Notion là nguồn dữ liệu duy nhất.

## Hai chế độ đọc dữ liệu

Mọi hàm trong `src/lib/notion/client.ts` có 2 nhánh, chọn bằng `blogIndexCache.exists()`:

| Chế độ | Khi nào | Cách lấy dữ liệu |
|---|---|---|
| **Cache** | Trong lúc `npm run build` (file `.blog_index_data` tồn tại) | `getAllPosts()` đọc file JSON, các hàm khác lọc/sắp xếp trong bộ nhớ |
| **Trực tiếp** | `next dev`, ISR regenerate trên Vercel, API route | Gọi `client.databases.query` với filter tương ứng |

Lệnh build trong `package.json`:

```
node scripts/set-blog-index-cache.js && next build && node scripts/expire-blog-index-cache.js
```

1. `set-blog-index-cache.js` query toàn bộ bài `Published = true` và `Date <= now`, phân trang 100 bài/lần, ghi vào `.blog_index_data` ở thư mục gốc.
2. `next build` chạy `getStaticPaths`/`getStaticProps` cho mọi trang; tất cả đọc từ file cache nên chỉ tốn vài request Notion (trừ phần nội dung block của từng bài).
3. `expire-blog-index-cache.js` xoá file. Từ đây mọi lần ISR regenerate đều gọi Notion trực tiếp.

Hệ quả cần biết:

- **Danh sách tag khác nhau giữa hai chế độ.** Chế độ cache lấy tag từ các bài đã publish. Chế độ trực tiếp lấy toàn bộ option của cột `Tags` trong schema database, kể cả tag chưa có bài nào được publish.
- Ở `NODE_ENV=development`, `_buildFilter` bỏ điều kiện `Published` và `Date`, nên `npm run dev` hiện cả bài nháp. Bài thiếu `Page`, `Slug` hoặc `Date` vẫn bị loại bởi `_validPost`.

## Mô hình dữ liệu

Định nghĩa trong `src/lib/notion/interfaces.ts`.

- `Post`: `PageId`, `Title`, `Slug`, `Date`, `Tags[]`, `Excerpt`, `OGImage`, `Rank`. Dựng bởi `_buildPost` từ property của trang Notion. `Title` và `Excerpt` nối mọi đoạn rich text (Notion tách đoạn mỗi khi đổi định dạng).
- `Block`: một block nội dung, có `Type` và đúng một field con tương ứng (`Paragraph`, `Image`, `Code`, `Table`...). Dựng bởi `getAllBlocksByBlockId`, đệ quy vào list item có con, bảng (`_getTableRows`) và cột (`_getColumns`).

## Route

| URL | File | `revalidate` | Sinh sẵn lúc build | Ghi chú |
|---|---|---|---|---|
| `/` | `pages/index.tsx` | 60s | có | Trang chủ kiểu tạp chí: 3 bài nổi bật (bài có `Rank` trước, thiếu thì bù bằng bài mới nhất) và 7 bài mới nhất còn lại. Ảnh bìa đi qua `/api/post-image`. |
| `/about` | `pages/about.tsx` | — (tĩnh) | có | Giới thiệu, gồm cả nội dung trang chủ cũ (hardcode) |
| `/blog` | `pages/blog/index.tsx` | 60s | có | Trang 1 của danh sách |
| `/blog/page/N` | `pages/blog/page/[page].tsx` | 60s | trang 2..N | N không hợp lệ hoặc rỗng → 404 |
| `/blog/<slug>` | `pages/blog/[slug].tsx` | 60s | mọi bài | Nội dung bài + sidebar |
| `/blog/tag/<tag>` | `pages/blog/tag/[tag].tsx` | 60s | mọi tag | Trang 1 của tag |
| `/blog/tag/<tag>/page/N` | `pages/blog/tag/[tag]/page/[page].tsx` | 60s | không | Sinh khi có request đầu tiên |
| `/blog/before/<date>` | `pages/blog/before/[date].tsx` | 3600s | 1 path | URL cũ, giữ để không gãy link |
| `/blog/tag/<tag>/before/<date>` | `pages/blog/tag/[tag]/before/[date].tsx` | 3600s | không | URL cũ |
| `/api/blocks?slug=` | `pages/api/blocks.ts` | — | — | Trả JSON block của bài, dùng để làm mới URL ảnh |
| `/api/url-metadata?url=` | `pages/api/url-metadata.ts` | — | — | Lấy title/description/image của URL ngoài cho bookmark. Chỉ nhận trang HTML công khai qua http(s), cổng mặc định; chặn địa chỉ nội bộ kể cả sau redirect; tối đa 3 redirect, 5 giây, 1 MB. CDN cache 1 ngày. |
| `/api/post-image?slug=` | `pages/api/post-image.ts` | — | — | Redirect 302 tới URL ảnh `OGImage` còn hạn của bài. Chỉ redirect tới URL lấy từ Notion, không nhận URL từ người gọi. CDN cache 30 phút. |
| `/lien-he` | `pages/lien-he.tsx` | — (tĩnh) | có | Form "Liên hệ / Góp bài", có Cloudflare Turnstile |
| `/api/contact` | `pages/api/contact.ts` | — | — | Nhận form (POST), kiểm tra rồi ghi vào database Notion liên hệ |

### Form liên hệ

`/lien-he` gửi JSON tới `/api/contact`. Route này chạy lần lượt các bước sau, và chỉ ghi vào Notion khi mọi bước đều qua:

1. Chỉ nhận `POST`, ngược lại trả 405. Body tối đa 32 KB.
2. Thiếu `NOTION_API_SECRET`, `CONTACT_DATABASE_ID`, `TURNSTILE_SECRET_KEY` hoặc `TURNSTILE_HOSTNAMES` → 503. Log chỉ ghi tên biến, không ghi giá trị.
3. Trường honeypot ẩn `website` có giá trị → 400.
4. Kiểm tra trường: bắt buộc, độ dài tối đa (họ tên 100, email 254, tiêu đề 200, nội dung 10000, link bản nháp 500), định dạng email, `Loại` thuộc `Liên hệ`/`Góp bài`, link phải là http(s). Sai → 400 kèm thông báo tiếng Việt.
5. Gọi Turnstile `siteverify`, timeout 10 giây. Phải có `success`, `action === "contact"` và `hostname` nằm trong `TURNSTILE_HOSTNAMES`. Sai hoặc lỗi mạng → 403.
6. `createContactSubmission` trong `client.ts` tạo trang Notion. Lỗi Notion → 500.

Hằng số dùng chung giữa trình duyệt và server (site key Turnstile, action, các giá trị `Loại`, độ dài tối đa) nằm ở `src/lib/contact.ts`. File này không import code server nên Notion client không lọt vào bundle trình duyệt. Site key Turnstile là giá trị công khai; secret key chỉ nằm trong env.

Mọi route động dùng `fallback: 'blocking'`: path chưa sinh sẵn sẽ được render phía server ở request đầu tiên rồi cache lại.

URL được sinh tập trung trong `src/lib/blog-helpers.ts` (`getBlogLink`, `getTagLink`, `getPageLink`, `getTagPageLink`, `getBeforeLink`, `getTagBeforeLink`). Tag luôn được `encodeURIComponent` (cần cho tag như `.NET`).

### Phân trang

- `NUMBER_OF_POSTS_PER_PAGE = 10` trong `src/lib/notion/server-constants.js`.
- `getPostsByPage`, `getPostsByTagAndPage` cắt mảng từ `getAllPosts()`; ở chế độ trực tiếp nghĩa là mỗi lần regenerate một trang danh sách sẽ tải toàn bộ bài.
- `Pagination` và `calculatePageNumbers` trong `src/components/blog-parts.tsx` hiển thị: trang 1–3, trang hiện tại ±1, các mốc chục (10, 20...), trang cuối. Khoảng trống dùng `…`; nếu khoảng trống chỉ là 1 trang thì hiện luôn số đó.
- URL cũ `/before/<date>` quy đổi ngày về số trang bằng `getPageNumberByBeforeDate` / `getPageNumberByTagAndBeforeDate` (đếm số bài có `Date >= date`).

### Ảnh trong bài và URL hết hạn

Ảnh upload lên Notion có URL S3 ký tạm, hết hạn sau khoảng 1 giờ (`ExpiryTime`). Trang bài viết là trang tĩnh nên URL trong HTML có thể đã hết hạn. Cách xử lý ở `pages/blog/[slug].tsx`:

1. Server truyền block vào props `fallback[slug]`.
2. Client kiểm tra `includeExpiredImage`: có block ảnh cấp cao nhất nào đã quá `ExpiryTime` không.
3. Nếu có, `useSWR` gọi `/api/blocks?slug=<slug>` để lấy URL mới.

Chỉ ảnh ở cấp cao nhất được kiểm tra (xem TODO trong code).

Ảnh bìa (`OGImage`) trên trang chủ dùng cách khác: `<img src="/api/post-image?slug=...">`. Route này lấy URL ảnh mới từ Notion rồi redirect, kèm cache CDN 30 phút (`s-maxage=1800, stale-while-revalidate=600`), ngắn hơn tuổi thọ khoảng 1 giờ của URL ký. `src/lib/notion/image-cache.ts` (tải ảnh về `public/notion_images`) có trong repo nhưng không được dùng ở đâu.

`next.config.js` cho phép `next/image` tải từ `s3.us-west-2.amazonaws.com` và `images.unsplash.com`.

## Component

| File | Vai trò |
|---|---|
| `pages/_app.tsx` | Layout chung: `GoogleAnalytics`, `Header`, nội dung, `Footer`. Gửi page view lên GA4 mỗi lần đổi route. |
| `pages/_document.tsx` | Khung HTML (`<Html lang="ja">`, xem known-issues). |
| `components/document-head.tsx` | `<title>`, meta description, Open Graph, Twitter card, canonical. Khai báo `SITE_TITLE` và `SITE_DESCRIPTION` (nguồn duy nhất). Thẻ `og:url`, `canonical` và `og:image` mặc định chỉ xuất hiện khi có `NEXT_PUBLIC_URL`. |
| `components/header.tsx` | Tên tạp chí và menu "Trang chủ / Tạp chí / Giới thiệu". |
| `components/footer.tsx` | Footer kiểu tạp chí: tagline (cắt tiền tố tên khỏi `SITE_DESCRIPTION`), cột "Chuyên mục" (`categoryTags`), "Tạp chí", "Kết nối" (link ngoài và "Góp bài / Liên hệ" → `/lien-he`), dòng bản quyền. |
| `components/blog-parts.tsx` | Mảnh UI trang danh sách và sidebar: `PostTitle`, `PostTags`, `PostExcerpt`, `PostBody`, `Pagination`, `BlogPostLink`, `BlogTagLink`, `NoContents`... `PostDate` và `ReadMoreLink` đang bị ẩn bằng `display: none`. |
| `components/notion-block.tsx` | Render mảng `Block` thành React. Gom list item liền nhau thành `<ul>`/`<ol>`. |
| `components/notion-blocks/*` | Block nặng, tải bằng `next/dynamic`: code (Prism, Mermaid), embed (Twitter, Gist), bookmark, video (YouTube), công thức (KaTeX). |
| `components/social-buttons.tsx` | Nút chia sẻ Facebook và Twitter/X; gửi sự kiện `share` lên GA4. Chỉ hiện khi có `NEXT_PUBLIC_URL`. |
| `components/google-analytics.tsx`, `lib/gtag.js` | Nạp gtag.js khi có `NEXT_PUBLIC_GA_TRACKING_ID`. |

Sidebar dùng các tiêu đề tiếng Việt: "Tuyển chọn" (bài có `Rank`, giảm dần), "Bài mới" (5 bài mới nhất), "Danh mục" (tất cả tag), "Nội dung cùng chuyên mục" (bài cùng tag đầu tiên, trừ bài hiện tại).

## Style

- CSS Modules trong `src/styles/*.module.css`, CSS toàn cục ở `global.css` và `syntax-coloring.css`.
- Biến dùng chung trong `global.css`: `--gap*`, `--fg`, `--bg`, `--accents-*`, `--radius`.
- Font `Spectral` import trong `header.module.css`, dùng được toàn site.
- Khi viết selector modifier, chú ý specificity. Ví dụ rule gốc `.pagination li span` là (0,1,2), nên trang hiện tại phải viết `.pagination li.paginationCurrent span`.
