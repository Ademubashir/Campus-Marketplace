import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { useToast } from '../ToastContext'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons'

export default function Login() {
  const { login, signup } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()

  // If a protected page sent us here, go back to it after logging in.
  const goTo = location.state?.from || '/browse'

      const [mode, setMode] = useState('login') // 'login' or 'signup'

  // Switch tabs whenever the address says ?mode=signup (or doesn't)
  useEffect(() => {
    const wantsSignup = new URLSearchParams(location.search).get('mode') === 'signup'
    setMode(wantsSignup ? 'signup' : 'login')
  }, [location.search])
  const [form, setForm] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    university: '',
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false) // eye button toggles this

  function update(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault() // stop the browser reloading the page
    setError('')
    setBusy(true)
    try {
      if (mode === 'login') {
        await login(form.email, form.password)
      } else {
        await signup(form)
        // A short welcome after creating an account (not after every login)
        toast.success(`Welcome, ${form.full_name.trim().split(' ')[0]}!`)
      }
      navigate(goTo, { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth">
      <h1>{mode === 'login' ? 'Login' : 'Create an account'}</h1>
            {location.state?.from && (
        <p className="notice">Please log in or sign up to continue.</p>
      )}

      <div className="auth-tabs">
        <button
          type="button"
          className={mode === 'login' ? 'active' : ''}
          onClick={() => setMode('login')}
        >
          Login
        </button>
        <button
          type="button"
          className={mode === 'signup' ? 'active' : ''}
          onClick={() => setMode('signup')}
        >
          Sign up
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {mode === 'signup' && (
          <>
            <label>
              Full name
              <input name="full_name" value={form.full_name} onChange={update} required />
            </label>
            <label>
              WhatsApp number (e.g. 0801 234 5678)
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                name="phone"
                placeholder="08012345678"
                value={form.phone}
                onChange={update}
                required
              />
            </label>
            <label>
              University
              <input name="university" value={form.university} onChange={update} required />
            </label>
          </>
        )}

        <label>
          Email
          <input type="email" name="email" value={form.email} onChange={update} required />
        </label>
        <label>
          Password
          <span className="pw-field">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={form.password}
              onChange={update}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
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

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={busy}>
          {busy ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create account'}
        </button>

        {mode === 'signup' && (
          <p className="form-note">
            By creating an account you agree to our <Link to="/terms">Terms</Link> and{' '}
            <Link to="/privacy">Privacy</Link>. Your WhatsApp number is shown to logged-in
            students who contact you.
          </p>
        )}
      </form>
    </div>
  )
}