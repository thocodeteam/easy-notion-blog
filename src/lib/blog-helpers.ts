export const getBlogLink = (slug: string) => {
  return `/blog/${slug}`
}

export const getTagLink = (tag: string) => {
  return `/blog/tag/${encodeURIComponent(tag)}`
}

export const getBeforeLink = (date: string) => {
  return `/blog/before/${date}`
}

export const getPageLink = (page: number) => {
  return page === 1 ? '/blog' : `/blog/page/${page}`
}

export const getTagPageLink = (tag: string, page: number) => {
  const encodedTag = encodeURIComponent(tag)
  return page === 1
    ? `/blog/tag/${encodedTag}`
    : `/blog/tag/${encodedTag}/page/${page}`
}

export const getTagBeforeLink = (tag: string, date: string) => {
  return `/blog/tag/${encodeURIComponent(tag)}/before/${date}`
}

export const getDateStr = (date: string) => {
  const dt = new Date(date)
  const y = dt.getFullYear()
  const m = ('00' + (dt.getMonth() + 1)).slice(-2)
  const d = ('00' + dt.getDate()).slice(-2)
  return y + '-' + m + '-' + d
}

// '2026-09-28' -> '28 thg 9, 2026'. Đọc thẳng chuỗi YYYY-MM-DD, không qua
// new Date, để ngày không bị lệch theo múi giờ của máy build.
export const getDateStrVi = (date: string) => {
  const matched = /^(\d{4})-(\d{2})-(\d{2})/.exec(date || '')
  if (!matched) return ''

  const [, y, m, d] = matched
  return `${parseInt(d, 10)} thg ${parseInt(m, 10)}, ${y}`
}

// Ảnh bài đi qua API route để luôn lấy URL có chữ ký mới từ Notion.
export const getPostImageLink = (slug: string) => {
  return `/api/post-image?slug=${encodeURIComponent(slug)}`
}

// og:image/twitter:image phải là URL tuyệt đối và còn dùng được khi Facebook,
// Zalo, Twitter đọc lại link về sau. URL ký của Notion hết hạn sau khoảng 1 giờ,
// nên trỏ qua /api/post-image (luôn redirect tới URL mới). Không có siteUrl
// (NEXT_PUBLIC_URL chưa đặt) thì không ghép được URL tuyệt đối, đành dùng URL
// gốc của Notion như trước.
export const getOgImageUrl = (
  post: { Slug: string; OGImage: string | null },
  siteUrl?: string
) => {
  if (!post.OGImage) return ''
  if (!siteUrl) return post.OGImage
  return new URL(getPostImageLink(post.Slug), siteUrl).toString()
}

export const normalizeSlug = (slug: string) => {
  const startingSlash = slug.startsWith('/')
  const endingSlash = slug.endsWith('/')

  if (startingSlash) {
    slug = slug.substring(1)
  }
  if (endingSlash) {
    slug = slug.substring(0, slug.length - 1)
  }
  return startingSlash || endingSlash ? normalizeSlug(slug) : slug
}

export const isYouTubeURL = (url: URL): boolean => {
  if (['www.youtube.com', 'youtu.be'].includes(url.hostname)) {
    return true
  }
  return false
}

// Supported URL
//
// - http://youtu.be/0zM3nApSvMg
// - http://www.youtube.com/watch?v=0zM3nApSvMg&feature=feedrec_grec_index
// - http://www.youtube.com/watch?v=0zM3nApSvMg#t=0m10s
// - http://www.youtube.com/watch?v=0zM3nApSvMg
// - http://www.youtube.com/v/0zM3nApSvMg?fs=1&amp;hl=en_US&amp;rel=0
// - http://www.youtube.com/embed/0zM3nApSvMg?rel=0
export const parseYouTubeVideoId = (url: URL): string => {
  if (!isYouTubeURL(url)) return ''

  if (url.hostname === 'youtu.be') {
    return url.pathname.split('/')[1]
  } else if (url.pathname === '/watch') {
    return url.searchParams.get('v')
  } else {
    const elements = url.pathname.split('/')

    if (elements.length < 2) return ''

    if (elements[1] === 'v' || elements[1] === 'embed') {
      return elements[2]
    }
  }

  return ''
}
