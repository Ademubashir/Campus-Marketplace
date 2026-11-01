import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { api } from '../api'
import ConfirmDialog from './ConfirmDialog'
import { useToast } from '../ToastContext'
import { formatDateTime, formatPrice } from '../utils'

// Listings that students have posted and that nobody can see until a moderator
// approves them. Oldest first, so nobody waits longer than they have to.
export default function Review() {
  const toast = useToast()
  const { refreshPending } = useOutletContext() || {}

  const [items, setItems] = useState([])
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [refresh, setRefresh] = useState(0)
  const [rejectId, setRejectId] = useState(null)
  const [busyId, setBusyId] = useState(null)

  // Loading: which request has finished (null = nothing has loaded yet)
  const [loadedKey, setLoadedKey] = useState(null)
  const [failed, setFailed] = useState(false)

  const url = `/admin/listings/review?page=${page}&limit=10`
  const requestKey = `${url}#${refresh}`
  const loading = loadedKey !== requestKey
  const showSkeleton = loading && loadedKey === null // first load: no cards yet
  const refreshing = loading && loadedKey !== null // after a decision: keep old cards, faded

  useEffect(() => {
    let cancelled = false
    api(url)
      .then((data) => {
        if (cancelled) return
        // The last card on a later page was just decided: step back a page.
        if (data.items.length === 0 && page > 1) {
          setPage(page - 1)
          return
        }
        setItems(data.items)
        setPages(data.pages)
        setTotal(data.total)
        setFailed(false)
        setLoadedKey(requestKey)
      })
      .catch((e) => {
        if (!cancelled) {
          setFailed(true)
          setLoadedKey(requestKey)
          toast.error(e.message || 'Failed to load the review queue')
        }
      })
    return () => { cancelled = true }
  }, [url, requestKey, page, toast])

  function reload() {
    setRefresh((current) => current + 1)
    refreshPending?.()
  }

  async function approve(item) {
    if (busyId !== null) return
    setBusyId(item.id)
    try {
      await api(`/admin/listings/${item.id}/approve`, { method: 'PATCH' })
      toast.success(`Approved "${item.title}"`)
    } catch (e) {
      toast.error(e.message || 'Failed to approve the listing')
    } finally {
      setBusyId(null)
      reload() // also covers "someone else already reviewed it"
    }
  }

  async function reject(id, reason) {
    try {
      await api(`/admin/listings/${id}/reject`, { method: 'PATCH', body: { reason } })
      toast.success('Listing rejected')
      setRejectId(null)
    } catch (e) {
      toast.error(e.message || 'Failed to reject the listing')
    } finally {
      reload()
    }
  }

  return (
    <div>
      <h1>Review</h1>
      <p className="hint">
        Listings stay hidden from everyone until you approve them.
        {!loading && !failed && total > 0 && ` ${total} waiting.`}
      </p>

      {showSkeleton && <ReviewSkeleton />}

      {!showSkeleton && failed && (
        <p className="empty-state">
          Could not load the review queue.{' '}
          <button type="button" onClick={() => setRefresh((current) => current + 1)}>Try again</button>
        </p>
      )}

      {!showSkeleton && !failed && items.length === 0 && (
        <p className="empty-state">Nothing is waiting for review.</p>
      )}

      {!showSkeleton && !failed && items.length > 0 && (
        <div className={`review-list ${refreshing ? 'is-loading' : ''}`} aria-busy={loading}>
          {items.map((item) => (
            <ReviewCard
              key={item.id}
              item={item}
              busy={busyId === item.id}
              onApprove={() => approve(item)}
              onReject={() => setRejectId(item.id)}
            />
          ))}
        </div>
      )}

      {pages > 1 && (
        <nav className="pagination">
          <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Prev</button>
          <span>Page {page} of {pages} ({total} waiting)</span>
          <button type="button" disabled={page >= pages} onClick={() => setPage((current) => current + 1)}>Next</button>
        </nav>
      )}

      <ConfirmDialog
        title="Reject listing"
        danger
        message="The student will see your reason and can edit the listing and send it for review again."
        reason="required"
        open={rejectId !== null}
        confirmLabel="Reject"
        cancelLabel="Cancel"
        onConfirm={(reason) => reject(rejectId, reason)}
        onCancel={() => setRejectId(null)}
      />
    </div>
  )
}

function ReviewCard({ item, busy, onApprove, onReject }) {
  const [photoIdx, setPhotoIdx] = useState(0)
  const photo = item.photos[photoIdx]

  return (
    <article className="review-card">
      <div className="review-photos">
        {photo ? (
          <a href={photo} target="_blank" rel="noopener noreferrer" title="Open the full-size photo">
            <img className="review-main" src={photo} alt={item.title} />
          </a>
        ) : (
          <div className="review-main review-nophoto">No photos</div>
        )}

        {item.photos.length > 1 && (
          <div className="review-thumbs">
            {item.photos.map((src, i) => (
              <button
                type="button"
                key={src}
                className={`review-thumb ${i === photoIdx ? 'active' : ''}`}
                onClick={() => setPhotoIdx(i)}
                aria-label={`Show photo ${i + 1}`}
              >
                <img src={src} alt="" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="review-info">
        <div className="review-head">
          <h2>{item.title}</h2>
          {item.resubmitted && <span className="adm-chip pending">Edited</span>}
        </div>
        <p className="review-price">{formatPrice(item.price)}</p>
        <p className="review-meta">
          {item.category || 'No category'}
          {item.condition ? ` · ${item.condition}` : ''}
        </p>
        <p className="review-desc">{item.description || 'No description.'}</p>
        <p className="review-meta">
          Seller: {item.seller.full_name}
          {item.seller.university ? ` (${item.seller.university})` : ''}
          {item.seller.is_suspended ? ' · suspended' : ''}
        </p>
        <p className="review-meta">Waiting since {formatDateTime(item.submitted_at)}</p>

        <div className="review-actions">
          <button type="button" className="btn btn-primary" onClick={onApprove} disabled={busy}>
            {busy ? 'Approving...' : 'Approve'}
          </button>
          <button type="button" className="btn btn-danger" onClick={onReject} disabled={busy}>
            Reject
          </button>
        </div>
      </div>
    </article>
  )
}

// Grey placeholders shaped like the cards while the queue loads.
function ReviewSkeleton() {
  return (
    <div className="review-list" aria-busy="true">
      {[0, 1, 2].map((i) => (
        <div className="review-card" key={i} aria-hidden="true">
          <span className="sk-line sk-review-img" />
          <div>
            <span className="sk-line w-m" />
            <span className="sk-line w-s" />
            <span className="sk-line w-l" />
            <span className="sk-line w-l" />
            <span className="sk-line w-m" />
          </div>
        </div>
      ))}
    </div>
  )
}
