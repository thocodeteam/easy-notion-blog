import dns from 'dns'
import net from 'net'

// Chặn mọi địa chỉ không phải Internet công cộng: loopback, mạng nội bộ,
// link-local (gồm 169.254.169.254 metadata của cloud), CGNAT, multicast,
// dải dành cho tài liệu/benchmark, dải dự trữ.
// Hai danh sách riêng: BlockList so địa chỉ IPv4 với cả rule IPv6 dạng
// IPv4-mapped, nên gộp chung thì rule ::ffff:0:0/96 sẽ chặn mọi IPv4.
const ipv4BlockList = new net.BlockList()
const ipv6BlockList = new net.BlockList()

const IPV4_BLOCKED: [string, number][] = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.88.99.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
]

const IPV6_BLOCKED: [string, number][] = [
  ['::', 128],
  ['::1', 128],
  ['::ffff:0:0', 96], // IPv4-mapped, kiểm tra riêng phần IPv4 bên dưới
  ['64:ff9b::', 96], // NAT64, có thể trỏ về IPv4 nội bộ
  ['64:ff9b:1::', 48],
  ['100::', 64],
  ['2001::', 23],
  ['2001:db8::', 32],
  ['2002::', 16], // 6to4, nhúng IPv4 tuỳ ý
  ['fc00::', 7],
  ['fe80::', 10],
  ['fec0::', 10],
  ['ff00::', 8],
]

IPV4_BLOCKED.forEach(([address, prefix]) =>
  ipv4BlockList.addSubnet(address, prefix, 'ipv4')
)
IPV6_BLOCKED.forEach(([address, prefix]) =>
  ipv6BlockList.addSubnet(address, prefix, 'ipv6')
)

const IPV4_MAPPED = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i

export const isPublicAddress = (address: string): boolean => {
  const mapped = address.match(IPV4_MAPPED)
  if (mapped) {
    return isPublicAddress(mapped[1])
  }

  const family = net.isIP(address)
  if (family === 4) {
    return !ipv4BlockList.check(address, 'ipv4')
  }
  if (family === 6) {
    return !ipv6BlockList.check(address, 'ipv6')
  }
  return false
}

export const MAX_URL_LENGTH = 2048

// URL được phép tải: http(s), cổng mặc định, không kèm user:pass, và nếu host
// là IP literal thì phải là IP công cộng (Node không gọi DNS lookup cho IP
// literal nên safeLookup bên dưới không bắt được trường hợp này).
export const checkFetchableUrl = (
  raw: string
): { url?: URL; error?: string } => {
  if (!raw || raw.length > MAX_URL_LENGTH) {
    return { error: 'invalid url' }
  }

  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return { error: 'invalid url' }
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { error: 'unsupported protocol' }
  }
  if (url.port !== '') {
    return { error: 'non-default port' }
  }
  if (url.username || url.password) {
    return { error: 'credentials in url' }
  }

  const host = url.hostname.replace(/^\[|\]$/g, '')
  if (net.isIP(host) && !isPublicAddress(host)) {
    return { error: 'blocked address' }
  }
  if (!net.isIP(host) && !host.includes('.')) {
    // "localhost", tên máy trong mạng nội bộ...
    return { error: 'blocked host' }
  }

  return { url }
}

type LookupCallback = (
  err: NodeJS.ErrnoException | null,
  address?: string | dns.LookupAddress[],
  family?: number
) => void

// Thay dns.lookup cho HTTP client: phân giải tên miền rồi từ chối nếu bất kỳ
// địa chỉ nào không công cộng. Chạy cho mọi kết nối, kể cả sau redirect, nên
// chặn được tên miền trỏ về IP nội bộ và DNS rebinding.
export const safeLookup = (
  hostname: string,
  options: dns.LookupOptions | number | LookupCallback,
  callback?: LookupCallback
) => {
  if (typeof options === 'function') {
    callback = options
    options = {}
  }
  const opts: dns.LookupOptions =
    typeof options === 'number' ? { family: options } : options || {}

  dns.lookup(hostname, { ...opts, all: true }, (err, addresses) => {
    if (err) {
      callback(err)
      return
    }

    const list = addresses as dns.LookupAddress[]
    if (list.length === 0 || list.some(a => !isPublicAddress(a.address))) {
      const error: NodeJS.ErrnoException = new Error(
        `blocked address for ${hostname}`
      )
      error.code = 'EBLOCKEDADDRESS'
      callback(error)
      return
    }

    if (opts.all) {
      callback(null, list)
    } else {
      callback(null, list[0].address, list[0].family)
    }
  })
}
