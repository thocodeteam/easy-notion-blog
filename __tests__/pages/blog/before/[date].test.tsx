jest.mock('../../../../src/lib/notion/blog-index-cache')

import { render } from '@testing-library/react'
import RenderPostsBeforeDate from '../../../../src/pages/blog/before/[date]'

import { NUMBER_OF_POSTS_PER_PAGE } from '../../../../src/lib/notion/server-constants'
import {
  getRankedPosts,
  getPostsBefore,
  getAllTags,
  getNumberOfPages,
  getPageNumberByBeforeDate,
} from '../../../../src/lib/notion/client'

const date = '2022-01-01'

jest.mock('next/router', () => ({
  useRouter() {
    return {
      asPath: `/blog/before/${date}`,
      pathname: '/blog/before/[date]',
    }
  },
}))

describe('RenderPostsBeforeDate', () => {
  it('renders the page unchanged', async () => {
    const posts = await getPostsBefore(date, NUMBER_OF_POSTS_PER_PAGE)
    const rankedPosts = await getRankedPosts()
    const tags = await getAllTags()
    const numberOfPages = await getNumberOfPages()
    const currentPage = await getPageNumberByBeforeDate(date)

    const { container } = render(
      <RenderPostsBeforeDate
        date={date}
        posts={posts}
        rankedPosts={rankedPosts}
        tags={tags}
        numberOfPages={numberOfPages}
        currentPage={currentPage}
        redirect={null}
      />
    )
    expect(container).toMatchSnapshot()
  })
})
