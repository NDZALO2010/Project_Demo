import { Link } from 'react-router'
import { cropName } from '../../lib/crops'
import { rands, shortDate, tonnes, timeAgo } from '../../lib/format'
import { sourceLabels } from '../../services/prices'
import { useFarm } from '../../state/FarmContext'
import PriorityBadge from './PriorityBadge'
import WorthItPanel from './WorthItPanel'

const addPrice = (
  <Link to="/prices" className="font-medium text-leaf-700 hover:underline">
    Add a price
  </Link>
)

function priceNote(price) {
  const label = sourceLabels[price.source] ?? price.source
  return price.asOf ? `${label}, ${shortDate(price.asOf)}` : label
}

function Row({ label, value, strong }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="text-sm text-soil-600">{label}</dt>
      <dd className={`text-right tabular-nums ${strong ? 'font-semibold text-soil-900' : 'text-soil-900'}`}>{value}</dd>
    </div>
  )
}

export default function RecommendationCard({ risk, showFieldLink = true }) {
  const { setRiskStatus } = useFarm()

  if (!risk) {
    return (
      <section className="rounded-xl border border-dashed border-wheat bg-white p-6 text-center text-sm text-soil-400">
        Pick a risk from the list to see what the engine recommends.
      </section>
    )
  }

  const { field, action } = risk
  const status = action?.status

  return (
    <section className="rounded-xl border border-wheat bg-white">
      <header className="border-b border-wheat px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-soil-400">
            Field {field.name} <span className="text-wheat">|</span> {cropName(field.crop)} · {risk.stage}
          </p>
          <PriorityBadge priority={risk.priority} />
        </div>
        <p className="mt-2 text-xs font-medium tracking-wide text-soil-400 uppercase">Possible problem</p>
        <h2 className="font-serif text-xl font-semibold text-leaf-900">{risk.title}</h2>
      </header>

      <dl className="divide-y divide-wheat/60 px-5 py-2">
        <Row label="Affected area" value={`${risk.affectedHa} ha`} />
        <Row label="Your expected yield" value={`${field.expectedYield} t/ha`} />
        <Row label="Possible loss in this area (estimate)" value={`${risk.scenarioPct}%`} />
        <Row label="Crop you could lose (estimate)" value={tonnes(risk.yieldAtRisk)} strong />
        <Row
          label="Crop price"
          value={
            risk.price ? (
              <>
                {rands(risk.price.pricePerTon)} / t
                <span className="block text-xs font-normal text-soil-400">{priceNote(risk.price)}</span>
              </>
            ) : (
              addPrice
            )
          }
        />
        <Row
          label={
            <>
              Income you could miss out on
              <span className="block text-xs text-soil-400">Revenue exposure, estimate</span>
            </>
          }
          value={risk.revenueExposure === null ? addPrice : rands(risk.revenueExposure)}
          strong
        />
      </dl>

      <p className="mx-5 rounded-lg bg-linen px-3 py-2 text-xs text-soil-600">
        <span className="font-semibold">Rough estimate:</span> this area could lose about {tonnes(risk.yieldAtRisk)} (
        {risk.affectedHa} ha × {field.expectedYield} t/ha × {risk.scenarioPct}%). Not yet checked against your past
        harvests.
      </p>

      <div className="px-5 pt-4">
        <p className="text-sm font-medium text-soil-900">Why the engine flagged it</p>
        <ul className="mt-2 space-y-1.5 text-sm">
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-clay" />
            <span>
              <span className="font-medium">Vegetation declining</span>
              <span className="text-soil-600">
                {' '}· {(risk.vegetation.declinePct * 100).toFixed(0)}% below the rest of the field
                {risk.vegetation.pattern === 'strip' && ', in a strip pattern'}
              </span>
            </span>
          </li>
          {risk.indicators
            .filter((i) => i.supports)
            .map((i) => (
              <li key={i.label} className="flex items-start gap-2">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-straw" />
                <span>
                  <span className="font-medium">
                    {i.label}: {i.level}
                  </span>
                  <span className="text-soil-600"> · {i.detail}</span>
                </span>
              </li>
            ))}
        </ul>
        <p className="mt-2 text-xs text-soil-400">Signal strength: {risk.confidence}</p>
        {risk.outlook && <p className="mt-2 text-sm text-soil-600">{risk.outlook}</p>}
      </div>

      <div className="mx-5 mt-5 rounded-lg bg-leaf-800 p-4 text-linen">
        <p className="text-xs font-semibold tracking-wide text-wheat uppercase">Recommended next step</p>
        <p className="mt-1 font-medium">{risk.nextStep}</p>
      </div>

      {risk.plan && <WorthItPanel key={risk.key} risk={risk} />}

      <div className="h-5" />

      <div className="space-y-2 px-5 pb-5">
        {!status && (
          <button
            onClick={() => setRiskStatus(risk.key, 'inspecting')}
            className="w-full rounded-lg bg-leaf-700 px-4 py-2.5 text-sm font-medium text-linen transition hover:bg-leaf-800"
          >
            Schedule inspection
          </button>
        )}
        {status === 'inspecting' && (
          <>
            <p className="text-center text-sm text-soil-600">Inspection scheduled {timeAgo(action.at)}</p>
            <button
              onClick={() => setRiskStatus(risk.key, 'done')}
              className="w-full rounded-lg bg-leaf-700 px-4 py-2.5 text-sm font-medium text-linen transition hover:bg-leaf-800"
            >
              Mark action taken
            </button>
          </>
        )}
        {status === 'done' && (
          <p className="rounded-lg bg-leaf-50 px-3 py-2.5 text-center text-sm text-leaf-800">
            ✓ Action taken {timeAgo(action.at)}. We'll keep watching this field for recovery.
          </p>
        )}
        {status && (
          <button onClick={() => setRiskStatus(risk.key, null)} className="w-full text-xs text-soil-400 hover:text-soil-600">
            Reopen
          </button>
        )}
        {showFieldLink && (
          <Link to={`/fields/${field.id}`} className="block pt-1 text-center text-sm font-medium text-leaf-700 hover:underline">
            Open field {field.name} →
          </Link>
        )}
      </div>
    </section>
  )
}
