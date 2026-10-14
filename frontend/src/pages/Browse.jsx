import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import ListingCard from '../components/ListingCard'
import Dropdown from '../components/Dropdown'

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'price_asc', label: 'Price: low → high' },
  { value: 'price_desc', label: 'Price: high → low' },
]

export default function Browse() {
  // States
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true) // true at first, so no "empty" flash
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)
    // Start from the URL (?q=...&category_id=...) so there's no unfiltered flash
  const [searchParams] = useSearchParams()
  const initialQ = searchParams.get('q') || ''
  const initialCat = searchParams.get('category_id')

  const [search, setSearch] = useState(initialQ) // raw search input
  const [debouncedSearch, setDebouncedSearch] = useState(initialQ) // for actual search
  const [categoryId, setCategoryId] = useState(initialCat ? Number(initialCat) : null) // null means ALL
  const [sort, setSort] = useState('newest')
  const [categories, setCategories] = useState([])

  // Fetch categories on mount
  useEffect(() => {
    api('/categories')
      .then(setCategories)
      .catch(() => setError('Failed to load categories'))
  }, [])

  // Debounce search: update debouncedSearch after 400ms of no change in search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1) // reset to first page when search changes
    }, 400)

    return () => clearTimeout(handler)
  }, [search])

  // Fetch listings when debouncedSearch, categoryId, sort, or page changes
  useEffect(() => {
    let cancelled = false // ignore stale responses
    setLoading(true)
    setError('')

    // Build query string manually since api() doesn't support params
    const params = new URLSearchParams()
    if (debouncedSearch) params.append('q', debouncedSearch)
    if (categoryId) params.append('category_id', categoryId)
    params.append('sort', sort)
    params.append('page', page)
    params.append('limit', 20)

    api(`/listings?${params.toString()}`)
      .then((data) => {
        if (!cancelled) {
          setListings(data.items)
          setPages(data.pages)
          setTotal(data.total)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message)
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [debouncedSearch, categoryId, sort, page])

  // Reset to page 1 when category or sort changes
  useEffect(() => {
    setPage(1)
  }, [categoryId, sort])

  // Is a search or filter in use? Decides which empty-state message to show.
  const filtersActive = Boolean(debouncedSearch) || categoryId !== null

  function clearFilters() {
    setSearch('')
    setDebouncedSearch('')
    setCategoryId(null)
    setSort('newest')
    setPage(1)
  }

  return (
    <div>
      <h1>Browse Listings</h1>
      {error && <p className="error">Error: {error}</p>}

      {/* Search and filter controls */}
      <div className="controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search listings..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <span>Category:</span>
          <Dropdown
            label="Category"
            value={categoryId ?? ''}
            onChange={(val) => setCategoryId(val === '' ? null : Number(val))}
            options={[
              { value: '', label: 'ALL categories' },
              ...categories.map((cat) => ({ value: cat.id, label: cat.name })),
            ]}
          />
        </div>

        <div className="filter-group">
          <span>Sort by:</span>
          <Dropdown
            label="Sort by"
            value={sort}
            onChange={setSort}
            options={SORT_OPTIONS}
          />
        </div>
      </div>

      {/* Loading state: grey placeholder cards */}
      {loading && listings.length === 0 && (
        <div className="listing-grid" aria-busy="true" aria-label="Loading listings">
          {Array.from({ length: 8 }, (_, i) => (
            <div className="skeleton-card" key={i}>
              <div className="sk-img" />
              <div className="sk-body">
                <div className="sk-line" />
                <div className="sk-line mid" />
                <div className="sk-line short" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && listings.length === 0 && total === 0 && (
        <div className="empty-state">
          {filtersActive ? (
            <>
              <h2>No listings match your search</h2>
              <p>Try a different word, or remove the filters.</p>
              <button type="button" className="btn-primary" onClick={clearFilters}>
                Clear filters
              </button>
            </>
          ) : (
            <>
              <h2>No listings yet</h2>
              <p>Be the first to post something for sale.</p>
              <Link to="/sell" className="btn-accent">
                Sell an item
              </Link>
            </>
          )}
        </div>
      )}

      {/* Listing grid: stays on screen (faded) while a new search loads */}
      {listings.length > 0 && (
        <div className={`listing-grid ${loading ? 'is-loading' : ''}`}>
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}

      {/* Pagination controls */}
      {total > 0 && (
        <div className="pagination">
          <button
            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
            disabled={page <= 1}
          >
            Previous
          </button>
          <span>Page {page} of {pages}</span>
          <button
            onClick={() => setPage((prev) => Math.min(prev + 1, pages))}
            disabled={page >= pages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}