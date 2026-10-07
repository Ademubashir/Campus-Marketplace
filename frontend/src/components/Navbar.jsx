import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'

export default function Navbar() {
  const { user, loading, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/browse')
  }

  return (
    <nav>
      <Link to="/">Campus Marketplace</Link>
      <Link to="/browse">Browse</Link>

      {user && (
        <>
          <Link to="/sell">Sell</Link>
          <Link to="/my-listings">My listings</Link>
        </>
      )}

      <span className="nav-right">
        {loading ? null : user ? (
          <>
            <span>Hi, {user.full_name.split(' ')[0]}</span>
            <button type="button" onClick={handleLogout}>
              Logout
            </button>
          </>
        ) : (
          <Link to="/login">Login</Link>
        )}
      </span>
    </nav>
  )
}