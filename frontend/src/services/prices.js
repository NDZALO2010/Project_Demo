/*
  Crop price service: the one place the app asks "what is a tonne of X worth?".

  Every provider returns the same shape:
    { maize: { pricePerTon, asOf, source }, wheat: {...}, ... }
  pricePerTon is null when we don't have a price. source is one of the keys in sourceLabels.

  Today only the manual provider exists. To plug in a live feed, implement
  safexProvider.getPrices and switch activeProvider. Nothing else in the app has to change.
*/

export const PRICE_CROPS = ['maize', 'wheat', 'soybean', 'sunflower']

// Starting estimates so a new farm isn't blank. Shown as estimates until the farmer updates them.
export const STARTING_PRICES = { maize: 4000, wheat: 5900, soybean: 8200, sunflower: 8600 }

export const sourceLabels = {
  default: 'Starting estimate',
  manual: 'Entered by you',
  safex: 'JSE/SAFEX',
  contract: 'Contract price',
}

// entries: what the farmer typed on the Crop prices screen, { maize: { pricePerTon, updatedAt } }
const manualProvider = {
  id: 'manual',
  async getPrices(entries = {}) {
    return Object.fromEntries(
      PRICE_CROPS.map((crop) => {
        const entry = entries[crop]
        if (entry) {
          const price = Number(entry.pricePerTon)
          return [crop, { pricePerTon: price > 0 ? price : null, asOf: entry.updatedAt, source: 'manual' }]
        }
        return [crop, { pricePerTon: STARTING_PRICES[crop] ?? null, asOf: null, source: 'default' }]
      }),
    )
  },
}

const safexProvider = {
  id: 'safex',
  async getPrices() {
    // TODO: connect an official, licensed JSE/SAFEX grain price feed (or our own backend that
    // holds one) and map it to { crop: { pricePerTon, asOf, source: 'safex' } }.
    // Don't scrape the JSE site or use unofficial APIs.
    throw new Error('Live grain prices are not connected yet')
  },
}

const activeProvider = manualProvider

export function getPrices(entries) {
  return activeProvider.getPrices(entries)
}

/*
  The price a field's numbers should use: its own contract price if it has one,
  otherwise the market price for its crop. Returns null if neither is known.
*/
export function priceForField(field, prices) {
  const contract = Number(field.contractPrice)
  if (contract > 0) return { pricePerTon: contract, asOf: null, source: 'contract' }

  const market = prices?.[field.crop]
  return market?.pricePerTon > 0 ? market : null
}

// The most recent date any price was set, for the dashboard line
export function latestPriceDate(prices) {
  const dates = Object.values(prices ?? {})
    .map((p) => p.asOf)
    .filter(Boolean)
    .sort()
  return dates.at(-1) ?? null
}
