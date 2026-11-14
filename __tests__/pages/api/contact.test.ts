/**
 * @jest-environment node
 */
jest.mock('../../../src/lib/notion/client', () => ({
  createContactSubmission: jest.fn(),
}))
import { createMocks, RequestMethod } from 'node-mocks-http'
import ApiContact from '../../../src/pages/api/contact'
import { createContactSubmission } from '../../../src/lib/notion/client'

const createSubmission = createContactSubmission as jest.Mock

const validBody = {
  name: 'Nguyễn Văn A',
  email: 'a@example.com',
  kind: 'Góp bài',
  title: 'Bài viết thử',
  content: 'Đoạn một.\n\nĐoạn hai.',
  draftUrl: 'https://docs.google.com/document/d/abc',
  website: '',
  'cf-turnstile-response': 'token-123',
}

const siteverifyResult = (result: Record<string, unknown>) =>
  Promise.resolve({ ok: true, json: () => Promise.resolve(result) })

const call = async (body: Record<string, unknown>, method = 'POST') => {
  const { req, res } = createMocks({
    method: method as RequestMethod,
    url: '/api/contact',
    headers: { 'x-forwarded-for': '203.0.113.7, 10.0.0.1' },
    body,
  })
  await ApiContact(req as any, res as any)
  return res
}

describe('/api/contact', () => {
  const originalEnv = process.env
  let fetchMock: jest.Mock

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NOTION_API_SECRET: 'notion-secret',
      CONTACT_DATABASE_ID: 'contact-db',
      TURNSTILE_SECRET: 'turnstile-secret',
      TURNSTILE_HOSTNAMES: 'thocode.com, www.thocode.com',
    }
    fetchMock = jest.fn(() =>
      siteverifyResult({
        success: true,
        action: 'contact',
        hostname: 'thocode.com',
      })
    )
    global.fetch = fetchMock as any
    createSubmission.mockReset()
    jest.spyOn(console, 'log').mockImplementation(() => undefined)
  })

  afterEach(() => {
    process.env = originalEnv
    jest.restoreAllMocks()
  })

  const expectNothingCalled = () => {
    expect(createSubmission).not.toHaveBeenCalled()
  }

  test('rejects non-POST with 405', async () => {
    const res = await call(validBody, 'GET')
    expect(res.statusCode).toEqual(405)
    expect(fetchMock).not.toHaveBeenCalled()
    expectNothingCalled()
  })

  test('returns 503 without touching Notion when config is missing', async () => {
    delete process.env.CONTACT_DATABASE_ID
    delete process.env.TURNSTILE_SECRET
    const res = await call(validBody)
    expect(res.statusCode).toEqual(503)
    expect(res._getJSONData().error).toBeTruthy()
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('CONTACT_DATABASE_ID, TURNSTILE_SECRET')
    )
    expect(fetchMock).not.toHaveBeenCalled()
    expectNothingCalled()
  })

  test('returns 503 when TURNSTILE_HOSTNAMES has no hostname', async () => {
    process.env.TURNSTILE_HOSTNAMES = ' , '
    const res = await call(validBody)
    expect(res.statusCode).toEqual(503)
    expectNothingCalled()
  })

  test('rejects a honeypot hit', async () => {
    const res = await call({ ...validBody, website: 'https://spam.example' })
    expect(res.statusCode).toEqual(400)
    expect(fetchMock).not.toHaveBeenCalled()
    expectNothingCalled()
  })

  test.each([
    ['missing name', { name: '  ' }],
    ['too long name', { name: 'a'.repeat(101) }],
    ['invalid email', { email: 'not-an-email' }],
    ['unknown kind', { kind: 'Quảng cáo' }],
    ['missing title', { title: '' }],
    ['too long content', { content: 'a'.repeat(10001) }],
    ['non-http draft link', { draftUrl: 'javascript:alert(1)' }],
    ['non-string field', { email: ['a@example.com'] }],
  ])('rejects %s with 400', async (_label, override) => {
    const res = await call({ ...validBody, ...override })
    expect(res.statusCode).toEqual(400)
    expect(res._getJSONData().error).toBeTruthy()
    expect(fetchMock).not.toHaveBeenCalled()
    expectNothingCalled()
  })

  test('rejects a missing Turnstile token without calling siteverify', async () => {
    const res = await call({ ...validBody, 'cf-turnstile-response': '' })
    expect(res.statusCode).toEqual(403)
    expect(fetchMock).not.toHaveBeenCalled()
    expectNothingCalled()
  })

  test.each([
    ['failed token', { success: false, 'error-codes': ['invalid-input-response'] }],
    ['wrong action', { success: true, action: 'signup', hostname: 'thocode.com' }],
    ['wrong hostname', { success: true, action: 'contact', hostname: 'evil.example' }],
  ])('rejects a %s from siteverify with 403', async (_label, result) => {
    fetchMock.mockImplementation(() => siteverifyResult(result))
    const res = await call(validBody)
    expect(res.statusCode).toEqual(403)
    expectNothingCalled()
  })

  test('rejects when siteverify is unreachable', async () => {
    fetchMock.mockImplementation(() => Promise.reject(new Error('network')))
    const res = await call(validBody)
    expect(res.statusCode).toEqual(403)
    expectNothingCalled()
  })

  test('verifies the token, then writes to Notion', async () => {
    const res = await call(validBody)
    expect(res.statusCode).toEqual(200)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toEqual(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify'
    )
    const params = new URLSearchParams(options.body)
    expect(params.get('secret')).toEqual('turnstile-secret')
    expect(params.get('response')).toEqual('token-123')
    expect(params.get('remoteip')).toEqual('203.0.113.7')

    expect(createSubmission).toHaveBeenCalledWith('contact-db', {
      name: 'Nguyễn Văn A',
      email: 'a@example.com',
      kind: 'Góp bài',
      title: 'Bài viết thử',
      content: 'Đoạn một.\n\nĐoạn hai.',
      draftUrl: 'https://docs.google.com/document/d/abc',
    })
  })

  test('returns 500 when Notion fails', async () => {
    createSubmission.mockRejectedValue(new Error('notion down'))
    const res = await call(validBody)
    expect(res.statusCode).toEqual(500)
  })
})
