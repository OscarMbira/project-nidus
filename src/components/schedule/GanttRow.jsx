function parseDate(s) {
  if (!s) return null
  const t = new Date(s).getTime()
  return Number.isNaN(t) ? null : t
}

/**
 * Single activity row in the planning Gantt (bar or milestone marker).
 */
export default function GanttRow({ activity: a, min, max }) {
  const span = max - min || 1
  const s = parseDate(a.planned_start_date || a.actual_start_date)
  const e = parseDate(a.planned_end_date || a.actual_end_date || a.planned_start_date)

  if (s == null) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <span className="w-48 shrink-0 truncate">{a.name}</span>
        <span>No dates</span>
      </div>
    )
  }

  const end = e ?? s + 86400000
  const left = ((s - min) / span) * 100
  const width = Math.max(2, ((end - s) / span) * 100)

  if (a.is_milestone) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="w-48 shrink-0 truncate text-gray-800 dark:text-gray-200">{a.name}</span>
        <div className="relative h-8 flex-1 rounded bg-gray-100 dark:bg-gray-800">
          <div
            className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 bg-amber-500"
            style={{ left: `calc(${left}% - 6px)` }}
            title={`${a.planned_start_date || ''}`}
            role="img"
            aria-label="Milestone"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-48 shrink-0 truncate text-gray-800 dark:text-gray-200">{a.name}</span>
      <div className="relative h-6 flex-1 rounded bg-gray-100 dark:bg-gray-800">
        <div
          className="absolute top-1 h-4 rounded bg-emerald-600"
          style={{ left: `${left}%`, width: `${width}%` }}
          title={`${a.planned_start_date || ''} → ${a.planned_end_date || ''}`}
        />
      </div>
    </div>
  )
}
