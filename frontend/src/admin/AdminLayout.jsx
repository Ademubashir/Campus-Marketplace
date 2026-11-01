import { useCallback, useEffect, useState } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import { api } from '../api'
import { useAdmin } from './AdminAuthContext'

// Same breakpoint the stylesheet uses for the desktop sidebar layout.
function isDesktop() {
  return window.matchMedia('(min-width: 800px)').matches
}

// Tables turn into cards when the content area is narrower than this (in pixels).
// It must be a little wider to turn back into a table, so a scrollbar appearing or
// disappearing cannot make the layout flip back and forth.
const CARDS_BELOW = 860
const TABLE_FROM = 880

// Best guess before anything is measured: the screen minus the sidebar (18rem = 288px,
// plus the 16px gap) and the page padding.
function guessCompact(menuOpen) {
  const screen = window.innerWidth
  if (screen < 800) return true
  return screen - (menuOpen ? 288 + 16 : 0) - 32 < CARDS_BELOW
}

// Sidebar links. A link with a permission only shows for roles that have it.
const NAV_LINKS = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/review', label: 'Review', permission: 'listings.review', showCount: true },
  { to: '/admin/users', label: 'Users', permission: 'users.view' },
  { to: '/admin/listings', label: 'Listings', permission: 'listings.view' },
  { to: '/admin/categories', label: 'Categories', permission: 'categories.manage' },
  { to: '/admin/admins', label: 'Admins', permission: 'admins.manage' },
  { to: '/admin/log', label: 'Log', permission: 'log.view' },
  { to: '/admin/password', label: 'Change password' },
]

export default function AdminLayout() {
  const { admin, logout, can } = useAdmin()
  const location = useLocation()

  // Menu starts open on desktop and closed on phones.
  const [menuOpen, setMenuOpen] = useState(() => isDesktop())

  // Is the content area too narrow for table columns? Measured, so it follows the menu:
  // collapsing it on a mid-size screen gives the tables their columns back.
  const [compact, setCompact] = useState(() => guessCompact(isDesktop()))
  const [contentEl, setContentEl] = useState(null)
  useEffect(() => {
    if (!contentEl || typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width
      setCompact((was) => (was ? width < TABLE_FROM : width < CARDS_BELOW))
    })
    observer.observe(contentEl)
    return () => observer.disconnect()
  }, [contentEl])

  // How many listings are waiting for review (only for admins who can review them).
  // The Review page calls refreshPending after each decision to keep the number right.
  const canReview = can('listings.review')
  const [pendingCount, setPendingCount] = useState(0)
  const refreshPending = useCallback(() => {
    if (!canReview) return
    api('/admin/listings/review/count')
      .then((data) => setPendingCount(data.pending))
      .catch(() => {})
  }, [canReview])

  // Look again whenever the admin moves to another page.
  useEffect(() => {
    refreshPending()
  }, [refreshPending, location.pathname])

  // Escape closes the menu on phones.
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape' && !isDesktop()) setMenuOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  // Until we know whether the admin is logged in, don't try to hide sidebar links.
  if (!admin) return null

  const mustChange = Boolean(admin.must_change_password)

  // A temporary-password account can only open the password page.
  if (mustChange && location.pathname !== '/admin/password') {
    return <Navigate to="/admin/password" replace />
  }

  if (mustChange) {
    return (
      <>
        <div className="adm-topbar">
          <Link className="adm-brand" to="/admin">
            UniMart Admin
          </Link>
          <button
            type="button"
            className="adm-logout"
            onClick={logout}
            aria-label="Log out"
          >
            Logout
          </button>
        </div>
        <main className="adm-container">
          <Outlet />
        </main>
      </>
    )
  }

  return (
    <>
      <div className="adm-topbar">
        <button
          type="button"
          className={`adm-menu-btn ${menuOpen ? 'open' : ''}`}
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="adm-sidebar"
        >
          <span />
          <span />
          <span />
        </button>
        <Link className="adm-brand" to="/admin">
          UniMart Admin
        </Link>
        <div className="adm-topbar-right">
          <span className="adm-welcome">
            Hi, {admin.name?.split(' ')[0] || 'there'}
          </span>
          <span className={`adm-chip adm-role-chip role-${admin.role}`}>
            {admin.role_label || admin.role}
          </span>
          <button
            type="button"
            className="adm-logout"
            onClick={logout}
            aria-label="Log out"
          >
            Logout
          </button>
        </div>
      </div>

      <div
        className={`adm-wrapper ${menuOpen ? 'sidebar-open' : ''} ${compact ? 'adm-compact' : ''}`}
      >
        <nav
          id="adm-sidebar"
          className={`adm-sidebar ${menuOpen ? 'open' : ''}`}
          aria-label="Admin"
          onClick={(e) => {
            // On phones, picking a page closes the menu.
            if (!isDesktop() && e.target.closest('a')) setMenuOpen(false)
          }}
        >
          {NAV_LINKS.filter((link) => !link.permission || can(link.permission)).map((link) => (
            <NavLink
              key={link.to}
              end={link.end}
              className={({ isActive }) => `adm-link ${isActive ? 'active' : ''}`}
              to={link.to}
            >
              {link.label}
              {link.showCount && pendingCount > 0 && (
                <span className="adm-nav-count" aria-label={`${pendingCount} waiting`}>
                  {pendingCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <main className="adm-container" ref={setContentEl}>
          <Outlet context={{ refreshPending }} />
        </main>
      </div>
    </>
  )
}
