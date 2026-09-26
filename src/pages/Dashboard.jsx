import { useState } from 'react'
import { Link } from 'react-router'
import Pipeline from '../components/dashboard/Pipeline'
import RiskList from '../components/dashboard/RiskList'
import RecommendationCard from '../components/dashboard/RecommendationCard'
import WeatherPanel from '../components/dashboard/WeatherPanel'
import CollectingData from '../components/dashboard/CollectingData'
import PriorityBadge from '../components/dashboard/PriorityBadge'
import { NdviThumb } from '../components/dashboard/NdviMap'
import { useFarm } from '../state/FarmContext'
import { useMonitoring } from '../state/MonitoringContext'
import { cropName } from '../lib/crops'
import { hectares, randsShort, timeAgo, tonnes } from '../lib/format'

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function Dashboard() {
  const { farm, fields } = useFarm()
  const { risks, byField, ready, loading, syncedAt, refresh } = useMonitoring()
  const [selectedKey, setSelectedKey] = useState(null)

  if (!ready) return <CollectingData fieldCount={fields.length} />

  const open = risks.filter((r) => r.action?.status !== 'done')
  const selected = risks.find((r) => r.key === selectedKey) ?? open[0] ?? risks[0]
  const top = open[0]

  const sum = (list, key) => list.reduce((acc, r) => acc + r[key], 0)
  const totalHa = fields.reduce((acc, f) => acc + f.hectares, 0)
  const highCount = open.filter((r) => r.priority === 'High').length
  const inspecting = risks.filter((r) => r.action?.status === 'inspecting').length
  const done = risks.length - open.length

  const stages = [
    { name: 'Monitor', value: hectares(totalHa), note: `${fields.length} fields · weather + satellite` },
    {
      name: 'Detect',
      value: `${risks.length} ${risks.length === 1 ? 'risk' : 'risks'}`,
      note: `across ${hectares(sum(risks, 'affectedHa'))} flagged`,
      tone: risks.length ? 'risk' : undefined,
    },
    {
      name: 'Decide',
      value: randsShort(sum(open, 'revenueExposure')),
      note: `exposed · ${tonnes(sum(open, 'yieldAtRisk'))} · ${highCount} high priority`,
      tone: highCount ? 'risk' : undefined,
    },
    { name: 'Act', value: `${inspecting + done} underway`, note: `${inspecting} inspections scheduled · ${done} done` },
  ]

  const weatherFieldId = selected?.field.id ?? fields[0].id
  const weatherInfo = byField[weatherFieldId]

  return (
    <>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-soil-400">
            {farm.name}
            {farm.region && ` · ${farm.region}`}
          </p>
          <h1 className="mt-1 font-serif text-3xl font-semibold text-leaf-900">{greeting()}</h1>
        </div>
        <div className="flex items-center gap-3 text-sm text-soil-400">
          <span>Synced {syncedAt ? timeAgo(syncedAt) : '…'}</span>
          <button
            onClick={refresh}
            disabled={loading}
            className="rounded-lg border border-wheat bg-white px-3 py-1.5 font-medium text-leaf-700 hover:bg-leaf-50 disabled:opacity-60"
          >
            {loading ? 'Refreshing…' : 'Refresh data'}
          </button>
        </div>
      </header>

      {top && (
        <button
          onClick={() => setSelectedKey(top.key)}
          className="mt-6 flex w-full flex-col gap-1 rounded-xl bg-leaf-800 px-5 py-4 text-left text-linen transition hover:bg-leaf-900 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
        >
          <span>
            <span className="block text-xs font-semibold tracking-wide text-wheat uppercase">
              If your team only checks one thing today
            </span>
            <span className="mt-1 block font-medium">
              Field {top.field.name}: {top.title.toLowerCase()}. {top.nextStep}
            </span>
          </span>
          <span className="shrink-0 text-sm text-leaf-100">
            ~<span className="font-semibold text-linen">{randsShort(top.revenueExposure)}</span> exposed
          </span>
        </button>
      )}

      <div className="mt-6">
        <Pipeline stages={stages} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0 space-y-6">
          <RiskList risks={risks} selectedKey={selected?.key} onSelect={setSelectedKey} />

          <section className="rounded-xl border border-wheat bg-white p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-serif text-lg font-semibold text-leaf-900">Fields at a glance</h2>
              <Link to="/fields" className="text-sm font-medium text-leaf-700 hover:underline">
                Manage fields
              </Link>
            </div>
            <p className="text-sm text-soil-400">Latest vegetation map per field. Red zones are flagged.</p>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {fields.map((f) => {
                const info = byField[f.id]
                return (
                  <Link
                    key={f.id}
                    to={`/fields/${f.id}`}
                    className="rounded-lg border border-wheat p-2.5 transition hover:border-leaf-500"
                  >
                    {info?.satellite && <NdviThumb satellite={info.satellite} />}
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="font-medium text-soil-900">{f.name}</span>
                      <PriorityBadge priority={info?.risk ? info.risk.priority : 'Healthy'} suffix="" />
                    </div>
                    <p className="text-xs text-soil-400">
                      {cropName(f.crop)} · {f.hectares} ha
                    </p>
                  </Link>
                )
              })}
            </div>
          </section>
        </div>

        <div className="xl:sticky xl:top-8 xl:self-start">
          <RecommendationCard risk={selected} />
        </div>
      </div>

      {weatherInfo?.weather && (
        <div className="mt-6">
          <WeatherPanel
            weather={weatherInfo.weather}
            summary={weatherInfo.summary}
            title={`Weather around Field ${weatherInfo.field.name}`}
          />
        </div>
      )}
    </>
  )
}
