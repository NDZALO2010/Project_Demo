/*
  The one place the app talks to the AgriNexus backend (backend/, FastAPI).
  In development Vite forwards /api to it (see vite.config.js). Set VITE_API_URL
  to point a build at a backend on another host.
*/
const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '') + '/api'

const TOKEN_KEY = 'agrinexus.token.v1'

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message)
    this.status = status
    this.details = details
  }
}

// "Keep me signed in" keeps the token in localStorage; otherwise it goes when the tab closes
export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token, remember) {
  try {
    localStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(TOKEN_KEY)
    if (token) (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token)
  } catch {
    // storage blocked: the login only lasts until the page reloads
  }
}

let onUnauthorized = () => {}
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn
}

// FastAPI sends { detail: "message" } or, for validation errors, { detail: [{ msg, loc }] }
function messageFrom(body, status) {
  const detail = body?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg.replace(/^Value error, /, '')
  return status >= 500 ? 'The server had a problem. Try again in a moment.' : `Request failed (${status})`
}

export async function api(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const token = auth ? getToken() : null
  if (token) headers.Authorization = `Bearer ${token}`

  let res
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, "Can't reach AgriNexus. Check your connection and try again.")
  }

  if (res.status === 204) return null
  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized()
    throw new ApiError(res.status, messageFrom(data, res.status), data?.detail)
  }
  return data
}
