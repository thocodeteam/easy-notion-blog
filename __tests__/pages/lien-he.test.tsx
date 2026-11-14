import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import RenderPage from '../../src/pages/lien-he'

jest.mock('next/router', () => ({
  useRouter() {
    return {
      asPath: '/lien-he',
      pathname: '/lien-he',
    }
  },
}))

describe('RenderPage', () => {
  afterEach(() => {
    delete window.turnstile
  })

  it('renders the contact form with a honeypot and the Turnstile widget', () => {
    const turnstile = {
      render: jest.fn(() => 'widget-1'),
      reset: jest.fn(),
      remove: jest.fn(),
    }
    window.turnstile = turnstile

    const { container } = render(<RenderPage />)

    expect(screen.getByLabelText(/Họ tên/)).toHaveAttribute('required')
    expect(screen.getByLabelText(/Email/)).toHaveAttribute('type', 'email')
    expect(screen.getByLabelText('Liên hệ')).toHaveAttribute('type', 'radio')
    expect(screen.getByLabelText('Góp bài')).toHaveAttribute('type', 'radio')
    expect(screen.getByLabelText(/Tiêu đề/)).toHaveAttribute('maxlength', '200')
    expect(screen.getByLabelText(/Nội dung/)).toHaveAttribute(
      'maxlength',
      '10000'
    )
    expect(screen.getByLabelText('Link bản nháp')).not.toHaveAttribute(
      'required'
    )
    expect(
      container.querySelector('input[name="website"]')
    ).toHaveAttribute('tabindex', '-1')

    expect(turnstile.render).toHaveBeenCalledTimes(1)
    expect(turnstile.render).toHaveBeenCalledWith(
      expect.any(HTMLDivElement),
      expect.objectContaining({
        sitekey: '0x4AAAAAAGAii2IXomuDLWeb',
        action: 'contact',
      })
    )
  })
})
