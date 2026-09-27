import { growthStage } from './crops'
import { revenueExposure as exposureFor, yieldAtRisk as yieldFor } from './finance'

/*
  Crop risk + impact engine.

  For the prototype this is a transparent rule set rather than a trained model:
  it combines the satellite signal (where) with the weather signal (why) and the
  farm's own numbers (how much it's worth). Everything it outputs is a scenario
  estimate until it has been checked against real historical yields.
*/

const riskTypes = {
  irrigation: {
    title: 'Possible irrigation shortfall',
    nextStep: 'Inspect the irrigation system and verify soil-moisture conditions in the highlighted area.',
  },
  water: {
    title: 'Possible water-stress risk',
    nextStep:
      'Verify soil-moisture conditions in the highlighted area and check for leaf rolling during the heat of the day.',
  },
  disease: {
    title: 'Possible fungal disease pressure',
    nextStep: 'Scout the highlighted area for leaf lesions and confirm with your agronomist before spraying.',
  },
  waterlogging: {
    title: 'Possible waterlogging',
    nextStep: 'Check the highlighted area for standing water and blocked drainage lines.',
  },
  nutrient: {
    title: 'Possible nutrient deficiency or pest damage',
    nextStep: 'Scout the highlighted zone and take leaf and soil samples to pin down the cause.',
  },
}

export const priorityOrder = { High: 0, Medium: 1, Low: 2 }

function pickType(field, w) {
  const { levels } = w
  if (levels.rainfall === 'High' || levels.waterBalance === 'Surplus') return 'waterlogging'
  if (levels.humidity === 'High' && w.tempMax >= 18 && w.tempMax <= 32) return 'disease'
  if (levels.waterBalance === 'Deficit' || levels.rainfall === 'Low') {
    return field.irrigated ? 'irrigation' : 'water'
  }
  return 'nutrient'
}

// Which weather readings back up (or don't) the type of risk we picked
function weatherIndicators(type, w) {
  const { levels } = w
  const dryTypes = type === 'water' || type === 'irrigation'

  return [
    {
      label: 'Temperature',
      level: levels.temperature,
      detail: `${w.tempMax.toFixed(1)}°C avg daily max`,
      supports: dryTypes ? levels.temperature === 'High' : type === 'disease' && levels.temperature === 'Normal',
    },
    {
      label: 'Rainfall',
      level: levels.rainfall,
      detail: `${w.rain14.toFixed(1)} mm in 14 days`,
      supports: dryTypes ? levels.rainfall === 'Low' : type === 'waterlogging' && levels.rainfall === 'High',
    },
    {
      label: 'Evapotranspiration',
      level: levels.evapotranspiration,
      detail: `${w.et0PerDay.toFixed(1)} mm/day`,
      supports: dryTypes && levels.evapotranspiration === 'High',
    },
    {
      label: 'Water balance',
      level: levels.waterBalance,
      detail: `${w.waterBalance > 0 ? '+' : ''}${w.waterBalance.toFixed(0)} mm (rain minus crop demand)`,
      supports: dryTypes ? levels.waterBalance === 'Deficit' : type === 'waterlogging' && levels.waterBalance === 'Surplus',
    },
    {
      label: 'Humidity',
      level: levels.humidity,
      detail: `${w.humidity.toFixed(0)}% avg`,
      supports: type === 'disease' && levels.humidity === 'High',
    },
  ]
}

function outlookFor(type, w) {
  const dryTypes = type === 'water' || type === 'irrigation'
  if (dryTypes && w.forecastRain >= 20) {
    return `${w.forecastRain.toFixed(0)} mm of rain is forecast this week, which may ease the pressure.`
  }
  if (dryTypes && w.forecastRain < 5) {
    return `Little rain in the 7-day forecast (${w.forecastRain.toFixed(0)} mm) and highs up to ${w.forecastTempMax.toFixed(0)}°C. This is likely to get worse.`
  }
  if (type === 'waterlogging' && w.forecastRain >= 20) {
    return `Another ${w.forecastRain.toFixed(0)} mm is forecast, so standing water may not clear on its own.`
  }
  return null
}

// price: { pricePerTon, asOf, source } from services/prices.js, or null when there isn't one yet
export function detectRisk(field, w, satellite, price = null) {
  // a single low zone is usually cloud shadow or a headland, not a crop problem
  if (!w || !satellite || satellite.flaggedCount < 2) return null

  const type = pickType(field, w)
  const indicators = weatherIndicators(type, w)
  const support = indicators.filter((i) => i.supports).length
  const stage = growthStage(field)

  // Scenario: bigger NDVI gap + more weather backing = bigger potential loss.
  // Flowering is when most crops are least forgiving.
  let scenarioPct = satellite.declinePct * 100 * 0.45 + support * 1.5
  if (stage === 'Flowering') scenarioPct += 2
  scenarioPct = Math.round(Math.min(20, Math.max(2, scenarioPct)) * 10) / 10

  const affectedHa = Math.round(satellite.flaggedHa * 10) / 10
  const yieldAtRisk = yieldFor(affectedHa, field.expectedYield, scenarioPct)
  // null until the crop has a price
  const revenueExposure = exposureFor(yieldAtRisk, price?.pricePerTon)

  // Without a price we can only rank on the size of the loss
  const rands = revenueExposure ?? 0
  let priority = 'Low'
  if (rands >= 50_000 || scenarioPct >= 10) priority = 'High'
  else if (rands >= 15_000) priority = 'Medium'

  // The satellite decline is always one signal; each weather reading that agrees adds another.
  // Weather that doesn't explain the decline means we're guessing more.
  let confidence = support >= 3 ? 'High' : support >= 1 ? 'Medium' : 'Low'
  if (type === 'nutrient') confidence = 'Low'

  return {
    key: `${field.id}:${type}`,
    type,
    title: riskTypes[type].title,
    nextStep: riskTypes[type].nextStep,
    field,
    stage,
    affectedHa,
    scenarioPct,
    yieldAtRisk,
    price,
    revenueExposure,
    priority,
    confidence,
    vegetation: {
      declinePct: satellite.declinePct,
      pattern: satellite.pattern,
    },
    indicators,
    outlook: outlookFor(type, w),
  }
}

// Problems without a price yet sort last within their priority
export function rankRisks(list) {
  const rands = (r) => r.revenueExposure ?? -1
  return [...list].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority] || rands(b) - rands(a))
}
