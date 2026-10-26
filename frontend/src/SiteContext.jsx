import { createContext, useContext, useEffect, useState } from 'react'
import { api } from './api'

// Site-wide facts that can change without rebuilding the pages (the support email).
const FALLBACK_EMAIL = 'support.unimart.ng@gmail.com'
const SiteContext = createContext({ supportEmail: FALLBACK_EMAIL })

export function SiteProvider({ children }) {
  const [supportEmail, setSupportEmail] = useState(FALLBACK_EMAIL)

  useEffect(() => {
    api('/site')
      .then((data) => data?.support_email && setSupportEmail(data.support_email))
      .catch(() => {}) // keep the fallback if the request fails
  }, [])

  return <SiteContext.Provider value={{ supportEmail }}>{children}</SiteContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSite() {
  return useContext(SiteContext)
}