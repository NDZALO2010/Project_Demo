import { Link, useParams } from 'react-router'
import NdviMap from '../components/dashboard/NdviMap'
import RecommendationCard from '../components/dashboard/RecommendationCard'
import WeatherPanel from '../components/dashboard/WeatherPanel'
import PriorityBadge from '../components/dashboard/PriorityBadge'
import { useMonitoring } from '../state/MonitoringContext'
import { usePrices } from '../state/PriceContext'
import { priceForField, sourceLabels } from '../services/prices'
import { cropName, daysSincePlanting, growthStage } from '../lib/crops'
import { rands, shortDate } from '../lib/format'

export default function FieldDetail() {
  const { id } = useParams()
  const { byField } = useMonitoring()
  const { prices } = usePrices()
  const info = byField[id]

  if (!info) {
    return (
      <div className="py-16 text-center">
        <p className="text-soil-600">We couldn't find that field.</p>
        <Link to="/fields" className="mt-2 inline-block font-medium text-leaf-700 hover:underline">
          Back to fields
        </Link>
      </div>
    )
  }

  const { field, risk, satellite, weather, summary, pending } = info

  const price = priceForField(field, prices)

  const facts = [
    ['Crop', cropName(field.crop)],
    ['Size', `${field.hectares} ha`],
    ['Planted', `${shortDate(field.plantingDate)} (${daysSincePlanting(field.plantingDate)} days)`],
    ['Growth stage', growthStage(field)],
    ['Expected yield', `${field.expectedYield} t/ha`],
    [
      'Crop price',
      price ? (
        `${rands(price.pricePerTon)} / t (${sourceLabels[price.source].toLowerCase()})`
      ) : (
        <Link to="/prices" className="font-medium text-leaf-700 hover:underline">
          Add a price
        </Link>
      ),
    ],
    ['Irrigation', field.irrigated ? 'Yes' : 'Dryland'],
    ['GPS', `${Number(field.lat).toFixed(4)}, ${Number(field.lon).toFixed(4)}`],
  ]

  return (
    <>
      <Link to="/fields" className="text-sm text-soil-400 hover:text-leaf-700">
        ← All fields
      </Link>

      <header className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-serif text-3xl font-semibold text-leaf-900">Field {field.name}</h1>
          {!pending && <PriorityBadge priority={risk ? risk.priority : 'Healthy'} />}
        </div>
        <Link
          to={`/fields/${field.id}/edit`}
          className="self-start rounded-lg border border-wheat bg-white px-4 py-2 text-sm font-medium text-leaf-700 hover:bg-leaf-50"
        >
          Edit field
        </Link>
      </header>

      {pending ? (
        <p className="mt-10 text-center text-soil-400">Pulling in weather and satellite data for this field…</p>
      ) : (
        <>
          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
            <div className="min-w-0 space-y-6">
              <NdviMap field={field} satellite={satellite} />

              <section className="rounded-xl border border-wheat bg-white p-5">
                <h2 className="font-serif text-lg font-semibold text-leaf-900">Field details</h2>
                <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                  {facts.map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-3 border-b border-wheat/60 pb-2 text-sm">
                      <dt className="text-soil-400">{label}</dt>
                      <dd className="text-right text-soil-900">{value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            </div>

            <div className="xl:sticky xl:top-8 xl:self-start">
              {risk ? (
                <RecommendationCard risk={risk} showFieldLink={false} />
              ) : (
                <section className="rounded-xl border border-wheat bg-white p-6">
                  <p className="text-xs font-semibold tracking-wide text-leaf-700 uppercase">No risks detected</p>
                  <p className="mt-2 font-serif text-xl font-semibold text-leaf-900">Field {field.name} looks even</p>
                  <p className="mt-2 text-sm text-soil-600">
                    No part of the field is falling behind the rest on the latest satellite pass. We'll keep checking
                    as new imagery and weather come in.
                  </p>
                </section>
              )}
            </div>
          </div>

          <div className="mt-6">
            <WeatherPanel weather={weather} summary={summary} />
          </div>
        </>
      )}
    </>
  )
}
