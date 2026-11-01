import { useState } from 'react'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import { useToast } from '../ToastContext'

// A bar shown to a student who has not confirmed their email yet.
// Until they do, they can browse but not post listings.
export default function VerifyBanner() {
  const { user, refreshUser } = useAuth()
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  if (!user || user.email_verified !== false) return null

  async function resend() {
    setBusy(true)
    try {
      const data = await api('/auth/resend-verification', { method: 'POST' })
      toast.success(data.message || 'We sent you a new link')
      if (data.verified) refreshUser() // it was already confirmed (maybe on another device)
    } catch (err) {
      toast.error(err.message || 'Could not send the email')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="verify-banner" role="status">
      <span>
        Confirm your email to post listings. We sent a link to <strong>{user.email}</strong>.
      </span>
      <button type="button" onClick={resend} disabled={busy}>
        {busy ? 'Sending...' : 'Resend email'}
      </button>
    </div>
  )
}
