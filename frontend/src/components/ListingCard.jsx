// A single listing card: photo, title, price, category, link to /listings/:id.
// Sold items get a small round "Sold" badge and a faded look.
import { Link } from 'react-router-dom'
import { formatPrice } from '../utils'

export default function ListingCard({ listing }) {
  const { id, title, price, category, first_photo_url, status } = listing
  const isSold = status === 'sold'

  return (
    <Link to={`/listings/${id}`} className="card-link">
      <div className={`listing-card ${isSold ? 'sold' : ''}`}>
        {/* Photo with placeholder and lazy loading */}
        <div className="card-image">
          {first_photo_url ? (
            <img
              src={first_photo_url}
              alt={title}
              loading="lazy"
            />
          ) : (
            <div className="card-placeholder" alt="No photo available" />
          )}
          {isSold && <span className="sold-dot">Sold</span>}
        </div>

        <div className="card-content">
          <h3 className="card-title">{title}</h3>
          <p className="card-price">
            {/* Naira price formatted automatically */}
            <span>{formatPrice(price)}</span>
          </p>
          <p className="card-category">{category || 'Uncategorized'}</p>
        </div>
      </div>
    </Link>
  )
}