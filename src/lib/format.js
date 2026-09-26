// Callers show an "Add a price" / "Add costs" prompt for missing numbers; this dash is only a safety net
const MISSING = '—'
const known = (value) => typeof value === 'number' && Number.isFinite(value)

export function rands(value) {
  if (!known(value)) return MISSING
  const sign = value < 0 ? '-' : ''
  return `${sign}R${Math.round(Math.abs(value)).toLocaleString('en-US')}`
}

// R2.84m / R184k, for tight spots like stat cards
export function randsShort(value) {
  if (!known(value)) return MISSING
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}R${(abs / 1_000_000).toFixed(2)}m`
  if (abs >= 10_000) return `${sign}R${Math.round(abs / 1_000)}k`
  return rands(value)
}

export function hectares(value) {
  return `${Math.round(value).toLocaleString('en-US')} ha`
}

export function tonnes(value) {
  if (!known(value)) return MISSING
  return `${value.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} t`
}

// Every R1 spent protects R3.80
export function randsPerRand(value) {
  if (!known(value)) return MISSING
  return `R${value.toFixed(2)}`
}

export function shortDate(value) {
  return new Date(value).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
}

export function timeAgo(value) {
  const mins = Math.round((Date.now() - new Date(value)) / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} h ago`
  return shortDate(value)
}
