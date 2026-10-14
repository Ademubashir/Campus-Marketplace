import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="not-found">
      <p className="big">404</p>
      <h1>We can't find that page</h1>
      <p>The link may be wrong, or the listing may have been removed.</p>
      <Link to="/" className="btn-primary">
        Go to the home page
      </Link>
    </div>
  )
}
