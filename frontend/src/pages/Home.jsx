import { Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'

export default function Home() {
  const { user } = useAuth()

  return (
    <section className="hero">
      <h1>Buy and sell on campus</h1>
      <p>
        Find textbooks, gadgets and more from students at your university, and chat with
        sellers on WhatsApp.
      </p>
      <div className="hero-actions">
        <Link to="/browse" className="btn-primary">
          Browse listings
        </Link>
        {user ? (
          <Link to="/sell" className="btn-accent">
            Sell an item
          </Link>
        ) : (
          <Link to="/login?mode=signup" className="btn-accent">
            Create an account
          </Link>
        )}
      </div>
    </section>
  )
}