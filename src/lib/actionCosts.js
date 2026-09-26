/*
  Starting cost estimates for each recommended action, in rands.
  These are rough South African figures for the prototype, not quotes. The farmer
  can change any of them per problem, and the screens label untouched ones as defaults.

  basis 'fixed' = rate × qty, basis 'perHa' = rate × affected hectares.
  treatment: true marks a follow-up step that only happens if the check confirms the problem.
*/
export const costItems = {
  scouting: { label: 'Scouting visit (agronomist)', basis: 'fixed', rate: 1500 },
  labSamples: { label: 'Leaf and soil lab tests', basis: 'fixed', rate: 650, qty: 3, unit: 'sample' },
  fertiliser: { label: 'Fertiliser top-dress', basis: 'perHa', rate: 1200, treatment: true },
  fungicide: { label: 'Fungicide spray (product + spraying)', basis: 'perHa', rate: 750, treatment: true },
  irrigationRepair: { label: 'Irrigation check and repairs', basis: 'fixed', rate: 3000 },
  extraIrrigation: { label: 'Extra irrigation (pumping, ~25 mm)', basis: 'perHa', rate: 450 },
  drainage: { label: 'Clearing blocked drains', basis: 'fixed', rate: 2500 },
  labour: { label: 'Farm labour', basis: 'fixed', rate: 300, qty: 2, unit: 'person-day' },
}

// Which cost lines go with the recommended step for each problem type (see engine.js)
const plans = {
  nutrient: ['scouting', 'labSamples', 'fertiliser', 'labour'],
  disease: ['scouting', 'fungicide', 'labour'],
  irrigation: ['irrigationRepair', 'extraIrrigation', 'labour'],
  water: ['scouting', 'labour'],
  waterlogging: ['scouting', 'drainage', 'labour'],
}

/*
  The cost lines for one problem: defaults merged with the farmer's edits.
  overrides looks like { lines: { fertiliser: { rate: 900, enabled: false } } }.
*/
export function costLinesFor(type, overrides) {
  return (plans[type] ?? []).map((id) => {
    const base = costItems[id]
    const edit = overrides?.lines?.[id] ?? {}
    const line = { id, ...base, enabled: true, ...edit }
    line.isDefault = line.rate === base.rate && (line.qty ?? 1) === (base.qty ?? 1)
    return line
  })
}
