import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { demoFarm, demoFields } from '../data/demoFarm'
import { STARTING_PRICES } from '../services/prices'
import { DEFAULT_RECOVERY_PCT } from '../lib/finance'

// No backend yet, so the farm lives in localStorage for the prototype
const STORAGE_KEY = 'agrinexus.farm.v1'

// costOverrides: the farmer's edits to action costs, keyed like actions ("<fieldId>:<type>")
const empty = { farm: null, fields: [], actions: {}, costOverrides: {}, settings: { recoveryPct: DEFAULT_RECOVERY_PCT } }

/*
  Fields used to carry their own cropPrice. Prices now come from the price service,
  so a price that just matches the old pre-filled default is dropped (the field follows
  the market price), and anything the farmer typed themselves is kept as a contract price.
*/
function migrateField(field) {
  if (!('cropPrice' in field)) return field
  const { cropPrice, ...rest } = field
  const typedByFarmer = Number(cropPrice) > 0 && Number(cropPrice) !== STARTING_PRICES[field.crop]
  return typedByFarmer && rest.contractPrice == null ? { ...rest, contractPrice: Number(cropPrice) } : rest
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return empty
    const saved = JSON.parse(raw)
    return {
      ...empty,
      ...saved,
      fields: (saved.fields ?? []).map(migrateField),
      settings: { ...empty.settings, ...saved.settings },
    }
  } catch {
    return empty
  }
}

const FarmContext = createContext(null)

export function FarmProvider({ children }) {
  const [state, setState] = useState(load)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // private mode or storage full, the app still works for this session
    }
  }, [state])

  const saveFarm = useCallback((farm) => setState((s) => ({ ...s, farm })), [])

  const addField = useCallback((field) => {
    const id = field.id ?? Date.now().toString(36)
    setState((s) => ({ ...s, fields: [...s.fields, { ...field, id }] }))
    return id
  }, [])

  const updateField = useCallback((id, changes) => {
    setState((s) => ({ ...s, fields: s.fields.map((f) => (f.id === id ? { ...f, ...changes } : f)) }))
  }, [])

  const removeField = useCallback((id) => {
    setState((s) => ({ ...s, fields: s.fields.filter((f) => f.id !== id) }))
  }, [])

  // status: 'inspecting' | 'done' | undefined (open)
  const setRiskStatus = useCallback((key, status) => {
    setState((s) => {
      const actions = { ...s.actions }
      if (status) actions[key] = { status, at: new Date().toISOString() }
      else delete actions[key]
      return { ...s, actions }
    })
  }, [])

  // changes: { rate?, qty?, enabled? } for one cost line of one problem
  const updateCostLine = useCallback((key, lineId, changes) => {
    setState((s) => {
      const current = s.costOverrides[key] ?? {}
      const lines = { ...current.lines, [lineId]: { ...current.lines?.[lineId], ...changes } }
      return { ...s, costOverrides: { ...s.costOverrides, [key]: { ...current, lines } } }
    })
  }, [])

  // pct of undefined goes back to the farm-wide default; null is a box the farmer is still typing in
  const setRiskRecovery = useCallback((key, pct) => {
    setState((s) => {
      const current = { ...s.costOverrides[key] }
      if (pct === undefined) delete current.recoveryPct
      else current.recoveryPct = pct
      return { ...s, costOverrides: { ...s.costOverrides, [key]: current } }
    })
  }, [])

  const resetCosts = useCallback((key) => {
    setState((s) => {
      const costOverrides = { ...s.costOverrides }
      delete costOverrides[key]
      return { ...s, costOverrides }
    })
  }, [])

  const updateSettings = useCallback((changes) => {
    setState((s) => ({ ...s, settings: { ...s.settings, ...changes } }))
  }, [])

  const loadDemo = useCallback(() => setState({ ...empty, farm: demoFarm, fields: demoFields }), [])
  const resetFarm = useCallback(() => setState(empty), [])

  const value = useMemo(
    () => ({
      ...state,
      saveFarm,
      addField,
      updateField,
      removeField,
      setRiskStatus,
      updateCostLine,
      setRiskRecovery,
      resetCosts,
      updateSettings,
      loadDemo,
      resetFarm,
    }),
    [state, saveFarm, addField, updateField, removeField, setRiskStatus, updateCostLine, setRiskRecovery, resetCosts, updateSettings, loadDemo, resetFarm],
  )

  return <FarmContext.Provider value={value}>{children}</FarmContext.Provider>
}

export function useFarm() {
  const ctx = useContext(FarmContext)
  if (!ctx) throw new Error('useFarm must be used inside <FarmProvider>')
  return ctx
}
