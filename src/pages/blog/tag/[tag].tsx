import { useRouter } from 'next/router'

import DocumentHead from '../../../components/document-head'
import {
  BlogPostLink,
  BlogTagLink,
  NoContents,
  Pagination,
  PostDate,
  PostExcerpt,
  PostTags,
  PostTitle,
  PostsNotFound,
  ReadMoreLink,
} from '../../../components/blog-parts'
import styles from '../../../styles/blog.module.css'
import { getTagLink } from '../../../lib/blog-helpers'
import { useEffect } from 'react'
import {
  getPosts,
  getRankedPosts,
  getPostsByTagAndPage,
  getNumberOfPagesByTag,
  getAllTags,
} from '../../../lib/notion/client'

export async function getStaticProps({ params: { tag } }) {
  const posts = await getPostsByTagAndPage(tag, 1)

  if (posts.length === 0) {
    console.log(`Failed to find posts for tag: ${tag}`)
    return {
      props: {
        redirect: '/blog',
      },
      revalidate: 30,
    }
  }

  const [rankedPosts, recentPosts, tags, numberOfPages] = await Promise.all([
    getRankedPosts(),
    getPosts(5),
    getAllTags(),
    getNumberOfPagesByTag(tag),
  ])

  return {
    props: {
      posts,
      rankedPosts,
      recentPosts,
      tags,
      tag,
      numberOfPages,
    },
    revalidate: 60,
  }
}

export async function getStaticPaths() {
  const tags = await getAllTags()

  return {
    paths: tags.map(tag => getTagLink(tag)),
    fallback: 'blocking',
  }
}

const RenderPostsByTags = ({
  tag,
  posts = [],
  rankedPosts = [],
  recentPosts = [],
  tags = [],
  numberOfPages = 1,
  redirect,
}) => {
  const router = useRouter()

  useEffect(() => {
    if (redirect && posts.length === 0) {
      router.replace(redirect)
    }
  }, [router, redirect, posts])

  if (!posts) {
    return <PostsNotFound />
  }

  return (
    <div className={styles.container}>
      <DocumentHead description={`Posts in ${tag}`} />

      <div className={styles.mainContent}>
        <header>
          <h2>{tag}</h2>
        </header>

        <NoContents contents={posts} />

        {posts.map(post => {
          return (
            <div className={styles.post} key={post.Slug}>
              <PostDate post={post} />
              <PostTags post={post} />
              <PostTitle post={post} />
              <PostExcerpt post={post} />
              <ReadMoreLink post={post} />
            </div>
          )
        })}

        <footer>
          <Pagination
            numberOfPages={numberOfPages}
            currentPage={1}
            tag={tag}
          />
        </footer>
      </div>

      <div className={styles.subContent}>
        <BlogPostLink heading="Tuyển chọn" posts={rankedPosts} />
        <BlogPostLink heading="Bài mới" posts={recentPosts} />
        <BlogTagLink heading="Danh mục" tags={tags} />
      </div>
    </div>
  )
}

export default RenderPostsByTags
