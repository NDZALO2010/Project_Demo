// Shown on first load while weather is still coming in for the farm's locations
export default function CollectingData({ fieldCount }) {
  const steps = [
    { label: `Reading GPS for ${fieldCount} ${fieldCount === 1 ? 'field' : 'fields'}`, done: true },
    { label: 'Fetching weather and 7-day forecast', done: false },
    { label: 'Scanning the latest satellite pass', done: false },
    { label: 'Running the crop risk engine', done: false },
  ]

  return (
    <div className="mx-auto mt-10 max-w-md rounded-2xl border border-wheat bg-white p-8">
      <h1 className="font-serif text-2xl font-semibold text-leaf-900">Collecting your farm data…</h1>
      <p className="mt-1 text-sm text-soil-400">This only takes a few seconds.</p>
      <ul className="mt-6 space-y-3">
        {steps.map((s, i) => (
          <li key={s.label} className="flex items-center gap-3 text-sm">
            {s.done ? (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-leaf-700 text-xs text-linen">✓</span>
            ) : i === 1 ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-wheat border-t-leaf-700" />
            ) : (
              <span className="h-5 w-5 rounded-full border-2 border-wheat" />
            )}
            <span className={s.done || i === 1 ? 'text-soil-900' : 'text-soil-400'}>{s.label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
