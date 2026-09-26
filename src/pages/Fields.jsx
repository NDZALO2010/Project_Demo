import { Link, useNavigate } from 'react-router'
import PriorityBadge from '../components/dashboard/PriorityBadge'
import { useFarm } from '../state/FarmContext'
import { useMonitoring } from '../state/MonitoringContext'
import { cropName, growthStage } from '../lib/crops'
import { hectares, shortDate } from '../lib/format'

export default function Fields() {
  const navigate = useNavigate()
  const { farm, fields, resetFarm } = useFarm()
  const { byField } = useMonitoring()

  const totalHa = fields.reduce((acc, f) => acc + f.hectares, 0)

  function reset() {
    if (window.confirm('Remove the farm and all its fields from this browser?')) {
      resetFarm()
      navigate('/onboarding')
    }
  }

  return (
    <>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-soil-400">{farm.name}</p>
          <h1 className="mt-1 font-serif text-3xl font-semibold text-leaf-900">Fields</h1>
          <p className="mt-1 text-sm text-soil-600">
            {fields.length} fields · {hectares(totalHa)} under monitoring
          </p>
        </div>
        <Link
          to="/fields/new"
          className="self-start rounded-lg bg-leaf-700 px-4 py-2.5 text-sm font-medium text-linen hover:bg-leaf-800 sm:self-auto"
        >
          + Add field
        </Link>
      </header>

      <div className="mt-6 overflow-x-auto rounded-xl border border-wheat bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-wheat text-xs tracking-wide text-soil-400 uppercase">
            <tr>
              <th className="px-5 py-3 font-medium">Field</th>
              <th className="px-3 py-3 font-medium">Crop</th>
              <th className="px-3 py-3 text-right font-medium">Size</th>
              <th className="px-3 py-3 font-medium">Planted</th>
              <th className="px-3 py-3 font-medium">Stage</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-wheat/60">
            {fields.map((f) => {
              const risk = byField[f.id]?.risk
              return (
                <tr key={f.id} className="hover:bg-linen">
                  <td className="px-5 py-3">
                    <Link to={`/fields/${f.id}`} className="font-medium text-soil-900 hover:text-leaf-700">
                      {f.name}
                    </Link>
                    {f.irrigated && <span className="ml-2 text-xs text-soil-400">Irrigated</span>}
                  </td>
                  <td className="px-3 py-3 text-soil-600">{cropName(f.crop)}</td>
                  <td className="px-3 py-3 text-right text-soil-600 tabular-nums">{f.hectares} ha</td>
                  <td className="px-3 py-3 text-soil-600">{shortDate(f.plantingDate)}</td>
                  <td className="px-3 py-3 text-soil-600">{growthStage(f)}</td>
                  <td className="px-3 py-3">
                    {byField[f.id]?.pending ? (
                      <span className="text-xs text-soil-400">Checking…</span>
                    ) : (
                      <PriorityBadge priority={risk ? risk.priority : 'Healthy'} />
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link to={`/fields/${f.id}/edit`} className="font-medium text-leaf-700 hover:underline">
                      Edit
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <button onClick={reset} className="mt-8 text-sm text-soil-400 hover:text-clay">
        Reset farm data
      </button>
    </>
  )
}
