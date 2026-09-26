import { Navigate, Route, Routes } from 'react-router'
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

// Nothing to monitor until there's a farm with at least one field
function RequireFarm({ children }) {
  const { farm, fields } = useFarm()
  if (!farm || fields.length === 0) return <Navigate to="/onboarding" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/about" element={<About />} />
      <Route path="/onboarding" element={<Onboarding />} />

      <Route
        element={
          <RequireFarm>
            <AppShell />
          </RequireFarm>
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
