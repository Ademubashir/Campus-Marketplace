// Small helper for talking to the Flask backend.
// Thanks to the Vite proxy, "/api/..." is forwarded to localhost:5000.

const TOKEN_KEY = 'token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export async function api(path, { method = 'GET', body } = {}) {
  const headers = {}
  const options = { method, headers }

  if (body instanceof FormData) {
    // For photo uploads. The browser sets the multipart header itself.
    options.body = body
  } else if (body) {
    headers['Content-Type'] = 'application/json'
    options.body = JSON.stringify(body)
  }

  const token = getToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`/api/v1${path}`, options)

  let data = null
  try {
    data = await res.json()
  } catch {
    // some responses have no body
  }

  if (res.status === 401) {
    clearToken() // the token is missing, wrong, or expired
  }

  if (!res.ok) {
    throw new Error(data?.error || 'Something went wrong')
  }
  return data
}