import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'

// The page behind the link in the "Confirm your UniMart email" message.
export default function VerifyEmail() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const { user, refreshUser } = useAuth()
  const [result, setResult] = useState(
    token ? { status: 'checking' } : { status: 'error', message: 'This link is not valid.' }
  )

  useEffect(() => {
    if (!token) return
    let cancelled = false
    api('/auth/verify-email', { method: 'POST', body: { token } })
      .then(() => {
        if (cancelled) return
        setResult({ status: 'ok' })
        refreshUser() // clears the "confirm your email" bar if they are logged in here
      })
      .catch((err) => {
        if (!cancelled) setResult({ status: 'error', message: err.message || 'Something went wrong.' })
      })
    return () => { cancelled = true }
  }, [token, refreshUser])

  return (
    <div className="auth verify-page">
      {result.status === 'checking' && (
        <>
          <h1>Confirming your email...</h1>
          <p className="hint">One moment.</p>
        </>
      )}

      {result.status === 'ok' && (
        <>
          <h1>Email confirmed</h1>
          <p className="hint">Thank you! You can now post listings on UniMart.</p>
          <Link className="btn btn-primary" to={user ? '/sell' : '/login'}>
            {user ? 'Post a listing' : 'Log in'}
          </Link>
        </>
      )}

      {result.status === 'error' && (
        <>
          <h1>We could not confirm your email</h1>
          <p className="error">{result.message}</p>
          <p className="hint">
            {user
              ? 'Use the Resend email button at the top of the page to get a new link.'
              : 'Log in, then use the Resend email button to get a new link.'}
          </p>
          <Link className="btn" to={user ? '/browse' : '/login'}>
            {user ? 'Go to UniMart' : 'Log in'}
          </Link>
        </>
      )}
    </div>
  )
}
