import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../services/api'

// South Africa's spoken official languages, labelled in their own language.
// Keep in step with Language in backend/app/schemas.py
export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'af', name: 'Afrikaans' },
  { code: 'nr', name: 'isiNdebele' },
  { code: 'xh', name: 'isiXhosa' },
  { code: 'zu', name: 'isiZulu' },
  { code: 'nso', name: 'Sepedi' },
  { code: 'st', name: 'Sesotho' },
  { code: 'tn', name: 'Setswana' },
  { code: 'ss', name: 'siSwati' },
  { code: 've', name: 'Tshivenḓa' },
  { code: 'ts', name: 'Xitsonga' },
]

// The app is written in English; every other language is translated by the backend
const SOURCE_LANGUAGE = 'en'
const STORAGE_KEY = 'agrinexus.language.v1'
const CACHE_KEY = (lang) => `agrinexus.translations.v1.${lang}`
// so corrections made on the server reach browsers that cached an earlier translation
const CACHE_DAYS = 7
const MAX_TEXTS_PER_REQUEST = 200 // translate_max_texts in backend/app/config.py

function load() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return LANGUAGES.some((l) => l.code === saved) ? saved : SOURCE_LANGUAGE
  } catch {
    return SOURCE_LANGUAGE
  }
}

function loadCache(lang) {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY(lang)))
    if (cached && Date.now() - cached.savedAt < CACHE_DAYS * 86_400_000) return cached.entries
  } catch {
    // missing or unreadable: fetch again
  }
  return {}
}

function saveCache(lang, entries) {
  try {
    localStorage.setItem(CACHE_KEY(lang), JSON.stringify({ savedAt: Date.now(), entries }))
  } catch {
    // storage full or blocked: translations are fetched again next visit
  }
}

// "Hello {name}" + { name: 'Thandi' }. Filled in after translating, so the cache holds one entry
// per sentence rather than one per name.
function interpolate(text, vars) {
  if (!vars) return text
  return text.replace(/\{(\w+)\}/g, (match, key) => (key in vars ? String(vars[key]) : match))
}

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(load)
  // bumped whenever translations arrive, so everything calling t() renders again
  const [version, setVersion] = useState(0)
  const [pendingRequests, setPendingRequests] = useState(0)
  const [failed, setFailed] = useState(false)

  const dictionaries = useRef({}) // { zu: { 'Log in': 'Ngena', ... } }
  const queued = useRef(new Set()) // texts waiting for the next request, for the current language
  const asked = useRef({}) // { zu: Set } texts already requested, so a miss isn't requested again on every render
  const timer = useRef(null)

  const dictionary = useCallback((lang) => (dictionaries.current[lang] ??= loadCache(lang)), [])

  const flush = useCallback(async (lang) => {
    timer.current = null
    const texts = [...queued.current]
    queued.current.clear()
    if (!texts.length) return

    setPendingRequests((n) => n + 1)
    try {
      for (let i = 0; i < texts.length; i += MAX_TEXTS_PER_REQUEST) {
        const chunk = texts.slice(i, i + MAX_TEXTS_PER_REQUEST)
        const { translations } = await api('/translate', {
          method: 'POST',
          auth: false,
          body: { source: SOURCE_LANGUAGE, target: lang, texts: chunk },
        })
        const dict = dictionary(lang)
        // null means the server has no translation yet: keep showing English, don't cache it
        chunk.forEach((text, j) => {
          if (translations[j] != null) dict[text] = translations[j]
        })
        saveCache(lang, dict)
      }
      setFailed(false)
    } catch {
      // offline or server down: English stays on screen, and a later language switch tries again
      setFailed(true)
    } finally {
      setPendingRequests((n) => n - 1)
      setVersion((v) => v + 1)
    }
  }, [dictionary])

  useEffect(() => {
    document.documentElement.lang = language
    try {
      localStorage.setItem(STORAGE_KEY, language)
    } catch {
      // private mode or storage full, the choice still holds for this session
    }
  }, [language])

  const setLanguage = useCallback((lang) => {
    // drop requests queued for the old language, and give anything that failed or was missing
    // last time in the new one a fresh chance. Done here, before the next render starts queueing.
    clearTimeout(timer.current)
    timer.current = null
    queued.current.clear()
    asked.current[lang] = new Set()
    setFailed(false)
    setLanguageState(lang)
  }, [])

  const t = useCallback(
    (text, vars) => {
      if (language === SOURCE_LANGUAGE || !text) return interpolate(text, vars)

      const translated = dictionary(language)[text]
      if (translated !== undefined) return interpolate(translated, vars)

      // collect every string rendered in this pass, then ask for them all in one request
      const seen = (asked.current[language] ??= new Set())
      if (!seen.has(text)) {
        seen.add(text)
        queued.current.add(text)
        timer.current ??= setTimeout(() => flush(language), 30)
      }
      return interpolate(text, vars) // English until the translation arrives
    },
    // version: t must change identity when translations arrive so consumers re-render
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [language, version, dictionary, flush],
  )

  const value = useMemo(
    () => ({ language, setLanguage, t, translating: pendingRequests > 0, translationFailed: failed }),
    [language, setLanguage, t, pendingRequests, failed],
  )
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider')
  return ctx
}

// the short form for components that only need to translate
export function useT() {
  return useLanguage().t
}
