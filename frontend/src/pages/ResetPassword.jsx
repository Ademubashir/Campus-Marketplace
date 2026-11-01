import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons'
import { api } from '../api'
import { useToast } from '../ToastContext'

// Step 2 of a forgotten password: the page behind the link in the email.
export default function ResetPassword() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const navigate = useNavigate()
  const toast = useToast()

  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setBusy(true)
    try {
      await api('/auth/reset-password', {
        method: 'POST',
        body: { token, new_password: password },
      })
      toast.success('Password changed. Log in with your new password.')
      navigate('/login', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  // Someone opened /reset-password without the link from the email.
  if (!token) {
    return (
      <div className="auth">
        <h1>This link is not valid</h1>
        <p className="hint">Open the link from the email we sent you, or ask for a new one.</p>
        <Link className="btn btn-primary" to="/forgot-password">Get a new link</Link>
      </div>
    )
  }

  return (
    <div className="auth">
      <h1>Choose a new password</h1>

      <form onSubmit={handleSubmit}>
        <label>
          New password
          <span className="pw-field">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              minLength={8}
              required
            />
            <button
              type="button"
              className="pw-toggle"
              onClick={() => setShowPassword((show) => !show)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
            >
              <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
            </button>
          </span>
        </label>

        {error && (
          <p className="error">
            {error}{' '}
            {/* A used or expired link cannot be fixed here: offer a fresh one. */}
            {/link|expired|used/i.test(error) && <Link to="/forgot-password">Get a new link</Link>}
          </p>
        )}

        <button type="submit" disabled={busy}>
          {busy ? 'Saving...' : 'Save new password'}
        </button>
      </form>
    </div>
  )
}
