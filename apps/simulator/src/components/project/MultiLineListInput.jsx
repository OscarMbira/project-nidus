import { useState } from 'react'
import { Plus, Trash2, X } from 'lucide-react'

function parseLines(value) {
  if (!value || typeof value !== 'string') return []
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
}

/**
 * "Add one value per line" list input — add via Enter or the Add button, remove
 * individually, clear all. Same UX as the tolerance fields in LifecycleControlsSection,
 * extracted so new fields don't hand-duplicate that logic. Value is stored as a single
 * newline-joined string (matches the tolerance_* fields' storage convention).
 */
export default function MultiLineListInput({
  id,
  value,
  onChange,
  placeholder = '',
  ariaLabelPrefix = 'item',
  disabled = false,
}) {
  const [draft, setDraft] = useState('')
  const lines = parseLines(value)

  const setLines = (next) => onChange(next.join('\n'))

  const addDraft = () => {
    const t = draft.trim()
    if (!t) return
    setLines([...lines, t])
    setDraft('')
  }

  return (
    <div className="space-y-2">
      {lines.length > 0 && (
        <ul className="space-y-2">
          {lines.map((line, index) => (
            <li
              key={index}
              className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2"
            >
              <span className="flex-1 text-gray-900 dark:text-white whitespace-pre-wrap">{line}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => setLines(lines.filter((_, i) => i !== index))}
                  className="p-1.5 rounded text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  title="Remove"
                  aria-label={`Remove ${ariaLabelPrefix} ${index + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {!disabled && lines.length > 0 && (
        <button
          type="button"
          onClick={() => {
            setLines([])
            setDraft('')
          }}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
        >
          <X className="h-4 w-4" /> Clear all
        </button>
      )}
      {!disabled && (
        <div className="flex gap-2">
          <input
            type="text"
            id={id}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addDraft()
              }
            }}
            placeholder={placeholder}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            aria-label={`New ${ariaLabelPrefix}`}
          />
          <button
            type="button"
            onClick={addDraft}
            disabled={!draft.trim()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none text-white text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      )}
      {lines.length === 0 && disabled && (
        <p className="text-sm text-gray-500 dark:text-gray-400">None recorded.</p>
      )}
    </div>
  )
}
