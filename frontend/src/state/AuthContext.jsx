import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, getToken, setToken, setUnauthorizedHandler } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  // 'checking' while a saved token is verified on load, then 'in' or 'out'
  const [status, setStatus] = useState(() => (getToken() ? 'checking' : 'out'))

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
    setStatus('out')
  }, [])

  // an expired or revoked token anywhere in the app signs the farmer out
  useEffect(() => setUnauthorizedHandler(logout), [logout])

  useEffect(() => {
    if (status !== 'checking') return
    let cancelled = false
    api('/auth/me')
      .then((me) => {
        if (cancelled) return
        setUser(me)
        setStatus('in')
      })
      .catch(() => {
        if (!cancelled) logout()
      })
    return () => {
      cancelled = true
    }
  }, [status, logout])

  const login = useCallback(async ({ email, password, remember }) => {
    const res = await api('/auth/login', { method: 'POST', body: { email, password, remember }, auth: false })
    setToken(res.accessToken, remember)
    setUser(res.user)
    setStatus('in')
    return res.user
  }, [])

  const register = useCallback(
    (details) => api('/auth/register', { method: 'POST', body: details, auth: false }),
    [],
  )

  const value = useMemo(() => ({ user, status, login, register, logout }), [user, status, login, register, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
