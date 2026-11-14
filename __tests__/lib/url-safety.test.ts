/**
 * @jest-environment node
 */
import dns from 'dns'
import {
  checkFetchableUrl,
  isPublicAddress,
  safeLookup,
} from '../../src/lib/url-safety'

describe('isPublicAddress', () => {
  test.each([
    '8.8.8.8',
    '93.184.216.34',
    '172.32.0.1',
    '2606:4700:4700::1111',
    '::ffff:8.8.8.8',
  ])('allows public address %s', address => {
    expect(isPublicAddress(address)).toBe(true)
  })

  test.each([
    '127.0.0.1',
    '10.1.2.3',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.1.1',
    '169.254.169.254',
    '100.64.0.1',
    '0.0.0.0',
    '224.0.0.1',
    '::',
    '::1',
    '::ffff:127.0.0.1',
    '::ffff:10.0.0.1',
    'fd00::1',
    'fe80::1',
    '64:ff9b::a00:1',
    'not-an-ip',
  ])('blocks non-public address %s', address => {
    expect(isPublicAddress(address)).toBe(false)
  })
})

describe('checkFetchableUrl', () => {
  test('accepts a normal https url', () => {
    const { url, error } = checkFetchableUrl('https://example.com/a?b=1&c=2')
    expect(error).toBeUndefined()
    expect(url.hostname).toBe('example.com')
  })

  test.each([
    ['', 'invalid url'],
    ['not a url', 'invalid url'],
    ['https://example.com/' + 'a'.repeat(2048), 'invalid url'],
    ['ftp://example.com/', 'unsupported protocol'],
    ['file:///etc/passwd', 'unsupported protocol'],
    ['http://example.com:8080/', 'non-default port'],
    ['http://user:pass@example.com/', 'credentials in url'],
    ['http://127.0.0.1/', 'blocked address'],
    ['http://169.254.169.254/latest/meta-data/', 'blocked address'],
    ['http://[::1]/', 'blocked address'],
    ['http://localhost/', 'blocked host'],
    ['http://intranet/', 'blocked host'],
  ])('rejects %s', (raw, expected) => {
    expect(checkFetchableUrl(raw).error).toBe(expected)
  })
})

describe('safeLookup', () => {
  const lookupSpy = jest.spyOn(dns, 'lookup')

  afterEach(() => lookupSpy.mockReset())
  afterAll(() => lookupSpy.mockRestore())

  const resolveTo = (addresses: dns.LookupAddress[]) => {
    lookupSpy.mockImplementation(((_host, _opts, cb) =>
      cb(null, addresses)) as typeof dns.lookup)
  }

  test('rejects a hostname that resolves to a private address', done => {
    resolveTo([
      { address: '93.184.216.34', family: 4 },
      { address: '10.0.0.5', family: 4 },
    ])
    safeLookup('evil.example', {}, err => {
      expect(err.code).toBe('EBLOCKEDADDRESS')
      done()
    })
  })

  test('returns the first address when all are public', done => {
    resolveTo([{ address: '93.184.216.34', family: 4 }])
    safeLookup('example.com', {}, (err, address, family) => {
      expect(err).toBeNull()
      expect(address).toBe('93.184.216.34')
      expect(family).toBe(4)
      done()
    })
  })

  test('returns the full list when all: true is requested', done => {
    const list = [
      { address: '93.184.216.34', family: 4 },
      { address: '2606:2800:220:1:248:1893:25c8:1946', family: 6 },
    ]
    resolveTo(list)
    safeLookup('example.com', { all: true }, (err, address) => {
      expect(err).toBeNull()
      expect(address).toEqual(list)
      done()
    })
  })
})
