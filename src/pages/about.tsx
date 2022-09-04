import DocumentHead from '../components/document-head'
import styles from '../styles/page.module.css'

// For commit

const RenderPage = () => (
  <div className={styles.container}>
    <DocumentHead />

    <div>
      <h2>ThoCode.com</h2>
      <img src='/image.fe1500615beccc2187c31c43cd72dac3.png' alt='Drop us an email!' />
    </div>
  </div>
)

export default RenderPage
