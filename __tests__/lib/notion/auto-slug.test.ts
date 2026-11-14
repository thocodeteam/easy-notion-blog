// getAllPosts / getPostBySlug với bài có ô Slug trống: sinh slug, ghi ngược vào
// Notion một lần, tránh trùng, và vẫn hiển thị khi ghi lỗi.
export {}

jest.mock('../../../src/lib/notion/blog-index-cache')

const mockNotion = {
  pages: [],
  databases: {
    query: jest.fn(),
    retrieve: jest.fn(),
  },
  pagesApi: {
    retrieve: jest.fn(),
    update: jest.fn(),
  },
}

jest.mock('@notionhq/client', () => ({
  Client: class {
    constructor() {
      return {
        databases: mockNotion.databases,
        pages: mockNotion.pagesApi,
      }
    }
  },
}))

const page = (
  id: string,
  title: string,
  slug: string,
  { published = true, date = '2026-07-01' } = {}
) => ({
  id,
  properties: {
    Page: { title: [{ plain_text: title }] },
    Slug: { rich_text: slug ? [{ plain_text: slug }] : [] },
    Date: { date: { start: date } },
    Tags: { multi_select: [] },
    Excerpt: { rich_text: [] },
    OGImage: { files: [] },
    Rank: { number: null },
    Published: { checkbox: published },
  },
})

const slugOf = p =>
  p.properties.Slug.rich_text.length
    ? p.properties.Slug.rich_text[0].plain_text
    : ''

// Đánh giá các điều kiện filter mà client.ts dùng; Date được bỏ qua vì mọi bài
// trong test đều ở quá khứ.
const matches = (p, cond) => {
  if (cond.property === 'Published') {
    return p.properties.Published.checkbox === cond.checkbox.equals
  }
  if (cond.property === 'Slug' && 'equals' in cond.rich_text) {
    return slugOf(p) === cond.rich_text.equals
  }
  if (cond.property === 'Slug' && cond.rich_text.is_empty) {
    return slugOf(p) === ''
  }
  return true
}

const TITLE = 'Kiro Approve for Me: Khi AI Agent tự quyết định'
const GENERATED = 'kiro-approve-for-me-khi-ai-agent-tu-quyet-dinh'

// Loại của mỗi lời gọi databases.query: đọc toàn database để tránh trùng
// (không filter), tìm bài trống Slug, hay truy vấn bình thường.
const queryKinds = () =>
  mockNotion.databases.query.mock.calls.map(([params]) => {
    if (!params.filter) return 'all-slugs'
    const pending = params.filter.and.some(
      c => c.property === 'Slug' && c.rich_text.is_empty
    )
    return pending ? 'pending' : 'list'
  })

const count = (kinds: string[], kind: string) =>
  kinds.filter(k => k === kind).length

// Các truy vấn Notion mà getStaticProps của /blog/[slug] gọi.
const renderPostPage = async (slug: string) => {
  const post = await client.getPostBySlug(slug)
  await Promise.all([
    client.getRankedPosts(),
    client.getPosts(5),
    client.getPostsByTag('AI', 6),
  ])
  return post
}

const env = process.env as Record<string, string>
const NODE_ENV = env.NODE_ENV
const TTL = 60 * 1000

let client
let now: number

beforeEach(() => {
  jest.resetModules()
  delete env.VERCEL_ENV
  delete env.VERCEL
  env.NODE_ENV = NODE_ENV
  now = Date.parse('2026-07-02T00:00:00Z')
  jest.spyOn(Date, 'now').mockImplementation(() => now)

  mockNotion.pages = [
    page('old', 'Bài cũ', 'hoc-and-thi-djinh-ky', { date: '2024-01-01' }),
    page('new', TITLE, ''),
    page('draft', 'Bản nháp', '', { published: false }),
  ]

  mockNotion.databases.query.mockReset().mockImplementation(async params => {
    const conds = params.filter ? params.filter.and : []
    return {
      results: mockNotion.pages.filter(p => conds.every(c => matches(p, c))),
      has_more: false,
    }
  })
  mockNotion.pagesApi.retrieve
    .mockReset()
    .mockImplementation(async ({ page_id }) =>
      mockNotion.pages.find(p => p.id === page_id)
    )
  mockNotion.pagesApi.update
    .mockReset()
    .mockImplementation(async ({ page_id, properties }) => {
      const target = mockNotion.pages.find(p => p.id === page_id)
      target.properties.Slug.rich_text = [
        { plain_text: properties.Slug.rich_text[0].text.content },
      ]
      return target
    })

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  client = require('../../../src/lib/notion/client')
})

afterEach(() => {
  jest.restoreAllMocks()
  env.NODE_ENV = NODE_ENV
})

