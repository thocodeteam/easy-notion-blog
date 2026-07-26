import React, { useEffect } from 'react'
import { useRouter } from 'next/router'

import { NUMBER_OF_POSTS_PER_PAGE } from '../../../lib/notion/server-constants'
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

import { getBeforeLink } from '../../../lib/blog-helpers'
import {
  getPosts,
  getRankedPosts,
  getPostsBefore,
  getAllTags,
  getNumberOfPages,
  getPageNumberByBeforeDate,
} from '../../../lib/notion/client'

export async function getStaticProps({ params: { date } }) {
  if (!Date.parse(date) || !/\d{4}-\d{2}-\d{2}/.test(date)) {
    return { notFound: true }
  }

  const [posts, rankedPosts, tags, numberOfPages, currentPage] =
    await Promise.all([
      getPostsBefore(date, NUMBER_OF_POSTS_PER_PAGE),
      getRankedPosts(),
      getAllTags(),
      getNumberOfPages(),
      getPageNumberByBeforeDate(date),
    ])

  return {
    props: {
      date,
      posts,
      rankedPosts,
      tags,
      numberOfPages,
      currentPage,
    },
    revalidate: 3600,
  }
}

export async function getStaticPaths() {
  const posts = await getPosts()
  const path = getBeforeLink(posts[posts.length - 1].Date)

  return {
    paths: [path],
    fallback: 'blocking',
  }
}

const RenderPostsBeforeDate = ({
  date,
  posts = [],
  rankedPosts = [],
  tags = [],
  numberOfPages = 1,
  currentPage = 1,
  redirect,
}) => {
  const router = useRouter()

  useEffect(() => {
    if (redirect && !posts) {
      router.replace(redirect)
    }
  }, [router, redirect, posts])

  if (!posts) {
    return <PostsNotFound />
  }

  return (
    <div className={styles.container}>
      <DocumentHead description={`Post before ${date.split('T')[0]}`} />

      <div className={styles.mainContent}>
        <header>
          <h2>Posts before {date.split('T')[0]}</h2>
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
            currentPage={currentPage}
          />
        </footer>
      </div>

      <div className={styles.subContent}>
        <BlogPostLink heading="Tuyển chọn" posts={rankedPosts} />
        <BlogTagLink heading="Danh mục" tags={tags} />
      </div>
    </div>
  )
}

export default RenderPostsBeforeDate
