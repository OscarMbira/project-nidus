import { useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'

/**
 * "N placeholders still to fill" (v1336) — shown on a record created from a template until every
 * [Placeholder] has been replaced. `summary` comes from recordPlaceholderSummary().
 */
export default function PlaceholderBanner({ summary }) {
  const [open, setOpen] = useState(false)
  if (!summary?.total) return null
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200" role="status">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>
            <strong>{summary.total}</strong> template {summary.total === 1 ? 'placeholder' : 'placeholders'} still to fill
            {' — '}
            {summary.tabs.map((t) => `${t.tab} (${t.count})`).join(', ')}
          </span>
        </p>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-1 text-xs font-medium text-amber-800 hover:underline dark:text-amber-300"
          aria-expanded={open}
        >
          {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {open ? 'Hide' : 'Show'} placeholders
        </button>
      </div>
      {open && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {summary.placeholders.map((p) => (
            <li key={p} className="rounded bg-amber-100 px-2 py-0.5 font-mono text-xs dark:bg-amber-900/40">{p}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
