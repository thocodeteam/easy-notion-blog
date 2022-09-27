import DocumentHead from '../components/document-head'
import styles from '../styles/page.module.css'

// For commit

const RenderPage = () => (
  <div className={styles.container}>
    <DocumentHead />

    <div>
      <h2>Hello, world!</h2>
      <p></p>
      <h2>Our Vision</h2>
      <p>Bà con chúng ta, dù ở miền quê hay thành thị, ai cũng có thể làm được phần mềm, trước là để phục vụ nhu cầu cá nhân, sau là cho cộng đồng được thì tốt.</p>
      <h2>Our Mission</h2>
      <p>Mang lại nguồn kiến thức khoa học máy tính khô khan bằng nhiều hình thức gần gũi, thuần Việt nhất để phổ cập cho bà con.</p>
      <p></p>
      <p>Lời quê góp nhặt dông dài</p>
      <p>Mua vui cũng được một trống canh</p>
      <p></p>
      <p>Tạp chí Thợ Code - Code gì cũng được, miễn có lương thiện là được!</p>
    </div>
  </div>
)

export default RenderPage
