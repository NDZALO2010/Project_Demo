import { LANGUAGES, useLanguage } from '../state/LanguageContext'

export default function LanguageSelect({ className = '' }) {
  const { language, setLanguage } = useLanguage()

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <svg
        className="pointer-events-none absolute left-3 h-4 w-4 text-leaf-900"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z" />
      </svg>

      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        aria-label="Language"
        className="cursor-pointer appearance-none rounded-lg bg-white py-2.5 pr-9 pl-9 text-sm font-medium text-leaf-900 transition hover:bg-leaf-50 focus:ring-2 focus:ring-leaf-500 focus:outline-none"
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.name}
          </option>
        ))}
      </select>

      <svg
        className="pointer-events-none absolute right-3 h-4 w-4 text-leaf-900"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M5.2 7.5a.75.75 0 0 1 1.06-.02L10 11.1l3.74-3.62a.75.75 0 1 1 1.04 1.08l-4.26 4.12a.75.75 0 0 1-1.04 0L5.22 8.56a.75.75 0 0 1-.02-1.06z" />
      </svg>
    </div>
  )
}
