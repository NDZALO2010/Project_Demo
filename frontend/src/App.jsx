import { Navigate, Route, Routes, useLocation } from 'react-router'
import Login from './pages/Login'
import Register from './pages/Register'
import Onboarding from './pages/Onboarding'
import About from './pages/About'
import Dashboard from './pages/Dashboard'
import Fields from './pages/Fields'
import FieldDetail from './pages/FieldDetail'
import FieldEditor from './pages/FieldEditor'
import Prices from './pages/Prices'
import AppShell from './components/AppShell'
import { useFarm } from './state/FarmContext'
import { useAuth } from './state/AuthContext'

function Loading() {
  return <p className="py-24 text-center text-soil-400">Loading your farm…</p>
}

// Everything past the login screen needs an account
function RequireAuth({ children }) {
  const { status } = useAuth()
  const location = useLocation()
  if (status === 'checking') return <Loading />
  if (status === 'out') return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return children
}

// Already signed in, so skip the login and register screens
function GuestOnly({ children }) {
  const { status } = useAuth()
  if (status === 'checking') return <Loading />
  if (status === 'in') return <Navigate to="/dashboard" replace />
  return children
}

// Nothing to monitor until there's a farm with at least one field
function RequireFarm({ children }) {
  const { farm, fields, loaded, syncError } = useFarm()
  if (!loaded) {
    return syncError ? <p className="py-24 text-center text-clay">{syncError}</p> : <Loading />
  }
  if (!farm || fields.length === 0) return <Navigate to="/onboarding" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
      <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
      <Route path="/about" element={<About />} />
      <Route path="/onboarding" element={<RequireAuth><Onboarding /></RequireAuth>} />

      <Route
        element={
          <RequireAuth>
            <RequireFarm>
              <AppShell />
            </RequireFarm>
          </RequireAuth>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/fields" element={<Fields />} />
        <Route path="/fields/new" element={<FieldEditor />} />
        <Route path="/fields/:id" element={<FieldDetail />} />
        <Route path="/fields/:id/edit" element={<FieldEditor />} />
        <Route path="/prices" element={<Prices />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
