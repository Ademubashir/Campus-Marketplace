import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import Navbar from './components/Navbar'
import VerifyBanner from './components/VerifyBanner'
import Footer from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import Browse from './pages/Browse'
import ListingDetail from './pages/ListingDetail'
import CreateListing from './pages/CreateListing'
import EditListing from './pages/EditListing'
import MyListings from './pages/MyListings'
import StudentLogin from './pages/Login'
import Profile from './pages/Profile'
import VerifyEmail from './pages/VerifyEmail'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Terms from './pages/Terms'
import Privacy from './pages/Privacy'
import NotFound from './pages/NotFound'
import AdminLogin from './admin/Login'
import AdminRoute from './admin/AdminRoute'
import AdminLayout from './admin/AdminLayout'
import RequirePermission from './admin/RequirePermission'
import Review from './admin/Review'
import Overview from './admin/Overview'
import Users from './admin/Users'
import Listings from './admin/Listings'
import Categories from './admin/Categories'
import Admins from './admin/Admins'
import Log from './admin/Log'
import Password from './admin/Password'
import Insights from './admin/Insights'

// Shorthand: wraps a page so only logged-in users can see it.
function Private({ children }) {
  return <ProtectedRoute>{children}</ProtectedRoute>
}
// Student shell: always shows the Navbar, footer, and student pages.
function StudentShell() {
  return (
    <>
      <Navbar />
      <VerifyBanner />
      <main className="container">
        <Outlet />
      </main>
      <Footer />
    </>
  )
}

export default function App() {
  return (
    <>
      <Routes>
        {/* Admin routes are siblings of the student shell. */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={<AdminRoute><AdminLayout /></AdminRoute>}
        >
          <Route index element={<Overview />} />
          <Route path="review" element={<RequirePermission permission="listings.review"><Review /></RequirePermission>} />
          <Route path="users" element={<RequirePermission permission="users.view"><Users /></RequirePermission>} />
          <Route path="listings" element={<RequirePermission permission="listings.view"><Listings /></RequirePermission>} />
          <Route path="categories" element={<RequirePermission permission="categories.manage"><Categories /></RequirePermission>} />
          <Route path="insights" element={<RequirePermission permission="insights.view"><Insights /></RequirePermission>} />
          <Route path="admins" element={<RequirePermission permission="admins.manage"><Admins /></RequirePermission>} />
          <Route path="log" element={<RequirePermission permission="log.view"><Log /></RequirePermission>} />
          <Route path="password" element={<Password />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>

        {/* Student catch-all stays inside the student shell so its 404 retains
            the student navigation and footer. */}
        <Route path="/" element={<StudentShell />}>
          <Route index element={<Home />} />
          <Route path="login" element={<StudentLogin />} />
          <Route path="verify-email" element={<VerifyEmail />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="reset-password" element={<ResetPassword />} />
          <Route path="terms" element={<Terms />} />
          <Route path="privacy" element={<Privacy />} />
          <Route path="browse" element={<Private><Browse /></Private>} />
          <Route path="listings/:id" element={<Private><ListingDetail /></Private>} />
          <Route path="sell" element={<Private><CreateListing /></Private>} />
          <Route path="listings/:id/edit" element={<Private><EditListing /></Private>} />
          <Route path="my-listings" element={<Private><MyListings /></Private>} />
          <Route path="profile" element={<Private><Profile /></Private>} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  )
}
