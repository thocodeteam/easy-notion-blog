/**
 * @jest-environment node
 */
// got là gói ESM-only nên Jest không load được; mock bằng factory.
jest.mock('got', () => ({ __esModule: true, default: jest.fn() }))
jest.mock('metascraper', () => ({
  __esModule: true,
  default: () => async () => ({
    title: 'Example title',
    description: 'Example description',
    image: 'https://example.com/og.png',
  }),
}))
jest.mock('metascraper-description', () => ({ __esModule: true, default: () => ({}) }))
jest.mock('metascraper-image', () => ({ __esModule: true, default: () => ({}) }))
jest.mock('metascraper-title', () => ({ __esModule: true, default: () => ({}) }))

import { createMocks, RequestMethod } from 'node-mocks-http'
import got from 'got'
import ApiUrlMetadata from '../../../src/pages/api/url-metadata'
import { safeLookup } from '../../../src/lib/url-safety'

const gotMock = (got as unknown) as jest.Mock

const fakeRequest = (result: Promise<unknown>) =>
  Object.assign(result, { on: jest.fn(), cancel: jest.fn() })

const call = async (url?: string, method = 'GET') => {
  const query = url === undefined ? '' : `?url=${encodeURIComponent(url)}`
  const { req, res } = createMocks({
    method: method as RequestMethod,
    url: `/api/url-metadata${query}`,
  })
  await ApiUrlMetadata(req, res)
  return res
}

describe('/api/url-metadata', () => {
  beforeEach(() => {
    gotMock.mockReset()
    jest.spyOn(console, 'log').mockImplementation(() => undefined)
  })

  test('rejects non-GET with 400', async () => {
    const res = await call('https://example.com/', 'POST')
    expect(res.statusCode).toBe(400)
    expect(gotMock).not.toHaveBeenCalled()
  })

  test('rejects a missing url with 400', async () => {
    const res = await call()
    expect(res.statusCode).toBe(400)
    expect(gotMock).not.toHaveBeenCalled()
  })

  test.each([
    'http://127.0.0.1/',
    'http://169.254.169.254/latest/meta-data/',
    'http://localhost:3000/',
    'http://example.com:22/',
    'file:///etc/passwd',
  ])('rejects %s without fetching', async url => {
    const res = await call(url)
    expect(res.statusCode).toBe(400)
    expect(gotMock).not.toHaveBeenCalled()
  })

  test('returns metadata and a CDN cache header for a public url', async () => {
    gotMock.mockReturnValue(
      fakeRequest(
        Promise.resolve({ body: '<html></html>', url: 'https://example.com/' })
      )
    )

    const res = await call('https://example.com/?a=1&b=2')

    expect(res.statusCode).toBe(200)
    expect(res._getJSONData()).toEqual({
      title: 'Example title',
      description: 'Example description',
      image: 'https://example.com/og.png',
    })
    expect(res.getHeader('Cache-Control')).toMatch(/s-maxage=86400/)

    const [requestedUrl, options] = gotMock.mock.calls[0]
    expect(requestedUrl).toBe('https://example.com/?a=1&b=2')
    expect(options.dnsLookup).toBe(safeLookup)
    expect(options.retry).toEqual({ limit: 0 })
    expect(options.maxRedirects).toBe(3)
    expect(options.timeout).toEqual({ request: 5000 })
  })

  test('rejects redirects to private addresses', async () => {
    gotMock.mockReturnValue(
      fakeRequest(
        Promise.resolve({ body: '<html></html>', url: 'https://example.com/' })
      )
    )
    await call('https://example.com/')

    const [beforeRedirect] = gotMock.mock.calls[0][1].hooks.beforeRedirect
    expect(() =>
      beforeRedirect({ url: new URL('http://10.0.0.1/admin') })
    ).toThrow(/redirect rejected/)
    expect(() =>
      beforeRedirect({ url: new URL('https://example.org/next') })
    ).not.toThrow()
  })

  test('cancels non-HTML and oversized responses', async () => {
    const request = fakeRequest(
      Promise.resolve({ body: '<html></html>', url: 'https://example.com/' })
    )
    gotMock.mockReturnValue(request)
    await call('https://example.com/')

    const handlers = Object.fromEntries(request.on.mock.calls)
    const clientRequest = { on: jest.fn() }
    handlers.request(clientRequest)
    const [event, onHeaders] = clientRequest.on.mock.calls[0]
    expect(event).toBe('response')

    const headers = (status: number, h: Record<string, string>) =>
      onHeaders({ statusCode: status, headers: h })

    headers(200, { 'content-type': 'application/zip' })
    headers(200, { 'content-type': 'text/html', 'content-length': '5000000' })
    handlers.downloadProgress({ transferred: 2 * 1024 * 1024 })
    expect(request.cancel).toHaveBeenCalledTimes(3)

    request.cancel.mockClear()
    headers(302, { 'content-type': 'application/octet-stream' })
    headers(200, { 'content-type': 'text/html; charset=utf-8' })
    handlers.downloadProgress({ transferred: 1000 })
    expect(request.cancel).not.toHaveBeenCalled()
  })

  test('returns 502 when the upstream fetch fails', async () => {
    gotMock.mockReturnValue(fakeRequest(Promise.reject(new Error('ETIMEDOUT'))))

    const res = await call('https://example.com/')

    expect(res.statusCode).toBe(502)
    expect(res.getHeader('Cache-Control')).toBe('public, s-maxage=300')
  })
})
