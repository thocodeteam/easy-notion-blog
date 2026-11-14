# Changelog

Thay đổi mà người đọc `thocode.com` hoặc người fork repo thấy được đều ghi ở đây, mới
nhất ở trên. Định dạng theo [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
số version theo [Semantic Versioning](https://semver.org/).

Repo này fork từ [otoyo/easy-notion-blog](https://github.com/otoyo/easy-notion-blog).
Số version của bản fork đánh lại từ `1.0.0`, không nối tiếp version của upstream.

## [Unreleased]
### Fixed
- Ảnh xem trước khi chia sẻ link bài lên Facebook, Zalo hay Twitter không còn mất sau
  khoảng 1 giờ. Cần đặt `NEXT_PUBLIC_URL`; thiếu biến này thì ảnh vẫn hết hạn như trước.
## [1.2.1] - 2026-11-14
### Fixed
- Block Bookmark, Link preview và embed GitHub Gist trong bài giờ hiện thẻ xem trước (tiêu
  đề, mô tả, ảnh). Trước đây thẻ không bao giờ hiện trên site thật vì API lấy thông tin link
  luôn lỗi.

## [1.2.0] - 2026-11-14

### Added

- Bài để trống ô `Slug` trong Notion giờ vẫn lên site: slug được sinh từ tiêu đề theo đúng
  tiếng Việt (`định` thành `dinh`, không phải `djinh`) rồi ghi lại vào ô `Slug`, nên URL cố
  định từ lần đầu. Slug gõ tay luôn được giữ, slug cũ không đổi. Người fork cần bật quyền
  "Update content" cho integration Notion; thiếu quyền thì bài vẫn hiện nhưng slug chưa
  được lưu. Chi tiết ở `docs/notion-cms.md`.

### Changed

- Số phiên bản ở footer chuyển xuống dòng credit, thành "Version X.Y.Z. Powered by
  easy-notion-blog...", thay cho dòng "Phiên bản" dưới câu Truyện Kiều.

## [1.1.0] - 2026-11-14

### Added

- Footer hiện số phiên bản đang chạy, ngay dưới câu Truyện Kiều.
### Changed
- Nút chia sẻ cuối bài chỉ còn Facebook và Twitter/X. Bỏ Pocket (đã ngừng hoạt động)
  và Hatena (mạng xã hội Nhật kế thừa từ bản gốc). Nút chỉ hiện khi đặt
  `NEXT_PUBLIC_URL`.

## [1.0.0] - 2026-11-14

Bản release đầu tiên của bản fork, gom các thay đổi từ 07/2026 đến nay.

### Added

- Trang chủ mới kiểu tạp chí: bài nổi bật ở trên, danh sách bài mới nhất bên dưới.
- Phân trang theo số trang: `/blog/page/N` và `/blog/tag/<tag>/page/N`, thay cho một nút
  "Trang sau". Link cũ dạng `/blog/before/<ngày>` vẫn mở đúng trang.
- Form liên hệ ở `/lien-he`: gửi thẳng vào một database Notion, chống spam bằng Cloudflare
  Turnstile. Link "Góp bài / Liên hệ" ở footer trỏ tới form này. Người fork cần đặt
  `TURNSTILE_SECRET_KEY`, `CONTACT_DATABASE_ID` và `TURNSTILE_HOSTNAMES`; thiếu biến nào thì
  form báo chưa hoạt động, phần còn lại của site vẫn chạy.
- `/api/post-image`: ảnh bìa bài viết luôn dẫn tới link ảnh Notion còn hạn, nên ảnh không
  còn vỡ khi link do Notion cấp hết hạn.
- Footer kiểu tạp chí: tên tạp chí, tagline, ba cột Chuyên mục / Tạp chí / Kết nối.

### Changed

- Nội dung trang chủ cũ chuyển sang trang About.
- Chữ to hơn, cỡ chữ và font theo vnhacker.substack.com cho dễ đọc.
- Footer: cột Chuyên mục chỉ dùng tag có thật trong Notion; bỏ link GitHub; link Website
  đổi thành balut.dev, mở ở tab mới.
- Build cần Node.js 24. Repo có `package-lock.json`, và `mermaid` được ghim ở 9.1.7 vì bản
  mới hơn làm vỡ build.

### Fixed

- Excerpt và tiêu đề có nhiều đoạn định dạng khác nhau trong Notion giờ hiện đủ chữ.
- Link tới bài không tồn tại trả trang 404 thay vì lỗi 500.
- Số trang đang chọn trong thanh phân trang đọc được (trước đó chữ trùng màu nền).
- Sửa lại câu Truyện Kiều ở footer và trang chủ.

### Security

- `/api/url-metadata` chỉ lấy thông tin từ trang HTML công khai qua http hoặc https.

[Unreleased]: https://github.com/thocodeteam/easy-notion-blog/compare/v1.2.1...HEAD
[1.2.1]: https://github.com/thocodeteam/easy-notion-blog/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/thocodeteam/easy-notion-blog/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/thocodeteam/easy-notion-blog/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/thocodeteam/easy-notion-blog/releases/tag/v1.0.0
