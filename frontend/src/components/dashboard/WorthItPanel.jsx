import { useState } from 'react'
import { Link } from 'react-router'
import { cropName } from '../../lib/crops'
import { lineCost } from '../../lib/finance'
import { rands, randsPerRand } from '../../lib/format'
import { useFarm } from '../../state/FarmContext'

// "~R15,500": rounded to the nearest R100 so it reads as the estimate it is
const about = (value) => `~${rands(Math.round(value / 100) * 100)}`

const tones = {
  good: 'bg-leaf-50 text-leaf-800',
  warn: 'bg-straw/20 text-soil-900',
  bad: 'bg-clay/10 text-clay',
  prompt: 'border border-dashed border-wheat bg-linen text-soil-600',
}

// Plain-language headline for each verdict code from lib/finance.js
export function verdictCopy(risk) {
  const { plan } = risk
  switch (plan.verdict) {
    case 'worth-it':
      return { tone: 'good', tag: 'Worth acting', text: `Spend ${about(plan.cost)} to protect ${about(plan.protectedRands)}: worth it.` }
    case 'close-call':
      return {
        tone: 'warn',
        tag: 'Close call',
        text: `Spend ${about(plan.cost)} to protect ${about(plan.protectedRands)}: a close call. Talk to your agronomist first.`,
      }
    case 'monitor':
      return {
        tone: 'bad',
        tag: 'Monitor',
        text: `Cost is higher than the likely loss: monitor instead. Acting would cost ${about(plan.cost)} to protect ${about(plan.protectedRands)}.`,
      }
    case 'free':
      return { tone: 'good', tag: 'Worth acting', text: 'No extra cost: worth doing.' }
    case 'no-loss':
      return { tone: 'warn', tag: 'Keep watching', text: 'No measurable loss to protect yet. Keep watching this area.' }
    case 'needs-price':
      return { tone: 'prompt', tag: 'Add a price', text: `Add a price for ${cropName(risk.field.crop).toLowerCase()} to see if acting pays.` }
    default:
      return { tone: 'prompt', tag: 'Add costs', text: 'Add costs below to see if acting pays.' }
  }
}

