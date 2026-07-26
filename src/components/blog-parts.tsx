import React from 'react'
import Link from 'next/link'

import { Post } from '../lib/notion/interfaces'
import NotionBlocks from './notion-block'
import {
  getBlogLink,
  getDateStr,
  getPageLink,
  getTagLink,
  getTagPageLink,
} from '../lib/blog-helpers'
import styles from '../styles/blog-parts.module.css'

export const PostDate = ({ post }) => (
  <div className={styles.postDate} style={{ display: 'none' }}>
    {post.Date ? getDateStr(post.Date) : ''}
  </div>
)

export const PostTitle = ({ post, enableLink = true }) => {
  const postTitle = post.Title ? post.Title : ''

  return (
    <h3 className={styles.postTitle}>
      {enableLink ? (
        <Link href="/blog/[slug]" as={getBlogLink(post.Slug)} passHref>
          <a>{postTitle}</a>
        </Link>
      ) : (
        postTitle
      )}
    </h3>
  )
}

export const PostTags = ({ post }) => (
  <div className={styles.postTags}>
    {post.Tags &&
      post.Tags.length > 0 &&
      post.Tags.map((tag: string) => (
        <Link href="/blog/tag/[tag]" as={getTagLink(tag)} key={tag} passHref>
          <a>{tag}</a>
        </Link>
      ))}
  </div>
)

export const PostExcerpt = ({ post }) => (
  <div className={styles.postExcerpt}>
    <p>{post.Excerpt ? post.Excerpt : ''}</p>
  </div>
)

export const PostBody = ({ blocks }) => (
  <div className={styles.postBody}>
    <NotionBlocks blocks={blocks} />
  </div>
)

export const ReadMoreLink = ({ post }) => (
  <div style={{ display: 'none' }} className={styles.readMoreLink}>
    <Link href="/blog/[slug]" as={getBlogLink(post.Slug)} passHref>
      <a className={styles.readMore}>Read more</a>
    </Link>
  </div>
)

// Danh sách số trang cần hiển thị: đầu dãy, quanh trang hiện tại, các mốc chục
// (10, 20, 30...) và trang cuối. null = dấu lược "…".
export const calculatePageNumbers = (
  currentPage: number,
  numberOfPages: number
): (number | null)[] => {
  const pages = new Set<number>()

  pages.add(1)
  pages.add(numberOfPages)

  for (let page = 2; page <= 3 && page <= numberOfPages; page++) {
    pages.add(page)
  }

  for (let page = currentPage - 1; page <= currentPage + 1; page++) {
    if (page >= 1 && page <= numberOfPages) {
      pages.add(page)
    }
  }

  for (let page = 10; page < numberOfPages; page += 10) {
    pages.add(page)
  }

  const sorted = [...pages].sort((a, b) => a - b)
  const result: (number | null)[] = []

  sorted.forEach((page, index) => {
    if (index > 0) {
      const gap = page - sorted[index - 1]

      if (gap === 2) {
        // Chỉ thiếu đúng 1 trang thì hiện luôn, không cần dấu lược
        result.push(page - 1)
      } else if (gap > 2) {
        result.push(null)
      }
    }
    result.push(page)
  })

  return result
}

const PageLink = ({ page, tag, label, current = false }) => {
  if (current) {
    return <span aria-current="page">{label}</span>
  }

  const href = tag
    ? page === 1
      ? '/blog/tag/[tag]'
      : '/blog/tag/[tag]/page/[page]'
    : page === 1
    ? '/blog'
    : '/blog/page/[page]'

  return (
    <Link
      href={href}
      as={tag ? getTagPageLink(tag, page) : getPageLink(page)}
      passHref
    >
      <a>{label}</a>
    </Link>
  )
}

export const Pagination = ({ numberOfPages, currentPage, tag = '' }) => {
  if (!numberOfPages || numberOfPages < 2) return null
  if (!currentPage) return null

  return (
    <nav className={styles.pagination} aria-label="Phân trang">
      <ul>
        {currentPage > 1 && (
          <li className={styles.paginationEdge}>
            <PageLink page={currentPage - 1} tag={tag} label="＜ Trước" />
          </li>
        )}

        {calculatePageNumbers(currentPage, numberOfPages).map((page, index) =>
          page === null ? (
            <li key={`gap-${index}`} className={styles.paginationGap}>
              …
            </li>
          ) : (
            <li
              key={page}
              className={page === currentPage ? styles.paginationCurrent : null}
            >
              <PageLink
                page={page}
                tag={tag}
                label={page.toString()}
                current={page === currentPage}
              />
            </li>
          )
        )}

        {currentPage < numberOfPages && (
          <li className={styles.paginationEdge}>
            <PageLink page={currentPage + 1} tag={tag} label="Sau ＞" />
          </li>
        )}
      </ul>
    </nav>
  )
}

export const NoContents = ({ contents }) => {
  if (!!contents && contents.length > 0) return null

  return <div className={styles.noContents}>Chúng tôi đang cập nhật...</div>
}

export const BlogPostLink = ({ heading, posts }) => (
  <div className={styles.blogPostLink}>
    <h3>{heading}</h3>
    <NoContents contents={posts} />
    <PostLinkList posts={posts} />
  </div>
)

export const BlogTagLink = ({ heading, tags }) => (
  <div className={styles.blogTagLink}>
    <h3>{heading}</h3>
    <NoContents contents={tags} />
    <TagLinkList tags={tags} />
  </div>
)

export const PostLinkList = ({ posts }) => {
  if (!posts || posts.length === 0) return null

  return (
    <ul>
      {posts.map((post: Post) => {
        return (
          <li key={post.Slug}>
            <Link href="/blog/[slug]" as={getBlogLink(post.Slug)} passHref>
              <a>{post.Title}</a>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

export const TagLinkList = ({ tags }) => {
  if (!tags || tags.length === 0) return null

  return (
    <ul>
      {tags.map((tag: string) => {
        return (
          <li key={tag}>
            <Link href="/blog/tag/[tag]" as={getTagLink(tag)} passHref>
              <a>{tag}</a>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

export const PostsNotFound = () => (
  <div className={styles.postsNotFound}>
    Woops! did not find the posts, redirecting you back to the blog index
  </div>
)
