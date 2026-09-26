import { describe, expect, it } from 'vitest'
import { getPrices, latestPriceDate, priceForField } from './prices'
import { costLinesFor } from '../lib/actionCosts'
import { actionCost } from '../lib/finance'

describe('price service', () => {
  it('falls back to labelled starting estimates when nothing has been entered', async () => {
    const prices = await getPrices({})
    expect(prices.maize).toEqual({ pricePerTon: 4000, asOf: null, source: 'default' })
  })

  it('uses what the farmer entered, with the date', async () => {
    const prices = await getPrices({ wheat: { pricePerTon: 6100, updatedAt: '2026-09-20T08:00:00Z' } })
    expect(prices.wheat).toEqual({ pricePerTon: 6100, asOf: '2026-09-20T08:00:00Z', source: 'manual' })
    expect(latestPriceDate(prices)).toBe('2026-09-20T08:00:00Z')
  })

  it('treats a cleared price as missing, not R0', async () => {
    const prices = await getPrices({ soybean: { pricePerTon: null, updatedAt: '2026-09-20T08:00:00Z' } })
    expect(prices.soybean.pricePerTon).toBeNull()
    expect(priceForField({ crop: 'soybean' }, prices)).toBeNull()
  })

  it('prefers a field contract price over the market price', async () => {
    const prices = await getPrices({})
    expect(priceForField({ crop: 'maize', contractPrice: 4300 }, prices).pricePerTon).toBe(4300)
    expect(priceForField({ crop: 'maize', contractPrice: null }, prices).pricePerTon).toBe(4000)
  })

  it('has no price for an unknown crop', async () => {
    expect(priceForField({ crop: 'sorghum' }, await getPrices({}))).toBeNull()
  })
})

describe('action cost lines', () => {
  it('uses default estimates for a problem type', () => {
    const lines = costLinesFor('nutrient')
    expect(lines.map((l) => l.id)).toEqual(['scouting', 'labSamples', 'fertiliser', 'labour'])
    expect(lines.every((l) => l.isDefault && l.enabled)).toBe(true)
    // 1,500 + 3 × 650 + 1,200 × 10 ha + 2 × 300
    expect(actionCost(lines, 10)).toBe(16_050)
  })

  it('applies the farmer edits and marks edited lines', () => {
    const lines = costLinesFor('nutrient', { lines: { fertiliser: { enabled: false }, scouting: { rate: 1000 } } })
    expect(lines.find((l) => l.id === 'scouting')).toMatchObject({ rate: 1000, isDefault: false })
    expect(actionCost(lines, 10)).toBe(3550)
  })

  it('returns no lines for an unknown problem type, so the app asks for costs', () => {
    expect(actionCost(costLinesFor('unknown'), 10)).toBeNull()
  })
})
