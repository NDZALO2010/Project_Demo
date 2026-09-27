import { crops, daysSincePlanting } from '../lib/crops'

/*
  SIMULATED satellite layer.

  Real Sentinel-2 NDVI needs a Sentinel Hub / Copernicus account, so for the
  prototype we generate a believable NDVI grid per field instead. It follows the
  crop's growth curve, is seeded by the field id (so it looks the same on every
  reload) and gets worse when the weather has been dry.

  Swap simulateSatellite() for a real imagery call later. The shape it returns
  is what the rest of the app expects.
*/

export const GRID_COLS = 10
export const GRID_ROWS = 6

// A zone is flagged when it sits this far below the field's typical NDVI
const FLAG_THRESHOLD = 0.06

// Tiny seeded random generator (FNV hash + xorshift). Deterministic per field.
function seededRandom(seed) {
  let h = 2166136261
  for (const ch of seed) {
    h ^= ch.charCodeAt(0)
    h = Math.imul(h, 16777619)
  }
  return () => {
    h ^= h << 13
    h ^= h >>> 17
    h ^= h << 5
    return ((h >>> 0) % 10_000) / 10_000
  }
}

// Healthy NDVI for a crop N days after planting: green-up, plateau, then senescence
function expectedNdvi(days, seasonDays) {
  const p = days / seasonDays
  if (p < 0.5) return 0.18 + 0.64 * Math.sin((p / 0.5) * (Math.PI / 2))
  if (p < 0.75) return 0.82
  return Math.max(0.3, 0.82 - (p - 0.75) * 1.6)
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

export function simulateSatellite(field, weatherSummary) {
  const rand = seededRandom(`${field.id}-${field.name}`)
  const seasonDays = crops[field.crop]?.seasonDays ?? 140
  const days = daysSincePlanting(field.plantingDate)

  const baseNow = expectedNdvi(days, seasonDays)
  const baseBefore = expectedNdvi(Math.max(0, days - 14), seasonDays)

  // 0 when rain kept up with evapotranspiration, up to 1.5 in a proper dry spell
  const dryness = Math.min(1.5, Math.max(0, -(weatherSummary?.waterBalance ?? 0) / 60))

  const hasAnomaly = rand() < 0.45 + 0.2 * Math.min(dryness, 1)
  const pattern = field.irrigated && rand() < 0.5 ? 'strip' : 'patch'
  const cx = 1 + rand() * (GRID_COLS - 2)
  const cy = 0.5 + rand() * (GRID_ROWS - 1)
  const radius = 1.8 + rand() * 1.6
  const severity = (0.08 + rand() * 0.14) * (0.75 + 0.35 * dryness)

  const zones = []
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const noise = (rand() - 0.5) * 0.05

      let impact = 0
      if (hasAnomaly) {
        if (pattern === 'patch') {
          const d = Math.hypot(col - cx, row - cy)
          impact = d < radius ? 1 - (d / radius) ** 2 : 0
        } else {
          // a strip of columns, what a blocked pivot span or nozzle line tends to look like
          const d = Math.abs(col - cx)
          impact = d < 1.2 ? 1 - d / 1.2 : 0
        }
      }

      const before = Math.max(0.05, baseBefore + noise * 0.8)
      const ndvi = Math.max(0.05, baseNow + noise - baseNow * severity * impact)
      zones.push({ row, col, ndvi, change: (ndvi - before) / before })
    }
  }

  const typical = median(zones.map((z) => z.ndvi))
  for (const z of zones) z.flagged = z.ndvi < typical * (1 - FLAG_THRESHOLD)

  const flagged = zones.filter((z) => z.flagged)
  const zoneHa = field.hectares / zones.length
  const flaggedMean = flagged.length ? flagged.reduce((a, z) => a + z.ndvi, 0) / flagged.length : typical

  // Sentinel-2 revisits every ~5 days, so the "latest pass" is usually a couple of days old
  const capturedAt = new Date()
  capturedAt.setDate(capturedAt.getDate() - (1 + Math.floor(rand() * 4)))

  return {
    source: 'simulated',
    capturedAt: capturedAt.toISOString(),
    cloudCover: Math.round(rand() * 12),
    cols: GRID_COLS,
    rows: GRID_ROWS,
    zones,
    zoneHa,
    typicalNdvi: typical,
    meanNdvi: zones.reduce((a, z) => a + z.ndvi, 0) / zones.length,
    flaggedCount: flagged.length,
    flaggedHa: flagged.length * zoneHa,
    // how far the flagged zones sit below the rest of the field, as a fraction
    declinePct: flagged.length ? (typical - flaggedMean) / typical : 0,
    pattern: hasAnomaly ? pattern : null,
  }
}
