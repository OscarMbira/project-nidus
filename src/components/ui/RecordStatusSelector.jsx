import { useEffect, useState } from 'react'
import { LIFECYCLE_STATUSES } from '../../config/recordLifecycleRegistry'

const LABELS = {
  live: 'Live',
  unauthorised: 'Unauthorised',
  history: 'History',
  archived: 'Archive',
}

export default function RecordStatusSelector({
  storageKey,
  value,
  onChange,
  counts = {},
  className = '',
}) {
  const [selected, setSelected] = useState(value || ['live'])

  useEffect(() => {
    if (!storageKey) return
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length) {
          setSelected(parsed)
          onChange?.(parsed)
        }
      }
    } catch {
      // ignore
    }
  }, [storageKey])

  useEffect(() => {
    if (value) setSelected(value)
  }, [value])

  const toggle = (status) => {
    let next
    if (status === 'all') {
      next = [...LIFECYCLE_STATUSES]
    } else {
      const has = selected.includes(status)
      next = has ? selected.filter((s) => s !== status) : [...selected, status]
      if (!next.length) next = ['live']
    }
    setSelected(next)
    if (storageKey) {
      try { localStorage.setItem(storageKey, JSON.stringify(next)) } catch { /* ignore */ }
    }
    onChange?.(next)
  }

  const allSelected = LIFECYCLE_STATUSES.every((s) => selected.includes(s))
  const total = Object.values(counts).reduce((a, b) => a + (b || 0), 0)

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {LIFECYCLE_STATUSES.map((status) => {
        const active = selected.includes(status)
        return (
          <button
            key={status}
            type="button"
            onClick={() => toggle(status)}
            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
              active
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:border-blue-400'
            }`}
          >
            {active ? '●' : '○'} {LABELS[status]}
            {counts[status] != null ? ` (${counts[status]})` : ''}
          </button>
        )
      })}
      <button
        type="button"
        onClick={() => toggle('all')}
        className={`px-3 py-1.5 rounded-lg text-sm border ${
          allSelected
            ? 'bg-purple-600 border-purple-600 text-white'
            : 'bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400'
        }`}
      >
        All{total > 0 ? ` (${total})` : ''}
        {total > 5000 ? ' ⚠' : ''}
      </button>
    </div>
  )
}
