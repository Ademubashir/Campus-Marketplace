import { Link } from 'react-router-dom'
import { useSite } from '../SiteContext'

export default function Footer() {
  const { supportEmail } = useSite()
  return (
    <footer className="site-footer">
      <p>
        <strong>Stay safe:</strong> meet in a public place on campus, and don't pay before you've
        seen the item.
      </p>
      <p>
        <Link to="/terms">Terms</Link>
        <Link to="/privacy">Privacy</Link>
        <a href={`mailto:${supportEmail}`}>Support</a>
      </p>
    </footer>
  )
}