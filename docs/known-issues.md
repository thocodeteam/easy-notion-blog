# Vấn đề đã biết

Các mục dưới đây đã được xác nhận trên code nhưng chưa sửa. Lỗi có thể bị lợi dụng được theo dõi riêng, không ghi ở đây. Nếu bạn phát hiện lỗ hổng bảo mật, hãy gửi qua email ở trang [Giới thiệu](https://www.thocode.com/about) thay vì mở issue công khai.

## Trang tag rỗng render 200 rồi chuyển hướng phía client

`/blog/tag/<tag không có bài>` trả HTTP 200 với props `redirect`, sau đó `router.replace('/blog')` chạy trên trình duyệt. Bot tìm kiếm thấy một trang 200 không có nội dung. Các route tag khác (`/page/N`, `/before/<date>`) có cùng hành vi.

## `<html lang="ja">`

`src/pages/_document.tsx` vẫn giữ `lang="ja"` từ upstream, trong khi nội dung là tiếng Việt. Ảnh hưởng tới trình đọc màn hình, dịch tự động và SEO. Nên đổi thành `vi`.

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
