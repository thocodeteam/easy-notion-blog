import { NextApiRequest, NextApiResponse } from 'next'
import { getPostBySlug } from '../../lib/notion/client'

// URL file của Notion có chữ ký, hết hạn sau khoảng 1 giờ. Trang chủ trỏ ảnh về
// đây, route lấy URL mới từ Notion rồi redirect. Chỉ redirect tới URL lấy từ
// Notion, không bao giờ tới URL do người gọi truyền vào.
const ApiPostImage = async function(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    res.statusCode = 405
    res.end()
    return
  }

  const { slug } = req.query
  if (!slug || typeof slug !== 'string') {
    res.statusCode = 400
    res.end()
    return
  }

  try {
    const post = await getPostBySlug(slug)
    if (!post || !post.OGImage) {
      res.statusCode = 404
      res.end()
      return
    }

    // URL ký sống khoảng 3600 giây: cache 1800 + SWR 600 vẫn còn hạn.
    res.setHeader(
      'Cache-Control',
      'public, s-maxage=1800, stale-while-revalidate=600'
    )
    res.redirect(302, post.OGImage)
  } catch (e) {
    console.log(e)
    res.statusCode = 500
    res.end()
  }
}

export default ApiPostImage
