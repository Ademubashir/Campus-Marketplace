import { Navigate, useLocation } from 'react-router-dom'
import { useAdmin } from './AdminAuthContext'
import { AdminShellSkeleton } from './AdminSkeleton'

export default function AdminRoute({ children }) {
  const { admin, loading } = useAdmin()
  const location = useLocation()

  // Still checking the saved admin token: don't redirect yet.
  if (loading) return <AdminShellSkeleton />

  if (!admin) {
    return <Navigate to="/admin/login" state={{ from: location.pathname + location.search }} replace/>
  }

  return children
}