import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import Dropdown from '../components/Dropdown'

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

  const [listing, setListing] = useState(null)
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState(null)
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

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
      await api(`/listings/${id}`, { method: 'PATCH', body: form })

      // 2. Upload any new photos.
      if (files.length > 0) {
        const data = new FormData()
        files.forEach((f) => data.append('photos', f))
        await api(`/listings/${id}/photos`, { method: 'POST', body: data })
      }

      navigate(`/listings/${id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth">
      <h1>Edit listing</h1>

      {listing.photos.length > 0 && (
        <div className="thumbnails">
          {listing.photos.map((src, i) => (
            <div key={src} className="my-thumb">
              <img src={src} alt={`${listing.title} photo ${i + 1}`} />
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
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleFiles}
            />
          </label>
        ) : (
          <p>This listing already has {MAX_PHOTOS} photos.</p>
        )}
        {files.length > 0 && <p>{files.length} new photo(s) selected</p>}

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={busy}>
          {busy ? 'Saving...' : 'Save changes'}
        </button>
        <Link to="/my-listings">Cancel</Link>
      </form>
    </div>
  )
}