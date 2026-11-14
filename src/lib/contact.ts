// Dùng chung cho trang /lien-he (trình duyệt) và /api/contact (server).
// Không import gì phía server vào đây để không kéo code Notion vào bundle client.

// Site key là giá trị công khai; secret key chỉ nằm ở env TURNSTILE_SECRET_KEY.
export const TURNSTILE_SITE_KEY = '0x4AAAAAAGAii2IXomuDLWeb'

// Phải trùng giữa data-action của widget và kiểm tra action ở siteverify.
export const TURNSTILE_ACTION = 'contact'

export const CONTACT_KINDS = ['Liên hệ', 'Góp bài']

export const MAX_LENGTHS = {
  name: 100,
  email: 254,
  title: 200,
  content: 10000,
  draftUrl: 500,
}
