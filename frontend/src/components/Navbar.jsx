import { Link, NavLink, useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faHouse,
  faMagnifyingGlass,
  faCirclePlus,
  faClipboardList,
  faUser,
} from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '../AuthContext'

export default function Navbar() {
  const { user, loading, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <>
      {/* Top bar */}
      <nav>
        <Link to="/">Campus Marketplace</Link>

        <span className="nav-links">
          <NavLink to="/" end>
            Home
          </NavLink>
          <NavLink to="/browse">Browse</NavLink>
          {user && <NavLink to="/my-listings">My listings</NavLink>}
        </span>

        <span className="nav-right">
          <Link to="/sell" className="btn-sell">
            + Sell
          </Link>
          {loading ? null : user ? (
            <>
              <span className="nav-hello">Hi, {user.full_name?.split(' ')[0] || 'there'}</span>
              <button type="button" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className="nav-login">
                Login
              </NavLink>
              <Link to="/login?mode=signup" className="nav-signup">
                Sign up
              </Link>
            </>
          )}
        </span>
      </nav>

      {/* Bottom bar: only visible on phones */}
      <div className="bottomnav" role="navigation" aria-label="Main">
        <NavLink to="/" end>
          <FontAwesomeIcon icon={faHouse} />
          Home
        </NavLink>
        <NavLink to="/browse">
          <FontAwesomeIcon icon={faMagnifyingGlass} />
          Browse
        </NavLink>
        <NavLink to="/sell">
          <FontAwesomeIcon icon={faCirclePlus} />
          Sell
        </NavLink>
        {user ? (
          <NavLink to="/my-listings">
            <FontAwesomeIcon icon={faClipboardList} />
            Mine
          </NavLink>
        ) : (
          <NavLink to="/login">
            <FontAwesomeIcon icon={faUser} />
            Login
          </NavLink>
        )}
      </div>
    </>
  )
}