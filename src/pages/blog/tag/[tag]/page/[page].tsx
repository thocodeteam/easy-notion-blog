import { useRouter } from 'next/router'
import { useEffect } from 'react'

import DocumentHead from '../../../../../components/document-head'
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
} from '../../../../../components/blog-parts'
import styles from '../../../../../styles/blog.module.css'
import {
  getPosts,
  getRankedPosts,
  getPostsByTagAndPage,
  getNumberOfPagesByTag,
  getAllTags,
} from '../../../../../lib/notion/client'

export async function getStaticProps({ params: { tag, page: requestedPage } }) {
  const page = parseInt(requestedPage as string, 10)

  if (isNaN(page) || page < 1) {
    return { notFound: true }
  }

  const posts = await getPostsByTagAndPage(tag, page)

  if (posts.length === 0) {
    console.log(`Failed to find posts for tag: ${tag}, page: ${page}`)
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
      page,
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
  // Số trang mỗi tag thay đổi theo nội dung Notion nên để fallback tự sinh
  return {
    paths: [],
    fallback: 'blocking',
  }
}

const RenderPostsByTagAndPage = ({
  tag,
  page,
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
      <DocumentHead description={`Posts in ${tag}, page ${page}`} />

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
            currentPage={page}
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

export default RenderPostsByTagAndPage
