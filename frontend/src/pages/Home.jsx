import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { useEffect, useState } from 'react'
import { api } from '../api'
import ListingCard from '../components/ListingCard'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faBook, faLaptop, faShirt, faCouch, faFutbol, faEllipsis, faComments, faPlus, faHandshake
} from '@fortawesome/free-solid-svg-icons'

export default function Home() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  // ---- hero search state ----
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearchSubmit = () => {
    const trimmed = searchQuery.trim()
    if (!trimmed) {
      navigate('/browse')
    } else {
      navigate(`/browse?q=${encodeURIComponent(trimmed)}`)
    }
  }

  // ---- fetch categories once ----
  const [categories, setCategories] = useState([])
  const [catIconMap, setCatIconMap] = useState({})

  useEffect(() => {
    api('/categories')
      .then(setCategories)
      .catch(() => setCategories([]))
  }, [])

  // map each category to a font icon after categories are loaded
  useEffect(() => {
    const map = {}
    categories.forEach(cat => {
      let icon
      const lower = cat.name.toLowerCase()
      if (/book|text/.test(lower)) icon = faBook
      else if (/laptop|electronics/.test(lower)) icon = faLaptop
      else if (/shirt|cloth/.test(lower)) icon = faShirt
      else if (/couch|furniture/.test(lower)) icon = faCouch
      else if (/sports?|football|futbol/.test(lower)) icon = faFutbol
      else icon = faEllipsis
      map[cat.id] = icon
    })
    setCatIconMap(map)
  }, [categories])

  // ---- fetch newest listings, but only for a logged-in visitor ----
  const [newListings, setNewListings] = useState([])
  const [loadingNew, setLoadingNew] = useState(false)
  const [errorNew, setErrorNew] = useState('')

  useEffect(() => {
    if (!user) return
    let cancelled = false // ignore stale responses
    setLoadingNew(true)
    setErrorNew('')
    api('/listings?limit=8&sort=newest&status=available')
      .then((data) => {
        if (!cancelled) setNewListings(data.items)
      })
      .catch((err) => {
        if (!cancelled) setErrorNew(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoadingNew(false)
      })
    return () => {
      cancelled = true
    }
  }, [user])

  // ---- render ----
  return (
    <>
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
          {loading ? null : user ? (
            <Link to="/sell" className="btn-accent">
              Sell an item
            </Link>
          ) : (
            <Link to="/login?mode=signup" className="btn-accent">
              Create an account
            </Link>
          )}
        </div>

                {/* hero search box */}
        <form
          className="hero-search"
          onSubmit={(e) => {
            e.preventDefault()
            handleSearchSubmit()
          }}
        >
          <input
            type="text"
            placeholder="Search listings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="btn-primary">
            Go
          </button>
        </form>
      </section>

      {/* category chips */}
      <section className="category-chips">
        <h2>Categories</h2>
        <div className="chip-row">
          {categories.map((cat) => {
            const Icon = catIconMap[cat.id] || faEllipsis
            return (
              <Link
                key={cat.id}
                to={`/browse?category_id=${cat.id}`}
                className="chip"
              >
                <FontAwesomeIcon icon={Icon} className="chip-icon" />
                <span>{cat.name}</span>
              </Link>
            )
          })}
        </div>
      </section>

      {/* newest listings (login-only) */}
      {user && (
        <section className="newest-listings">
          <h2>Newest listings</h2>
          {loadingNew && <p>Loading newest listings...</p>}
          {errorNew && <p className="error">Error: {errorNew}</p>}
          {!errorNew && newListings.length === 0 && !loadingNew && <p>No listings yet.</p>}
          {!loadingNew && !errorNew && (
            <div className="listing-grid">
              {newListings.slice(0, 8).map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}
          <Link to="/browse" className="btn-accent">
            See all
          </Link>
        </section>
      )}

      {/* how it works */}
      <section className="how-it-works">
        <div className="step">
          <FontAwesomeIcon icon={faPlus} />
          <h3>Post an item</h3>
          <p>Create a listing with photos, price, and description.</p>
        </div>
        <div className="step">
          <FontAwesomeIcon icon={faComments} />
          <h3>Chat on WhatsApp</h3>
          <p>Message the seller directly on WhatsApp.</p>
        </div>
        <div className="step">
          <FontAwesomeIcon icon={faHandshake} />
          <h3>Meet safely on campus</h3>
          <p>Arrange a convenient location and time.</p>
        </div>
      </section>

      {/* logged-out CTA */}
      {!loading && !user && (
        <section className="cta-box">
          <h3>Ready to Start?</h3>
          <div>
            <Link to="/login?mode=signup" className="btn-accent">
              Create an account
            </Link>
            <Link to="/login" className="btn-accent">
              Login
            </Link>
          </div>
        </section>
      )}
    </>
  )
}
