// Tự sinh Slug cho bài có ô Slug trống, rồi ghi ngược vào Notion để URL cố định
// từ lần đầu. CommonJS để scripts/set-blog-index-cache.js require được mà không
// cần transpile (giống server-constants.js).

// Next ghi mỗi trang ISR thành file `<slug>.html` và `<slug>.json`; hệ file Linux
// giới hạn tên file 255 byte. 200 ký tự chừa chỗ cho hậu tố trùng (-2, -3...) và
// phần mở rộng.
const MAX_SLUG_LENGTH = 200

// "Kiro Approve for Me: Khi AI Agent tự quyết định..." ->
// "kiro-approve-for-me-khi-ai-agent-tu-quyet-dinh..."
function slugify(title) {
  const slug = String(title || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    // Slug cũ viết tay dùng "and" cho "&" (hoc-and-thi-...), giữ cùng kiểu.
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  if (slug.length <= MAX_SLUG_LENGTH) {
    return slug
  }

  // Cắt ở ranh giới từ để không để lại nửa chữ ở cuối.
  let cut = slug.slice(0, MAX_SLUG_LENGTH)
  if (slug[MAX_SLUG_LENGTH] !== '-' && cut.lastIndexOf('-') > 0) {
    cut = cut.slice(0, cut.lastIndexOf('-'))
  }
  return cut.replace(/-+$/, '')
}

// Slug đang có của một trang Notion thô, '' nếu ô Slug trống.
// Đọc như _buildPost trước nay (đoạn rich text đầu tiên) để slug cũ không đổi.
function getExistingSlug(page) {
  const slug = page && page.properties && page.properties.Slug
  if (!slug || !slug.rich_text || slug.rich_text.length === 0) {
    return ''
  }
  return slug.rich_text[0].plain_text || ''
}

// Gán slug cho các bài thiếu slug. `posts`: [{ id, title, date }].
// `takenSlugs`: mọi slug đã có trong database, kể cả bản nháp, để bài nháp
// publish sau này không bị trùng URL. Bài cũ hơn (theo Date, rồi id) nhận slug
// gốc, bài sau nhận -2, -3... nên kết quả giống nhau ở mọi lần gọi.
function assignSlugs(posts, takenSlugs) {
  const taken = new Set(takenSlugs.map(slug => slug.toLowerCase()))
  const sorted = [...posts].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  })

  const assigned = new Map()
  sorted.forEach(post => {
    const base = slugify(post.title) || post.id.replace(/-/g, '')
    let slug = base
    for (let n = 2; taken.has(slug); n++) {
      slug = `${base}-${n}`
    }
    taken.add(slug)
    assigned.set(post.id, slug)
  })
  return assigned
}

// Chỉ ghi vào Notion khi chạy như production. Preview dùng chung database với
// production nên không được sửa nội dung; `npm run dev` bỏ filter Published
// nên bản nháp cũng lọt vào đây.
function canWriteSlugs() {
  if (process.env.NODE_ENV === 'development') return false
  const vercelEnv = process.env.VERCEL_ENV
  return !vercelEnv || vercelEnv === 'production'
}

// Mọi slug đang có trong database, không lọc Published: chỉ đọc để tránh trùng,
// không hiển thị bài nào.
async function fetchAllSlugs(client, databaseId) {
  const params = { database_id: databaseId, page_size: 100 }
  const slugs = []

  while (true) {
    const data = await client.databases.query(params)
    data.results.forEach(page => {
      const slug = getExistingSlug(page)
      if (slug) slugs.push(slug)
    })

    if (!data.has_more) break
    params['start_cursor'] = data.next_cursor
  }

  return slugs
}

// Ghi slug vào trang. Đọc lại trang trước: nếu người viết vừa gõ Slug tay thì
// slug tay thắng và không bị ghi đè. Lỗi (thiếu quyền "Update content", rate
// limit...) chỉ log, bài vẫn hiển thị bằng slug sinh ra trong bộ nhớ.
async function writeSlug(client, pageId, slug) {
  try {
    const page = await client.pages.retrieve({ page_id: pageId })
    const current = getExistingSlug(page)
    if (current) return current

    await client.pages.update({
      page_id: pageId,
      properties: {
        Slug: { rich_text: [{ type: 'text', text: { content: slug } }] },
      },
    })
    console.log(`Saved generated slug "${slug}" to Notion page ${pageId}`)
    return slug
  } catch (error) {
    const reason = (error && (error.code || error.status)) || 'unknown error'
    console.warn(
      `Could not save generated slug to Notion page ${pageId} (${reason}). ` +
        'Serving it from memory. If this is restricted_resource, enable ' +
        '"Update content" for the integration.'
    )
    return slug
  }
}

// Một lượt ghi cho mỗi (trang, slug) trong một process: các getStaticProps chạy
// song song dùng chung kết quả, và lỗi quyền không bị thử lại ở mọi request.
const pendingWrites = new Map()

// Sinh slug cho `missing` ([{ id, title, date }]), ghi vào Notion nếu được phép.
// Trả về Map id -> slug.
async function resolveMissingSlugs(client, databaseId, missing) {
  if (missing.length === 0) return new Map()

  const assigned = assignSlugs(
    missing,
    await fetchAllSlugs(client, databaseId)
  )
  if (!canWriteSlugs()) return assigned

  // Tuần tự để không vượt giới hạn ~3 request/giây của Notion.
  for (const [pageId, slug] of assigned) {
    const key = `${pageId}:${slug}`
    if (!pendingWrites.has(key)) {
      pendingWrites.set(key, writeSlug(client, pageId, slug))
    }
    assigned.set(pageId, await pendingWrites.get(key))
  }
  return assigned
}

module.exports = {
  MAX_SLUG_LENGTH,
  slugify,
  getExistingSlug,
  assignSlugs,
  canWriteSlugs,
  fetchAllSlugs,
  writeSlug,
  resolveMissingSlugs,
}
