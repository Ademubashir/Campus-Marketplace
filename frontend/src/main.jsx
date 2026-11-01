import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './AuthContext'
import { ToastProvider } from './ToastContext'
import { SiteProvider } from './SiteContext'
import { AdminProvider } from './admin/AdminAuthContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <SiteProvider>
            <AdminProvider>
              <App />
            </AdminProvider>
          </SiteProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)