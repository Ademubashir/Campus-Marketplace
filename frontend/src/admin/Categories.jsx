import { useEffect, useState } from 'react'
import { api } from '../api'
import { TableSkeleton } from './AdminSkeleton'
import { useToast } from '../ToastContext'

const COLUMNS = ['Name', 'Slug', 'Hidden', 'Listings', 'Actions']

export default function Categories() {
  const toast = useToast()
  const [items, setItems] = useState([])

  // Editing-in-place state
  const [editingId, setEditingId] = useState(null)
  const [draftName, setDraftName] = useState('')
  const [draftHidden, setDraftHidden] = useState(null)

  // New category form
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(false)
  const [refresh, setRefresh] = useState(0)

  // Loading: which request has finished (null = nothing has loaded yet)
  const [loadedKey, setLoadedKey] = useState(null)
  const [failed, setFailed] = useState(false)
  const requestKey = `categories#${refresh}`
  const loading = loadedKey !== requestKey
  const showSkeleton = loading && loadedKey === null // first load: no rows yet
  const refreshing = loading && loadedKey !== null // after a save: keep old rows, faded

  function startEdit(item) {
    setEditingId(item.id)
    setDraftName(item.name)
    setDraftHidden(Boolean(item.is_hidden))
  }

  function cancelEdit() {
    setEditingId(null)
    setDraftName('')
    setDraftHidden(null)
  }

  async function saveEdit() {
    if (!draftName.trim()) return
    setBusy(true)
    try {
      await api(`/admin/categories/${editingId}`, {
        method: 'PATCH',
        body: { name: draftName.trim(), is_hidden: draftHidden },
      })
      toast.success('Category updated')
      cancelEdit()
      setRefresh((current) => current + 1)
    } catch (e) {
      toast.error(e.message || 'Failed to update category')
    } finally {
      setBusy(false)
    }
  }

  async function addNew() {
    if (!newName.trim()) return
    setBusy(true)
    try {
      await api('/admin/categories', { method: 'POST', body: { name: newName.trim() } })
      toast.success('Category added')
      setNewName('')
      setRefresh((current) => current + 1)
    } catch (e) {
      toast.error(e.message || 'Failed to add category')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    api('/admin/categories')
      .then((data) => {
        if (!cancelled) {
          setItems(data.items)
          setFailed(false)
          setLoadedKey(requestKey)
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setFailed(true)
          setLoadedKey(requestKey)
          toast.error(e.message || 'Failed to load categories')
        }
      })
    return () => { cancelled = true }
  }, [requestKey, toast])

  return (
    <div>
      <h1>Categories</h1>

      {/* Add new */}
      <form className="adm-inline-form" onSubmit={(e) => { e.preventDefault(); addNew() }}>
        <label>
          <span>New category</span>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            maxLength={50}
            placeholder="e.g. Electronics"
            autoComplete="off"
          />
        </label>
        <button type="submit" disabled={busy || !newName.trim()}>{busy ? 'Saving...' : 'Add category'}</button>
      </form>

      <p className="hint">Hidden categories are still manageable here; they don't show on the public browse page.</p>

      <table className={`adm-table ${refreshing ? 'is-loading' : ''}`} aria-busy={loading}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Slug</th>
            <th>Hidden</th>
            <th>Listings</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {showSkeleton && <TableSkeleton columns={COLUMNS} />}
          {!showSkeleton && failed && (
            <tr>
              <td colSpan="5" className="empty-state">
                Could not load categories.{' '}
                <button type="button" onClick={() => setRefresh((current) => current + 1)}>Try again</button>
              </td>
            </tr>
          )}
          {!showSkeleton && !failed && items.length === 0 && (
            <tr><td colSpan="5" className="empty-state">No categories yet</td></tr>
          )}
          {!showSkeleton && !failed && items.map((c) => (
            <tr key={c.id} className={c.is_hidden ? 'suspended-row' : ''}>
              <td data-label="Name">
                <input
                  type="text"
                  className={`adm-name-input ${editingId === c.id ? 'active' : ''}`}
                  value={editingId === c.id ? draftName : c.name}
                  onChange={(e) => setDraftName(e.target.value)}
                  disabled={editingId !== c.id}
                  maxLength={50}
                  aria-label={`Name for ${c.name}`}
                />
              </td>
              <td data-label="Slug" className="muted small">{c.slug}</td>
              <td data-label="Hidden">
                <input
                  type="checkbox"
                  checked={editingId === c.id ? draftHidden : Boolean(c.is_hidden)}
                  onChange={(e) => setDraftHidden(e.target.checked)}
                  disabled={editingId !== c.id}
                />
              </td>
              <td data-label="Listings">{c.listing_count}</td>
              <td data-label="Actions">
                {editingId === c.id ? (
                  <>
                    <button type="button" className="btn btn-primary btn-sm" onClick={saveEdit} disabled={busy}>Save</button>
                    <button type="button" className="btn btn-outline btn-sm" onClick={cancelEdit}>Cancel</button>
                  </>
                ) : (
                  <button type="button" className="btn btn-sm" onClick={() => startEdit(c)}>Edit</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
