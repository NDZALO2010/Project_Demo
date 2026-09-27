import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { getPrices } from '../services/prices'
import { api } from '../services/api'
import { useAuth } from './AuthContext'

// The farmer's typed prices are kept on the backend, per account.
// Prices are market data rather than farm data, so they survive "Reset farm data".

const PriceContext = createContext(null)

export function PriceProvider({ children }) {
  const { status } = useAuth()
  const [entries, setEntries] = useState(null)
  const [prices, setPrices] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (status !== 'in') {
      setEntries(null)
      setPrices(null)
      return
    }
    let cancelled = false
    api('/prices')
      .then((saved) => {
        if (cancelled) return
        setEntries(saved)
        setError(null)
      })
      .catch((err) => {
        if (cancelled) return
        console.warn('loading prices failed', err)
        setError(`Couldn't load your saved prices: ${err.message}`)
        // still show the starting estimates rather than nothing
        setEntries({})
      })
    return () => {
      cancelled = true
    }
  }, [status])

  // The provider is async so a live feed can slot in later without touching the screens
  useEffect(() => {
    if (entries === null) return
    let cancelled = false
    getPrices(entries)
      .then((next) => {
        if (!cancelled) setPrices(next)
      })
      .catch((err) => {
        if (cancelled) return
        console.warn('price lookup failed', err)
        setError(`Couldn't load prices: ${err.message}`)
      })
    return () => {
      cancelled = true
    }
  }, [entries])

  // pricePerTon of null (or blank) clears the price so the app asks for one
  const setPrice = useCallback(async (crop, pricePerTon) => {
    let previous
    setEntries((prev) => {
      previous = prev?.[crop]
      return { ...prev, [crop]: { pricePerTon, updatedAt: new Date().toISOString() } }
    })
    try {
      const saved = await api(`/prices/${crop}`, { method: 'PUT', body: { pricePerTon } })
      setEntries((prev) => ({ ...prev, [crop]: saved }))
      setError(null)
    } catch (err) {
      // put back what the server still has
      setEntries((prev) => {
        const next = { ...prev }
        if (previous) next[crop] = previous
        else delete next[crop]
        return next
      })
      setError(`Couldn't save the ${crop} price: ${err.message}`)
      throw err
    }
  }, [])

  const value = useMemo(() => ({ prices, error, setPrice }), [prices, error, setPrice])
  return <PriceContext.Provider value={value}>{children}</PriceContext.Provider>
}

export function usePrices() {
  const ctx = useContext(PriceContext)
  if (!ctx) throw new Error('usePrices must be used inside <PriceProvider>')
  return ctx
}
