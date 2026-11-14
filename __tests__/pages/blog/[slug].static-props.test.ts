/**
 * @jest-environment node
 */
jest.mock('../../../src/lib/notion/client', () => ({
  getPostBySlug: jest.fn(),
  getAllBlocksByBlockId: jest.fn(),
  getRankedPosts: jest.fn(),
  getPosts: jest.fn(),
  getAllTags: jest.fn(),
  getPostsByTag: jest.fn(),
  getAllPosts: jest.fn(),
}))

import { getStaticProps } from '../../../src/pages/blog/[slug]'
import {
  getPostBySlug,
  getAllBlocksByBlockId,
} from '../../../src/lib/notion/client'

describe('/blog/[slug] getStaticProps', () => {
  test('returns notFound with revalidate when the slug does not exist', async () => {
    const getPostBySlugMock = getPostBySlug as jest.Mock
    getPostBySlugMock.mockResolvedValue(null)

    const result = await getStaticProps({ params: { slug: 'khong-ton-tai' } })

    expect(result).toEqual({ notFound: true, revalidate: 30 })
    expect(getAllBlocksByBlockId).not.toHaveBeenCalled()
  })
})
