import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAdmin } from './AdminAuthContext'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons'

export default function Login() {
  const { login } = useAdmin()
  const navigate = useNavigate()
  const location = useLocation()
  // If redirected here from a protected page, go back after login.
  const goTo = location.state?.from || '/admin'

  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  function update(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(form.email, form.password)
      navigate(goTo, { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="adm-login-page">
    <div className="adm-auth auth">
      <h1>UniMart Admin</h1>
      {error && <p className="error">{error}</p>}

      <form onSubmit={handleSubmit}>
        <label>
          Email
          <input
            type="email"
            name="email"
            autoComplete="email"
            value={form.email}
            onChange={update}
            required
          />
        </label>

        <label>
          Password
          <span className="pw-field">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              autoComplete="current-password"
              value={form.password}
              onChange={update}
              required
            />
            <button
              type="button"
              className="pw-toggle"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
            >
              <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
            </button>
          </span>
        </label>

        <button type="submit" disabled={busy}>
          {busy ? 'Please wait...' : 'Log in'}
        </button>
      </form>
    </div>
  </main>
  )
}

