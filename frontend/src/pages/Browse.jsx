import { useEffect, useState } from 'react'
import { api } from '../api'
import ListingCard from '../components/ListingCard'

export default function Browse() {
  // States
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('') // raw search input
  const [debouncedSearch, setDebouncedSearch] = useState('') // for actual search
  const [categoryId, setCategoryId] = useState(null) // null means ALL
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
          <label htmlFor="category">Category:</label>
          <select
            id="category"
            value={categoryId ?? ''}
            onChange={(e) => {
              const val = e.target.value
              setCategoryId(val === '' ? null : Number(val))
            }}
          >
            <option value="">ALL categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="sort">Sort by:</label>
          <select
            id="sort"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="newest">Newest first</option>
            <option value="price_asc">Price: low → high</option>
            <option value="price_desc">Price: high → low</option>
          </select>
        </div>
      </div>

      {/* Loading state */}
      {loading && listings.length === 0 && <p>Loading listings...</p>}

      {/* Empty state */}
      {!loading && listings.length === 0 && total === 0 && (
        <p>No listing found</p>
      )}

      {/* Listing grid */}
      {!loading && listings.length > 0 && (
        <div className="listing-grid">
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