jest.mock('../../src/lib/notion/blog-index-cache')

import {
  getOgImageUrl,
  isYouTubeURL,
  parseYouTubeVideoId,
} from '../../src/lib/blog-helpers'

describe('getOgImageUrl', () => {
  const notionUrl =
    'https://prod-files-secure.s3.us-west-2.amazonaws.com/a/b/cover.jpg?X-Amz-Expires=3600'

  it('points at /api/post-image on the site so the link never expires', () => {
    const got = getOgImageUrl(
      { Slug: 'bài viết/thử', OGImage: notionUrl },
      'https://www.thocode.com'
    )
    expect(got).toBe(
      'https://www.thocode.com/api/post-image?slug=b%C3%A0i%20vi%E1%BA%BFt%2Fth%E1%BB%AD'
    )
  })

  it('falls back to the Notion URL when the site URL is not set', () => {
    expect(getOgImageUrl({ Slug: 'a', OGImage: notionUrl }, undefined)).toBe(
      notionUrl
    )
  })

  it('returns an empty string when the post has no cover image', () => {
    expect(
      getOgImageUrl({ Slug: 'a', OGImage: null }, 'https://www.thocode.com')
    ).toBe('')
  })
})

describe('isYouTubeURL', () => {
  it('returns false with not YouTube URL', async () => {
    const got = isYouTubeURL(new URL('https://www.google.com/'))
    expect(got).toBeFalsy()
  })

  it('returns true with youtu.be', async () => {
    const got = isYouTubeURL(new URL('http://youtu.be/0zM3nApSvMg'))
    expect(got).toBeTruthy
  })

  it('returns true with www.youtube.com', async () => {
    const got = isYouTubeURL(new URL('http://www.youtube.com/watch?v=0zM3nApSvMg'))
    expect(got).toBeTruthy
  })
})

describe('parseYouTubeVideoId', () => {
  const videoId = '0zM3nApSvMg'

  it('returns empty with not YouTube URL', async () => {
    const got = parseYouTubeVideoId(new URL('https://www.google.com/'))
    expect(got).toEqual('')
  })

  it('returns videoId with youtu.be', async () => {
    const got = parseYouTubeVideoId(new URL('http://youtu.be/0zM3nApSvMg'))
    expect(got).toEqual(videoId)
  })

  it('returns videoId with www.youtube.com/watch', async () => {
    const got = parseYouTubeVideoId(new URL('http://www.youtube.com/watch?v=0zM3nApSvMg&feature=feedrec_grec_index'))
    expect(got).toEqual(videoId)
  })

  it('returns videoId with www.youtube.com/v', async () => {
    const got = parseYouTubeVideoId(new URL('http://www.youtube.com/v/0zM3nApSvMg?fs=1&amp;hl=en_US&amp;rel=0'))
    expect(got).toEqual(videoId)
  })

  it('returns videoId with www.youtube.com/embed', async () => {
    const got = parseYouTubeVideoId(new URL('http://www.youtube.com/embed/0zM3nApSvMg?rel=0'))
    expect(got).toEqual(videoId)
  })
})
