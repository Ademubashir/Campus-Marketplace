import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import Browse from './pages/Browse'
import ListingDetail from './pages/ListingDetail'
import CreateListing from './pages/CreateListing'
import EditListing from './pages/EditListing'
import MyListings from './pages/MyListings'
import Login from './pages/Login'
import Profile from './pages/Profile'
import Terms from './pages/Terms'
import Privacy from './pages/Privacy'
import NotFound from './pages/NotFound'

// Shorthand: wraps a page so only logged-in users can see it.
function Private({ children }) {
  return <ProtectedRoute>{children}</ProtectedRoute>
}

export default function App() {
  return (
    <>
      <Navbar />
      <main className="container">
        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />

          {/* Need a login */}
          <Route path="/browse" element={<Private><Browse /></Private>} />
          <Route path="/listings/:id" element={<Private><ListingDetail /></Private>} />
          <Route path="/sell" element={<Private><CreateListing /></Private>} />
          <Route path="/listings/:id/edit" element={<Private><EditListing /></Private>} />
          <Route path="/my-listings" element={<Private><MyListings /></Private>} />
          <Route path="/profile" element={<Private><Profile /></Private>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </>
  )
}
