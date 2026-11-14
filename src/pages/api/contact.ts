import { NextApiRequest, NextApiResponse } from 'next'
import {
  ContactSubmission,
  createContactSubmission,
} from '../../lib/notion/client'
import {
  CONTACT_KINDS,
  MAX_LENGTHS,
  TURNSTILE_ACTION,
} from '../../lib/contact'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '32kb',
    },
  },
}

const SITEVERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const sendError = (res: NextApiResponse, status: number, error: string) => {
  res.status(status).json({ error })
}

const getConfig = () => {
  const values = {
    NOTION_API_SECRET: process.env.NOTION_API_SECRET,
    CONTACT_DATABASE_ID: process.env.CONTACT_DATABASE_ID,
    TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
    TURNSTILE_HOSTNAMES: process.env.TURNSTILE_HOSTNAMES,
  }
  // Chỉ ghi tên biến bị thiếu, không bao giờ ghi giá trị.
  const missing = Object.keys(values).filter(key => !values[key])
  const hostnames = new Set(
    (values.TURNSTILE_HOSTNAMES || '')
      .split(',')
      .map(hostname => hostname.trim())
      .filter(Boolean)
  )
  if (hostnames.size === 0 && !missing.includes('TURNSTILE_HOSTNAMES')) {
    missing.push('TURNSTILE_HOSTNAMES')
  }

  return {
    missing,
    databaseId: values.CONTACT_DATABASE_ID,
    turnstileSecret: values.TURNSTILE_SECRET_KEY,
    hostnames,
  }
}

const asTrimmedString = (value: unknown) =>
  typeof value === 'string' ? value.trim() : ''

const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch (e) {
    return false
  }
}

const validate = (
  body: Record<string, unknown>
): { fields?: ContactSubmission; error?: string } => {
  const fields: ContactSubmission = {
    name: asTrimmedString(body.name),
    email: asTrimmedString(body.email),
    kind: asTrimmedString(body.kind),
    title: asTrimmedString(body.title),
    content: asTrimmedString(body.content),
    draftUrl: asTrimmedString(body.draftUrl),
  }

  if (!fields.name || fields.name.length > MAX_LENGTHS.name) {
    return { error: `Họ tên là bắt buộc, tối đa ${MAX_LENGTHS.name} ký tự.` }
  }
  if (
    !fields.email ||
    fields.email.length > MAX_LENGTHS.email ||
    !EMAIL_PATTERN.test(fields.email)
  ) {
    return { error: 'Email không hợp lệ.' }
  }
  if (!CONTACT_KINDS.includes(fields.kind)) {
    return { error: 'Vui lòng chọn loại: Liên hệ hoặc Góp bài.' }
  }
  if (!fields.title || fields.title.length > MAX_LENGTHS.title) {
    return { error: `Tiêu đề là bắt buộc, tối đa ${MAX_LENGTHS.title} ký tự.` }
  }
  if (!fields.content || fields.content.length > MAX_LENGTHS.content) {
    return {
      error: `Nội dung là bắt buộc, tối đa ${MAX_LENGTHS.content} ký tự.`,
    }
  }
  if (
    fields.draftUrl &&
    (fields.draftUrl.length > MAX_LENGTHS.draftUrl || !isHttpUrl(fields.draftUrl))
  ) {
    return {
      error: `Link bản nháp phải là địa chỉ http(s) hợp lệ, tối đa ${MAX_LENGTHS.draftUrl} ký tự.`,
    }
  }

  return { fields }
}

const getClientIp = (req: NextApiRequest) => {
  const forwardedFor = req.headers['x-forwarded-for']
  const first = (Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : forwardedFor || ''
  )
    .split(',')[0]
    .trim()
  return first || req.socket?.remoteAddress || ''
}

// Siteverify chuẩn của Cloudflare: token chỉ dùng được một lần, phải khớp
// action của widget và hostname của trang đã render widget.
const verifyTurnstile = async (
  token: unknown,
  secret: string,
  hostnames: Set<string>,
  remoteip: string
) => {
  if (typeof token !== 'string' || token.length === 0 || token.length > 2048) {
    return false
  }

  const params: Record<string, string> = { secret, response: token }
  if (remoteip) {
    params.remoteip = remoteip
  }

  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      signal: AbortSignal.timeout(10000),
      body: new URLSearchParams(params),
    })
    if (!response.ok) {
      throw new Error(`siteverify ${response.status}`)
    }
    const result = await response.json()
    return (
      result.success === true &&
      result.action === TURNSTILE_ACTION &&
      hostnames.has(result.hostname)
    )
  } catch (e) {
    console.log(`siteverify failed: ${e instanceof Error ? e.message : e}`)
    return false
  }
}

const ApiContact = async function(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return sendError(res, 405, 'Phương thức không được hỗ trợ.')
  }

  const { missing, databaseId, turnstileSecret, hostnames } = getConfig()
  if (missing.length > 0) {
    console.log(`/api/contact is not configured, missing: ${missing.join(', ')}`)
    return sendError(
      res,
      503,
      'Form liên hệ tạm thời chưa hoạt động. Vui lòng thử lại sau.'
    )
  }

  const body =
    req.body && typeof req.body === 'object' && !Array.isArray(req.body)
      ? req.body
      : {}

  // Honeypot: ô "website" bị ẩn với người thật, chỉ bot mới điền.
  if (asTrimmedString(body.website)) {
    return sendError(res, 400, 'Không thể gửi biểu mẫu.')
  }

  const { fields, error } = validate(body)
  if (error) {
    return sendError(res, 400, error)
  }

  const verified = await verifyTurnstile(
    body['cf-turnstile-response'],
    turnstileSecret,
    hostnames,
    getClientIp(req)
  )
  if (!verified) {
    return sendError(
      res,
      403,
      'Xác minh chống spam không thành công. Vui lòng thử lại.'
    )
  }

  try {
    await createContactSubmission(databaseId, fields)
  } catch (e) {
    console.log(e)
    return sendError(
      res,
      500,
      'Không lưu được nội dung. Vui lòng thử lại sau ít phút.'
    )
  }

  return res.status(200).json({ ok: true })
}

export default ApiContact
