import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { getPrices } from '../services/prices'

// Prices are market data rather than farm data, so they live under their own key
// and survive "Reset farm data".
const STORAGE_KEY = 'agrinexus.prices.v1'

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

const PriceContext = createContext(null)

export function PriceProvider({ children }) {
  const [entries, setEntries] = useState(load)
  const [prices, setPrices] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
    } catch {
      // private mode or storage full, the prices still hold for this session
    }
  }, [entries])

  // The provider is async so a live feed can slot in later without touching the screens
  useEffect(() => {
    let cancelled = false
    getPrices(entries)
      .then((next) => {
        if (cancelled) return
        setPrices(next)
        setError(null)
      })
      .catch((err) => {
        if (cancelled) return
        console.warn('price lookup failed', err)
        setError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [entries])

  // pricePerTon of null (or blank) clears the price so the app asks for one
  const setPrice = useCallback((crop, pricePerTon) => {
    setEntries((prev) => ({ ...prev, [crop]: { pricePerTon, updatedAt: new Date().toISOString() } }))
  }, [])

  const value = useMemo(() => ({ prices, error, setPrice }), [prices, error, setPrice])
  return <PriceContext.Provider value={value}>{children}</PriceContext.Provider>
}

export function usePrices() {
  const ctx = useContext(PriceContext)
  if (!ctx) throw new Error('usePrices must be used inside <PriceProvider>')
  return ctx
}
