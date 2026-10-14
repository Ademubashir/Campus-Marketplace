import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons'
import { api, setToken } from '../api'
import { useAuth } from '../AuthContext'
import { useToast } from '../ToastContext'

// A password box with an eye button to show or hide what you typed.
function PasswordField({ label, name, value, onChange, autoComplete }) {
  const [show, setShow] = useState(false)
  return (
    <label>
      {label}
      <span className="pw-field">
        <input
          type={show ? 'text' : 'password'}
          name={name}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          required
        />
        <button
          type="button"
          className="pw-toggle"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
          aria-pressed={show}
        >
          <FontAwesomeIcon icon={show ? faEyeSlash : faEye} />
        </button>
      </span>
    </label>
  )
}

export default function Profile() {
  const { user } = useAuth()
  const toast = useToast()

  // Change-password form
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [pwError, setPwError] = useState('')
  const [pwBusy, setPwBusy] = useState(false)

  // "Log out other devices" button
  const [secError, setSecError] = useState('')
  const [secBusy, setSecBusy] = useState(false)

  function updatePw(e) {
    setPw({ ...pw, [e.target.name]: e.target.value })
  }

  async function changePassword(e) {
    e.preventDefault()
    setPwError('')

    // Quick checks in the browser; the server checks again.
    if (pw.next.length < 8) {
      setPwError('New password must be at least 8 characters')
      return
    }
    if (pw.next !== pw.confirm) {
      setPwError('The new passwords do not match')
      return
    }

    setPwBusy(true)
    try {
      const data = await api('/users/me/password', {
        method: 'POST',
        body: { current_password: pw.current, new_password: pw.next },
      })
      setToken(data.token) // this device gets a fresh login; all others are cut off
      setPw({ current: '', next: '', confirm: '' })
      toast.success('Password changed. Other devices were logged out.')
    } catch (err) {
      setPwError(err.message)
    } finally {
      setPwBusy(false)
    }
  }

  async function logoutOthers() {
    if (!window.confirm('Log out of every other device? This device stays logged in.')) return
    setSecError('')
    setSecBusy(true)
    try {
      const data = await api('/users/me/logout-others', { method: 'POST' })
      setToken(data.token)
      toast.success('Logged out of all other devices')
    } catch (err) {
      setSecError(err.message)
    } finally {
      setSecBusy(false)
    }
  }

  if (!user) return null

  return (
    <div className="profile">
      <h1>Profile</h1>

      <div className="auth">
        <h2>Your details</h2>
        <dl className="profile-list">
          <div>
            <dt>Name</dt>
            <dd>{user.full_name}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{user.email}</dd>
          </div>
          <div>
            <dt>WhatsApp</dt>
            <dd>{user.phone}</dd>
          </div>
          <div>
            <dt>University</dt>
            <dd>{user.university}</dd>
          </div>
        </dl>
      </div>

      <div className="auth">
        <h2>Change password</h2>
        <form onSubmit={changePassword}>
          <PasswordField
            label="Current password"
            name="current"
            value={pw.current}
            onChange={updatePw}
            autoComplete="current-password"
          />
          <PasswordField
            label="New password (at least 8 characters)"
            name="next"
            value={pw.next}
            onChange={updatePw}
            autoComplete="new-password"
          />
          <PasswordField
            label="Repeat new password"
            name="confirm"
            value={pw.confirm}
            onChange={updatePw}
            autoComplete="new-password"
          />

          {pwError && <p className="error">{pwError}</p>}

          <button type="submit" disabled={pwBusy}>
            {pwBusy ? 'Saving...' : 'Change password'}
          </button>
        </form>
      </div>

      <div className="auth">
        <h2>Lost your phone?</h2>
        <p className="hint">
          If you lost a device or think someone else is logged in as you, log out every other
          device. You stay logged in here. Changing your password does this too.
        </p>
        {secError && <p className="error">{secError}</p>}
        <button type="button" onClick={logoutOthers} disabled={secBusy}>
          {secBusy ? 'Please wait...' : 'Log out other devices'}
        </button>
      </div>
    </div>
  )
}
