import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'

// Step 1 of a forgotten password: ask for an email address, and we send a reset link.
export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sentTo, setSentTo] = useState('') // set once the request has gone through

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await api('/auth/forgot-password', { method: 'POST', body: { email } })
      setSentTo(email.trim())
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (sentTo) {
    return (
      <div className="auth">
        <h1>Check your email</h1>
        <p className="hint">
          If there is an account for <strong>{sentTo}</strong>, we have sent a link to reset the
          password. It works for 1 hour.
        </p>
        <p className="hint">
          Nothing there? Look in your spam folder, then wait a minute or two. You can try again
          or use a different address.
        </p>
        <button type="button" onClick={() => setSentTo('')}>Try again</button>{' '}
        <Link to="/login">Back to login</Link>
      </div>
    )
  }

  return (
    <div className="auth">
      <h1>Forgot your password?</h1>
      <p className="hint">
        Enter the email you signed up with. We will send you a link to choose a new password.
      </p>

      <form onSubmit={handleSubmit}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={busy}>
          {busy ? 'Sending...' : 'Send reset link'}
        </button>
        <Link to="/login">Back to login</Link>
      </form>
    </div>
  )
}
