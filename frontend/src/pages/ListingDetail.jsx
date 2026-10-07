import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import { formatPrice } from '../utils'

export default function ListingDetail() {
  const { id } = useParams()
  const { user, loading: authLoading } = useAuth()

  const [listing, setListing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [mainPhotoIdx, setMainPhotoIdx] = useState(0)

  // Fetch listing on mount
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    api(`/listings/${id}`)
      .then((data) => {
        if (!cancelled) {
          setListing(data)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          if (err.message === 'Not found') {
            setError('Listing not found')
          } else {
            setError(err.message)
          }
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [id])

  // Derived state
  const photos = listing?.photos || []
  const mainPhoto = photos[mainPhotoIdx] || null
  const isOwner = !authLoading && user?.id === listing?.seller?.id
  const isSold = listing?.status === 'sold'
  const phoneDigits = listing?.seller?.phone ? listing.seller.phone.replace(/\D/g, '') : ''

  // Human-readable date
  const postedDate = listing?.created_at
    ? new Date(listing.created_at).toLocaleDateString('en-NG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null

  // WhatsApp link
  const whatsappLink = phoneDigits
    ? `https://wa.me/${phoneDigits}?text=${encodeURIComponent(
        `Hi, I'm interested in your "${listing?.title}" listed for ${formatPrice(listing?.price)} on Campus Marketplace.`
      )}`
    : null

  // Loading/error states
  if (loading) return <p>Loading listing...</p>
  if (error) return <p className="error">Error: {error}</p>
  if (!listing) return <p>Listing not found</p>

  return (
    <div className="detail-layout">
      {/* Left: photos */}
      <div className="detail-photos">
        <div className="main-photo">
          {mainPhoto ? (
            <img
              src={mainPhoto}
              alt={listing.title}
              loading="lazy"
            />
          ) : (
            <div className="photo-placeholder">
              <span>No photo available</span>
            </div>
          )}

          {isSold && (
            <div className="sold-badge">Sold</div>
          )}
        </div>

        {photos.length > 1 && (
          <div className="thumbnails">
            {photos.map((src, idx) => (
              <button
                key={idx}
                className={`thumbnail ${idx === mainPhotoIdx ? 'active' : ''}`}
                onClick={() => setMainPhotoIdx(idx)}
              >
                <img src={src} alt={`${listing.title} thumbnail ${idx + 1}`} loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right: info */}
      <div className="detail-info">
        <h1>{listing.title}</h1>
        <p className="price">{formatPrice(listing.price)}</p>
        <p className="meta">
          <span>Category: {listing.category}</span>
          <span>Condition: {listing.condition}</span>
        </p>

        <div className="description">
          <h3>Description</h3>
          <p>{listing.description}</p>
        </div>

        <div className="seller-info">
          <h3>Seller</h3>
          <p>{listing.seller?.full_name}</p>
          <p>Posted on {postedDate}</p>
        </div>

        <div className="actions">
          {isSold && !isOwner && <p className="sold-notice">This listing is sold</p>}

          {isOwner && (
            <Link to={`/listings/${id}/edit`} className="btn btn-outline">
              Edit listing
            </Link>
          )}

          {isSold && isOwner ? (
            <p className="sold-notice">Sold (you can still edit)</p>
          )        : !isSold && !isOwner && !authLoading &&  (
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="whatsapp-btn"
              onClick={(e) => !whatsappLink && e.preventDefault()}
            >
              Contact seller on WhatsApp
            </a>
          )}
        </div>

        <Link to="/browse" className="back-link">
          ← Back to browse
        </Link>
      </div>
    </div>
  )
}