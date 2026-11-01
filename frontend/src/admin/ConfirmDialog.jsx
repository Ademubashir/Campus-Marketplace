import { useEffect, useRef, useState } from 'react'

// A small confirmation dialog that works everywhere.
// reason: 'none' | 'optional' | 'required'
//   'none'       → no reason field
//   'optional'   → reason textarea shown, not required
//   'required'   → reason textarea shown, must be filled (max 500 chars)
// danger: true makes the confirm button red (suspend, delete, deactivate)
export default function ConfirmDialog({
  title = 'Confirm?',
  message,
  reason = 'none',
  danger = false,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  open,
}) {
  const [reasonValue, setReasonValue] = useState('')
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)

  useEffect(() => {
    if (open) {
      setReasonValue('')
      setBusy(false)
      busyRef.current = false
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function handleKeyDown(e) {
      if (e.key === 'Escape' && !busyRef.current) onCancel?.()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onCancel])

  // Focus the cancel button when opened so Enter doesn't fire confirm by accident
  const cancelBtnRef = useRef(null)
  useEffect(() => {
    if (open && cancelBtnRef.current) {
      cancelBtnRef.current.focus()
    }
  }, [open])

  if (!open) return null

  async function handleConfirm() {
    if (busyRef.current || (reason === 'required' && !reasonValue.trim())) return
    busyRef.current = true
    setBusy(true)
    try {
      await onConfirm(reasonValue.trim())
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  return (
    <div
      className="adm-confirm-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      onClick={(e) => e.target === e.currentTarget && !busyRef.current && onCancel?.()}
      tabIndex={-1}
    >
      <div className="adm-confirm">
        <h2 id="confirm-title">{title}</h2>
        <p>{message}</p>

        {(reason === 'optional' || reason === 'required') && (
          <label className="adm-reason-field">
            <span>Reason</span>
            <textarea
              value={reasonValue}
              onChange={(e) => setReasonValue(e.target.value)}
              maxLength={500}
              rows={3}
              required={reason === 'required'}
              aria-required={reason === 'required'}
              placeholder={reason === 'required' ? 'Required' : 'Optional'}
            />
            {reason === 'required' && (
              <span className="adm-reason-hint">Maximum 500 characters.</span>
            )}
          </label>
        )}

        <div className="adm-confirm-actions">
          <button
            type="button"
            ref={cancelBtnRef}
            className="adm-confirm-cancel"
            onClick={onCancel}
            disabled={busy}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`adm-confirm-ok${danger ? ' danger' : ''}`}
            onClick={handleConfirm}
            disabled={busy || (reason === 'required' && !reasonValue.trim())}
          >
            {busy ? 'Please wait...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
