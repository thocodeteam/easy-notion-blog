import { render, screen } from '@testing-library/react'
import Footer from '../../src/components/footer'
import { version } from '../../package.json'

describe('Footer', () => {
  test('shows the version from package.json right before the credit line', () => {
    render(<Footer />)

    // getByText ném lỗi nếu không tìm thấy
    expect(screen.getByText(`Version ${version}. Powered by`)).toBeTruthy()
  })
})
