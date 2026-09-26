// Starting values the field form pre-fills. Farmers overwrite these with their own numbers.
export const crops = {
  maize: { name: 'Maize', yieldPerHa: 8, pricePerTon: 4000, seasonDays: 150 },
  wheat: { name: 'Wheat', yieldPerHa: 5.5, pricePerTon: 5900, seasonDays: 140 },
  soybean: { name: 'Soybean', yieldPerHa: 3, pricePerTon: 8200, seasonDays: 130 },
  sunflower: { name: 'Sunflower', yieldPerHa: 2.2, pricePerTon: 8600, seasonDays: 125 },
}

export function cropName(key) {
  return crops[key]?.name ?? key
}

export function daysSincePlanting(plantingDate, today = new Date()) {
  const planted = new Date(plantingDate)
  return Math.max(0, Math.floor((today - planted) / 86_400_000))
}

// Rough label for where the crop is in its season
export function growthStage(field) {
  const days = daysSincePlanting(field.plantingDate)
  const progress = days / (crops[field.crop]?.seasonDays ?? 140)
  if (progress < 0.15) return 'Emergence'
  if (progress < 0.45) return 'Vegetative'
  if (progress < 0.7) return 'Flowering'
  if (progress < 1) return 'Grain fill'
  return 'Maturity'
}
