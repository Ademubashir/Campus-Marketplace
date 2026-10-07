import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../AuthContext'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  // Still checking the saved token: don't redirect yet.
  if (loading) return <p>Loading...</p>

  if (!user) {
    // Send them to login, and remember where they were going.
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  return children
}