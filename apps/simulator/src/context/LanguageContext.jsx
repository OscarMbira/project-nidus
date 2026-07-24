import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { DEFAULT_LANGUAGE_CODE } from '../utils/userLanguage.js'

const LanguageContext = createContext(null)

const STORAGE_KEY = 'nidus-language'

function getInitialLanguage() {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE_CODE
  try {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_LANGUAGE_CODE
  } catch {
    return DEFAULT_LANGUAGE_CODE
  }
}

/**
 * Global "which language is the viewer using right now" state, mirroring
 * UnsavedChangesContext's shape (createContext + provider + throwing hook).
 * Persistence to the DB is delegated to the caller via `onChange` — this
 * context itself only owns in-memory + localStorage state so it stays
 * app/DB-agnostic.
 */
export function LanguageProvider({ children, initialLanguageCode, onChange }) {
  const [languageCode, setLanguageCode] = useState(() => initialLanguageCode || getInitialLanguage())

  const changeLanguage = useCallback((nextCode) => {
    if (!nextCode || nextCode === languageCode) return
    setLanguageCode(nextCode)
    try {
      localStorage.setItem(STORAGE_KEY, nextCode)
    } catch {
      // ignore storage errors (private browsing, quota, etc.)
    }
    onChange?.(nextCode)
  }, [languageCode, onChange])

  const contextValue = useMemo(
    () => ({ languageCode, changeLanguage }),
    [languageCode, changeLanguage],
  )

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguageContext() {
  const ctx = useContext(LanguageContext)
  if (!ctx) {
    throw new Error('useLanguageContext must be used within LanguageProvider')
  }
  return ctx
}
