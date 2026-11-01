import { createContext, useContext, useEffect, useState } from 'react'
import { api, getAdminToken, setAdminToken, clearAdminToken } from '../api'

const AdminAuthContext = createContext(null)

export function AdminProvider({ children }) {
  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(true)

  // On first load: if a saved admin token exists, ask who it belongs to.
  useEffect(() => {
    if (!getAdminToken()) {
      setLoading(false)
      return
    }
    api('/admin/auth/me')
      .then((data) => setAdmin(data.admin))
      .catch(() => clearAdminToken())
      .finally(() => setLoading(false))
  }, [])

  // If any request finds the saved admin login expired, clear it.
  useEffect(() => {
    const onExpired = () => setAdmin(null)
    window.addEventListener('admin:expired', onExpired)
    return () => window.removeEventListener('admin:expired', onExpired)
  }, [])

  async function login(email, password) {
    const data = await api('/admin/auth/login', {
      method: 'POST',
      body: { email, password },
    })
    setAdminToken(data.token)
    setAdmin(data.admin)
  }

  async function logout() {
    try {
      await api('/admin/auth/logout', { method: 'POST' })
    } catch {
      // The session is ending anyway; ignore the error and clear locally.
    }
    clearAdminToken()
    setAdmin(null)
  }

  async function changePassword(currentPassword, newPassword) {
    const data = await api('/admin/auth/password', {
      method: 'POST',
      body: { current_password: currentPassword, new_password: newPassword },
    })
    setAdminToken(data.token) // this device gets a fresh login
    setAdmin(data.admin)
  }

  // The server sends the list of things this admin may do; the web pages only use it
  // to hide what would be refused anyway (the server still checks every request).
  function can(permission) {
    return Boolean(admin?.permissions?.includes(permission))
  }

  return (
    <AdminAuthContext.Provider value={{ admin, loading, login, logout, changePassword, can }}>
      {children}
    </AdminAuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAdmin() {
  return useContext(AdminAuthContext)
}
