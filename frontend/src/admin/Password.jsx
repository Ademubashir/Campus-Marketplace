import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons'
import { useAdmin } from './AdminAuthContext'
import { useToast } from '../ToastContext'

// A password input with a show/hide eye button.
function PasswordInput({ show, onToggle, ...inputProps }) {
  return (
    <span className="adm-pw-field">
      <input type={show ? 'text' : 'password'} {...inputProps} />
      <button
        type="button"
        className="adm-pw-toggle"
        onClick={onToggle}
        aria-label={show ? 'Hide password' : 'Show password'}
        aria-pressed={show}
      >
        <FontAwesomeIcon icon={show ? faEyeSlash : faEye} />
      </button>
    </span>
  )
}

export default function Password() {
  const { admin, loading, changePassword } = useAdmin()
  const toast = useToast()
  const navigate = useNavigate()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNext, setShowNext] = useState(false)
  const [busy, setBusy] = useState(false)

  if (loading || !admin) return null

  return (
    <div className="auth">
      <h1>{admin.must_change_password ? 'Set your password' : 'Change password'}</h1>
      {admin.must_change_password && <p className="hint">Choose a new password before continuing.</p>}
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          if (next.length < 8) {
            toast.error('New password must be at least 8 characters')
            return
          }
          setBusy(true)
          try {
            await changePassword(current, next)
            toast.success('Password changed')
            navigate('/admin', { replace: true })
          } catch (err) {
            toast.error(err.message || 'Failed to change password')
          } finally {
            setBusy(false)
          }
        }}
      >
        <label>
          Current password
          <PasswordInput
            show={showCurrent}
            onToggle={() => setShowCurrent((s) => !s)}
            autoComplete="current-password"
            placeholder="Your current password (required)"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
          />
        </label>

        <label>
          New password
          <PasswordInput
            show={showNext}
            onToggle={() => setShowNext((s) => !s)}
            autoComplete="new-password"
            minLength={8}
            maxLength={254}
            placeholder="At least 8 characters"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            required
          />
        </label>

        <button type="submit" disabled={busy}>{busy ? 'Saving...' : 'Save password'}</button>
      </form>
    </div>
  )
}
