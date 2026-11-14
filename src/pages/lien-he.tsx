import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react'
import Script from 'next/script'

import DocumentHead from '../components/document-head'
import {
  CONTACT_KINDS,
  MAX_LENGTHS,
  TURNSTILE_ACTION,
  TURNSTILE_SITE_KEY,
} from '../lib/contact'
import styles from '../styles/contact.module.css'

interface Turnstile {
  render: (container: HTMLElement, options: Record<string, unknown>) => string
  reset: (widgetId: string) => void
  remove: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: Turnstile
  }
}

const initialValues = {
  name: '',
  email: '',
  kind: '',
  title: '',
  content: '',
  draftUrl: '',
  website: '',
}

const RenderPage = () => {
  const [values, setValues] = useState(initialValues)
  const [token, setToken] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const widgetContainerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)

  // Render widget kiểu explicit để giữ widgetId: trang không chuyển hướng sau
  // khi gửi, mà token Turnstile chỉ dùng được một lần, nên phải reset widget.
  const renderWidget = () => {
    if (
      !window.turnstile ||
      !widgetContainerRef.current ||
      widgetIdRef.current !== null
    ) {
      return
    }
    widgetIdRef.current = window.turnstile.render(widgetContainerRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      action: TURNSTILE_ACTION,
      callback: (newToken: string) => setToken(newToken),
      'expired-callback': () => setToken(''),
      'error-callback': () => setToken(''),
    })
  }

  const resetWidget = () => {
    if (window.turnstile && widgetIdRef.current !== null) {
      window.turnstile.reset(widgetIdRef.current)
    }
    setToken('')
  }

  const removeWidget = () => {
    if (window.turnstile && widgetIdRef.current !== null) {
      window.turnstile.remove(widgetIdRef.current)
    }
    widgetIdRef.current = null
    setToken('')
  }

  useEffect(() => {
    // Khi quay lại trang bằng điều hướng client, script đã tải sẵn.
    renderWidget()
    return () => {
      if (window.turnstile && widgetIdRef.current !== null) {
        window.turnstile.remove(widgetIdRef.current)
      }
      widgetIdRef.current = null
    }
  }, [])

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setValues(current => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (submitting) return

    if (!token) {
      setErrorMessage(
        'Vui lòng hoàn tất bước xác minh chống spam bên dưới rồi gửi lại.'
      )
      return
    }

    setSubmitting(true)
    setErrorMessage('')

    let ok = false
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, 'cf-turnstile-response': token }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        ok = true
      } else {
        setErrorMessage(
          data.error || 'Gửi không thành công. Vui lòng thử lại sau ít phút.'
        )
      }
    } catch (err) {
      setErrorMessage(
        'Không kết nối được máy chủ. Vui lòng kiểm tra mạng rồi thử lại.'
      )
    }

    if (ok) {
      removeWidget()
      setSubmitted(true)
    } else {
      resetWidget()
    }
    setSubmitting(false)
  }

  return (
    <div className={styles.container}>
      <DocumentHead
        title="Liên hệ / Góp bài"
        description="Gửi lời nhắn hoặc góp bài cho Tạp chí Thợ Code."
      />
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={renderWidget}
      />

      <h2>Liên hệ / Góp bài</h2>

      {submitted ? (
        <div className={styles.success} role="status">
          <p>
            Cảm ơn {values.name}! Tạp chí đã nhận được{' '}
            {values.kind === 'Góp bài' ? 'bài góp' : 'lời nhắn'} của bạn và sẽ
            phản hồi qua email {values.email} khi đọc xong.
          </p>
        </div>
      ) : (
        <>
          <p className={styles.intro}>
            Có điều muốn nói, hoặc có bài muốn đăng trên Thợ Code? Điền vào
            form bên dưới, tạp chí sẽ trả lời qua email của bạn.
          </p>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="contact-name">
                Họ tên <span className={styles.required}>*</span>
              </label>
              <input
                id="contact-name"
                className={styles.input}
                name="name"
                type="text"
                autoComplete="name"
                required
                maxLength={MAX_LENGTHS.name}
                value={values.name}
                onChange={handleChange}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="contact-email">
                Email <span className={styles.required}>*</span>
              </label>
              <input
                id="contact-email"
                className={styles.input}
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={MAX_LENGTHS.email}
                value={values.email}
                onChange={handleChange}
              />
            </div>

            <fieldset className={styles.field}>
              <legend className={styles.label}>
                Loại <span className={styles.required}>*</span>
              </legend>
              <div className={styles.choices}>
                {CONTACT_KINDS.map(kind => (
                  <label key={kind}>
                    <input
                      type="radio"
                      name="kind"
                      value={kind}
                      required
                      checked={values.kind === kind}
                      onChange={handleChange}
                    />
                    {kind}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="contact-title">
                Tiêu đề <span className={styles.required}>*</span>
              </label>
              <input
                id="contact-title"
                className={styles.input}
                name="title"
                type="text"
                required
                maxLength={MAX_LENGTHS.title}
                value={values.title}
                onChange={handleChange}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="contact-content">
                Nội dung <span className={styles.required}>*</span>
              </label>
              <textarea
                id="contact-content"
                className={styles.textarea}
                name="content"
                required
                maxLength={MAX_LENGTHS.content}
                value={values.content}
                onChange={handleChange}
              />
              <span className={styles.hint}>
                {values.content.length}/{MAX_LENGTHS.content} ký tự
              </span>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="contact-draft-url">
                Link bản nháp
              </label>
              <input
                id="contact-draft-url"
                className={styles.input}
                name="draftUrl"
                type="url"
                placeholder="https://"
                maxLength={MAX_LENGTHS.draftUrl}
                value={values.draftUrl}
                onChange={handleChange}
              />
              <span className={styles.hint}>
                Không bắt buộc. Google Docs, Notion, GitHub… nếu bạn đã có bản
                nháp.
              </span>
            </div>

            <div className={styles.honeypot} aria-hidden="true">
              <label htmlFor="contact-website">Website</label>
              <input
                id="contact-website"
                name="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={values.website}
                onChange={handleChange}
              />
            </div>

            <div className={styles.turnstile} ref={widgetContainerRef} />

            {errorMessage ? (
              <p className={styles.error} role="alert">
                {errorMessage}
              </p>
            ) : null}

            <div className={styles.actions}>
              <button
                className={styles.submit}
                type="submit"
                disabled={submitting}
              >
                {submitting ? 'Đang gửi…' : 'Gửi'}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  )
}

export default RenderPage
