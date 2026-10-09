import { createContext, useContext, useEffect, useState } from 'react'
import { api, setToken, clearToken, getToken } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // On first load: if a token is saved, ask the backend who it belongs to.
  useEffect(() => {
    if (!getToken()) {
      setLoading(false)
      return
    }
    api('/users/me')
      .then(setUser)
      .catch(() => clearToken()) // expired or invalid token
      .finally(() => setLoading(false))
  }, [])

    async function login(email, password) {
    const data = await api('/auth/login', {
      method: 'POST',
      body: { email, password },
    })
    setToken(data.token)
    // The login reply may carry only some user fields, so load the full profile.
    setUser(await api('/users/me'))
  }

  async function signup(fields) {
    const data = await api('/auth/signup', {
      method: 'POST',
      body: fields,
    })
    setToken(data.token)
    setUser(await api('/users/me'))
  }
  
  function logout() {
    clearToken()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}