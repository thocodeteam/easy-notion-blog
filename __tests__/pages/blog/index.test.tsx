jest.mock('../../../src/lib/notion/blog-index-cache')

import { render } from '@testing-library/react'
import RenderPosts from '../../../src/pages/blog/index'

import {
  getPosts,
  getRankedPosts,
  getAllTags,
  getNumberOfPages,
} from '../../../src/lib/notion/client'

jest.mock('next/router', () => ({
  useRouter() {
    return {
      asPath: '/blog',
      pathname: '/blog',
    }
  },
}))

describe('RenderPosts', () => {
  it('renders the page unchanged', async () => {
    const posts = await getPosts()
    const rankedPosts = await getRankedPosts()
    const tags = await getAllTags()
    const numberOfPages = await getNumberOfPages()

    const { container } = render(
      <RenderPosts
        posts={posts}
        rankedPosts={rankedPosts}
        tags={tags}
        numberOfPages={numberOfPages}
      />
    )
    expect(container).toMatchSnapshot()
  })
})
