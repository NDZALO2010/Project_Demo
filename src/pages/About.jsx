import { Link } from 'react-router'
import Logo from '../components/Logo'
import fieldsPhoto from '../../assets/OIP.jpg'

// Mirrors the loop the dashboard runs on every field
const steps = [
  {
    name: 'Monitor',
    body: 'Map your fields once. We keep watch with live weather, a 7-day forecast and regular satellite passes.',
  },
  {
    name: 'Detect',
    body: 'The crop risk engine reads heat, rainfall, humidity and water balance alongside NDVI crop health to flag trouble early.',
  },
  {
    name: 'Decide',
    body: 'Every risk comes with the affected area, the yield at stake and the estimated revenue exposure, so you know what matters most.',
  },
  {
    name: 'Act',
    body: 'Clear, prioritised recommendations you can inspect, action and tick off, field by field.',
  },
]

const audiences = [
  {
    title: 'Farmers',
    body: 'See which field needs you today, and why, without digging through spreadsheets or weather apps.',
  },
  {
    title: 'Agribusinesses',
    body: 'Track risk and exposure across many hectares to plan inputs, logistics and finance with confidence.',
  },
]

export default function About() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-wheat bg-linen">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-10">
          <Link to="/login" aria-label="AgriNexus home">
            <Logo />
          </Link>
          <nav className="flex items-center gap-3 text-sm font-medium">
            <Link to="/login" className="rounded-lg px-4 py-2 text-leaf-800 transition hover:bg-leaf-50">
              Log in
            </Link>
            <Link
              to="/register"
              className="rounded-lg bg-leaf-700 px-4 py-2 text-linen transition hover:bg-leaf-800"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <section
        className="relative overflow-hidden bg-leaf-700 bg-cover bg-center text-linen"
        style={{ backgroundImage: `url(${fieldsPhoto})` }}
      >
        <div className="absolute inset-0 bg-leaf-900/75" aria-hidden="true" />
        <div className="relative mx-auto max-w-6xl px-5 py-20 sm:px-10 sm:py-28">
          <p className="text-xs font-semibold tracking-widest text-leaf-100 uppercase">About AgriNexus</p>
          <h1 className="mt-4 max-w-2xl font-serif text-4xl leading-tight font-semibold sm:text-5xl">
            Smarter farming decisions, grounded in your own data
          </h1>
          <p className="mt-5 max-w-xl text-lg text-leaf-50">
            AgriNexus turns weather, satellite and field data into clear, actionable insights for farmers and
            agribusinesses, so you can protect yield and revenue before problems spread.
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-5 py-16 sm:px-10">
        <section>
          <h2 className="font-serif text-3xl font-semibold text-leaf-900">How it works</h2>
          <p className="mt-2 max-w-2xl text-soil-600">
            One simple loop runs on every field you add, around the clock.
          </p>

          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => (
              <li key={step.name} className="rounded-xl border border-wheat bg-white p-5">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-leaf-700 text-sm font-semibold text-linen">
                    {i + 1}
                  </span>
                  <span className="text-xs font-semibold tracking-widest text-leaf-700 uppercase">{step.name}</span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-soil-600">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-16">
          <h2 className="font-serif text-3xl font-semibold text-leaf-900">Who it's for</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {audiences.map((a) => (
              <div key={a.title} className="rounded-xl bg-leaf-50 p-6">
                <h3 className="font-serif text-xl font-semibold text-leaf-800">{a.title}</h3>
                <p className="mt-2 leading-relaxed text-soil-600">{a.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 flex flex-col items-start justify-between gap-6 rounded-2xl bg-leaf-800 p-8 text-linen sm:flex-row sm:items-center sm:p-10">
          <div>
            <h2 className="font-serif text-2xl font-semibold">Ready to see your fields clearly?</h2>
            <p className="mt-1 text-leaf-100">Add your first field in a few minutes.</p>
          </div>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-leaf-900 transition hover:bg-leaf-500 hover:text-white"
          >
            Create an account
            <span aria-hidden="true">→</span>
          </Link>
        </section>
      </main>

      <footer className="border-t border-wheat py-6 text-center text-sm text-soil-400">
        © {new Date().getFullYear()} AgriNexus
      </footer>
    </div>
  )
}
