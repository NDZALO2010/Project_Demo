import Logo from './Logo'
import fieldsPhoto from '../../assets/OIP.jpg'

// Two column shell shared by login + register.
// The green side panel drops away on small screens so the form gets the room.
export default function AuthLayout({ title, subtitle, aside, children }) {
  return (
    <div className="flex min-h-screen">
      <aside className="relative hidden w-[42%] flex-col justify-between overflow-hidden bg-leaf-700 bg-cover bg-center p-12 text-linen lg:flex"
        style={{ backgroundImage: `url(${fieldsPhoto})` }}
      >
        {/* Green wash so the light text stays readable over the bright photo */}
        <div
          className="absolute inset-0 bg-gradient-to-b from-leaf-900/70 via-leaf-800/55 to-leaf-900/85"
          aria-hidden="true"
        />

        <div className="relative z-10">
          <Logo light />
        </div>

        <div className="relative z-10 max-w-sm">
          {aside}
        </div>

       <p> </p>
       <p> </p>
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
