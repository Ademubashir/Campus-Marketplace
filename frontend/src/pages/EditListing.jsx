import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import Dropdown from '../components/Dropdown'
import { useToast } from '../ToastContext'

const MAX_PHOTOS = 5
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB, same limits as the backend

const CONDITION_OPTIONS = [
  { value: '', label: 'Not specified' },
  { value: 'new', label: 'New' },
  { value: 'used', label: 'Used' },
]

export default function EditListing() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  const [listing, setListing] = useState(null)
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState(null)
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(null) // id of the photo being removed
  const fileInput = useRef(null)

  // Load the listing and the categories together, then fill in the form.
  useEffect(() => {
    let cancelled = false
    Promise.all([api(`/listings/${id}`), api('/categories')])
      .then(([data, cats]) => {
        if (cancelled) return
        setListing(data)
        setCategories(cats)
        // The API gives the category NAME, so find its id for the dropdown.
        const match = cats.find((c) => c.name === data.category)
        setForm({
          title: data.title,
          price: String(data.price),
          category_id: match ? String(match.id) : '',
          condition: data.condition || '',
          description: data.description || '',
        })
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message === 'Not found' ? 'Listing not found' : err.message)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) return <p>Loading...</p>
  if (!listing) return <p className="error">{error || 'Listing not found'}</p>

  // Only the seller may edit. (The backend enforces this too.)
  if (user?.id !== listing.seller.id) {
    return (
      <div>
        <p className="error">You can only edit your own listings.</p>
        <Link to={`/listings/${id}`}>Back to the listing</Link>
      </div>
    )
  }

  const slotsLeft = MAX_PHOTOS - listing.photos.length

  function update(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  function handleFiles(e) {
    const chosen = Array.from(e.target.files)
    if (chosen.length > slotsLeft) {
      setError(`You can add ${slotsLeft} more photo(s)`)
      e.target.value = ''
      setFiles([])
      return
    }
    if (chosen.some((f) => f.size > MAX_BYTES)) {
      setError('Each photo must be 5 MB or smaller')
      e.target.value = ''
      setFiles([])
      return
    }
    setError('')
    setFiles(chosen)
  }

  // Take one photo out of the new ones before saving (nothing is uploaded yet).
  function removeSelected(index) {
    setFiles((current) => current.filter((_, i) => i !== index))
    if (fileInput.current) fileInput.current.value = ''
  }

  // Delete one of the listing's saved photos.
  async function removePhoto(photo) {
    if (photoBusy !== null) return
    if (!window.confirm('Remove this photo from your listing?')) return
    setError('')
    setPhotoBusy(photo.id)
    try {
      const data = await api(`/listings/${id}/photos/${photo.id}`, { method: 'DELETE' })
      const backInReview = data.review_status === 'pending' && listing.review_status !== 'pending'
      setListing((current) => ({
        ...current,
        photos: current.photos.filter((url) => url !== photo.url),
        photo_items: current.photo_items.filter((p) => p.id !== photo.id),
        review_status: data.review_status ?? current.review_status,
        rejection_reason: backInReview ? null : current.rejection_reason,
      }))
      toast.success(backInReview ? 'Photo removed. Your listing is back in review.' : 'Photo removed')
    } catch (err) {
      setError(err.message)
    } finally {
      setPhotoBusy(null)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    // The custom dropdown has no built-in "required" check, so check here.
    if (!form.category_id) {
      setError('Choose a category')
      return
    }
    setBusy(true)
    try {
      // 1. Save the text fields.
      const saved = await api(`/listings/${id}`, { method: 'PATCH', body: form })
      let reviewStatus = saved.review_status

      // 2. Upload any new photos.
      if (files.length > 0) {
        const data = new FormData()
        files.forEach((f) => data.append('photos', f))
        const withPhotos = await api(`/listings/${id}/photos`, { method: 'POST', body: data })
        reviewStatus = withPhotos.review_status
      }

      // Some changes send the listing back for another review.
      if (reviewStatus === 'pending' && listing.review_status !== 'pending') {
        toast.success('Changes saved. Your listing will go back online once a moderator approves it.')
        navigate('/my-listings')
      } else {
        toast.success('Changes saved')
        navigate(`/listings/${id}`)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth">
      <h1>Edit listing</h1>

      {listing.review_status === 'approved' && (
        <p className="review-banner info">
          Changing the title, description, category or photos sends this listing back for review.
          It stays hidden until a moderator approves it again. Changing the price or the condition
          does not.
        </p>
      )}
      {listing.review_status === 'pending' && (
        <p className="review-banner pending">This listing is waiting for review.</p>
      )}
      {listing.review_status === 'rejected' && (
        <p className="review-banner rejected">
          <strong>Rejected:</strong> {listing.rejection_reason}. Save your changes to send it for
          review again.
        </p>
      )}

      {listing.photo_items.length > 0 && (
        <div className="thumbnails">
          {listing.photo_items.map((photo, i) => (
            <div key={photo.id} className="my-thumb edit-thumb">
              <img src={photo.url} alt={`${listing.title} photo ${i + 1}`} />
              <button
                type="button"
                className="thumb-remove"
                onClick={() => removePhoto(photo)}
                disabled={photoBusy !== null}
                aria-label={`Remove photo ${i + 1}`}
                title="Remove this photo"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <label>
          Title
          <input name="title" value={form.title} onChange={update} maxLength={100} required />
        </label>

        <label>
          Price (₦)
          <input
            type="number"
            name="price"
            value={form.price}
            onChange={update}
            min="1"
            step="any"
            required
          />
        </label>

        <div className="field">
          <span className="field-label">Category</span>
          <Dropdown
            label="Category"
            placeholder="Choose a category"
            value={form.category_id}
            onChange={(val) => setForm({ ...form, category_id: String(val) })}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />
        </div>

        <div className="field">
          <span className="field-label">Condition</span>
          <Dropdown
            label="Condition"
            value={form.condition}
            onChange={(val) => setForm({ ...form, condition: val })}
            options={CONDITION_OPTIONS}
          />
        </div>

        <label>
          Description
          <textarea
            name="description"
            value={form.description}
            onChange={update}
            rows={4}
            maxLength={2000}
          />
        </label>

        {slotsLeft > 0 ? (
          <label>
            Add photos ({slotsLeft} more allowed)
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleFiles}
            />
          </label>
        ) : (
          <p>This listing already has {MAX_PHOTOS} photos.</p>
        )}
        {files.length > 0 && (
          <ul className="selected-files">
            {files.map((file, i) => (
              <li key={`${file.name}-${i}`}>
                <span>{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeSelected(i)}
                  aria-label={`Remove ${file.name}`}
                >
                  &times;
                </button>
              </li>
            ))}
          </ul>
        )}

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={busy}>
          {busy ? 'Saving...' : 'Save changes'}
        </button>
        <Link to="/my-listings">Cancel</Link>
      </form>
    </div>
  )
}