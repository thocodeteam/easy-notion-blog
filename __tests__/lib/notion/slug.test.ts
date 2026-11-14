import {
  MAX_SLUG_LENGTH,
  slugify,
  assignSlugs,
} from '../../../src/lib/notion/slug'

describe('slugify', () => {
  it('turns a Vietnamese title into the slug the author expects', () => {
    expect(
      slugify(
        'Kiro Approve for Me: Khi AI Agent tự quyết định hành động nào được phép chạy, hành động nào cần hỏi Developer'
      )
    ).toBe(
      'kiro-approve-for-me-khi-ai-agent-tu-quyet-dinh-hanh-dong-nao-duoc-phep-chay-hanh-dong-nao-can-hoi-developer'
    )
  })

  it('maps đ and Đ to d, not dj', () => {
    expect(slugify('Đường đi định mệnh')).toBe('duong-di-dinh-menh')
  })

  it('strips every Vietnamese diacritic, composed or decomposed', () => {
    expect(slugify('Ăn ở ơn ưu ý Ỷ')).toBe('an-o-on-uu-y-y')
    expect(slugify('Tiếng Việt'.normalize('NFD'))).toBe('tieng-viet')
  })

  it('writes & as "and" like the existing hand-made slugs', () => {
    expect(slugify('Học & Thi AWS')).toBe('hoc-and-thi-aws')
    expect(slugify('R&D')).toBe('r-and-d')
  })

  it('collapses runs of other characters into one dash and trims dashes', () => {
    expect(slugify('  --.NET 8 / C# : "hello"!! -- ')).toBe('net-8-c-hello')
  })

  it('returns an empty string when nothing usable is left', () => {
    expect(slugify('🚀 !!!')).toBe('')
  })

  it('cuts long titles at a word boundary within the limit', () => {
    const title = Array(60).fill('chuyen').join(' ')
    const slug = slugify(title)

    expect(slug.length).toBeLessThanOrEqual(MAX_SLUG_LENGTH)
    expect(slug.endsWith('-')).toBe(false)
    expect(slug.split('-').every(word => word === 'chuyen')).toBe(true)
  })
})

describe('assignSlugs', () => {
  it('keeps the base slug when it is free', () => {
    const got = assignSlugs(
      [{ id: 'a', title: 'Bài mới', date: '2026-07-01' }],
      ['bai-cu']
    )
    expect(got.get('a')).toBe('bai-moi')
  })

  it('adds -2, -3 on collisions, the older post getting the lower number', () => {
    const got = assignSlugs(
      [
        { id: 'c', title: 'Nhật ký', date: '2026-07-03' },
        { id: 'b', title: 'Nhật ký', date: '2026-07-02' },
      ],
      ['nhat-ky']
    )
    expect(got.get('b')).toBe('nhat-ky-2')
    expect(got.get('c')).toBe('nhat-ky-3')
  })

  it('treats taken slugs case-insensitively', () => {
    const got = assignSlugs(
      [{ id: 'a', title: 'Nhật ký', date: '2026-07-01' }],
      ['Nhat-Ky']
    )
    expect(got.get('a')).toBe('nhat-ky-2')
  })

  it('falls back to the page id when the title has no usable characters', () => {
    const got = assignSlugs(
      [{ id: '1234-abcd', title: '🚀', date: '2026-07-01' }],
      []
    )
    expect(got.get('1234-abcd')).toBe('1234abcd')
  })
})
