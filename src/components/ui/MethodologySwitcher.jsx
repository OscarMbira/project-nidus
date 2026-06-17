import { useState } from 'react'
import {
  METHODOLOGY_TRACK_IDS,
  readUserMethodologyPreference,
  writeUserMethodologyPreference,
} from '../../config/methodologyMenuUtils'

const OPTIONS = [
  { value: '', label: 'All tracks (expand)' },
  { value: 'structured', label: 'Structured focus' },
  { value: 'pmbok', label: 'PMBOK focus' },
  { value: 'agile', label: 'Agile focus' },
]

/**
 * Sidebar header control — persists expanded-track preference (Phase 2).
 */
export default function MethodologySwitcher({ onChange, className = '' }) {
  const [value, setValue] = useState(() => readUserMethodologyPreference() || '')

  const handleChange = (e) => {
    const next = e.target.value
    setValue(next)
    writeUserMethodologyPreference(next || null)
    onChange?.(next || null)
    window.dispatchEvent(new CustomEvent('nidus-methodology-pref-changed', { detail: next || null }))
  }

  return (
    <div className={`px-3 py-2 border-b border-gray-200 dark:border-gray-700 ${className}`}>
      <label
        htmlFor="methodology-switcher"
        className="block text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1"
      >
        Methodology focus
      </label>
      <select
        id="methodology-switcher"
        value={value}
        onChange={handleChange}
        className="w-full text-xs rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-1.5"
      >
        {OPTIONS.map((o) => (
          <option key={o.value || 'all'} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <p className="mt-1 text-[10px] text-gray-500 dark:text-gray-500">
        Focus hides other methodology tracks. Organisation settings can lock tracks for everyone.
      </p>
    </div>
  )
}

export { METHODOLOGY_TRACK_IDS }
