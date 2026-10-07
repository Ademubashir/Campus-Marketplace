import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

const MAX_PHOTOS = 5
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB, same limits as the backend

export default function CreateListing() {
  const navigate = useNavigate()
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

        <label>
          Category
          <select name="category_id" value={form.category_id} onChange={update} required>
            <option value="">Choose a category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Condition
          <select name="condition" value={form.condition} onChange={update}>
            <option value="">Not specified</option>
            <option value="new">New</option>
            <option value="used">Used</option>
          </select>
        </label>

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