// Skeleton placeholders for the admin pages: grey shimmering shapes that
// hold the same space as the real content, so nothing jumps when data arrives.
// The shimmer styles (.sk-line, shimmer) live in index.css.

const WIDTHS = ['w-m', 'w-l', 'w-s', 'w-m', 'w-l']

// Skeleton rows for an admin table. `columns` are the same labels the real
// rows use for data-label, so the phone card layout shows them too.
export function TableSkeleton({ columns, rows = 6 }) {
  return Array.from({ length: rows }, (_, r) => (
    <tr key={r} className="adm-sk-row" aria-hidden="true">
      {columns.map((label, c) => {
        let shape = `sk-line ${WIDTHS[(r + c) % WIDTHS.length]}`
        if (label === 'Thumbnail') shape = 'sk-line sk-thumb'
        if (label === 'Actions') shape = 'sk-line sk-action'
        return (
          <td key={label} data-label={label}>
            <span className={shape} />
          </td>
        )
      })}
    </tr>
  ))
}

// Shown while the saved admin login is being checked (instead of a blank page).
export function AdminShellSkeleton() {
  return (
    <div aria-busy="true">
      <div className="adm-topbar">
        <span className="sk-line adm-sk-menu" aria-hidden="true" />
        <span className="adm-brand">UniMart Admin</span>
      </div>

      <div className="adm-wrapper sidebar-open">
        <div className="adm-sk-sidebar" aria-hidden="true">
          {Array.from({ length: 7 }, (_, i) => (
            <span key={i} className="sk-line" />
          ))}
        </div>

        <main className="adm-container" aria-hidden="true">
          <span className="sk-line adm-sk-title" />
          <span className="sk-line adm-sk-block" />
          <span className="sk-line adm-sk-block" />
          <span className="sk-line adm-sk-block" />
        </main>
      </div>
    </div>
  )
}
