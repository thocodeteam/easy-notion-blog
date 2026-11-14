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
| `Slug` | Text | không | Đuôi URL `/blog/<slug>`. Để trống thì site tự sinh từ tiêu đề, xem [Slug tự sinh](#slug-tự-sinh). Gõ tay thì chỉ dùng ký tự hợp lệ cho URL, không trùng giữa các bài. |
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

Ngoài ra `_validPost` loại mọi bài có `Page` rỗng hoặc không có `Date`, ở mọi môi trường. `Slug` rỗng không còn làm mất bài: slug được sinh tự động.

Ở `npm run dev`, điều kiện 1 và 2 bị bỏ nên bài nháp vẫn hiện.

## Slug tự sinh

Bài đã qua hai điều kiện trên mà ô `Slug` trống thì site sinh slug từ `Page` rồi ghi ngược vào ô `Slug` của bài trong Notion. Từ đó slug cố định: sửa tiêu đề sau này không đổi URL. Muốn URL khác thì gõ tay vào ô `Slug`; slug gõ tay luôn thắng và không bao giờ bị ghi đè. Code ở `src/lib/notion/slug.js`.

Quy tắc sinh:

- Chữ thường, bỏ dấu tiếng Việt (Unicode NFD rồi xoá dấu kết hợp), `đ`/`Đ` thành `d` (không phải `dj`).
- `&` thành `and`, cùng kiểu với slug gõ tay trước đây (`hoc-and-thi-...`).
- Mọi chuỗi ký tự ngoài `a-z0-9` thành một dấu `-`, bỏ `-` ở hai đầu.
- Tối đa 200 ký tự, cắt ở ranh giới từ. Next lưu mỗi trang ISR thành file `<slug>.html`/`<slug>.json`, và Linux giới hạn tên file 255 byte.
- Tiêu đề không còn ký tự nào dùng được (chỉ emoji, ký hiệu) thì dùng page id.
- Trùng với slug đã có trong database, kể cả bản nháp, thì thêm `-2`, `-3`... Bài cũ hơn (theo `Date`) nhận số nhỏ hơn.

Ví dụ: "Kiro Approve for Me: Khi AI Agent tự quyết định hành động nào được phép chạy, hành động nào cần hỏi Developer" → `kiro-approve-for-me-khi-ai-agent-tu-quyet-dinh-hanh-dong-nao-duoc-phep-chay-hanh-dong-nao-can-hoi-developer`.

Slug cũ (kể cả slug có `dj` do công cụ ngoài sinh) giữ nguyên, vì đổi là gãy link.

Khi nào ghi vào Notion:

- Lúc `npm run build` (bước tạo `.blog_index_data`) và lúc ISR tái tạo trang ở production.
- **Không** ghi ở Vercel Preview (`VERCEL_ENV=preview`, dùng chung database với production) và ở `npm run dev` (bản nháp lọt qua filter). Ở đó slug chỉ sinh trong bộ nhớ, giống hệt slug production sẽ ghi.
- Trên Vercel, chỉ ghi khi `VERCEL_ENV=production`. Nếu thấy `VERCEL` mà không thấy `VERCEL_ENV` (tắt *Automatically expose System Environment Variables* trong Project Settings) thì coi như không được ghi. Ngoài Vercel (fork tự host, không có hai biến này) thì ghi.
- Trước khi ghi, code đọc lại trang; nếu ô `Slug` vừa được gõ tay thì dùng slug đó.

Ghi cần integration có quyền **Update content** (Notion → *Settings* → *Connections* → *Develop or manage integrations* → integration → *Capabilities*). Thiếu quyền thì Notion trả lỗi `restricted_resource`; site log cảnh báo (page id và mã lỗi) và vẫn hiển thị bài bằng slug sinh trong bộ nhớ, nhưng slug chưa cố định: sửa tiêu đề lúc đó sẽ đổi URL. Mỗi process thử ghi một bài một lần rồi nhớ slug chưa lưu tới hết process. Trên Vercel, process là bước build và từng instance serverless, nên mỗi lần build và mỗi instance mới khởi động sẽ thử lại một lần.

### Chi phí request Notion

Khi mọi bài đã có slug: không tốn thêm request nào ngoài một truy vấn nhỏ cho link tới slug không tồn tại (xem dưới).

Khi có bài published còn trống Slug, mỗi process tính slug một lượt rồi dùng chung cho mọi truy vấn trong 60 giây (bằng chu kỳ ISR), kể cả các truy vấn chạy song song trong cùng một lần render trang:

- 1 truy vấn tìm bài published trống Slug (mỗi 100 bài một request);
- lần đầu gặp bài đó trong process: thêm 1 lượt đọc toàn database để tránh trùng (mỗi 100 bài một request), rồi đọc lại và ghi từng bài, tuần tự (2 request mỗi bài);
- ghi thành công thì từ lượt sau bài không còn trống Slug, chi phí về 0;
- ghi thất bại thì các lượt sau trong process chỉ còn truy vấn đầu tiên, mỗi 60 giây một lần.

Link tới slug không tồn tại (trang bài, `/api/post-image`, `/api/blocks`) tốn 1 truy vấn `Slug equals` như trước, cộng truy vấn tìm bài trống Slug ở trên, nhưng truy vấn này dùng chung kết quả 60 giây nên tối đa 1 request mỗi phút mỗi process, dù có bao nhiêu link sai.

Bài mới đăng mà trống Slug có thể hiện chậm tới 60 giây so với trước, vì process đang chạy dùng lại kết quả lượt tính gần nhất.

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
