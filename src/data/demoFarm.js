// A sample farm near Bothaville so the prototype can be shown without typing in a whole operation.
// Planting dates are relative to today so the demo always lands mid-season.

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

export const demoFarm = {
  name: 'Mooiplaas Farming',
  region: 'Bothaville, Free State',
}

export const demoFields = [
  { id: 'a3', name: 'A3', crop: 'maize', hectares: 180, lat: -27.372, lon: 26.601, plantingDate: daysAgo(74), expectedYield: 8, cropPrice: 4000, irrigated: true },
  { id: 'a7', name: 'A7', crop: 'maize', hectares: 240, lat: -27.388, lon: 26.622, plantingDate: daysAgo(81), expectedYield: 7.5, cropPrice: 4000, irrigated: false },
  { id: 'a12', name: 'A12', crop: 'maize', hectares: 150, lat: -27.401, lon: 26.644, plantingDate: daysAgo(70), expectedYield: 8, cropPrice: 4000, irrigated: true },
  { id: 'b2', name: 'B2', crop: 'soybean', hectares: 210, lat: -27.356, lon: 26.667, plantingDate: daysAgo(62), expectedYield: 3.2, cropPrice: 8200, irrigated: false },
  { id: 'b5', name: 'B5', crop: 'soybean', hectares: 165, lat: -27.341, lon: 26.689, plantingDate: daysAgo(58), expectedYield: 3, cropPrice: 8200, irrigated: false },
  { id: 'c1', name: 'C1', crop: 'wheat', hectares: 120, lat: -27.421, lon: 26.612, plantingDate: daysAgo(96), expectedYield: 6, cropPrice: 5900, irrigated: true },
  { id: 'c4', name: 'C4', crop: 'sunflower', hectares: 260, lat: -27.433, lon: 26.587, plantingDate: daysAgo(66), expectedYield: 2.2, cropPrice: 8600, irrigated: false },
  { id: 'c9', name: 'C9', crop: 'maize', hectares: 195, lat: -27.447, lon: 26.631, plantingDate: daysAgo(77), expectedYield: 7.8, cropPrice: 4000, irrigated: false },
]
