import { api } from './api'

// Weather comes from Open-Meteo (free, no API key, includes FAO evapotranspiration) through our
// backend, which caches it per ~10 km square. It asks for the last 14 days plus a 7 day forecast.
const PAST_DAYS = 14

export async function fetchWeather(lat, lon) {
  const data = await api(`/weather?${new URLSearchParams({ lat, lon })}`)

  const days = data.daily.time.map((date, i) => ({
    date,
    tempMax: data.daily.temperature_2m_max[i],
    tempMin: data.daily.temperature_2m_min[i],
    rain: data.daily.precipitation_sum[i] ?? 0,
    et0: data.daily.et0_fao_evapotranspiration[i] ?? 0,
    humidity: data.daily.relative_humidity_2m_mean[i],
    wind: data.daily.wind_speed_10m_max[i],
  }))

  return {
    source: 'live',
    current: {
      temperature: data.current.temperature_2m,
      humidity: data.current.relative_humidity_2m,
      wind: data.current.wind_speed_10m,
      rain: data.current.precipitation,
    },
    past: days.slice(0, PAST_DAYS),
    forecast: days.slice(PAST_DAYS),
  }
}

// Used when there's no connection (hackathon wifi...). A dry, warm spell so the demo still tells a story.
export function sampleWeather() {
  const today = new Date()
  const days = Array.from({ length: PAST_DAYS + 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - PAST_DAYS + i)
    const wave = Math.sin(i / 2.5)
    return {
      date: d.toISOString().slice(0, 10),
      tempMax: Math.round((29 + wave * 3) * 10) / 10,
      tempMin: Math.round((13 + wave * 2) * 10) / 10,
      rain: i % 9 === 4 ? 3.2 : 0,
      et0: Math.round((5.2 + wave * 0.6) * 10) / 10,
      humidity: Math.round(34 + wave * 8),
      wind: Math.round(18 + wave * 6),
    }
  })

  return {
    source: 'sample',
    current: { temperature: 27.5, humidity: 31, wind: 16, rain: 0 },
    past: days.slice(0, PAST_DAYS),
    forecast: days.slice(PAST_DAYS),
  }
}

const sum = (list, key) => list.reduce((acc, d) => acc + (d[key] ?? 0), 0)
const avg = (list, key) => (list.length ? sum(list, key) / list.length : 0)

function level(value, low, high) {
  if (value >= high) return 'High'
  if (value <= low) return 'Low'
  return 'Normal'
}

// Boils two weeks of weather down to the handful of signals the risk engine cares about
export function summarizeWeather(weather) {
  const lastWeek = weather.past.slice(-7)

  const tempMax = avg(lastWeek, 'tempMax')
  const rain14 = sum(weather.past, 'rain')
  const et0PerDay = avg(lastWeek, 'et0')
  const et0Sum14 = sum(weather.past, 'et0')
  const humidity = avg(lastWeek, 'humidity')
  const waterBalance = rain14 - et0Sum14

  return {
    tempMax,
    rain14,
    et0PerDay,
    humidity,
    windMax: Math.max(...lastWeek.map((d) => d.wind ?? 0)),
    waterBalance,
    forecastRain: sum(weather.forecast, 'rain'),
    forecastTempMax: Math.max(...weather.forecast.map((d) => d.tempMax)),
    levels: {
      temperature: level(tempMax, 15, 30),
      rainfall: level(rain14, 15, 60),
      evapotranspiration: level(et0PerDay, 2.5, 5),
      humidity: level(humidity, 35, 75),
      // negative = crop used more water than fell as rain
      waterBalance: waterBalance < -25 ? 'Deficit' : waterBalance > 30 ? 'Surplus' : 'Balanced',
    },
  }
}
