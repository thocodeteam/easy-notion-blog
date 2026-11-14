import Link from 'next/link'
import DocumentHead from '../components/document-head'
import styles from '../styles/page.module.css'

const RenderPage = () => (
  <div className={styles.container}>
    <DocumentHead title="Giới thiệu" />

    <div>
      <h2>ThoCode.com</h2>
      <p>Ở đây để chia sẻ về những vấn đề thời sự nóng hổi trên cõi mạng mà những người dùng bàn phím để mưu sinh quan tâm.</p>
    </div>

    <div>
      <h2>Tầm nhìn</h2>
      <p>Bà con chúng ta, dù ở miền quê hay thành thị, ai cũng có thể làm được phần mềm, trước là để phục vụ nhu cầu cá nhân, sau là cho cộng đồng được thì tốt.</p>
    </div>

    <div>
      <h2>Sứ mệnh</h2>
      <p>Mang lại nguồn kiến thức khoa học máy tính khô khan bằng nhiều hình thức gần gũi, thuần Việt nhất để phổ cập cho bà con.</p>
    </div>

    <blockquote>
      <p>Lời quê chắp nhặt dông dài<br />Mua vui cũng được một vài trống canh</p>
    </blockquote>

    <div>
      <h2>Liên hệ</h2>
      <p>Email: <a href="mailto:info@thocode.com">info@thocode.com</a></p>
      <p>
        Hoặc gửi lời nhắn, góp bài qua{' '}
        <Link href="/lien-he" passHref>
          <a>form liên hệ</a>
        </Link>
        .
      </p>
    </div>

    <p>
      <em>Code gì cũng được, miễn có lương thiện là được!</em>
    </p>
  </div>
)

export default RenderPage
