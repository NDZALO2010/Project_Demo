import { NavLink, Outlet } from 'react-router'
import Logo from './Logo'
import { useFarm } from '../state/FarmContext'
import { useAuth } from '../state/AuthContext'

const icons = {
  dashboard: 'M4 13h6V4H4v9Zm0 7h6v-4H4v4Zm10 0h6v-9h-6v9Zm0-16v4h6V4h-6Z',
  fields: 'M3 7l6-3 6 3 6-3v13l-6 3-6-3-6 3V7Zm6-3v13m6-10v13',
  add: 'M12 5v14M5 12h14',
  prices: 'M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8ZM7.5 7.5h.01',
}

export function Icon({ name, className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={icons[name]} />
    </svg>
  )
}

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/fields', label: 'Fields', icon: 'fields', end: true },
  { to: '/fields/new', label: 'Add field', icon: 'add' },
  { to: '/prices', label: 'Crop prices', icon: 'prices' },
]

export default function AppShell() {
  const { farm, syncError } = useFarm()
  const { logout } = useAuth()

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-leaf-900 px-4 py-6 text-leaf-100 lg:flex">
        <div className="px-2">
          <Logo light />
        </div>

        <nav className="mt-10 space-y-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive ? 'bg-leaf-700 text-linen' : 'hover:bg-leaf-800 hover:text-linen'
                }`
              }
            >
              <Icon name={item.icon} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto rounded-xl bg-leaf-800 p-3">
          <p className="truncate text-sm font-medium text-linen">{farm?.name}</p>
          <p className="truncate text-xs">{farm?.region}</p>
          <button onClick={logout} className="mt-3 text-xs font-medium text-wheat hover:underline">
            Sign out
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* on small screens the sidebar collapses into this bar */}
        <div className="border-b border-wheat bg-white px-4 py-3 lg:hidden">
          <div className="flex items-center justify-between">
            <Logo />
            <button onClick={logout} className="text-sm font-medium text-leaf-700">
              Sign out
            </button>
          </div>
          <nav className="mt-3 flex flex-wrap gap-1">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `rounded-full px-3 py-1 text-sm font-medium ${isActive ? 'bg-leaf-700 text-linen' : 'text-soil-600'}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {syncError && (
            <p role="alert" className="mb-4 rounded-lg bg-clay/10 px-4 py-3 text-sm text-clay">
              Your last change wasn't saved: {syncError}
            </p>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  )
}
