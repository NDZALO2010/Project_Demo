import Logo from './Logo'

// Two column shell shared by login + register.
// The green side panel drops away on small screens so the form gets the room.
export default function AuthLayout({ title, subtitle, aside, children }) {
  return (
    <div className="flex min-h-screen">
      <aside className="relative hidden w-[42%] flex-col justify-between overflow-hidden bg-leaf-700 p-12 text-linen lg:flex">
        <Logo light />

        <div className="relative z-10 max-w-sm">
          {aside}
        </div>

        <p className="relative z-10 text-sm text-leaf-100">
          &copy; {new Date().getFullYear()} AgriNexus. Grown with care.
        </p>

        {/* Ploughed-field rows along the bottom edge */}
        <div className="absolute inset-x-0 bottom-0 h-40" aria-hidden="true">
          <div className="h-1/4 bg-leaf-800" />
          <div className="h-1/4 bg-soil-600" />
          <div className="h-1/4 bg-leaf-800" />
          <div className="h-1/4 bg-soil-900" />
        </div>
      </aside>

      <main className="flex flex-1 items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>

          <h1 className="font-serif text-3xl font-semibold text-leaf-900">{title}</h1>
          {subtitle && <p className="mt-2 text-soil-400">{subtitle}</p>}

          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  )
}
