import { useState } from 'react'
import { shortDate } from '../../lib/format'

// One hue, light to dark: pale = thin or stressed canopy, dark = dense healthy canopy
const ramp = [
  { min: 0.75, color: '#2a4a2b' },
  { min: 0.65, color: '#3f6b3a' },
  { min: 0.55, color: '#5e8c4a' },
  { min: 0.45, color: '#85ad67' },
  { min: 0.35, color: '#aecb94' },
  { min: 0.2, color: '#d3e2c5' },
  { min: -1, color: '#eef3ea' },
]

export function ndviColor(value) {
  return ramp.find((step) => value >= step.min).color
}

const ROW_LABELS = 'ABCDEFGH'

// Small, non-interactive version for lists
export function NdviThumb({ satellite }) {
  return (
    <div
      className="grid gap-px overflow-hidden rounded"
      style={{ gridTemplateColumns: `repeat(${satellite.cols}, minmax(0, 1fr))` }}
      aria-hidden="true"
    >
      {satellite.zones.map((z) => (
        <span
          key={`${z.row}-${z.col}`}
          className={`aspect-square ${z.flagged ? 'ring-1 ring-clay ring-inset' : ''}`}
          style={{ backgroundColor: z.flagged ? '#b5552f' : ndviColor(z.ndvi) }}
        />
      ))}
    </div>
  )
}

export default function NdviMap({ field, satellite }) {
  const [hovered, setHovered] = useState(null)
  const zoneName = (z) => `${ROW_LABELS[z.row]}${z.col + 1}`

  return (
    <section className="rounded-xl border border-wheat bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-serif text-lg font-semibold text-leaf-900">Satellite crop monitoring</h2>
          <p className="text-sm text-soil-400">
            Vegetation index (NDVI) for Field {field.name}. Outlined zones are well below the rest of the field.
          </p>
        </div>
        <span className="rounded-full bg-straw/20 px-2.5 py-0.5 text-xs font-medium text-soil-600">Simulated imagery</span>
      </div>

      <div
        className="mt-4 grid gap-0.5"
        style={{ gridTemplateColumns: `repeat(${satellite.cols}, minmax(0, 1fr))` }}
        onMouseLeave={() => setHovered(null)}
      >
        {satellite.zones.map((z) => (
          <button
            key={`${z.row}-${z.col}`}
            type="button"
            onMouseEnter={() => setHovered(z)}
            onFocus={() => setHovered(z)}
            aria-label={`Zone ${zoneName(z)}, NDVI ${z.ndvi.toFixed(2)}${z.flagged ? ', flagged' : ''}`}
            className={`aspect-square rounded-sm transition ${
              z.flagged ? 'ring-2 ring-clay ring-inset' : ''
            } ${hovered === z ? 'outline-2 outline-offset-1 outline-soil-900' : ''}`}
            style={{ backgroundColor: ndviColor(z.ndvi) }}
          />
        ))}
      </div>

      {/* readout for the zone under the cursor, kept below the map so it never covers anything */}
      <div className="mt-3 min-h-[2.5rem] rounded-lg bg-linen px-3 py-2 text-sm">
        {hovered ? (
          <span className="text-soil-900">
            <span className="font-semibold">Zone {zoneName(hovered)}</span> · NDVI {hovered.ndvi.toFixed(2)} ·{' '}
            {hovered.change >= 0 ? '+' : ''}
            {(hovered.change * 100).toFixed(0)}% vs 14 days ago · ~{satellite.zoneHa.toFixed(1)} ha
            {hovered.flagged && <span className="ml-1 font-medium text-clay">· needs a look</span>}
          </span>
        ) : (
          <span className="text-soil-400">
            {satellite.flaggedCount
              ? `${satellite.flaggedCount} zones (~${satellite.flaggedHa.toFixed(0)} ha) flagged. Hover a zone for details.`
              : 'No zones stand out from the rest of the field.'}
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-soil-600">
        <div className="flex items-center gap-2">
          <span>Low</span>
          <span className="flex">
            {[...ramp].reverse().map((step) => (
              <span key={step.color} className="h-3 w-5" style={{ backgroundColor: step.color }} />
            ))}
          </span>
          <span>High NDVI</span>
          <span className="ml-3 inline-block h-3 w-3 rounded-sm ring-2 ring-clay ring-inset" />
          <span>Flagged</span>
        </div>
        <span className="text-soil-400">
          Pass on {shortDate(satellite.capturedAt)} · {satellite.cloudCover}% cloud
        </span>
      </div>
    </section>
  )
}
