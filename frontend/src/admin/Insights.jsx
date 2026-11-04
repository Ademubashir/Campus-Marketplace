import { useEffect, useState } from 'react'
import { api } from '../api'
import { useToast } from '../ToastContext'
import { StatCard } from './Overview'

// How many weeks the charts can cover.
const RANGES = [8, 12, 26, 52]

const weekFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' })

function formatWeek(start) {
  return weekFormat.format(new Date(`${start}T00:00:00`))
}

// 0.4 -> "24 min", 5.25 -> "5.3 h", 72 -> "3.0 days"
function formatHours(hours) {
  if (hours === null || hours === undefined) return '-'
  if (hours < 1) return `${Math.max(Math.round(hours * 60), 1)} min`
  if (hours < 48) return `${hours.toFixed(1)} h`
  return `${(hours / 24).toFixed(1)} days`
}

// Bars per week. Each bar can be split into parts (series), for example approved and rejected.
function WeekChart({ weeks, series, label }) {
  const totals = weeks.map((w) => series.reduce((sum, s) => sum + w[s.key], 0))
  const max = Math.max(...totals, 0)
  if (max === 0) return <p className="ins-empty">Nothing to show for these weeks yet.</p>

  // Name only some of the weeks when there are many, so the labels do not collide.
  const step = weeks.length > 26 ? 4 : weeks.length > 12 ? 3 : weeks.length > 8 ? 2 : 1

  return (
    <div className="ins-chart" role="img" aria-label={label}>
      {weeks.map((w, i) => {
        const total = totals[i]
        const detail = series.map((s) => `${w[s.key]} ${s.label.toLowerCase()}`).join(', ')
        return (
          <div className="ins-col" key={w.start} title={`Week of ${formatWeek(w.start)}: ${detail}`}>
            <span className="ins-val">{total > 0 ? total : ''}</span>
            <div className="ins-bar-wrap">
              {total > 0 && (
                <div className="ins-stack" style={{ height: `${(total / max) * 100}%` }}>
                  {series.map(
                    (s) =>
                      w[s.key] > 0 && (
                        <div key={s.key} className={`ins-seg ${s.tone}`} style={{ flexGrow: w[s.key] }} />
                      )
                  )}
                </div>
              )}
            </div>
            <span className="ins-label">{i % step === 0 ? formatWeek(w.start) : ''}</span>
          </div>
        )
      })}
    </div>
  )
}

function Legend({ items }) {
  return (
    <div className="ins-legend">
      {items.map((item) => (
        <span key={item.label}>
          <i className={item.tone} />
          {item.label}
        </span>
      ))}
    </div>
  )
}

