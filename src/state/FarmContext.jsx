import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { demoFarm, demoFields } from '../data/demoFarm'

// No backend yet, so the farm lives in localStorage for the prototype
const STORAGE_KEY = 'agrinexus.farm.v1'

const empty = { farm: null, fields: [], actions: {} }

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...empty, ...JSON.parse(raw) } : empty
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

  const loadDemo = useCallback(() => setState({ farm: demoFarm, fields: demoFields, actions: {} }), [])
  const resetFarm = useCallback(() => setState(empty), [])

  const value = useMemo(
    () => ({ ...state, saveFarm, addField, updateField, removeField, setRiskStatus, loadDemo, resetFarm }),
    [state, saveFarm, addField, updateField, removeField, setRiskStatus, loadDemo, resetFarm],
  )

  return <FarmContext.Provider value={value}>{children}</FarmContext.Provider>
}

export function useFarm() {
  const ctx = useContext(FarmContext)
  if (!ctx) throw new Error('useFarm must be used inside <FarmProvider>')
  return ctx
}
