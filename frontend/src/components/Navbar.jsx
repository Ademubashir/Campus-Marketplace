import { Link } from 'react-router-dom'

export default function Navbar() {
  return (
    <nav>
      <Link to="/">Campus Marketplace</Link>
      <Link to="/browse">Browse</Link>
      <Link to="/sell">Sell</Link>
      <Link to="/my-listings">My listings</Link>
      <Link to="/login">Login</Link>
    </nav>
  )
}