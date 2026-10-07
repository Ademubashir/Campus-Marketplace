// A single listing card: photo, title, price, category, link to /listing/:id
import { Link } from 'react-router-dom'

export default function ListingCard({ listing }) {
  const { id, title, price, category, first_photo_url } = listing

  return (
    <Link to={`/listings/${id}`} className="card-link">
      <div className="listing-card">
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
        </div>

        <div className="card-content">
          <h3 className="card-title">{title}</h3>
          <p className="card-price">
            {/* Naira price formatted automatically */}
            <span>
              {new Intl.NumberFormat('en-NG', {
                style: 'currency',
                currency: 'NGN',
                maximumFractionDigits: 0,
              }).format(price)}
            </span>
          </p>
          <p className="card-category">{category || 'Uncategorized'}</p>
        </div>
      </div>
    </Link>
  )
}