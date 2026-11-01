import { useEffect, useState } from 'react'
import { api } from '../api'
import { TableSkeleton } from './AdminSkeleton'
import { useToast } from '../ToastContext'
import { formatDateTime } from '../utils'

const COLUMNS = ['Time', 'Admin', 'Action', 'Target', 'Reason']

const ACTION_TEMPLATES = {
  suspend_user: () => 'Suspended user',
  reinstate_user: () => 'Reinstated user',
  delete_listing: () => 'Deleted listing',
  add_category: () => 'Added category',
  rename_category: () => 'Renamed category',
  hide_category: () => 'Hid category',
  show_category: () => 'Showed category',
  create_admin: () => 'Created admin account',
  approve_listing: () => 'Approved listing',
  reject_listing: () => 'Rejected listing',
  change_admin_role: () => 'Changed admin role',
  activate_admin: () => 'Activated admin',
  deactivate_admin: () => 'Deactivated admin',
}

export default function Log() {
  const toast = useToast()
  const [items, setItems] = useState([])
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [refresh, setRefresh] = useState(0)

  // Loading: which request has finished (null = nothing has loaded yet)
  const [loadedKey, setLoadedKey] = useState(null)
  const [failed, setFailed] = useState(false)
  const url = `/admin/log?page=${page}`
  const requestKey = `${url}#${refresh}`
  const loading = loadedKey !== requestKey
  const showSkeleton = loading && loadedKey === null // first load: no rows yet
  const refreshing = loading && loadedKey !== null // new page: keep old rows, faded

  useEffect(() => {
    let cancelled = false
    api(url).then((data) => {
      if (!cancelled) {
        setItems(data.items)
        setPages(data.pages)
        setFailed(false)
        setLoadedKey(requestKey)
      }
    }).catch((e) => {
      if (!cancelled) {
        setFailed(true)
        setLoadedKey(requestKey)
        toast.error(e.message || 'Failed to load log')
      }
    })
    return () => { cancelled = true }
  }, [url, requestKey, toast])

  return (
    <div>
      <h1>Activity Log</h1>

      <table className={`adm-table ${refreshing ? 'is-loading' : ''}`} aria-busy={loading}>
        <thead>
          <tr>
            <th>Time</th>
            <th>Admin</th>
            <th>Action</th>
            <th>Target</th>
            <th>Reason</th>
          </tr>
        </thead>
        <tbody>
          {showSkeleton && <TableSkeleton columns={COLUMNS} />}
          {!showSkeleton && failed && (
            <tr>
              <td colSpan={5} className="empty-state">
                Could not load the activity log.{' '}
                <button type="button" onClick={() => setRefresh((current) => current + 1)}>Try again</button>
              </td>
            </tr>
          )}
          {!showSkeleton && !failed && items.length === 0 && <tr><td colSpan={5} className="empty-state">No activity yet</td></tr>}
          {!showSkeleton && !failed && items.map((l) => {
            const template = ACTION_TEMPLATES[l.action] || (() => `${l.admin_name} did something`)
            const reasonCell = l.reason ? <span className="muted small">{l.reason}</span> : null
            return (
              <tr key={l.id}>
                <td data-label="Time" className="muted small">{formatDateTime(l.created_at)}</td>
                <td data-label="Admin">{l.admin_name}</td>
                <td data-label="Action">{template(l)}</td>
                <td data-label="Target">{l.target_label || '-'}</td>
                <td data-label="Reason">{reasonCell}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {pages > 1 && (
        <nav className="pagination">
          <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
          <span>Page {page} of {pages}</span>
          <button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
        </nav>
      )}
    </div>
  )
}
