# Vấn đề đã biết

Các mục dưới đây đã được xác nhận trên code hoặc trên production (10/2026) nhưng chưa sửa. Thứ tự gần đúng theo mức ảnh hưởng.

## `/blog/<slug>` không tồn tại trả về 500

- **Tái hiện:** `https://www.thocode.com/blog/khong-ton-tai-xyz123` → HTTP 500.
- **Nguyên nhân:** khi không tìm thấy bài, `getStaticProps` trong `src/pages/blog/[slug].tsx` chỉ trả `props: { redirect: '/blog' }`. Component sau đó đọc `fallback[slug]` với `fallback` là `undefined` và throw lúc render.
- **Hướng sửa:** trả `{ notFound: true, revalidate: 30 }` như `/blog/page/[page].tsx` đang làm.

## Thiếu `NEXT_PUBLIC_URL` trên Vercel

- **Tái hiện:** HTML của `https://www.thocode.com/blog` không có `<link rel="canonical">` và `og:url`.
- **Ảnh hưởng:** không có canonical, không có `og:image` mặc định (`/default.png`) cho bài không đặt `OGImage`, và nút chia sẻ mạng xã hội ở cuối bài bị ẩn.
- **Hướng sửa:** thêm `NEXT_PUBLIC_URL=https://www.thocode.com` cho môi trường Production trên Vercel rồi Redeploy.

## Trang tag rỗng render 200 rồi chuyển hướng phía client

`/blog/tag/<tag không có bài>` trả HTTP 200 với props `redirect`, sau đó `router.replace('/blog')` chạy trên trình duyệt. Bot tìm kiếm thấy một trang 200 không có nội dung. Các route tag khác (`/page/N`, `/before/<date>`) có cùng hành vi.

## `<html lang="ja">`

`src/pages/_document.tsx` vẫn giữ `lang="ja"` từ upstream, trong khi nội dung là tiếng Việt. Ảnh hưởng tới trình đọc màn hình, dịch tự động và SEO. Nên đổi thành `vi`.

## `/api/url-metadata` tải bất kỳ URL nào

API này nhận `?url=` từ client và dùng `got` tải trang đó từ server Vercel mà không giới hạn domain hay địa chỉ. Bất kỳ ai cũng có thể dùng nó làm proxy tải trang web (dạng SSRF). Function chạy trên hạ tầng Vercel, không có mạng nội bộ đáng giá để lộ, nhưng vẫn tốn quota function và băng thông. Nên giới hạn ở URL xuất hiện trong bookmark của các bài, hoặc chặn địa chỉ nội bộ và thêm cache.

## Thứ tự sắp xếp bài cần kiểm chứng

Các query Notion dùng `sorts: [{ property: 'Date', timestamp: 'created_time', direction: 'descending' }]`. Một sort Notion chỉ nên có `property` hoặc `timestamp`; khi có cả hai, chưa rõ Notion ưu tiên field nào. Nếu Notion sắp theo `created_time`, thứ tự bài sẽ theo ngày tạo trang chứ không theo cột `Date`, và phép quy đổi URL cũ `/before/<date>` sang số trang (giả định thứ tự theo `Date`) có thể lệch. Cần kiểm tra bằng một bài có `Date` khác hẳn ngày tạo.

## Ảnh lồng trong list/cột không được làm mới

`includeExpiredImage` trong `[slug].tsx` chỉ kiểm tra block ảnh ở cấp cao nhất. Ảnh Notion nằm trong list item hoặc column có thể hiện ảnh vỡ khi URL S3 hết hạn và trang chưa được regenerate.

## Embed Twitter chỉ nhận `twitter.com`

`notion-blocks/embed.tsx` chỉ nhận URL bắt đầu bằng `https://twitter.com`. Link `https://x.com/...` bị bỏ qua.

## Không có lockfile

`package-lock.json` chưa được commit nên mỗi build có thể kéo version dependency khác. Ba lỗi build năm 2026 đều từ nguyên nhân này. Xem [development.md](development.md#dependency).

## Code thừa từ upstream

- `src/lib/notion/image-cache.ts` không được import ở đâu.
- `README.ja.md` là README tiếng Nhật của upstream.
- Thông báo lỗi trong `scripts/init-database.sh` và `PostsNotFound` vẫn là tiếng Nhật/tiếng Anh.
- Nút chia sẻ có Hatena (mạng xã hội Nhật) và Pocket (Mozilla đã đóng cửa 07/2025); có thể thay bằng nút phù hợp người đọc Việt.
