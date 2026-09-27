import { useState } from 'react'

const levelStyle = {
  High: 'bg-clay/10 text-clay',
  Low: 'bg-rain/10 text-rain',
  Deficit: 'bg-clay/10 text-clay',
  Surplus: 'bg-rain/10 text-rain',
  Normal: 'bg-linen text-soil-600',
  Balanced: 'bg-linen text-soil-600',
}

function weekday(date) {
  // noon, so the day doesn't slip in timezones west of UTC
  return new Date(`${date}T12:00`).toLocaleDateString('en-ZA', { weekday: 'short' })
}

// Daily rain against crop water demand (ET0): last 14 days, then the forecast
function WaterChart({ days, todayIndex }) {
  const [hovered, setHovered] = useState(null)
  const max = Math.max(4, ...days.map((d) => Math.max(d.rain, d.et0)))
  const active = hovered !== null ? days[hovered] : null

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-soil-900">Rain vs. crop water demand</p>
        <div className="flex gap-3 text-xs text-soil-600">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-rain" />Rain</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-harvest" />ET₀</span>
        </div>
      </div>

      <div className="relative mt-3 flex h-28 items-end gap-0.5 border-b border-wheat" onMouseLeave={() => setHovered(null)}>
        {days.map((d, i) => (
          <div
            key={d.date}
            className={`relative flex h-full flex-1 items-end justify-center gap-px ${i === todayIndex ? 'border-l border-dashed border-soil-400' : ''} ${
              hovered === i ? 'bg-linen' : ''
            }`}
            onMouseEnter={() => setHovered(i)}
          >
            <span
              className={`w-full max-w-[7px] rounded-t-sm bg-rain ${i >= todayIndex ? 'opacity-50' : ''}`}
              style={{ height: `${(d.rain / max) * 100}%` }}
            />
            <span
              className={`w-full max-w-[7px] rounded-t-sm bg-harvest ${i >= todayIndex ? 'opacity-50' : ''}`}
              style={{ height: `${(d.et0 / max) * 100}%` }}
            />
          </div>
        ))}
      </div>

      <div className="mt-1 flex justify-between text-xs text-soil-400">
        <span>14 days ago</span>
        <span>Today → forecast</span>
      </div>

      <p className="mt-2 min-h-[1.25rem] text-xs text-soil-600">
        {active
          ? `${weekday(active.date)} ${active.date.slice(5)} · Rain ${active.rain.toFixed(1)} mm · ET₀ ${active.et0.toFixed(1)} mm${
              hovered >= todayIndex ? ' (forecast)' : ''
            }`
          : 'Hover a day to see the numbers.'}
      </p>
    </div>
  )
}

export default function WeatherPanel({ weather, summary, title = 'Weather monitoring' }) {
  const current = [
    { label: 'Temperature', value: `${Math.round(weather.current.temperature)}°C` },
    { label: 'Humidity', value: `${Math.round(weather.current.humidity)}%` },
    { label: 'Wind', value: `${Math.round(weather.current.wind)} km/h` },
    { label: 'Rain, next 7 days', value: `${summary.forecastRain.toFixed(0)} mm` },
  ]

  const indicators = [
    { label: 'Temperature', level: summary.levels.temperature, detail: `${summary.tempMax.toFixed(1)}°C avg max` },
    { label: 'Rainfall', level: summary.levels.rainfall, detail: `${summary.rain14.toFixed(1)} mm / 14 days` },
    { label: 'Evapotranspiration', level: summary.levels.evapotranspiration, detail: `${summary.et0PerDay.toFixed(1)} mm/day` },
    { label: 'Humidity', level: summary.levels.humidity, detail: `${summary.humidity.toFixed(0)}% avg` },
    { label: 'Water balance', level: summary.levels.waterBalance, detail: `${summary.waterBalance.toFixed(0)} mm` },
  ]

  return (
    <section className="rounded-xl border border-wheat bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="font-serif text-lg font-semibold text-leaf-900">{title}</h2>
        <span className="rounded-full bg-leaf-50 px-2.5 py-0.5 text-xs font-medium text-leaf-800">
          {weather.source === 'live' ? 'Live · Open-Meteo' : 'Offline sample data'}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {current.map((c) => (
          <div key={c.label} className="rounded-lg bg-linen px-3 py-2">
            <p className="text-xs text-soil-400">{c.label}</p>
            <p className="font-semibold text-soil-900">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-6 md:grid-cols-2">
        <div>
          <p className="text-sm font-medium text-soil-900">Last 7–14 days</p>
          <ul className="mt-2 divide-y divide-wheat/60">
            {indicators.map((i) => (
              <li key={i.label} className="flex items-center justify-between gap-3 py-1.5 text-sm">
                <span className="text-soil-600">{i.label}</span>
                <span className="flex items-center gap-2">
                  <span className="hidden text-xs text-soil-400 sm:inline">{i.detail}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${levelStyle[i.level]}`}>{i.level}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <WaterChart days={[...weather.past, ...weather.forecast]} todayIndex={weather.past.length} />
      </div>

      <div className="mt-5 grid grid-cols-7 gap-1 text-center text-xs">
        {weather.forecast.map((d) => (
          <div key={d.date} className="rounded-lg bg-linen px-1 py-2">
            <p className="font-medium text-soil-600">{weekday(d.date)}</p>
            <p className="mt-1 font-semibold text-soil-900">{Math.round(d.tempMax)}°</p>
            <p className="text-soil-400">{Math.round(d.tempMin)}°</p>
            <p className={`mt-1 ${d.rain >= 1 ? 'font-medium text-rain' : 'text-soil-400'}`}>{d.rain.toFixed(0)} mm</p>
          </div>
        ))}
      </div>
    </section>
  )
}
