import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { formatPrice } from '../utils'

export default function MyListings() {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    api('/users/me/listings')
      .then((data) => {
        if (!cancelled) setListings(data.items)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Flip a listing between available and sold.
  async function toggleSold(listing) {
    setError('')
    try {
      const updated = await api(`/listings/${listing.id}/sold`, {
        method: 'PATCH',
        body: { sold: listing.status !== 'sold' },
      })
      setListings((prev) =>
        prev.map((l) => (l.id === listing.id ? { ...l, status: updated.status } : l))
      )
    } catch (err) {
      setError(err.message)
    }
  }

  async function remove(listing) {
    if (!window.confirm(`Delete "${listing.title}"? This cannot be undone.`)) return
    setError('')
    try {
      await api(`/listings/${listing.id}`, { method: 'DELETE' })
      setListings((prev) => prev.filter((l) => l.id !== listing.id))
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) return <p>Loading your listings...</p>

  return (
    <div>
      <h1>My listings</h1>
      {error && <p className="error">{error}</p>}

      {listings.length === 0 ? (
        <p>
          You have no listings yet. <Link to="/sell">Post your first item</Link>.
        </p>
      ) : (
        <ul className="my-list">
          {listings.map((l) => (
            <li key={l.id} className="my-row">
              <div className="my-thumb">
                {l.first_photo_url ? (
                  <img src={l.first_photo_url} alt={l.title} loading="lazy" />
                ) : null}
              </div>

              <div className="my-info">
                <Link to={`/listings/${l.id}`} className="my-title">
                  {l.title}
                </Link>
                <span>{formatPrice(l.price)}</span>
                <span className={l.status === 'sold' ? 'status sold' : 'status'}>
                  {l.status === 'sold' ? 'Sold' : 'Available'}
                </span>
              </div>

              <div className="my-actions">
                <Link to={`/listings/${l.id}/edit`} className="btn btn-outline">
                  Edit
                </Link>
                <button type="button" onClick={() => toggleSold(l)}>
                  {l.status === 'sold' ? 'Mark available' : 'Mark sold'}
                </button>
                <button type="button" className="danger" onClick={() => remove(l)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}