export function VerdictTag({ risk }) {
  if (!risk.plan) return null
  const { tone, tag } = verdictCopy(risk)
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${tones[tone]}`}>{tag}</span>
}

const numberInput =
  'rounded-md border border-wheat bg-white px-2 py-1 text-right tabular-nums outline-none focus:border-leaf-500 focus:ring-2 focus:ring-leaf-500/15'

// '' while the farmer is clearing the box becomes null, which the finance module treats as "missing"
const toNumber = (value) => (value === '' ? null : Number(value))

function Row({ label, value, strong }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="text-sm text-soil-600">{label}</dt>
      <dd className={`text-right tabular-nums ${strong ? 'font-semibold text-soil-900' : 'text-soil-900'}`}>{value}</dd>
    </div>
  )
}

function CostLine({ line, riskKey, affectedHa }) {
  const { updateCostLine } = useFarm()
  const cost = lineCost(line, affectedHa)
  const set = (changes) => updateCostLine(riskKey, line.id, changes)

  return (
    <li className={`py-2.5 ${line.enabled ? '' : 'opacity-60'}`}>
      <label className="flex cursor-pointer items-center gap-2 text-sm text-soil-900">
        <input
          type="checkbox"
          checked={line.enabled}
          onChange={(e) => set({ enabled: e.target.checked })}
          className="h-4 w-4 accent-leaf-700"
        />
        {line.label}
      </label>

      <div className="mt-1.5 ml-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-soil-600">
        <span>R</span>
        <input
          type="number"
          min="0"
          step="50"
          aria-label={`${line.label} cost in rands`}
          value={line.rate ?? ''}
          disabled={!line.enabled}
          onChange={(e) => set({ rate: toNumber(e.target.value) })}
          className={`${numberInput} w-24`}
        />
        {line.basis === 'perHa' && <span>/ha × {affectedHa} ha</span>}
        {line.unit && (
          <>
            <span>×</span>
            <input
              type="number"
              min="0"
              step="1"
              aria-label={`Number of ${line.unit}s`}
              value={line.qty ?? ''}
              disabled={!line.enabled}
              onChange={(e) => set({ qty: toNumber(e.target.value) })}
              className={`${numberInput} w-16`}
            />
            <span>{line.unit}s</span>
          </>
        )}
        <span className="ml-auto font-medium text-soil-900 tabular-nums">
          {!line.enabled ? 'Not included' : cost === null ? 'Add a cost' : rands(cost)}
        </span>
      </div>

      <p className="mt-1 ml-6 text-xs text-soil-400">
        {line.isDefault ? 'Default estimate' : 'Your cost'}
        {line.treatment && ' · only needed if the check confirms the problem'}
      </p>
    </li>
  )
}

export default function WorthItPanel({ risk }) {
  const { settings, setRiskRecovery, resetCosts } = useFarm()
  const { plan } = risk
  const copy = verdictCopy(risk)
  const defaultCount = plan.lines.filter((l) => l.enabled && l.isDefault).length
  // start open when costs are missing; after that the farmer decides, so edits don't snap it shut
  const [open, setOpen] = useState(plan.cost === null && plan.verdict !== 'needs-price')

  return (
    <div className="px-5 pt-5">
      <p className="text-sm font-medium text-soil-900">Is it worth acting?</p>

      <div className={`mt-2 rounded-lg px-3 py-2.5 text-sm font-medium ${tones[copy.tone]}`}>
        {copy.text}
        {plan.verdict === 'needs-price' && (
          <Link to="/prices" className="ml-1 font-semibold text-leaf-700 underline">
            Add a price
          </Link>
        )}
      </div>

      {plan.verdict !== 'needs-price' && (
        <dl className="mt-1 divide-y divide-wheat/60">
          <Row label="Cost of acting (estimate)" value={plan.cost === null ? 'Add costs' : rands(plan.cost)} />
          <Row
            label={`Income protected (estimate, ${plan.recoveryPct}% of the loss)`}
            value={plan.protectedRands === null ? 'Add a price' : rands(plan.protectedRands)}
          />
          {plan.netBenefit !== null && (
            <Row label="Net benefit (estimate)" value={rands(plan.netBenefit)} strong />
          )}
          {plan.returnPerRand !== null && (
            <Row label="Every R1 spent protects about" value={randsPerRand(plan.returnPerRand)} />
          )}
        </dl>
      )}

      <details className="mt-2 rounded-lg border border-wheat" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
        <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-leaf-700">
          Check or change the costs
          {defaultCount > 0 && (
            <span className="font-normal text-soil-400">
              {' '}
              ({defaultCount} default {defaultCount === 1 ? 'estimate' : 'estimates'})
            </span>
          )}
        </summary>

        <div className="border-t border-wheat px-3 pb-3">
          <ul className="divide-y divide-wheat/60">
            {plan.lines.map((line) => (
              <CostLine key={line.id} line={line} riskKey={risk.key} affectedHa={risk.affectedHa} />
            ))}
          </ul>

          <div className="mt-2 border-t border-wheat pt-3 text-sm">
            <label className="flex flex-wrap items-center gap-2 text-soil-900">
              Share of the loss this action could save
              <span className="flex items-center gap-1 whitespace-nowrap">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="5"
                  value={plan.recoveryInput ?? ''}
                  onChange={(e) => setRiskRecovery(risk.key, toNumber(e.target.value))}
                  className={`${numberInput} w-16`}
                />
                %
              </span>
            </label>
            <p className="mt-1 text-xs text-soil-400">
              {plan.customRecovery ? (
                <>
                  Your figure for this problem.{' '}
                  <button onClick={() => setRiskRecovery(risk.key, undefined)} className="text-leaf-700 hover:underline">
                    Use farm default ({settings.recoveryPct}%)
                  </button>
                </>
              ) : (
                'Farm default estimate. Change it for every problem on the Crop prices screen.'
              )}
            </p>
          </div>

          <button onClick={() => resetCosts(risk.key)} className="mt-3 text-xs text-soil-400 hover:text-soil-600">
            Reset to default estimates
          </button>
        </div>
      </details>
    </div>
  )
}
