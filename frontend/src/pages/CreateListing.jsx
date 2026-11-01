import { useEffect, useRef, useState } from 'react'
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
  const fileInput = useRef(null)
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

  // Take one photo out of the selection before posting.
  function removeSelected(index) {
    setFiles((current) => current.filter((_, i) => i !== index))
    if (fileInput.current) fileInput.current.value = ''
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

      await api('/listings', { method: 'POST', body: data })
      toast.success('Submitted for review. It will go online once a moderator approves it.')
      navigate('/my-listings')
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
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleFiles}
          />
        </label>
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

        <p className="hint">
          A moderator checks every new listing before it appears on UniMart. We'll email you
          when it's decided.
        </p>

        <button type="submit" disabled={busy}>
          {busy ? 'Posting...' : 'Post listing'}
        </button>
      </form>
    </div>
  )
}