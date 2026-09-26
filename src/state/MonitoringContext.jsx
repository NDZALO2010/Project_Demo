import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useFarm } from './FarmContext'
import { usePrices } from './PriceContext'
import { fetchWeather, sampleWeather, summarizeWeather } from '../services/weather'
import { simulateSatellite } from '../services/satellite'
import { detectRisk, rankRisks } from '../lib/engine'
import { assessAction } from '../lib/finance'
import { costLinesFor } from '../lib/actionCosts'
import { priceForField } from '../services/prices'

// Fields a few km apart share the same weather cell, so round the coords
// and only call the API once per ~10 km square.
function weatherKey(field) {
  return `${Number(field.lat).toFixed(1)},${Number(field.lon).toFixed(1)}`
}

const MonitoringContext = createContext(null)

export function MonitoringProvider({ children }) {
  const { fields, actions, costOverrides, settings } = useFarm()
  const { prices } = usePrices()
  const [weather, setWeather] = useState({})
  const [loading, setLoading] = useState(false)
  const [syncedAt, setSyncedAt] = useState(null)
  const inFlight = useRef(new Set())

  const fetchMissing = useCallback(
    async (force = false) => {
      const keys = [...new Set(fields.map(weatherKey))].filter(
        (k) => (force || !weather[k]) && !inFlight.current.has(k),
      )
      if (!keys.length) return

      keys.forEach((k) => inFlight.current.add(k))
      setLoading(true)

      const results = await Promise.all(
        keys.map(async (key) => {
          const [lat, lon] = key.split(',')
          try {
            return [key, await fetchWeather(lat, lon)]
          } catch (err) {
            console.warn('weather fetch failed, using sample data', err)
            return [key, sampleWeather()]
          }
        }),
      )

      keys.forEach((k) => inFlight.current.delete(k))
      setWeather((prev) => ({ ...prev, ...Object.fromEntries(results) }))
      setSyncedAt(new Date().toISOString())
      setLoading(false)
    },
    [fields, weather],
  )

  useEffect(() => {
    fetchMissing()
  }, [fetchMissing])

  const refresh = useCallback(() => fetchMissing(true), [fetchMissing])

  // MONITOR -> DETECT -> DECIDE for every field, recomputed whenever data or fields change
  const analysis = useMemo(() => {
    const byField = {}
    const risks = []

    for (const field of fields) {
      const raw = weather[weatherKey(field)]
      if (!raw) {
        byField[field.id] = { field, pending: true }
        continue
      }

      const summary = summarizeWeather(raw)
      const satellite = simulateSatellite(field, summary)
      const risk = detectRisk(field, summary, satellite, priceForField(field, prices))

      if (risk) {
        risk.action = actions[risk.key] ?? null

        // DECIDE: what acting would cost and what it would likely save
        const overrides = costOverrides[risk.key]
        const lines = costLinesFor(risk.type, overrides)
        const customRecovery = overrides != null && 'recoveryPct' in overrides
        const recoveryPct = overrides?.recoveryPct ?? settings.recoveryPct
        risk.plan = {
          lines,
          customRecovery,
          recoveryInput: customRecovery ? overrides.recoveryPct : recoveryPct,
          ...assessAction({ exposure: risk.revenueExposure, lines, affectedHa: risk.affectedHa, recoveryPct }),
        }
        risks.push(risk)
      }
      byField[field.id] = { field, weather: raw, summary, satellite, risk }
    }

    const sources = new Set(Object.values(weather).map((w) => w.source))
    return {
      byField,
      risks: rankRisks(risks),
      weatherSource: sources.size > 1 ? 'mixed' : ([...sources][0] ?? null),
    }
  }, [fields, weather, actions, costOverrides, settings, prices])

  // wait for prices too, so the numbers don't flash "Add a price" on load
  const ready = prices !== null && fields.length > 0 && fields.every((f) => weather[weatherKey(f)])

  const value = useMemo(
    () => ({ ...analysis, loading, ready, syncedAt, refresh }),
    [analysis, loading, ready, syncedAt, refresh],
  )

  return <MonitoringContext.Provider value={value}>{children}</MonitoringContext.Provider>
}

export function useMonitoring() {
  const ctx = useContext(MonitoringContext)
  if (!ctx) throw new Error('useMonitoring must be used inside <MonitoringProvider>')
  return ctx
}
