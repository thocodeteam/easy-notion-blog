import { NextApiRequest, NextApiResponse } from 'next'
import type { Got, OptionsInit } from 'got'
import createMetascraper from 'metascraper'
import metascraperDescription from 'metascraper-description'
import metascraperImage from 'metascraper-image'
import metascraperTitle from 'metascraper-title'
import { checkFetchableUrl, safeLookup } from '../../lib/url-safety'

const metascraper = createMetascraper([
  metascraperDescription(),
  metascraperImage(),
  metascraperTitle(),
])

const TIMEOUT_MS = 5000
const MAX_REDIRECTS = 3
const MAX_BYTES = 1024 * 1024
const HTML_TYPES = ['text/html', 'application/xhtml+xml']

// Vercel CDN cache theo từng URL query: một bookmark chỉ bị tải lại mỗi ngày,
// và request lặp lại (kể cả request lỗi) không chạy function.
const CACHE_OK = 'public, s-maxage=86400, stale-while-revalidate=604800'
const CACHE_ERROR = 'public, s-maxage=300'

// got là gói ESM-only. Import tĩnh ở đầu file khiến webpack của Next 12 sinh
// `import("got")` ở cấp module, biến cả route thành async module: require()
// trả về Promise thay vì { default }, Next báo "resolver is not a function" và
// mọi request đều 500. Nạp got bên trong handler để module vẫn đồng bộ.
let gotPromise: Promise<Got> | undefined
const loadGot = () => {
  if (!gotPromise) {
    gotPromise = import('got').then(m => m.default)
  }
  return gotPromise
}

const fail = (res: NextApiResponse, status: number) => {
  res.setHeader('Cache-Control', CACHE_ERROR)
  res.status(status).end()
}

const ApiUrlMetadata = async function(
  req: NextApiRequest,
  res: NextApiResponse
) {
  res.setHeader('Content-Type', 'application/json')

  if (req.method !== 'GET') {
    res.status(400).end()
    return
  }

  const raw = Array.isArray(req.query.url) ? req.query.url[0] : req.query.url
  const { url, error } = checkFetchableUrl(raw)
  if (error) {
    console.log(`url-metadata rejected: ${error}`)
    fail(res, 400)
    return
  }

  try {
    const got = await loadGot()
    const request = got(url.toString(), {
      dnsLookup: (safeLookup as unknown) as OptionsInit['dnsLookup'],
      timeout: { request: TIMEOUT_MS },
      retry: { limit: 0 },
      maxRedirects: MAX_REDIRECTS,
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; thocode-link-preview)',
        accept: 'text/html,application/xhtml+xml',
      },
      hooks: {
        beforeRedirect: [
          // options.url là URL đích đã resolve (kể cả location tương đối)
          options => {
            const next = checkFetchableUrl(String(options.url))
            if (next.error) {
              throw new Error(`redirect rejected: ${next.error}`)
            }
          },
        ],
      },
    })

    // Kiểm tra ngay khi có header, trước khi tải body. Event 'response' của
    // got chỉ phát sau khi body đã tải xong nên không dùng được ở đây.
    request.on('request', clientRequest => {
      clientRequest.on('response', response => {
        const status = response.statusCode || 0
        if (status >= 300 && status < 400) {
          return // redirect, beforeRedirect kiểm tra đích
        }
        const type = (response.headers['content-type'] || '').toLowerCase()
        const length = Number(response.headers['content-length'] || 0)
        if (!HTML_TYPES.some(t => type.startsWith(t))) {
          request.cancel(`unsupported content-type: ${type}`)
        } else if (length > MAX_BYTES) {
          request.cancel('response too large')
        }
      })
    })
    // Phòng server không gửi content-length hoặc gửi sai
    request.on('downloadProgress', ({ transferred }) => {
      if (transferred > MAX_BYTES) {
        request.cancel('response too large')
      }
    })

    const { body: html, url: finalUrl } = await request
    const metadata = await metascraper({ html, url: finalUrl })

    res.setHeader('Cache-Control', CACHE_OK)
    res.status(200).json({
      title: metadata.title || null,
      description: metadata.description || null,
      image: metadata.image || null,
    })
  } catch (e) {
    console.log(`url-metadata failed for ${url.hostname}: ${e.message}`)
    fail(res, 502)
  }
}

export default ApiUrlMetadata
