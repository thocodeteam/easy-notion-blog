import {
  FacebookIcon,
  FacebookShareButton,
  TwitterIcon,
  TwitterShareButton,
} from 'react-share'

import * as gtag from '../lib/gtag'
import styles from '../styles/social-buttons.module.css'

// Chỉ giữ mạng xã hội người đọc Việt dùng. Pocket (Mozilla đóng cửa 07/2025)
// và Hatena (mạng bookmark Nhật, kế thừa từ upstream) đã bỏ.
const SocialButtons = ({ title = '', url, id = null }) => (
  <ul className={styles.socialButtons}>
    <li>
      <FacebookShareButton
        url={url}
        beforeOnClick={() =>
          gtag.share({
            method: 'facebook',
            contentType: 'article',
            itemId: id,
          })
        }
      >
        <FacebookIcon size={32} round={true} />
      </FacebookShareButton>
    </li>
    <li>
      <TwitterShareButton
        url={url}
        title={title}
        beforeOnClick={() =>
          gtag.share({
            method: 'twitter',
            contentType: 'article',
            itemId: id,
          })
        }
      >
        <TwitterIcon size={32} round={true} />
      </TwitterShareButton>
    </li>
  </ul>
)

export default SocialButtons
