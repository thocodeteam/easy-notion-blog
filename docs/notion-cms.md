# Notion làm CMS

## Kết nối

- Site đọc **một** database Notion, id lưu ở biến `DATABASE_ID`.
- Quyền truy cập qua một Notion internal integration; token của nó là `NOTION_API_SECRET`. Database phải được share cho integration đó (Notion: `•••` → *Connections* → thêm integration), nếu không API trả 404.
- Giá trị thật của hai biến nằm trong Vercel Project Settings, không có trong repo.

## Schema database

Tên property phải đúng chính tả và kiểu, vì code truy cập trực tiếp `prop.Page.title`, `prop.Slug.rich_text`...

| Property | Kiểu Notion | Bắt buộc | Dùng làm |
|---|---|---|---|
| `Page` | Title | có | Tiêu đề bài |
| `Slug` | Text | có | Đuôi URL `/blog/<slug>`. Chỉ dùng ký tự hợp lệ cho URL, không trùng giữa các bài. |
| `Date` | Date | có | Ngày xuất bản. Bài có ngày trong tương lai bị ẩn cho tới ngày đó. |
| `Tags` | Multi-select | không | Chuyên mục. Tag đầu tiên quyết định khối "Nội dung cùng chuyên mục". |
| `Excerpt` | Text | không | Đoạn tóm tắt trên trang danh sách và meta description |
| `OGImage` | Files & media | không | Ảnh `og:image`/`twitter:image`. Chỉ lấy file đầu tiên. |
| `Rank` | Number | không | Bài có `Rank` vào khối "Tuyển chọn", sắp xếp giảm dần |
| `Published` | Checkbox | không | Chỉ bài được tick mới hiện ở production |

`scripts/init-database.sh` tạo các property trên cho database mới và thêm một bài mẫu. Chỉ dùng khi dựng database từ đầu; script dùng `curl` và cần `DATABASE_ID`, `NOTION_API_SECRET` trong môi trường.

## Khi nào một bài hiển thị

Ở production (và trong `npm run build`), bài phải thoả cả hai:

1. `Published` được tick.
2. `Date` <= thời điểm hiện tại.

Ngoài ra `_validPost` loại mọi bài có `Page` rỗng, `Slug` rỗng hoặc không có `Date`, ở mọi môi trường.

Ở `npm run dev`, điều kiện 1 và 2 bị bỏ nên bài nháp vẫn hiện.

## Bao lâu thì thay đổi lên site

Không cần deploy khi viết hoặc sửa bài. ISR tự tái tạo trang:

| Trang | `revalidate` |
|---|---|
| `/blog`, `/blog/page/N`, `/blog/<slug>`, trang tag | 60 giây |
| URL cũ `/before/<date>` | 3600 giây |

Cơ chế ISR là stale-while-revalidate: request đầu tiên sau khi hết hạn vẫn nhận bản cũ và kích hoạt render lại; request sau đó mới thấy bản mới. Một bài mới cũng chỉ hiện trên danh sách sau khi trang danh sách được regenerate.

## Tag

Tag thật đang có (07/2026), dùng đúng chuỗi này khi hardcode link:

`AWS`, `AI`, `Diary`, `NhatKyMayMua`, `Dummies`, `.NET`, `BanNguyetSan`, `Blockchain`, `ChatGPT`, `DevOps`, `FriendBlog`, `MongDB`, `MongoDB`, `NFT`, `Nodejs`, `Reactjs`, `nix`

- `MongDB` là tag sai chính tả nhưng có bài đang gắn; đổi tên trên Notion sẽ làm đổi URL `/blog/tag/MongDB`.
- Cột "Chuyên mục" ở footer lấy từ mảng `categoryTags` trong `src/components/footer.tsx`. Tag ở đó phải tồn tại và có bài, nếu không link dẫn tới trang rỗng rồi bị chuyển về `/blog`.

## Block nội dung được hỗ trợ

Renderer ở `src/components/notion-block.tsx`. Block không có trong bảng sẽ bị bỏ qua (render `null`), không báo lỗi.

| Block Notion | Cách hiển thị |
|---|---|
| Paragraph, Heading 1/2/3 | Văn bản có định dạng: đậm, nghiêng, gạch, gạch chân, code, màu chữ/màu nền, link, công thức inline |
| Bulleted list, Numbered list | Có lồng nhiều cấp |
| Image | Ảnh + caption. Ảnh upload lên Notion có URL hết hạn, xem [architecture.md](architecture.md#ảnh-trong-bài-và-url-hết-hạn) |
| Code | Tô màu bằng Prism (css, diff, docker, elixir, go, hcl, java, json, python, ruby, sql, typescript...; ngôn ngữ lạ dùng grammar JavaScript). Ngôn ngữ `mermaid` được vẽ thành sơ đồ. |
| Quote, Callout (icon emoji), Divider | |
| Equation | KaTeX |
| Table, Column list | |
| Video | Chỉ YouTube (link ngoài) |
| Embed | Chỉ Twitter (`https://twitter.com/...`) và GitHub Gist |
| Bookmark, Link preview | Thẻ preview, metadata lấy qua `/api/url-metadata` |

Không hỗ trợ: toggle, to-do, child page, child database, synced block, file/PDF, audio, embed từ dịch vụ khác. Callout dùng icon file (không phải emoji) cũng chưa xử lý.

## Database liên hệ

Form `/lien-he` ghi vào một database Notion **thứ hai**, tách khỏi database bài viết, id lưu ở `CONTACT_DATABASE_ID`. Database này phải được share cho cùng integration của `NOTION_API_SECRET`, với quyền chỉnh sửa (form cần tạo trang).

Tên property phải khớp chính xác, kể cả dấu tiếng Việt:

| Property | Kiểu Notion | Ghi chú |
|---|---|---|
| `Tiêu đề` | Title | Đổi tên cột "Name" mặc định thành tên này |
| `Họ tên` | Text | |
| `Email` | Email | |
| `Loại` | Select | Option: `Liên hệ`, `Góp bài` |
| `Link bản nháp` | URL | Để trống nếu người gửi không đưa link |
| `Trạng thái` | Select | Option: `Mới`, `Đang xem`, `Đã xử lý`. Form luôn ghi `Mới`. |
| `Thời gian gửi` (tuỳ chọn) | Created time | Code không ghi cột này; thêm vào nếu muốn thấy thời điểm gửi |

Nội dung tin nhắn nằm trong thân trang, không phải property: tách đoạn theo dòng trống, mỗi rich text tối đa 2000 ký tự, tối đa 100 block (phần dư gộp vào block cuối).
