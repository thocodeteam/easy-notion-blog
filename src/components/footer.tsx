import Link from 'next/link'

import ExtLink from './ext-link'
import { SITE_TITLE, SITE_DESCRIPTION } from './document-head'
import { getTagLink } from '../lib/blog-helpers'

import styles from '../styles/footer.module.css'

interface FooterLink {
  label: string
  path: string
}

// Điều hướng nội bộ trong site
const siteLinks: FooterLink[] = [
  { label: 'Trang chủ', path: '/' },
  { label: 'Tạp chí', path: '/blog' },
  { label: 'Giới thiệu', path: '/about' },
]

// Chuyên mục = tag trong Notion database. Sửa/thêm cho đúng tag của bạn.
const categoryTags: string[] = [
  'AWS',
  'DevOps',
  'Nodejs',
  'Reactjs',
  'AI',
  'Diary',
]

// Kênh bên ngoài. Chỉ để những link thật sự tồn tại.
const socialLinks: FooterLink[] = [
  { label: 'Website', path: 'https://thocode.com' },
]

// Tên tạp chí đã hiển thị ngay trên nên bỏ tiền tố "<tên> - " khỏi tagline,
// vẫn giữ một nguồn duy nhất là SITE_DESCRIPTION.
const tagline = SITE_DESCRIPTION.replace(
  new RegExp('^' + SITE_TITLE + '\\s*-\\s*'),
  ''
)

const Footer = () => (
  <footer className={styles.footer}>
    <div className={styles.masthead}>
      <div className={styles.brand}>
        <p className={styles.brandTitle}>
          <Link href="/" passHref>
            <a>{SITE_TITLE}</a>
          </Link>
        </p>
        <p className={styles.brandDescription}>{tagline}</p>
        <p className={styles.brandMotto}>
          Lời quê chắp nhặt dông dài
          <br />
          Mua vui cũng được một vài trống canh
        </p>
      </div>

      <nav className={styles.columns} aria-label="Điều hướng chân trang">
        <div className={styles.column}>
          <h2 className={styles.columnTitle}>Chuyên mục</h2>
          <ul>
            {categoryTags.map(tag => (
              <li key={tag}>
                <Link href="/blog/tag/[tag]" as={getTagLink(tag)} passHref>
                  <a>{tag}</a>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.column}>
          <h2 className={styles.columnTitle}>Tạp chí</h2>
          <ul>
            {siteLinks.map(({ label, path }) => (
              <li key={label}>
                <Link href={path} passHref>
                  <a>{label}</a>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.column}>
          <h2 className={styles.columnTitle}>Kết nối</h2>
          <ul>
            {socialLinks.map(({ label, path }) => (
              <li key={label}>
                <ExtLink href={path}>{label}</ExtLink>
              </li>
            ))}
            <li>
              <a href="mailto:hello@thocode.com">Góp bài / Liên hệ</a>
            </li>
          </ul>
        </div>
      </nav>
    </div>

    <div className={styles.colophon}>
      <div className={styles.copyright}>
        <span>© {new Date().getFullYear()} </span>
        <ExtLink href="https://thocode.com">{SITE_TITLE}</ExtLink>
        <span>. Mọi bài viết thuộc về tác giả của bài viết đó.</span>
      </div>
      <div className={styles.credit}>
        <span>Powered by </span>
        <ExtLink href="https://github.com/otoyo/easy-notion-blog">
          easy-notion-blog
        </ExtLink>
        <span>. Built with </span>
        <ExtLink href="https://kiro.dev">Kiro</ExtLink>
        <span> and a lot of coffee in Saigon, with love ❤️</span>
      </div>
    </div>
  </footer>
)

export default Footer
