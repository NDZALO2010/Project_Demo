// The MONITOR -> DETECT -> DECIDE -> ACT loop, with live numbers under each stage
export default function Pipeline({ stages }) {
  return (
    <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {stages.map((stage, i) => (
        <li key={stage.name} className="relative rounded-xl border border-wheat bg-white p-4">
          <span className="text-xs font-semibold tracking-widest text-leaf-700 uppercase">{stage.name}</span>
          <p className={`mt-3 font-serif text-2xl font-semibold ${stage.tone === 'risk' ? 'text-clay' : 'text-soil-900'}`}>
            {stage.value}
          </p>
          <p className="mt-0.5 text-sm text-soil-600">{stage.note}</p>

          {i < stages.length - 1 && (
            <span className="absolute top-1/2 -right-3 z-10 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-wheat bg-linen text-sm text-leaf-700 xl:flex" aria-hidden="true">
              →
            </span>
          )}
        </li>
      ))}
    </ol>
  )
}
