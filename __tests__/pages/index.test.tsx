jest.mock('../../src/lib/notion/blog-index-cache')

import { render } from '@testing-library/react'
import RenderPage, { getStaticProps } from '../../src/pages/index'

jest.mock('next/router', () => ({
  useRouter() {
    return {
      asPath: '/',
      pathname: '/',
    }
  },
}))

describe('RenderPage', () => {
  it('renders the page unchanged', async () => {
    const { props } = await getStaticProps()

    const { container } = render(
      <RenderPage
        featured={props.featured}
        latest={props.latest}
        tags={props.tags}
      />
    )
    expect(container).toMatchSnapshot()
  })
})
