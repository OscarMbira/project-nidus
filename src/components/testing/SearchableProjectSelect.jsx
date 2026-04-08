import { useEffect, useMemo, useRef, useState, useId } from 'react'
import { ChevronDown, Search } from 'lucide-react'

function formatProjectLabel(p) {
  if (!p) return ''
  const code = p.project_code ? `${p.project_code} — ` : ''
  return `${code}${p.project_name || ''}`.trim()
}

/**
 * Searchable project dropdown (code, name, id) for Testing & QA shells.
 */
export default function SearchableProjectSelect({
  id,
  label,
  projects = [],
  value,
  onChange,
  emptyLabel = 'Select a project…',
  searchPlaceholder = 'Search code, name, or ID…',
  className = '',
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const rootRef = useRef(null)
  const searchId = useId()

  const selected = useMemo(() => projects.find((p) => p.id === value), [projects, value])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return projects
    return projects.filter((p) => {
      const hay = [p.project_code, p.project_name, p.id].filter(Boolean).join(' ').toLowerCase()
      return hay.includes(s)
    })
  }, [projects, q])

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  useEffect(() => {
    if (!open) setQ('')
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const display = selected ? formatProjectLabel(selected) : emptyLabel

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <label htmlFor={id} className="text-xs text-gray-500">
        {label}
      </label>
      <button
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="mt-0.5 w-full flex items-center justify-between gap-2 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white min-w-[220px] max-w-[min(100vw-2rem,420px)] text-left focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:outline-none"
      >
        <span className="truncate">{display}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className="absolute right-0 mt-1 z-50 w-full min-w-[280px] max-w-[min(100vw-2rem,420px)] rounded-lg border border-gray-600 bg-gray-900 shadow-xl flex flex-col overflow-hidden"
          role="listbox"
          aria-label={label}
        >
          <div className="p-2 border-b border-gray-700 flex items-center gap-2">
            <Search className="h-4 w-4 text-gray-500 shrink-0" aria-hidden />
            <input
              id={searchId}
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={searchPlaceholder}
              className="flex-1 min-w-0 bg-gray-800 border border-gray-600 rounded-md px-2 py-1.5 text-sm text-white placeholder:text-gray-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              autoComplete="off"
              autoFocus
            />
          </div>
          <ul className="max-h-60 overflow-y-auto py-1">
            <li>
              <button
                type="button"
                role="option"
                aria-selected={!value}
                className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:bg-gray-800 hover:text-white"
                onClick={() => {
                  onChange('')
                  setOpen(false)
                }}
              >
                {emptyLabel}
              </button>
            </li>
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-gray-500">No projects match your search.</li>
            )}
            {filtered.map((p) => {
              const isSel = p.id === value
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSel}
                    className={`w-full text-left px-3 py-2 text-sm truncate hover:bg-gray-800 ${
                      isSel ? 'bg-emerald-900/40 text-emerald-200' : 'text-gray-200'
                    }`}
                    onClick={() => {
                      onChange(p.id)
                      setOpen(false)
                    }}
                  >
                    {formatProjectLabel(p)}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
