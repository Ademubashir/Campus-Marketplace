import { useEffect, useState } from 'react'
import { api } from '../api'
import { useToast } from '../ToastContext'

export default function Overview() {
  const toast = useToast()
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setError('')
    api('/admin/stats')
      .then((data) => { if (!cancelled) setStats(data) })
      .catch((e) => {
        if (!cancelled) {
          setError(e.message)
          toast.error(e.message || 'Failed to load stats')
        }
      })
    return () => {
      cancelled = true
    }
  }, [toast])

  if (error) return <p className="error">{error}</p>
  if (!stats) return <OverviewSkeleton />

  return (
    <div>
      <h1>Overview</h1>
      <div className="stats-grid">
        <StatCard
          label="Total Users"
          value={stats.users.total}
          sub={`Suspended: ${stats.users.suspended}`}
        />
        <StatCard
          label="Available Listings"
          value={stats.listings.available}
          sub={`Sold: ${stats.listings.sold} · Awaiting review: ${stats.listings.pending}`}
        />
        <StatCard label="Active Users" value={stats.users.active} sub={`New this week: ${stats.users.new_this_week}`} />
        <StatCard
          label="New Listings This Week"
          value={stats.listings.new_this_week}
          sub={`Total: ${stats.listings.total}`}
        />
      </div>

      {/* Per-category breakdown */}
      <section className="adm-section">
        <h2>Listings by category</h2>
        <ul className="category-breakdown">
          {stats.per_category.map(({ category, count }) => (
            <li key={category}>
              <span className="cat-name">{category || 'Other'}</span>
              <span className="cat-count">{count}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

// Grey placeholders in the same layout as the real stat cards and category list.
function OverviewSkeleton() {
  return (
    <div aria-busy="true">
      <h1>Overview</h1>
      <div className="stats-grid" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <div className="stat-card" key={i}>
            <span className="sk-line sk-label" />
            <span className="sk-line sk-value" />
            <span className="sk-line sk-sub" />
          </div>
        ))}
      </div>

      <section className="adm-section" aria-hidden="true">
        <h2>Listings by category</h2>
        <ul className="category-breakdown">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <li key={i}>
              <span className="sk-line sk-chip" />
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

export function StatCard({ label, value, sub }) {
  return (
    <div className="stat-card">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  )
}
