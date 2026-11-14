// set() là đường ghi slug chính ở production: chạy một lần lúc build, trước khi
// `next build` đọc `.blog_index_data`.
import fs from 'fs'

const mockNotion = {
  query: jest.fn(),
  retrieve: jest.fn(),
  update: jest.fn(),
}

jest.mock('@notionhq/client', () => ({
  Client: class {
    constructor() {
      return {
        databases: { query: mockNotion.query },
        pages: { retrieve: mockNotion.retrieve, update: mockNotion.update },
      }
    }
  },
}))

const page = (id: string, title: string, slug: string) => ({
  id,
  properties: {
    Page: { title: [{ plain_text: title }] },
    Slug: { rich_text: slug ? [{ plain_text: slug }] : [] },
    Date: { date: { start: '2026-07-01' } },
  },
})

const GENERATED = 'kiro-approve-for-me-khi-ai-agent-tu-quyet-dinh'

const env = process.env as Record<string, string>
let pages
let written: string

beforeEach(() => {
  jest.resetModules()
  delete env.VERCEL
  delete env.VERCEL_ENV

  pages = [
    page('old', 'Bài cũ', 'hoc-and-thi-djinh-ky'),
    page('new', 'Kiro Approve for Me: Khi AI Agent tự quyết định', ''),
  ]
  // Lượt có filter là truy vấn bài published; lượt không filter là
  // fetchAllSlugs. Trả bản sao để set() chỉ sửa được cache, không sửa "Notion".
  mockNotion.query.mockReset().mockImplementation(async () => ({
    results: JSON.parse(JSON.stringify(pages)),
    has_more: false,
  }))
  mockNotion.retrieve
    .mockReset()
    .mockImplementation(async ({ page_id }) =>
      pages.find(p => p.id === page_id)
    )
  mockNotion.update.mockReset().mockResolvedValue({})

  written = ''
  jest.spyOn(fs, 'writeFileSync').mockImplementation((_path, data) => {
    written = String(data)
  })
  jest.spyOn(console, 'log').mockImplementation(() => null)
})

afterEach(() => {
  jest.restoreAllMocks()
})

const run = async () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  await require('../../../src/lib/notion/blog-index-cache').set()
  return JSON.parse(written)
}

const slugOf = p =>
  p.properties.Slug.rich_text.length
    ? p.properties.Slug.rich_text[0].plain_text
    : ''

describe('blogIndexCache.set', () => {
  it('writes the missing slug once and stores it in the cache', async () => {
    const cached = await run()

    expect(mockNotion.update).toHaveBeenCalledTimes(1)
    expect(mockNotion.update).toHaveBeenCalledWith({
      page_id: 'new',
      properties: {
        Slug: { rich_text: [{ type: 'text', text: { content: GENERATED } }] },
      },
    })
    expect(cached.map(p => [p.id, slugOf(p)])).toEqual([
      ['old', 'hoc-and-thi-djinh-ky'],
      ['new', GENERATED],
    ])
  })

  it('does nothing to posts that already have a slug', async () => {
    pages[1] = page('new', 'Bài mới', 'slug-tay')

    const cached = await run()

    expect(mockNotion.update).not.toHaveBeenCalled()
    expect(mockNotion.retrieve).not.toHaveBeenCalled()
    expect(cached.map(slugOf)).toEqual(['hoc-and-thi-djinh-ky', 'slug-tay'])
  })

  it('caches the generated slug without writing on a Vercel preview', async () => {
    env.VERCEL = '1'
    env.VERCEL_ENV = 'preview'

    const cached = await run()

    expect(mockNotion.update).not.toHaveBeenCalled()
    expect(slugOf(cached[1])).toBe(GENERATED)
  })

  it('still caches the slug when Notion refuses the write', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => null)
    mockNotion.update.mockRejectedValue(
      Object.assign(new Error('Insufficient permissions'), {
        code: 'restricted_resource',
      })
    )

    const cached = await run()

    expect(slugOf(cached[1])).toBe(GENERATED)
  })
})