describe('auto-generated slugs', () => {
  it('lists a published post with an empty Slug under the generated slug', async () => {
    const posts = await client.getAllPosts()

    expect(posts.map(p => [p.PageId, p.Slug])).toEqual([
      ['old', 'hoc-and-thi-djinh-ky'],
      ['new', GENERATED],
    ])
  })

  it('writes the slug to Notion once and reuses it afterwards', async () => {
    await client.getAllPosts()
    await client.getAllPosts()
    now += TTL + 1
    const posts = await client.getAllPosts()

    expect(mockNotion.pagesApi.update).toHaveBeenCalledTimes(1)
    expect(mockNotion.pagesApi.update).toHaveBeenCalledWith({
      page_id: 'new',
      properties: {
        Slug: { rich_text: [{ type: 'text', text: { content: GENERATED } }] },
      },
    })
    expect(posts.find(p => p.PageId === 'new').Slug).toBe(GENERATED)

    const post = await client.getPostBySlug(GENERATED)
    expect(post.PageId).toBe('new')
  })

  it('resolves a missing slug once per page render, not once per query', async () => {
    const post = await renderPostPage(GENERATED)

    expect(post.PageId).toBe('new')
    const kinds = queryKinds()
    // getPostBySlug (equals) + 3 truy vấn của trang, cộng đúng một lượt tìm bài
    // trống Slug và một lượt đọc toàn database.
    expect(count(kinds, 'list')).toBe(4)
    expect(count(kinds, 'pending')).toBe(1)
    expect(count(kinds, 'all-slugs')).toBe(1)
    expect(mockNotion.pagesApi.update).toHaveBeenCalledTimes(1)
  })

  it('costs one extra query per minute for unknown slugs', async () => {
    mockNotion.pages[1] = page('new', TITLE, GENERATED)

    for (let i = 0; i < 5; i++) {
      expect(await client.getPostBySlug(`khong-co-${i}`)).toBeNull()
    }

    const kinds = queryKinds()
    expect(count(kinds, 'list')).toBe(5)
    expect(count(kinds, 'pending')).toBe(1)
    expect(count(kinds, 'all-slugs')).toBe(0)
  })

  it('never writes to drafts or posts that already have a slug', async () => {
    await client.getAllPosts()

    const written = mockNotion.pagesApi.update.mock.calls.map(
      ([args]) => args.page_id
    )
    expect(written).toEqual(['new'])
    expect(slugOf(mockNotion.pages[0])).toBe('hoc-and-thi-djinh-ky')
    expect(slugOf(mockNotion.pages[2])).toBe('')
  })

  it('adds a suffix when the slug is taken, by drafts too', async () => {
    mockNotion.pages[2] = page('draft', 'Bản nháp', GENERATED, {
      published: false,
    })

    const posts = await client.getAllPosts()

    expect(posts.find(p => p.PageId === 'new').Slug).toBe(`${GENERATED}-2`)
  })

  it('keeps a slug the author typed after the list was read', async () => {
    mockNotion.pagesApi.retrieve.mockImplementation(async () =>
      page('new', TITLE, 'slug-tay')
    )

    const posts = await client.getAllPosts()

    expect(mockNotion.pagesApi.update).not.toHaveBeenCalled()
    expect(posts.find(p => p.PageId === 'new').Slug).toBe('slug-tay')
  })

  it('still serves the post when Notion refuses the write', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => null)
    mockNotion.pagesApi.update.mockRejectedValue(
      Object.assign(new Error('Insufficient permissions'), {
        code: 'restricted_resource',
        status: 403,
      })
    )

    const posts = await client.getAllPosts()
    expect(posts.find(p => p.PageId === 'new').Slug).toBe(GENERATED)

    const post = await client.getPostBySlug(GENERATED)
    expect(post.PageId).toBe('new')

    const recent = await client.getPosts()
    expect(recent.map(p => p.Slug)).toContain(GENERATED)

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('restricted_resource')
    )
    // Một lần thử ghi cho mỗi process, không thử lại ở mọi request.
    expect(mockNotion.pagesApi.update).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })

  it('keeps the degraded state cheap after a refused write', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => null)
    mockNotion.pagesApi.update.mockRejectedValue(
      Object.assign(new Error('Insufficient permissions'), {
        code: 'restricted_resource',
      })
    )

    await renderPostPage(GENERATED)
    mockNotion.databases.query.mockClear()

    // Hết TTL: ISR tái tạo trang lần nữa, slug vẫn chưa nằm trong Notion.
    now += TTL + 1
    const post = await renderPostPage(GENERATED)

    expect(post.PageId).toBe('new')
    expect(post.Slug).toBe(GENERATED)
    const kinds = queryKinds()
    expect(count(kinds, 'list')).toBe(4)
    expect(count(kinds, 'pending')).toBe(1)
    expect(count(kinds, 'all-slugs')).toBe(0)
    expect(mockNotion.pagesApi.retrieve).toHaveBeenCalledTimes(1)
    expect(mockNotion.pagesApi.update).toHaveBeenCalledTimes(1)
  })

  it('does not write from a Vercel preview, which shares the database', async () => {
    env.VERCEL = '1'
    env.VERCEL_ENV = 'preview'

    const posts = await client.getAllPosts()

    expect(posts.find(p => p.PageId === 'new').Slug).toBe(GENERATED)
    expect(mockNotion.pagesApi.update).not.toHaveBeenCalled()
  })

  it('does not write on Vercel when VERCEL_ENV is not exposed', async () => {
    env.VERCEL = '1'

    const posts = await client.getAllPosts()

    expect(posts.find(p => p.PageId === 'new').Slug).toBe(GENERATED)
    expect(mockNotion.pagesApi.update).not.toHaveBeenCalled()
  })

  it('does not write from npm run dev, where drafts pass the filter', async () => {
    env.NODE_ENV = 'development'

    const posts = await client.getAllPosts()

    expect(posts.find(p => p.PageId === 'draft').Slug).toBe('ban-nhap')
    expect(mockNotion.pagesApi.update).not.toHaveBeenCalled()
  })

  it('writes on Vercel production', async () => {
    env.VERCEL = '1'
    env.VERCEL_ENV = 'production'

    await client.getAllPosts()

    expect(mockNotion.pagesApi.update).toHaveBeenCalledTimes(1)
  })

  it('returns null for an unknown slug', async () => {
    expect(await client.getPostBySlug('khong-co')).toBeNull()
  })
})
