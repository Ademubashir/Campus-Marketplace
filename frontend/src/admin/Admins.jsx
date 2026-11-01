import { useEffect, useState } from 'react'
import { api } from '../api'
import ConfirmDialog from './ConfirmDialog'
import FormDialog from './FormDialog'
import RolePicker from './RolePicker'
import { TableSkeleton } from './AdminSkeleton'
import { useToast } from '../ToastContext'
import { useAdmin } from './AdminAuthContext'
import { formatDateTime } from '../utils'

const COLUMNS = ['Name', 'Email', 'Role', 'Status', 'Must change password?', 'Last login', 'Actions']

export default function Admins() {
  const toast = useToast()
  const { admin: currentAdmin } = useAdmin()
  const [items, setItems] = useState([])

  // New admin form
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [newRole, setNewRole] = useState('support') // the most limited role unless chosen

  // Change role dialog
  const [roleId, setRoleId] = useState(null)
  const [roleDraft, setRoleDraft] = useState('support')

  // Toggle confirmation
  const [toggleId, setToggleId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [refresh, setRefresh] = useState(0)

  // Loading: which request has finished (null = nothing has loaded yet)
  const [loadedKey, setLoadedKey] = useState(null)
  const [failed, setFailed] = useState(false)
  const requestKey = `admins#${refresh}`
  const loading = loadedKey !== requestKey
  const showSkeleton = loading && loadedKey === null // first load: no rows yet
  const refreshing = loading && loadedKey !== null // after a change: keep old rows, faded

  useEffect(() => {
    let cancelled = false
    api('/admin/admins')
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
          toast.error(e.message || 'Failed to load admins')
        }
      })
    return () => { cancelled = true }
  }, [requestKey, toast])

  async function createAdmin() {
    if (busy || !newName.trim()) return
    setBusy(true)
    try {
      await api('/admin/admins', {
        method: 'POST',
        body: { name: newName.trim(), email: newEmail.trim().toLowerCase(), password: newPassword, role: newRole },
      })
      toast.success('Admin account created')
      closeAdd()
      setRefresh((current) => current + 1)
    } catch (e) {
      toast.error(e.message || 'Failed to create admin')
    } finally {
      setBusy(false)
    }
  }

  function closeAdd() {
    setAddOpen(false)
    setNewName(''); setNewEmail(''); setNewPassword(''); setNewRole('support')
  }

  function openRole(a) {
    setRoleId(a.id)
    setRoleDraft(a.role)
  }

  async function saveRole() {
    const target = items.find((i) => i.id === roleId)
    if (busy || !target) return
    if (roleDraft === target.role) {
      setRoleId(null)
      return
    }
    setBusy(true)
    try {
      await api(`/admin/admins/${roleId}`, { method: 'PATCH', body: { role: roleDraft } })
      toast.success('Role updated')
      setRoleId(null)
      setRefresh((current) => current + 1)
    } catch (e) {
      toast.error(e.message || 'Failed to change role')
    } finally {
      setBusy(false)
    }
  }

  async function toggleActive(id) {
    const target = items.find((i) => i.id === id)
    const newState = !target?.is_active
    if (target?.id === currentAdmin?.id) return // the API also prevents self-deactivation
    try {
      await api(`/admin/admins/${id}`, { method: 'PATCH', body: { is_active: newState } })
      toast.success(`Admin ${newState ? 'activated' : 'deactivated'}`)
      setToggleId(null)
      setRefresh((current) => current + 1)
    } catch (e) {
      toast.error(e.message || 'Failed to change admin status')
    }
  }

  return (
    <div>
      <div className="adm-page-head">
        <h1>Admins</h1>
        <button type="button" className="btn btn-primary" onClick={() => setAddOpen(true)}>
          + Add admin
        </button>
      </div>

      <table className={`adm-table ${refreshing ? 'is-loading' : ''}`} aria-busy={loading}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Must change password?</th>
            <th>Last login</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {showSkeleton && <TableSkeleton columns={COLUMNS} />}
          {!showSkeleton && failed && (
            <tr>
              <td colSpan="7" className="empty-state">
                Could not load admins.{' '}
                <button type="button" onClick={() => setRefresh((current) => current + 1)}>Try again</button>
              </td>
            </tr>
          )}
          {!showSkeleton && !failed && items.length === 0 && <tr><td colSpan="7" className="empty-state">No admins yet</td></tr>}
          {!showSkeleton && !failed && items.map((a) => (
            <tr key={a.id}>
              <td data-label="Name">{a.name}</td>
              <td data-label="Email" className="muted">{a.email}</td>
              <td data-label="Role">
                <span className={`adm-chip role-${a.role}`}>{a.role_label || a.role}</span>
              </td>
              <td data-label="Status">
                {a.is_active ? <span className="adm-chip active">Active</span> : <span className="adm-chip inactive">Inactive</span>}
              </td>
              <td data-label="Must change password?">
                {a.must_change_password ? <span className="hint-small">yes</span> : <span className="muted small">-</span>}
              </td>
              <td data-label="Last login" className="muted small">{formatDateTime(a.last_login_at)}</td>
              <td data-label="Actions">
                {a.id !== currentAdmin?.id && (
                  <div className="adm-actions">
                    <button type="button" className="btn btn-sm" onClick={() => openRole(a)}>
                      Change role
                    </button>
                    <button
                      type="button"
                      className={`btn ${a.is_active ? 'btn-danger' : 'btn-accent'} btn-sm`}
                      onClick={() => setToggleId(a.id)}
                    >
                      {a.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <FormDialog
        title="Add admin"
        open={addOpen}
        onClose={closeAdd}
        onSubmit={createAdmin}
        submitLabel="Create admin"
        busyLabel="Creating..."
        busy={busy}
        submitDisabled={!newName.trim() || !newEmail.trim() || newPassword.length < 8}
      >
        <label>
          Admin name
          <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={50} placeholder="Full name" autoComplete="off" required />
        </label>
        <label>
          Email
          <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} maxLength={254} placeholder="admin@example.com" autoComplete="email" required />
        </label>
        <label>
          Password
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} maxLength={254} placeholder="At least 8 characters" autoComplete="new-password" required />
          <span className="adm-field-hint">
            The new admin must choose their own password at first sign-in, and it must be different from this one.
          </span>
        </label>
        <RolePicker value={newRole} onChange={setNewRole} name="new-admin-role" />
      </FormDialog>

      <FormDialog
        title={`Change role: ${items.find((i) => i.id === roleId)?.name || ''}`}
        open={roleId !== null}
        onClose={() => setRoleId(null)}
        onSubmit={saveRole}
        submitLabel="Save role"
        busyLabel="Saving..."
        busy={busy}
        submitDisabled={roleDraft === items.find((i) => i.id === roleId)?.role}
      >
        <RolePicker value={roleDraft} onChange={setRoleDraft} name="change-admin-role" />
        <span className="adm-field-hint">
          They will be signed out, and the new role applies the next time they sign in.
        </span>
      </FormDialog>

      <ConfirmDialog
        title={items.find(i => i.id === toggleId)?.is_active ? 'Deactivate admin' : 'Reactivate admin'}
        message={`You are about to ${items.find(i => i.id === toggleId)?.is_active ? 'deactivate' : 'reactivate'} ${items.find(i => i.id === toggleId)?.email || 'this account'}. Continue?`}
        reason="none"
        danger={Boolean(items.find(i => i.id === toggleId)?.is_active)}
        open={toggleId !== null}
        confirmLabel={items.find(i => i.id === toggleId)?.is_active ? 'Deactivate' : 'Reactivate'}
        cancelLabel="Cancel"
        onConfirm={() => toggleId && toggleActive(toggleId)}
        onCancel={() => setToggleId(null)}
      />
    </div>
  )
}