// One bar per category: the whole bar is all its listings, the dark part is the sold ones.
function CategoryBars({ categories }) {
  const max = Math.max(...categories.map((c) => c.total), 0)
  if (max === 0) return <p className="ins-empty">No listings yet.</p>

  return (
    <div>
      <Legend
        items={[
          { label: 'All listings', tone: 'soft' },
          { label: 'Sold', tone: 'primary' },
        ]}
      />
      {categories.map((c) => (
        <div className="ins-hrow" key={c.name}>
          <span className="ins-hname">{c.name}</span>
          <div className="ins-htrack">
            <div className="ins-hfill" style={{ width: `${(c.total / max) * 100}%` }}>
              <div
                className="ins-hsold"
                style={{ width: `${c.total ? (c.sold / c.total) * 100 : 0}%` }}
              />
            </div>
          </div>
          <span className="ins-hnum">
            {c.total}
            {c.sold > 0 && <small> ({c.sold} sold)</small>}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function Insights() {
  const toast = useToast()
  const [weeks, setWeeks] = useState(12)
  const [refresh, setRefresh] = useState(0)
  const [data, setData] = useState(null)

  // Loading: which request has finished (null = nothing has loaded yet)
  const [loadedKey, setLoadedKey] = useState(null)
  const [failed, setFailed] = useState(false)

  const url = `/admin/insights?weeks=${weeks}`
  const requestKey = `${url}#${refresh}`
  const loading = loadedKey !== requestKey
  const showSkeleton = loading && loadedKey === null // first load: nothing to show yet
  const refreshing = loading && loadedKey !== null // new range: keep the old charts, faded

  useEffect(() => {
    let cancelled = false
    api(url)
      .then((result) => {
        if (!cancelled) {
          setData(result)
          setFailed(false)
          setLoadedKey(requestKey)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setFailed(true)
          setLoadedKey(requestKey)
          toast.error(err.message || 'Failed to load the insights')
        }
      })
    return () => { cancelled = true }
  }, [url, requestKey, toast])

  const kpis = data?.kpis
  const newStudents = data ? data.weeks.reduce((sum, w) => sum + w.signups, 0) : 0

  return (
    <div>
      <div className="adm-page-head">
        <h1>Insights</h1>
        <select
          value={weeks}
          onChange={(e) => setWeeks(Number(e.target.value))}
          aria-label="How many weeks to show"
        >
          {RANGES.map((n) => (
            <option key={n} value={n}>Last {n} weeks</option>
          ))}
        </select>
      </div>

      {showSkeleton && <InsightsSkeleton />}

      {!showSkeleton && failed && (
        <p className="empty-state">
          Could not load the insights.{' '}
          <button type="button" onClick={() => setRefresh((current) => current + 1)}>Try again</button>
        </p>
      )}

      {!showSkeleton && !failed && data && (
        <div className={refreshing ? 'ins-body is-loading' : 'ins-body'} aria-busy={loading}>
          <div className="stats-grid">
            <StatCard
              label="Students"
              value={kpis.students}
              sub={`New in the last ${weeks} weeks: ${newStudents}`}
            />
            <StatCard
              label="Listings"
              value={kpis.listings}
              sub={`Sold: ${kpis.sold}${kpis.listings ? ` (${Math.round((kpis.sold / kpis.listings) * 100)}%)` : ''}`}
            />
            <StatCard
              label="Approval rate"
              value={kpis.approval_rate === null ? '-' : `${Math.round(kpis.approval_rate * 100)}%`}
              sub={`${kpis.approved} approved · ${kpis.rejected} rejected`}
            />
            <StatCard
              label="Average review wait"
              value={formatHours(kpis.avg_wait_hours)}
              sub={`Median: ${formatHours(kpis.median_wait_hours)} · Oldest waiting: ${formatHours(kpis.oldest_pending_hours)}`}
            />
          </div>

          <div className="ins-grid">
            <section className="ins-card">
              <h2>New students per week</h2>
              <p className="ins-sub">Accounts created each week.</p>
              <WeekChart
                weeks={data.weeks}
                series={[{ key: 'signups', label: 'Signups', tone: 'primary' }]}
                label="New students per week"
              />
            </section>

            <section className="ins-card">
              <h2>Listings posted per week</h2>
              <p className="ins-sub">Every listing posted, whether or not it was approved.</p>
              <WeekChart
                weeks={data.weeks}
                series={[{ key: 'listings', label: 'Listings', tone: 'teal' }]}
                label="Listings posted per week"
              />
            </section>

            <section className="ins-card">
              <h2>Review decisions per week</h2>
              <Legend
                items={[
                  { label: 'Approved', tone: 'approved' },
                  { label: 'Rejected', tone: 'rejected' },
                ]}
              />
              <WeekChart
                weeks={data.weeks}
                series={[
                  { key: 'approved', label: 'Approved', tone: 'approved' },
                  { key: 'rejected', label: 'Rejected', tone: 'rejected' },
                ]}
                label="Review decisions per week"
              />
            </section>

            <section className="ins-card">
              <h2>Listings by category</h2>
              <CategoryBars categories={data.categories} />
            </section>
          </div>

          <p className="hint">
            Weeks start on Monday. These charts use sign-ups, listings and review decisions.
            Logins, page views and searches are not recorded.
          </p>
        </div>
      )}
    </div>
  )
}

// Grey placeholders in the same layout while the numbers load.
function InsightsSkeleton() {
  return (
    <div aria-busy="true">
      <div className="stats-grid" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <div className="stat-card" key={i}>
            <span className="sk-line sk-label" />
            <span className="sk-line sk-value" />
            <span className="sk-line sk-sub" />
          </div>
        ))}
      </div>
      <div className="ins-grid" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <div className="ins-card" key={i}>
            <span className="sk-line ins-sk-title" />
            <span className="sk-line ins-sk-chart" />
          </div>
        ))}
      </div>
    </div>
  )
}
