import { useEffect, useRef } from 'react'

// A small form dialog: a title, the fields (children), Cancel and a submit button.
// Enter submits. Escape or a click outside closes it, unless it is busy saving.
export default function FormDialog({
  title,
  open,
  onClose,
  onSubmit,
  submitLabel = 'Save',
  busyLabel = 'Saving...',
  busy = false,
  submitDisabled = false,
  children,
}) {
  const formRef = useRef(null)

  useEffect(() => {
    if (!open) return
    function handleKeyDown(e) {
      if (e.key === 'Escape' && !busy) onClose?.()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, busy, onClose])

  // Put the cursor in the first field when the dialog opens.
  useEffect(() => {
    if (open) formRef.current?.querySelector('input, textarea, select')?.focus()
  }, [open])

  if (!open) return null

  return (
    <div
      className="adm-confirm-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="form-dialog-title"
      onClick={(e) => e.target === e.currentTarget && !busy && onClose?.()}
    >
      <form
        ref={formRef}
        className="adm-confirm adm-form-dialog"
        onSubmit={(e) => {
          e.preventDefault()
          if (!busy && !submitDisabled) onSubmit()
        }}
      >
        <h2 id="form-dialog-title">{title}</h2>

        <div className="adm-form-fields">{children}</div>

        <div className="adm-confirm-actions">
          <button
            type="button"
            className="adm-confirm-cancel"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="adm-confirm-ok"
            disabled={busy || submitDisabled}
          >
            {busy ? busyLabel : submitLabel}
          </button>
        </div>
      </form>
    </div>
  )
}
