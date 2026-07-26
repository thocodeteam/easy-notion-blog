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
  ReadMoreLink,
} from '../../../components/blog-parts'
import styles from '../../../styles/blog.module.css'
import {
  getPostsByPage,
  getRankedPosts,
  getAllTags,
  getNumberOfPages,
} from '../../../lib/notion/client'

export async function getStaticProps({ params: { page: requestedPage } }) {
  const page = parseInt(requestedPage as string, 10)

  if (isNaN(page) || page < 1) {
    return { notFound: true }
  }

  const [posts, rankedPosts, tags, numberOfPages] = await Promise.all([
    getPostsByPage(page),
    getRankedPosts(),
    getAllTags(),
    getNumberOfPages(),
  ])

  if (posts.length === 0) {
    return { notFound: true, revalidate: 60 }
  }

  return {
    props: {
      page,
      posts,
      rankedPosts,
      tags,
      numberOfPages,
    },
    revalidate: 60,
  }
}

export async function getStaticPaths() {
  const numberOfPages = await getNumberOfPages()

  // Trang 1 đã là /blog nên chỉ sinh sẵn từ trang 2
  const paths = []
  for (let page = 2; page <= numberOfPages; page++) {
    paths.push({ params: { page: page.toString() } })
  }

  return {
    paths,
    fallback: 'blocking',
  }
}

const RenderPostsByPage = ({
  page,
  posts = [],
  rankedPosts = [],
  tags = [],
  numberOfPages = 1,
}) => {
  return (
    <div className={styles.container}>
      <DocumentHead title={`Trang ${page}`} />

      <div className={styles.mainContent}>
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
          <Pagination numberOfPages={numberOfPages} currentPage={page} />
        </footer>
      </div>

      <div className={styles.subContent}>
        <BlogPostLink heading="Tuyển chọn" posts={rankedPosts} />
        <BlogTagLink heading="Danh mục" tags={tags} />
      </div>
    </div>
  )
}

export default RenderPostsByPage
