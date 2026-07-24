import { useMemo } from 'react'
import GanttRow from './GanttRow'

function parseDate(s) {
  if (!s) return null
  const t = new Date(s).getTime()
  return Number.isNaN(t) ? null : t
}

/**
 * Schedule Gantt-style timeline from activity_list rows (bars + today line + milestones).
 */
export default function GanttChart({ activities }) {
  const { min, max, list } = useMemo(() => {
    let minT = Infinity
    let maxT = -Infinity
    const list = activities || []
    for (const a of list) {
      const s = parseDate(a.planned_start_date || a.actual_start_date)
      const e = parseDate(a.planned_end_date || a.actual_end_date || a.planned_start_date)
      if (s != null) minT = Math.min(minT, s)
      if (e != null) maxT = Math.max(maxT, e)
    }
    if (!Number.isFinite(minT) || !Number.isFinite(maxT)) {
      return { min: Date.now(), max: Date.now() + 86400000 * 30, list }
    }
    if (minT === maxT) maxT = minT + 86400000 * 7
    return { min: minT, max: maxT, list }
  }, [activities])

  const span = max - min || 1
  const today = Date.now()
  const todayPct = ((today - min) / span) * 100

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900/50">
      <div className="relative mb-2 h-6 border-b border-gray-200 dark:border-gray-700">
        <div
          className="absolute top-0 h-full w-px bg-amber-500"
          style={{ left: `${Math.min(100, Math.max(0, todayPct))}%` }}
          title="Today"
        />
      </div>
      <div className="space-y-2">
        {list.map((a) => (
          <GanttRow key={a.id} activity={a} min={min} max={max} />
        ))}
      </div>
      <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        Use Print for a PDF-friendly view. Edit dates on the Activity List.
      </p>
    </div>
  )
}
