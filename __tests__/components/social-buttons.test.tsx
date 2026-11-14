import { render, screen } from '@testing-library/react'
import SocialButtons from '../../src/components/social-buttons'

describe('SocialButtons', () => {
  test('renders only Facebook and Twitter share buttons', () => {
    render(
      <SocialButtons
        title="Bài thử"
        url="https://www.thocode.com/blog/bai-thu"
        id="bai-thu"
      />
    )

    const labels = screen
      .getAllByRole('button')
      .map(button => button.getAttribute('aria-label'))

    expect(labels).toEqual(['facebook', 'twitter'])
  })
})
