jest.mock('../../../src/lib/notion/client', () => ({
  getPostBySlug: jest.fn(),
}))

import { createMocks } from 'node-mocks-http'
import ApiPostImage from '../../../src/pages/api/post-image'
import { getPostBySlug } from '../../../src/lib/notion/client'

const mockedGetPostBySlug = getPostBySlug as jest.Mock

const slug = 'supported-blocks'
const imageUrl =
  'https://prod-files-secure.s3.us-west-2.amazonaws.com/abc/cover.png?X-Amz-Signature=xyz'

describe('/api/post-image', () => {
  beforeEach(() => {
    mockedGetPostBySlug.mockReset()
  })

  describe('not GET', () => {
    test('returns 405', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        url: `/api/post-image?slug=${slug}`,
      })

      await ApiPostImage(req, res)
      expect(res.statusCode).toEqual(405)
      expect(mockedGetPostBySlug).not.toHaveBeenCalled()
    })
  })

  describe('GET', () => {
    test('returns 400 when slug is missing', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        url: '/api/post-image?slug=',
      })

      await ApiPostImage(req, res)
      expect(res.statusCode).toEqual(400)
    })

    test('returns 404 when the post is not found', async () => {
      mockedGetPostBySlug.mockResolvedValue(null)
      const { req, res } = createMocks({
        method: 'GET',
        url: '/api/post-image?slug=unknown',
      })

      await ApiPostImage(req, res)
      expect(res.statusCode).toEqual(404)
    })

    test('returns 404 when the post has no image', async () => {
      mockedGetPostBySlug.mockResolvedValue({ Slug: slug, OGImage: null })
      const { req, res } = createMocks({
        method: 'GET',
        url: `/api/post-image?slug=${slug}`,
      })

      await ApiPostImage(req, res)
      expect(res.statusCode).toEqual(404)
    })

    test('redirects 302 to the fresh Notion URL with a cache header', async () => {
      mockedGetPostBySlug.mockResolvedValue({ Slug: slug, OGImage: imageUrl })
      const { req, res } = createMocks({
        method: 'GET',
        url: `/api/post-image?slug=${slug}`,
      })

      await ApiPostImage(req, res)
      expect(mockedGetPostBySlug).toHaveBeenCalledWith(slug)
      expect(res.statusCode).toEqual(302)
      expect(res._getRedirectUrl()).toEqual(imageUrl)
      expect(res.getHeader('Cache-Control')).toContain('s-maxage=1800')
    })

    test('answers HEAD like GET', async () => {
      mockedGetPostBySlug.mockResolvedValue({ Slug: slug, OGImage: imageUrl })
      const { req, res } = createMocks({
        method: 'HEAD',
        url: `/api/post-image?slug=${slug}`,
      })

      await ApiPostImage(req, res)
      expect(res.statusCode).toEqual(302)
      expect(res._getRedirectUrl()).toEqual(imageUrl)
    })

    test('returns 500 when Notion fails', async () => {
      mockedGetPostBySlug.mockRejectedValue(new Error('notion down'))
      jest.spyOn(console, 'log').mockImplementation(() => undefined)
      const { req, res } = createMocks({
        method: 'GET',
        url: `/api/post-image?slug=${slug}`,
      })

      await ApiPostImage(req, res)
      expect(res.statusCode).toEqual(500)
    })
  })
})
