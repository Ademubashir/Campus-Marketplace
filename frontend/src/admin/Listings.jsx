import { useEffect, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import Dropdown from '../components/Dropdown'
import ConfirmDialog from './ConfirmDialog'
import { TableSkeleton } from './AdminSkeleton'
import { useToast } from '../ToastContext'
import { formatDate, formatPrice } from '../utils'

const COLUMNS = ['Thumbnail', 'Title', 'Price', 'Status', 'Category', 'Seller', 'Actions']

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'available', label: 'Available' },
  { value: 'sold', label: 'Sold' },
]

export default function Listings() {
  const toast = useToast()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const sellerId = searchParams.get('seller_id') || ''
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState('all')
  const [categoryId, setCategoryId] = useState('')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [deleteId, setDeleteId] = useState(null)

  // Loading: which request has finished (null = nothing has loaded yet)
  const [loadedKey, setLoadedKey] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    api('/admin/categories?limit=100')
      .then((data) => {
        if (!cancelled) {
          setCategories(data.items.map((category) => ({
            value: String(category.id),
            label: category.name,
          })))
        }
      })
      .catch((e) => {
        if (!cancelled) toast.error(e.message || 'Failed to load categories')
      })
    return () => { cancelled = true }
  }, [toast])

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim())
      setPage(1)
    }, 350)
    return () => clearTimeout(timer)
  }, [search])

  const params = new URLSearchParams({ status, page: String(page) })
  if (query) params.set('q', query)
  if (categoryId) params.set('category_id', categoryId)
  if (sellerId) params.set('seller_id', sellerId)
  const url = `/admin/listings?${params.toString()}`
  const requestKey = `${url}#${refresh}`
  const loading = loadedKey !== requestKey
  const showSkeleton = loading && loadedKey === null // first load: no rows yet
  const refreshing = loading && loadedKey !== null // new search/page: keep old rows, faded

  useEffect(() => {
    let cancelled = false
    api(url)
      .then((data) => {
        if (!cancelled) {
          setItems(data.items)
          setPages(data.pages)
          setTotal(data.total)
          setFailed(false)
          setLoadedKey(requestKey)
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setFailed(true)
          setLoadedKey(requestKey)
          toast.error(e.message || 'Failed to load listings')
        }
      })
    return () => { cancelled = true }
  }, [url, requestKey, toast])

  async function doDelete(id, reason) {
    try {
      await api(`/admin/listings/${id}`, { method: 'DELETE', body: { reason } })
      toast.success('Listing deleted')
      setDeleteId(null)
      setRefresh((current) => current + 1)
    } catch (e) {
      toast.error(e.message || 'Failed to delete listing')
    }
  }

  const sellerName = items.find((item) => String(item.seller.id) === sellerId)?.seller.full_name
    || location.state?.sellerName

  return (
    <div>
      <h1>Listings</h1>

      {sellerId && (
        <p className="adm-filter-chip">
          Seller: {sellerName || 'Seller'},{' '}
          <button
            type="button"
            onClick={() => {
              const next = new URLSearchParams(searchParams)
              next.delete('seller_id')
              setSearchParams(next)
              setPage(1)
            }}
            aria-label="Clear seller filter"
          >
            Clear
          </button>
        </p>
      )}

      <div className="controls">
        <input
          className="search-box"
          placeholder="Search titles..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoComplete="off"
        />
        <Dropdown
          label="Status"
          options={STATUS_OPTIONS}
          value={status}
          onChange={(value) => { setStatus(value); setPage(1) }}
        />
        <Dropdown
          label="Category"
          options={categories}
          value={categoryId}
          placeholder="All categories"
          onChange={(value) => { setCategoryId(value); setPage(1) }}
        />
      </div>

      <table className={`adm-table ${refreshing ? 'is-loading' : ''}`} aria-busy={loading}>
        <thead>
          <tr>
            <th>Thumbnail</th>
            <th>Title</th>
            <th>Price</th>
            <th>Status</th>
            <th>Category</th>
            <th>Seller</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {showSkeleton && <TableSkeleton columns={COLUMNS} />}
          {!showSkeleton && failed && (
            <tr>
              <td colSpan="7" className="empty-state">
                Could not load listings.{' '}
                <button type="button" onClick={() => setRefresh((current) => current + 1)}>Try again</button>
              </td>
            </tr>
          )}
          {!showSkeleton && !failed && items.length === 0 && (
            <tr><td colSpan="7" className="empty-state">No listings found</td></tr>
          )}
          {!showSkeleton && !failed && items.map((listing) => (
            <tr key={listing.id}>
              <td data-label="Thumbnail">
                {listing.first_photo_url ? (
                  <img src={listing.first_photo_url} alt="" className="row-thumb" />
                ) : (
                  <div className="row-thumb placeholder" />
                )}
              </td>
              <td data-label="Title">
                <div>{listing.title}</div>
                <div className="adm-cell-sub">
                  Listed {formatDate(listing.created_at)} · {listing.photo_count} {listing.photo_count === 1 ? 'photo' : 'photos'}
                </div>
              </td>
              <td data-label="Price" className="price">{formatPrice(listing.price)}</td>
              <td data-label="Status">
                <span className={`adm-chip ${listing.status}`}>{listing.status.toUpperCase()}</span>
                {listing.review_status !== 'approved' && (
                  <span className={`adm-chip ${listing.review_status}`}>
                    {listing.review_status === 'pending' ? 'PENDING REVIEW' : 'REJECTED'}
                  </span>
                )}
              </td>
              <td data-label="Category" className="muted">{listing.category || '-'}</td>
              <td data-label="Seller">{listing.seller.full_name}</td>
              <td data-label="Actions">
                <button type="button" className="btn btn-danger" onClick={() => setDeleteId(listing.id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {pages > 1 && (
        <nav className="pagination">
          <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Prev</button>
          <span>Page {page} of {pages} ({total} total)</span>
          <button type="button" disabled={page >= pages} onClick={() => setPage((current) => current + 1)}>Next</button>
        </nav>
      )}

      <ConfirmDialog
        title="Delete listing"
        danger
        message="This will permanently remove the listing and its photos. Continue?"
        reason="optional"
        open={deleteId !== null}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={(reason) => doDelete(deleteId, reason)}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
