/*
  Every money calculation in the app lives here, so it can be tested on its own.

  Units: area in hectares, yield in tonnes, money in rands, percentages as 0-100.
  Rule of thumb: if an input is missing or nonsense, the answer is null, never NaN
  and never a made-up 0. The screens turn null into an "Add a price" / "Add costs" prompt.
*/

export const DEFAULT_RECOVERY_PCT = 80

// Return (rands protected per rand spent) needed before we call an action worth it
export const WORTH_IT_RETURN = 1.5

const isNum = (x) => typeof x === 'number' && Number.isFinite(x)
const nonNegative = (x) => isNum(x) && x >= 0

// affected area (ha) × expected yield (t/ha) × loss %
export function yieldAtRisk(affectedHa, expectedYield, lossPct) {
  if (!nonNegative(affectedHa) || !nonNegative(expectedYield) || !nonNegative(lossPct)) return null
  return affectedHa * expectedYield * (lossPct / 100)
}

// yield at risk (t) × price (R/t). A price of 0 is treated as "no price yet".
export function revenueExposure(tonnes, pricePerTon) {
  if (!nonNegative(tonnes) || !isNum(pricePerTon) || pricePerTon <= 0) return null
  return tonnes * pricePerTon
}

/*
  A cost line is either a fixed amount (rate × qty, e.g. 3 lab samples at R650)
  or a per-hectare amount (rate × affected hectares, e.g. fertiliser at R1,200/ha).
*/
export function lineCost(line, affectedHa) {
  if (!line || !nonNegative(line.rate)) return null
  if (line.basis === 'perHa') return nonNegative(affectedHa) ? line.rate * affectedHa : null
  const qty = line.qty ?? 1
  return nonNegative(qty) ? line.rate * qty : null
}

// Sum of the switched-on lines. No lines, or a line with a missing amount, means we don't know the cost.
export function actionCost(lines, affectedHa) {
  const active = (lines ?? []).filter((l) => l.enabled !== false)
  if (!active.length) return null

  let total = 0
  for (const line of active) {
    const cost = lineCost(line, affectedHa)
    if (cost === null) return null
    total += cost
  }
  return total
}

// Share of the exposure the action is expected to save
export function revenueProtected(exposure, recoveryPct = DEFAULT_RECOVERY_PCT) {
  if (!nonNegative(exposure) || !isNum(recoveryPct)) return null
  const pct = Math.min(100, Math.max(0, recoveryPct))
  return exposure * (pct / 100)
}

export function netBenefit(protectedRands, cost) {
  if (!isNum(protectedRands) || !isNum(cost)) return null
  return protectedRands - cost
}

// "Every R1 spent protects R3.80". Undefined when the action is free.
export function returnPerRand(protectedRands, cost) {
  if (!isNum(protectedRands) || !isNum(cost) || cost <= 0) return null
  return protectedRands / cost
}

/*
  Verdict codes (the wording lives in the UI):
    needs-price  no crop price, so we can't value the loss
    needs-costs  no usable action costs
    no-loss      nothing to protect (e.g. zero affected area)
    free         costs entered and they come to R0
    worth-it     protects at least WORTH_IT_RETURN rands per rand spent
    close-call   protects more than it costs, but not by much
    monitor      costs more than it is likely to save
*/
export function verdict({ exposure, cost, protectedRands }) {
  if (exposure === null || exposure === undefined) return 'needs-price'
  if (cost === null || cost === undefined) return 'needs-costs'
  if (exposure === 0) return 'no-loss'
  if (cost === 0) return 'free'

  const ratio = returnPerRand(protectedRands, cost)
  if (ratio === null) return 'needs-costs'
  if (ratio >= WORTH_IT_RETURN) return 'worth-it'
  if (ratio >= 1) return 'close-call'
  return 'monitor'
}

// Verdicts where we'd tell the farmer to go ahead
export const ACT_VERDICTS = new Set(['worth-it', 'close-call', 'free'])

// Everything the "is it worth acting?" panel needs, in one go
export function assessAction({ exposure, lines, affectedHa, recoveryPct = DEFAULT_RECOVERY_PCT }) {
  const cost = actionCost(lines, affectedHa)
  const protectedRands = revenueProtected(exposure, recoveryPct)
  return {
    cost,
    recoveryPct,
    protectedRands,
    netBenefit: netBenefit(protectedRands, cost),
    returnPerRand: returnPerRand(protectedRands, cost),
    verdict: verdict({ exposure, cost, protectedRands }),
  }
}

// Adds up the numbers we know and counts the ones we don't, so totals never hide gaps
export function sumKnown(values) {
  let total = 0
  let known = 0
  let missing = 0
  for (const v of values) {
    if (isNum(v)) {
      total += v
      known += 1
    } else missing += 1
  }
  return { total: known ? total : null, known, missing }
}
