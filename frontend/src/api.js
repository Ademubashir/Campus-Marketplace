// Small helper for talking to the Flask backend.
// Thanks to the Vite proxy, "/api/..." is forwarded to localhost:5000.

const TOKEN_KEY = 'token'
const ADMIN_TOKEN_KEY = 'admin_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY)
}

export function setAdminToken(token) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token)
}

export function clearAdminToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY)
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

  // Decide which token to send based on the path
  const token = path.startsWith('/admin') ? getAdminToken() : getToken()
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

  // A saved login stopped working (usually: expired). Tell the app so it can
  // log the user out cleanly and send them to the login page.
  if (res.status === 401) {
    if (path.startsWith('/admin')) {
      // Only clear the admin token if we actually sent one.
      if (token) {
        clearAdminToken()
        window.dispatchEvent(new Event('admin:expired'))
      }
    } else {
      clearToken()
      if (token) window.dispatchEvent(new Event('auth:expired'))
    }
  }

  if (!res.ok) {
    const err = new Error(data?.error || 'Something went wrong')
    err.code = data?.code
    err.status = res.status
    throw err
  }
  return data
}