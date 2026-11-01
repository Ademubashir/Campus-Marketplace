import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import Dropdown from '../components/Dropdown'
import ConfirmDialog from './ConfirmDialog'
import { TableSkeleton } from './AdminSkeleton'
import { useToast } from '../ToastContext'

const COLUMNS = ['Name', 'Email', 'University', 'Status', 'Listings', 'Actions']

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
]

export default function Users() {
  const toast = useToast()
  const [items, setItems] = useState([])
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [q, setQ] = useState('')
  const [refresh, setRefresh] = useState(0)

  // Loading: which request has finished (null = nothing has loaded yet)
  const [loadedKey, setLoadedKey] = useState(null)
  const [failed, setFailed] = useState(false)

  // Per-row state
  const [suspendId, setSuspendId] = useState(null) // user id awaiting confirm
  const [suspendOpen, setSuspendOpen] = useState(false)
  const [reinstateId, setReinstateId] = useState(null)
  const [reinstateOpen, setReinstateOpen] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setQ(search.trim())
      setPage(1)
    }, 350)
    return () => clearTimeout(timer)
  }, [search])

  const url = `/admin/users?q=${encodeURIComponent(q)}&status=${status}&page=${page}`
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
          toast.error(e.message || 'Failed to load users')
        }
      })
    return () => { cancelled = true }
  }, [url, requestKey, toast])

  async function doSuspend(id, reason) {
    try {
      await api(`/admin/users/${id}/suspend`, { method: 'PATCH', body: { reason } })
      toast.success('User suspended')
      setSuspendId(null)
      setSuspendOpen(false)
      setRefresh((current) => current + 1)
    } catch (e) {
      toast.error(e.message || 'Failed to suspend user')
    }
  }

  async function doReinstate(id) {
    try {
      await api(`/admin/users/${id}/reinstate`, { method: 'PATCH' })
      toast.success('User reinstated')
      setReinstateId(null)
      setReinstateOpen(false)
      setRefresh((current) => current + 1)
    } catch (e) {
      toast.error(e.message || 'Failed to reinstate user')
    }
  }

  return (
    <div>
      <h1>Users</h1>

      {/* Search + filter row */}
      <div className="controls">
        <input
          className="search-box"
          placeholder="Search name, email or university..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoComplete="off"
        />
        <Dropdown
          label="Status"
          options={STATUS_OPTIONS}
          value={status}
          onChange={(v) => {
            setStatus(v)
            setPage(1)
          }}
        />
      </div>

      {/* Table on desktop, cards on phones */}
      <table className={`adm-table ${refreshing ? 'is-loading' : ''}`} aria-busy={loading}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>University</th>
            <th>Status</th>
            <th>Listings</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {showSkeleton && <TableSkeleton columns={COLUMNS} />}
          {!showSkeleton && failed && (
            <tr>
              <td colSpan="6" className="empty-state">
                Could not load users.{' '}
                <button type="button" onClick={() => setRefresh((current) => current + 1)}>Try again</button>
              </td>
            </tr>
          )}
          {!showSkeleton && !failed && items.length === 0 && (
            <tr>
              <td colSpan="6" className="empty-state">No users found</td>
            </tr>
          )}
          {!showSkeleton && !failed && items.map((u) => (
            <tr key={u.id} className={u.is_suspended ? 'suspended-row' : ''}>
              <td data-label="Name">{u.full_name}</td>
              <td data-label="Email" className="muted">{u.email}</td>
              <td data-label="University" className="muted">{u.university || '-'}</td>
              <td data-label="Status">
                <span className={`adm-chip ${u.is_suspended ? 'suspended' : 'active'}`}>
                  {u.is_suspended ? 'Suspended' : 'Active'}
                </span>
              </td>
              <td data-label="Listings">{u.listing_count}</td>
              <td data-label="Actions">
                {u.is_suspended ? (
                  <button type="button" className="btn btn-accent" onClick={() => { setReinstateId(u.id); setReinstateOpen(true) }}>
                    Reinstate
                  </button>
                ) : (
                  <button type="button" className="btn btn-danger" onClick={() => { setSuspendId(u.id); setSuspendOpen(true) }}>
                    Suspend
                  </button>
                )}
                <Link
                  className="view-link"
                  to={`/admin/listings?seller_id=${u.id}`}
                  state={{ sellerName: u.full_name }}
                >
                  View listings
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      {pages > 1 && (
        <nav className="pagination">
          <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Prev</button>
          <span>Page {page} of {pages} ({total} total)</span>
          <button type="button" disabled={page >= pages} onClick={() => setPage((current) => current + 1)}>Next</button>
        </nav>
      )}

      {/* Suspension confirmation dialog */}
      <ConfirmDialog
        title="Suspend user"
        danger
        message={`You are about to suspend ${items.find(i => i.id === suspendId)?.full_name || 'this user'}. Why?`}
        reason="required"
        open={suspendOpen}
        confirmLabel="Suspend"
        cancelLabel="Cancel"
        onConfirm={(reason) => doSuspend(suspendId, reason)}
        onCancel={() => { setSuspendId(null); setSuspendOpen(false) }}
      />

      {/* Reinstate confirmation dialog */}
      <ConfirmDialog
        title="Reinstate user"
        message={`This will restore access for ${items.find(i => i.id === reinstateId)?.full_name || 'this user'}. Continue?`}
        reason="none"
        open={reinstateOpen}
        confirmLabel="Reinstate"
        cancelLabel="Cancel"
        onConfirm={() => doReinstate(reinstateId)}
        onCancel={() => { setReinstateId(null); setReinstateOpen(false) }}
      />
    </div>
  )
}
