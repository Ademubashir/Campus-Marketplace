import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleCheck, faCircleExclamation } from '@fortawesome/free-solid-svg-icons'

// Small "it worked" / "it failed" messages that appear for a few seconds.
// Any page can call:  const toast = useToast();  toast.success('Saved')

const ToastContext = createContext(null)

const SHOW_MS = 3000 // how long a message stays
const MAX_AT_ONCE = 3

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const nextId = useRef(1)

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const show = useCallback(
    (message, type) => {
      const id = nextId.current++
      setToasts((list) => [...list, { id, message, type }].slice(-MAX_AT_ONCE))
      setTimeout(() => dismiss(id), SHOW_MS)
    },
    [dismiss]
  )

  // Memoised so pages that use it don't re-run their effects needlessly.
  const value = useMemo(
    () => ({
      success: (message) => show(message, 'success'),
      error: (message) => show(message, 'error'),
    }),
    [show]
  )

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Screen readers announce new messages because of aria-live */}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast ${t.type}`}
            onClick={() => dismiss(t.id)} // tap a message to close it early
          >
            <FontAwesomeIcon icon={t.type === 'error' ? faCircleExclamation : faCircleCheck} />
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  return useContext(ToastContext)
}
