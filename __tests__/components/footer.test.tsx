import { render, screen } from '@testing-library/react'
import Footer from '../../src/components/footer'
import { version } from '../../package.json'

describe('Footer', () => {
  test('shows the version from package.json', () => {
    render(<Footer />)

    // getByText ném lỗi nếu không tìm thấy
    expect(screen.getByText(`Phiên bản ${version}`)).toBeTruthy()
  })
})
