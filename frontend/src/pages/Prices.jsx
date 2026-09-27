import { useState } from 'react'
import { Link } from 'react-router'
import { useFarm } from '../state/FarmContext'
import { usePrices } from '../state/PriceContext'
import { cropName } from '../lib/crops'
import { rands, shortDate } from '../lib/format'
import { PRICE_CROPS, sourceLabels } from '../services/prices'

const input =
  'rounded-lg border border-wheat bg-white px-3 py-2 text-right text-soil-900 tabular-nums outline-none transition focus:border-leaf-500 focus:ring-4 focus:ring-leaf-500/15'

function PriceRow({ crop, price, fieldCount, contractCount }) {
  const { setPrice } = usePrices()
  const [draft, setDraft] = useState(price?.pricePerTon ? String(price.pricePerTon) : '')
  const [saved, setSaved] = useState(false)

  const current = price?.pricePerTon ? String(price.pricePerTon) : ''
  const changed = draft !== current
  const invalid = draft !== '' && !(Number(draft) > 0)

  async function save(e) {
    e.preventDefault()
    if (invalid) return
    try {
      await setPrice(crop, draft === '' ? null : Number(draft))
      setSaved(true)
    } catch {
      // the page shows the error above the list
    }
  }

  return (
    <form onSubmit={save} className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_11rem_auto] sm:items-center">
      <div>
        <p className="font-medium text-soil-900">{cropName(crop)}</p>
        <p className="text-sm text-soil-400">
          {price?.pricePerTon ? (
            <>
              {sourceLabels[price.source]}
              {price.asOf ? `, updated ${shortDate(price.asOf)}` : ' (not today’s market price)'}
            </>
          ) : (
            <span className="text-clay">No price yet. Add one to value losses on this crop.</span>
          )}
        </p>
        {fieldCount + contractCount > 0 && (
          <p className="text-xs text-soil-400">
            {fieldCount} {fieldCount === 1 ? 'field uses' : 'fields use'} this price
            {contractCount > 0 && ` · ${contractCount} on a contract price`}
          </p>
        )}
      </div>

      <label className="block">
        <span className="sr-only">{cropName(crop)} price in rands per tonne</span>
        <div className="flex items-center gap-2 text-sm whitespace-nowrap text-soil-600">
          R
          <input
            type="number"
            min="0"
            step="10"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value)
              setSaved(false)
            }}
            className={`${input} w-full min-w-0 ${invalid ? 'border-clay' : ''}`}
            placeholder="Add a price"
          />
          / t
        </div>
        {invalid && <span className="mt-1 block text-xs text-clay">Enter a price above R0.</span>}
      </label>

      <div className="flex items-center gap-2 sm:w-24 sm:justify-end">
        {changed ? (
          <button
            type="submit"
            disabled={invalid}
            className="rounded-lg bg-leaf-700 px-4 py-2 text-sm font-medium text-linen hover:bg-leaf-800 disabled:opacity-60"
          >
            Save
          </button>
        ) : (
          saved && <span className="text-sm text-leaf-700">✓ Saved</span>
        )}
      </div>
    </form>
  )
}

function RecoverySetting() {
  const { settings, updateSettings } = useFarm()
  const [draft, setDraft] = useState(String(settings.recoveryPct))
  const pct = Number(draft)
  const invalid = draft === '' || !(pct >= 0 && pct <= 100)

  return (
    <section className="mt-6 rounded-xl border border-wheat bg-white p-5">
      <h2 className="font-serif text-lg font-semibold text-leaf-900">How much of a loss can acting save?</h2>
      <p className="mt-1 text-sm text-soil-600">
        When we weigh up an action, we assume it saves this share of the income you could miss out on. It's an estimate:
        acting early usually saves more, acting late less. You can change it for a single problem on its card.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!invalid) updateSettings({ recoveryPct: pct })
        }}
        className="mt-3 flex flex-wrap items-center gap-2 text-sm"
      >
        <input
          type="number"
          min="0"
          max="100"
          step="5"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className={`${input} w-24 ${invalid ? 'border-clay' : ''}`}
        />
        <span className="text-soil-600">%</span>
        {!invalid && pct !== settings.recoveryPct && (
          <button type="submit" className="rounded-lg bg-leaf-700 px-4 py-2 font-medium text-linen hover:bg-leaf-800">
            Save
          </button>
        )}
        {invalid && <span className="text-clay">Enter a number from 0 to 100.</span>}
      </form>
    </section>
  )
}

export default function Prices() {
  const { fields } = useFarm()
  const { prices, error } = usePrices()

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-serif text-3xl font-semibold text-leaf-900">Crop prices</h1>
      <p className="mt-1 text-soil-600">
        What a tonne of each crop is worth to you today. Every "income you could miss out on" figure uses these, and
        updates as soon as you save.
      </p>

      {error && (
        <p className="mt-4 rounded-lg bg-clay/10 px-4 py-3 text-sm text-clay">{error}</p>
      )}

      <section className="mt-6 rounded-xl border border-wheat bg-white">
        <header className="border-b border-wheat px-5 py-4">
          <h2 className="font-serif text-lg font-semibold text-leaf-900">Market price per tonne</h2>
          <p className="text-sm text-soil-400">
            Use the price you expect to sell at, e.g. today's SAFEX price minus transport. Leave a box empty if you
            don't know it yet.
          </p>
        </header>
        <div className="divide-y divide-wheat/60">
          {prices &&
            PRICE_CROPS.map((crop) => {
              const cropFields = fields.filter((f) => f.crop === crop)
              const contractCount = cropFields.filter((f) => Number(f.contractPrice) > 0).length
              return (
                <PriceRow
                  key={crop}
                  crop={crop}
                  price={prices[crop]}
                  fieldCount={cropFields.length - contractCount}
                  contractCount={contractCount}
                />
              )
            })}
        </div>
      </section>

      {fields.some((f) => Number(f.contractPrice) > 0) && (
        <section className="mt-6 rounded-xl border border-wheat bg-white p-5">
          <h2 className="font-serif text-lg font-semibold text-leaf-900">Fields on a contract price</h2>
          <p className="text-sm text-soil-600">These fields use their own price instead of the market price above.</p>
          <ul className="mt-3 divide-y divide-wheat/60 text-sm">
            {fields
              .filter((f) => Number(f.contractPrice) > 0)
              .map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-3 py-2">
                  <span>
                    Field {f.name} · {cropName(f.crop)}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="tabular-nums">{rands(f.contractPrice)} / t</span>
                    <Link to={`/fields/${f.id}/edit`} className="font-medium text-leaf-700 hover:underline">
                      Edit
                    </Link>
                  </span>
                </li>
              ))}
          </ul>
        </section>
      )}

      <RecoverySetting />

      <p className="mt-6 text-sm text-soil-400">
        Live JSE/SAFEX grain prices aren't connected yet, so prices are entered by hand for now.
      </p>
    </div>
  )
}
