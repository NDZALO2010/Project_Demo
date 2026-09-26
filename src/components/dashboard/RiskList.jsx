import { cropName } from '../../lib/crops'
import { randsShort, tonnes } from '../../lib/format'
import PriorityBadge, { StatusTag } from './PriorityBadge'

export default function RiskList({ risks, selectedKey, onSelect }) {
  return (
    <section className="rounded-xl border border-wheat bg-white">
      <header className="border-b border-wheat px-5 py-4">
        <h2 className="font-serif text-lg font-semibold text-leaf-900">Where attention is needed first</h2>
        <p className="text-sm text-soil-400">Sorted by priority, then by how much revenue could be exposed.</p>
      </header>

      {risks.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-soil-400">
          Nothing flagged across your fields right now. We'll keep watching.
        </p>
      ) : (
        <ol className="divide-y divide-wheat/60">
          {risks.map((risk, i) => {
            const selected = risk.key === selectedKey
            const done = risk.action?.status === 'done'
            return (
              <li key={risk.key}>
                <button
                  onClick={() => onSelect(risk.key)}
                  className={`grid w-full grid-cols-[1.75rem_1fr_auto] items-start gap-x-3 px-5 py-3.5 text-left transition ${
                    selected ? 'bg-leaf-50' : 'hover:bg-linen'
                  } ${done ? 'opacity-60' : ''}`}
                >
                  <span className={`font-serif text-lg font-semibold ${selected ? 'text-leaf-700' : 'text-soil-400'}`}>
                    {i + 1}
                  </span>

                  <span className="min-w-0">
                    <span className="block truncate font-medium text-soil-900">
                      Field {risk.field.name}: {risk.title}
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-soil-400">
                      <span>
                        {cropName(risk.field.crop)} · {risk.affectedHa} ha · {tonnes(risk.yieldAtRisk)} at risk
                      </span>
                      <StatusTag action={risk.action} />
                    </span>
                  </span>

                  <span className="flex flex-col items-end gap-1">
                    <PriorityBadge priority={risk.priority} suffix="" />
                    <span className="text-sm font-semibold text-soil-900 tabular-nums">{randsShort(risk.revenueExposure)}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
