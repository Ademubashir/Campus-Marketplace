import { useEffect, useState } from 'react'
import { api } from '../api'

export default function Browse() {
  const [listings, setListings] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    api('/listings')
      .then((data) => setListings(data.items))
      .catch((err) => setError(err.message))
  }, [])

  return (
    <div>
      <h1>Browse</h1>
      {error && <p>Error: {error}</p>}
      <ul>
        {listings.map((l) => (
          <li key={l.id}>
            {l.title}, ₦{l.price}
          </li>
        ))}
      </ul>
    </div>
  )
}