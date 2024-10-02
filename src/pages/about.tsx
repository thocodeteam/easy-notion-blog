import DocumentHead from '../components/document-head'
import styles from '../styles/page.module.css'

const RenderPage = () => (
  <div className={styles.container}>
    <DocumentHead />

    <div>
      <h2>ThoCode.com</h2>
      <p>Liên hệ với chúng tôi: info@thocode.com.</p>

      <p>Ở đây để chia sẻ về những vấn đề thời sự nóng hổi trên cõi mạng mà những người dùng bàn phím để mưu sinh quan tâm.</p>

      <p>Code gì cũng được, miễn có lương thiện là được!</p>
    </div>
  </div>
)

export default RenderPage
