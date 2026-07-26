jest.mock('../../../../../../src/lib/notion/blog-index-cache')

import { render } from '@testing-library/react'
import RenderPostsByTagsBeforeDate from '../../../../../../src/pages/blog/tag/[tag]/before/[date]'

import {
  getPosts,
  getPostsByTagBefore,
  getRankedPosts,
  getAllTags,
  getNumberOfPagesByTag,
  getPageNumberByTagAndBeforeDate,
} from '../../../../../../src/lib/notion/client'

jest.mock('next/router', () => ({
  useRouter() {
    return {
      asPath: '/blog/tag/Diary/before/2022-05-01',
      pathname: '/blog/tag/[tag]/before/[date]',
    }
  },
}))

describe('RenderPostsByTagsBeforeDate', () => {
  it('renders the page unchanged', async () => {
    const tag = 'Diary'
    const date = '2022-05-01'
    const posts = await getPostsByTagBefore(tag, date)
    const rankedPosts = await getRankedPosts()
    const recentPosts = await getPosts(5)
    const tags = await getAllTags()
    const numberOfPages = await getNumberOfPagesByTag(tag)
    const currentPage = await getPageNumberByTagAndBeforeDate(tag, date)

    const { container } = render(
      <RenderPostsByTagsBeforeDate
        date={date}
        tag={tag}
        posts={posts}
        rankedPosts={rankedPosts}
        recentPosts={recentPosts}
        tags={tags}
        numberOfPages={numberOfPages}
        currentPage={currentPage}
        redirect={null}
      />
    )
    expect(container).toMatchSnapshot()
  })
})
