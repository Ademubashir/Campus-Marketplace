import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import Dropdown from '../components/Dropdown'
import { useToast } from '../ToastContext'

const MAX_PHOTOS = 5
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB, same limits as the backend

const CONDITION_OPTIONS = [
  { value: '', label: 'Not specified' },
  { value: 'new', label: 'New' },
  { value: 'used', label: 'Used' },
]

export default function CreateListing() {
  const navigate = useNavigate()
  const toast = useToast()
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState({
    title: '',
    price: '',
    category_id: '',
    condition: '',
    description: '',
  })
  const [files, setFiles] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Load the category dropdown once.
  useEffect(() => {
    api('/categories')
      .then(setCategories)
      .catch(() => setError('Could not load categories'))
  }, [])

  function update(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  // Check photos in the browser first, so mistakes show up instantly.
  function handleFiles(e) {
    const chosen = Array.from(e.target.files)
    if (chosen.length > MAX_PHOTOS) {
      setError(`Choose at most ${MAX_PHOTOS} photos`)
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
      // FormData is how a browser sends text fields and files together.
      const data = new FormData()
      data.append('title', form.title)
      data.append('price', form.price)
      data.append('category_id', form.category_id)
      if (form.condition) data.append('condition', form.condition)
      if (form.description) data.append('description', form.description)
      files.forEach((f) => data.append('photos', f))

      const listing = await api('/listings', { method: 'POST', body: data })
      toast.success('Listing posted')
      navigate(`/listings/${listing.id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth">
      <h1>Sell an item</h1>
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

        <label>
          Photos (up to 5, JPEG, PNG or WebP)
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleFiles}
          />
        </label>
        {files.length > 0 && <p>{files.length} photo(s) selected</p>}

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={busy}>
          {busy ? 'Posting...' : 'Post listing'}
        </button>
      </form>
    </div>
  )
}