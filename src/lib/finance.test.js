import { describe, expect, it } from 'vitest'
import {
  actionCost,
  assessAction,
  lineCost,
  netBenefit,
  returnPerRand,
  revenueExposure,
  revenueProtected,
  sumKnown,
  verdict,
  yieldAtRisk,
} from './finance'
import { rands, tonnes } from './format'

describe('yield at risk and revenue exposure', () => {
  it('matches the worked example: 13.3 ha × 5.5 t/ha × 4.5% at R5,900/t', () => {
    const t = yieldAtRisk(13.3, 5.5, 4.5)
    expect(t).toBeCloseTo(3.29175, 5)
    expect(tonnes(t)).toBe('3.3 t')

    const exposure = revenueExposure(t, 5900)
    expect(rands(exposure)).toBe('R19,421')
  })

  it('does not round tonnes before pricing them', () => {
    // 3.3 t × R5,900 would be R19,470
    expect(rands(revenueExposure(yieldAtRisk(13.3, 5.5, 4.5), 5900))).not.toBe('R19,470')
  })

  it('gives zero, not null, for a zero affected area', () => {
    expect(yieldAtRisk(0, 5.5, 4.5)).toBe(0)
    expect(revenueExposure(0, 5900)).toBe(0)
  })

  it('returns null when the price is missing, zero or not a number', () => {
    expect(revenueExposure(3.3, null)).toBeNull()
    expect(revenueExposure(3.3, undefined)).toBeNull()
    expect(revenueExposure(3.3, 0)).toBeNull()
    expect(revenueExposure(3.3, NaN)).toBeNull()
    expect(revenueExposure(3.3, '5900')).toBeNull()
  })

  it('returns null for missing or negative field numbers', () => {
    expect(yieldAtRisk(undefined, 5.5, 4.5)).toBeNull()
    expect(yieldAtRisk(13.3, null, 4.5)).toBeNull()
    expect(yieldAtRisk(-1, 5.5, 4.5)).toBeNull()
    expect(revenueExposure(null, 5900)).toBeNull()
  })
})

describe('action costs', () => {
  const lines = [
    { id: 'scouting', basis: 'fixed', rate: 1500 },
    { id: 'lab', basis: 'fixed', rate: 650, qty: 3 },
    { id: 'fert', basis: 'perHa', rate: 1200 },
  ]

  it('prices fixed lines by quantity and per-hectare lines by affected area', () => {
    expect(lineCost(lines[0], 10)).toBe(1500)
    expect(lineCost(lines[1], 10)).toBe(1950)
    expect(lineCost(lines[2], 10)).toBe(12_000)
    expect(actionCost(lines, 10)).toBe(15_450)
  })

  it('skips switched-off lines', () => {
    const withoutFert = lines.map((l) => (l.id === 'fert' ? { ...l, enabled: false } : l))
    expect(actionCost(withoutFert, 10)).toBe(3450)
  })

  it('treats zero cost as a real R0, not a missing value', () => {
    expect(actionCost([{ basis: 'fixed', rate: 0 }], 10)).toBe(0)
  })

  it('returns null when there are no costs or one is blank', () => {
    expect(actionCost([], 10)).toBeNull()
    expect(actionCost(undefined, 10)).toBeNull()
    expect(actionCost(lines.map((l) => ({ ...l, enabled: false })), 10)).toBeNull()
    expect(actionCost([{ basis: 'fixed', rate: null }], 10)).toBeNull()
    expect(actionCost([{ basis: 'fixed', rate: -5 }], 10)).toBeNull()
  })

  it('per-hectare lines cost nothing on zero area', () => {
    expect(actionCost([lines[2]], 0)).toBe(0)
  })
})

describe('protection, net benefit and return', () => {
  it('protects 80% of the exposure by default', () => {
    expect(revenueProtected(19_421)).toBeCloseTo(15_536.8)
  })

  it('clamps the recovery % to 0-100', () => {
    expect(revenueProtected(1000, 150)).toBe(1000)
    expect(revenueProtected(1000, -20)).toBe(0)
  })

  it('works out net benefit and rands protected per rand spent', () => {
    expect(netBenefit(15_500, 5000)).toBe(10_500)
    expect(returnPerRand(19_000, 5000)).toBeCloseTo(3.8)
  })

  it('has no return figure when the action is free or the cost is unknown', () => {
    expect(returnPerRand(15_500, 0)).toBeNull()
    expect(returnPerRand(15_500, null)).toBeNull()
    expect(netBenefit(null, 5000)).toBeNull()
  })
})

describe('verdict', () => {
  const lines = (rate) => [{ basis: 'fixed', rate }]

  it('asks for a price before anything else', () => {
    expect(assessAction({ exposure: null, lines: lines(5000), affectedHa: 10 }).verdict).toBe('needs-price')
  })

  it('asks for costs when none are usable', () => {
    expect(assessAction({ exposure: 19_421, lines: [], affectedHa: 10 }).verdict).toBe('needs-costs')
  })

  it('says worth it when R1 protects R1.50 or more', () => {
    const a = assessAction({ exposure: 19_421, lines: lines(5000), affectedHa: 13.3 })
    expect(a.verdict).toBe('worth-it')
    expect(a.cost).toBe(5000)
    expect(a.netBenefit).toBeCloseTo(10_536.8)
    expect(a.returnPerRand).toBeCloseTo(3.107, 3)
  })

  it('calls a small margin a close call', () => {
    expect(assessAction({ exposure: 10_000, lines: lines(7000), affectedHa: 1 }).verdict).toBe('close-call')
  })

  it('says monitor when the action costs more than it saves', () => {
    const a = assessAction({ exposure: 10_000, lines: lines(9000), affectedHa: 1 })
    expect(a.verdict).toBe('monitor')
    expect(a.netBenefit).toBe(-1000)
  })

  it('handles a zero-cost action', () => {
    const a = assessAction({ exposure: 10_000, lines: lines(0), affectedHa: 1 })
    expect(a.verdict).toBe('free')
    expect(a.returnPerRand).toBeNull()
    expect(a.netBenefit).toBe(8000)
  })

  it('handles zero affected area', () => {
    expect(verdict({ exposure: 0, cost: 1500, protectedRands: 0 })).toBe('no-loss')
  })

  it('respects a per-problem recovery %', () => {
    const a = assessAction({ exposure: 10_000, lines: lines(5000), affectedHa: 1, recoveryPct: 40 })
    expect(a.protectedRands).toBe(4000)
    expect(a.verdict).toBe('monitor')
  })
})

describe('sumKnown', () => {
  it('adds known values and counts missing ones', () => {
    expect(sumKnown([100, null, 250, undefined, NaN])).toEqual({ total: 350, known: 2, missing: 3 })
  })

  it('returns a null total when nothing is known, rather than R0', () => {
    expect(sumKnown([null, null]).total).toBeNull()
    expect(sumKnown([]).total).toBeNull()
  })
})
