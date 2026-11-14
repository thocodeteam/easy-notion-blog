import Link from 'next/link'

import DocumentHead from '../components/document-head'
import { NoContents } from '../components/blog-parts'
import { Post } from '../lib/notion/interfaces'
import {
  getBlogLink,
  getDateStrVi,
  getPostImageLink,
  getTagLink,
} from '../lib/blog-helpers'
import { getPosts, getRankedPosts, getAllTags } from '../lib/notion/client'
import styles from '../styles/home.module.css'

const NUMBER_OF_FEATURED_POSTS = 3
const NUMBER_OF_LATEST_POSTS = 7

export async function getStaticProps() {
  const [posts, rankedPosts, tags] = await Promise.all([
    // Dư 3 bài để bù sau khi loại các bài đã lên dải nổi bật
    getPosts(NUMBER_OF_FEATURED_POSTS + NUMBER_OF_LATEST_POSTS + 3),
    getRankedPosts(NUMBER_OF_FEATURED_POSTS),
    getAllTags(),
  ])

  // Bài có Rank lên trước, thiếu thì bù bằng bài mới nhất
  const featured: Post[] = rankedPosts.slice(0, NUMBER_OF_FEATURED_POSTS)
  posts.forEach(post => {
    if (
      featured.length < NUMBER_OF_FEATURED_POSTS &&
      !featured.some(p => p.Slug === post.Slug)
    ) {
      featured.push(post)
    }
  })

  const latest = posts
    .filter(post => !featured.some(p => p.Slug === post.Slug))
    .slice(0, NUMBER_OF_LATEST_POSTS)

  return {
    props: {
      featured,
      latest,
      tags,
    },
    revalidate: 60,
  }
}

const PostLink = ({ post, className = undefined, children }) => (
  <Link href="/blog/[slug]" as={getBlogLink(post.Slug)} passHref>
    <a className={className}>{children}</a>
  </Link>
)

const PostImage = ({ post, className, lazy = true }) => {
  if (!post.OGImage) return null

  return (
    <Link href="/blog/[slug]" as={getBlogLink(post.Slug)} passHref>
      <a className={className} tabIndex={-1} aria-hidden="true">
        <img
          src={getPostImageLink(post.Slug)}
          alt=""
          loading={lazy ? 'lazy' : undefined}
        />
      </a>
    </Link>
  )
}

const PostMeta = ({ post }) => {
  const date = getDateStrVi(post.Date)
  const tag = post.Tags && post.Tags.length > 0 ? post.Tags[0] : ''

  return (
    <div className={styles.meta}>
      {date}
      {date && tag && ' • '}
      {tag && (
        <Link href="/blog/tag/[tag]" as={getTagLink(tag)} passHref>
          <a>{tag}</a>
        </Link>
      )}
    </div>
  )
}

const PostText = ({ post }) => (
  <>
    <h3 className={styles.title}>
      <PostLink post={post}>{post.Title}</PostLink>
    </h3>
    {post.Excerpt && <p className={styles.excerpt}>{post.Excerpt}</p>}
    <PostMeta post={post} />
  </>
)

const RenderPage = ({ featured = [], latest = [], tags = [] }) => {
  const [mainPost, ...sidePosts] = featured

  return (
    <div className={styles.home}>
      <DocumentHead />

      <NoContents contents={featured} />

      {mainPost && (
        <section className={styles.featured}>
          {sidePosts.length > 0 && (
            <div className={styles.featuredSide}>
              {sidePosts.map(post => (
                <article className={styles.card} key={post.Slug}>
                  <PostImage post={post} className={styles.cardImage} />
                  <div className={styles.text}>
                    <PostText post={post} />
                  </div>
                </article>
              ))}
            </div>
          )}

          <article className={styles.featuredMain}>
            <PostImage
              post={mainPost}
              className={styles.mainImage}
              lazy={false}
            />
            <PostText post={mainPost} />
          </article>

          {tags.length > 0 && (
            <aside className={styles.featuredTags}>
              <h2>Danh mục</h2>
              <ul>
                {tags.map((tag: string) => (
                  <li key={tag}>
                    <Link href="/blog/tag/[tag]" as={getTagLink(tag)} passHref>
                      <a>{tag}</a>
                    </Link>
                  </li>
                ))}
              </ul>
            </aside>
          )}
        </section>
      )}

      <section className={styles.latest}>
        {latest.length > 0 && <h2>Bài mới</h2>}

        {latest.map(post => (
          <article className={styles.row} key={post.Slug}>
            <div className={styles.text}>
              <PostText post={post} />
            </div>
            <PostImage post={post} className={styles.rowImage} />
          </article>
        ))}

        <Link href="/blog" passHref>
          <a className={styles.seeAll}>Xem tất cả bài viết →</a>
        </Link>
      </section>
    </div>
  )
}

export default RenderPage
