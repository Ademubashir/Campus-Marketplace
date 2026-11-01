import { Navigate } from 'react-router-dom'
import { useAdmin } from './AdminAuthContext'

// Wraps an admin page. An admin whose role lacks the permission is sent back to the
// Overview page (typing the address by hand does not get them in).
export default function RequirePermission({ permission, children }) {
  const { can } = useAdmin()
  return can(permission) ? children : <Navigate to="/admin" replace />
}
