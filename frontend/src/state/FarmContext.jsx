import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../services/api'
import { useAuth } from './AuthContext'
import { DEFAULT_RECOVERY_PCT } from '../lib/finance'

// costOverrides: the farmer's edits to action costs, keyed like actions ("<fieldId>:<type>")
const empty = { farm: null, fields: [], actions: {}, costOverrides: {}, settings: { recoveryPct: DEFAULT_RECOVERY_PCT } }

// Cost boxes save on every keystroke, so wait for a pause before sending
const COST_SAVE_DELAY = 400

const FarmContext = createContext(null)

/*
  The farm lives on the backend. Changes show straight away and are saved in the
  background; if a save fails we say so and reload what the server has.
*/
export function FarmProvider({ children }) {
  const { status } = useAuth()
  const [state, setState] = useState(empty)
  const [loaded, setLoaded] = useState(false)
  const [syncError, setSyncError] = useState(null)

  // Mutations build on the latest state even before React re-renders
  const stateRef = useRef(state)
  const commit = useCallback((next) => {
    stateRef.current = next
    setState(next)
  }, [])

  const reload = useCallback(async () => {
    const snapshot = await api('/farm')
    commit({ ...empty, ...snapshot })
    setLoaded(true)
  }, [commit])

  useEffect(() => {
    if (status === 'in') {
      reload().catch((err) => setSyncError(err.message))
    } else {
      commit(empty)
      setLoaded(false)
      setSyncError(null)
    }
  }, [status, reload, commit])

  // Send a change; on failure, show why and resync with the server
  const save = useCallback(
    async (request) => {
      try {
        const result = await request()
        setSyncError(null)
        return result
      } catch (err) {
        console.warn('save failed', err)
        setSyncError(err.message)
        reload().catch(() => {})
        throw err
      }
    },
    [reload],
  )
  const quietly = (promise) => promise.catch(() => {})

  const saveFarm = useCallback(
    (farm) => {
      commit({ ...stateRef.current, farm })
      return save(() => api('/farm', { method: 'PUT', body: farm }))
    },
    [commit, save],
  )

  // Waits for the server, which hands out the id the new field's page needs
  const addField = useCallback(
    async (field) => {
      const created = await save(() => api('/fields', { method: 'POST', body: field }))
      commit({ ...stateRef.current, fields: [...stateRef.current.fields, created] })
      return created.id
    },
    [commit, save],
  )

  const updateField = useCallback(
    (id, changes) => {
      const s = stateRef.current
      commit({ ...s, fields: s.fields.map((f) => (f.id === id ? { ...f, ...changes } : f)) })
      quietly(save(() => api(`/fields/${id}`, { method: 'PATCH', body: changes })))
    },
    [commit, save],
  )

  const removeField = useCallback(
    (id) => {
      const s = stateRef.current
      const ofField = (key) => key.startsWith(`${id}:`)
      const without = (obj) => Object.fromEntries(Object.entries(obj).filter(([k]) => !ofField(k)))
      commit({
        ...s,
        fields: s.fields.filter((f) => f.id !== id),
        actions: without(s.actions),
        costOverrides: without(s.costOverrides),
      })
      quietly(save(() => api(`/fields/${id}`, { method: 'DELETE' })))
    },
    [commit, save],
  )

  // status: 'inspecting' | 'done' | undefined (open)
  const setRiskStatus = useCallback(
    (key, status) => {
      const s = stateRef.current
      const actions = { ...s.actions }
      if (status) actions[key] = { status, at: new Date().toISOString() }
      else delete actions[key]
      commit({ ...s, actions })

      const path = `/actions/${encodeURIComponent(key)}`
      quietly(save(() => (status ? api(path, { method: 'PUT', body: { status } }) : api(path, { method: 'DELETE' }))))
    },
    [commit, save],
  )

  // One pending save per problem, always sending its latest edits
  const costTimers = useRef({})
  const saveCostOverride = useCallback(
    (key) => {
      clearTimeout(costTimers.current[key])
      costTimers.current[key] = setTimeout(() => {
        delete costTimers.current[key]
        const current = stateRef.current.costOverrides[key]
        const path = `/cost-overrides/${encodeURIComponent(key)}`
        quietly(save(() => (current ? api(path, { method: 'PUT', body: current }) : api(path, { method: 'DELETE' }))))
      }, COST_SAVE_DELAY)
    },
    [save],
  )

  const setCostOverride = useCallback(
    (key, override) => {
      const s = stateRef.current
      const costOverrides = { ...s.costOverrides }
      if (override) costOverrides[key] = override
      else delete costOverrides[key]
      commit({ ...s, costOverrides })
      saveCostOverride(key)
    },
    [commit, saveCostOverride],
  )

  // changes: { rate?, qty?, enabled? } for one cost line of one problem
  const updateCostLine = useCallback(
    (key, lineId, changes) => {
      const current = stateRef.current.costOverrides[key] ?? {}
      const lines = { ...current.lines, [lineId]: { ...current.lines?.[lineId], ...changes } }
      setCostOverride(key, { ...current, lines })
    },
    [setCostOverride],
  )

  // pct of undefined goes back to the farm-wide default; null is a box the farmer is still typing in
  const setRiskRecovery = useCallback(
    (key, pct) => {
      const current = { ...stateRef.current.costOverrides[key] }
      if (pct === undefined) delete current.recoveryPct
      else current.recoveryPct = pct
      setCostOverride(key, current)
    },
    [setCostOverride],
  )

  const resetCosts = useCallback((key) => setCostOverride(key, null), [setCostOverride])

  const updateSettings = useCallback(
    (changes) => {
      const s = stateRef.current
      commit({ ...s, settings: { ...s.settings, ...changes } })
      quietly(save(() => api('/farm/settings', { method: 'PATCH', body: changes })))
    },
    [commit, save],
  )

  const loadDemo = useCallback(async () => {
    const snapshot = await save(() => api('/farm/demo', { method: 'POST' }))
    commit({ ...empty, ...snapshot })
  }, [commit, save])

  const resetFarm = useCallback(async () => {
    await save(() => api('/farm', { method: 'DELETE' }))
    commit(empty)
  }, [commit, save])

  const value = useMemo(
    () => ({
      ...state,
      loaded,
      syncError,
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
    [state, loaded, syncError, saveFarm, addField, updateField, removeField, setRiskStatus, updateCostLine, setRiskRecovery, resetCosts, updateSettings, loadDemo, resetFarm],
  )

  return <FarmContext.Provider value={value}>{children}</FarmContext.Provider>
}

export function useFarm() {
  const ctx = useContext(FarmContext)
  if (!ctx) throw new Error('useFarm must be used inside <FarmProvider>')
  return ctx
}
