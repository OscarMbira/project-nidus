/**
 * v1239 Slice 3 — lightweight, theme-aware Gantt for the shared schedule screens.
 *
 * Plain DOM + one SVG layer (no chart library), so it renders the same in every shell, prints,
 * and is testable in jsdom. Bars use planned dates; critical tasks are red; a thin grey bar
 * under a task shows its baseline; diamonds are milestones; elbow arrows show links.
 *
 * props: tasks (DB rows), dependencies (DB rows), zoom 'day'|'week'|'month', showBaseline,
 *        onTaskClick(task)
 * v1265 Plan sheet: keepOrder (rows in the given order, undated rows keep their slot),
 *        hideNames (the sheet shows the names), summary bars for tasks with is_summary,
 *        compare_start_date / compare_end_date: a second baseline drawn as a thin amber bar.
 */
import { useMemo, useState } from 'react'

const DAY_MS = 86400000
const PX_PER_DAY = { day: 28, week: 10, month: 3.5 }
/** Row and header heights, shared with the Plan sheet so its rows line up with the bars. */
export const GANTT_ROW_H = 34
export const GANTT_HEADER_H = 32
const ROW_H = GANTT_ROW_H
const NAME_W = 240

const toMs = (d) => {
  const [y, m, day] = String(d).slice(0, 10).split('-').map(Number)
  return Date.UTC(y, m - 1, day)
}
const iso = (ms) => new Date(ms).toISOString().slice(0, 10)

/** Pure layout: x/width per task and the visible date range. Exported for tests. */
export function layoutGantt(tasks, zoom = 'week', showBaseline = false, keepOrder = false) {
  const px = PX_PER_DAY[zoom] || PX_PER_DAY.week
  const dated = tasks.filter((t) => t.planned_start_date)
  if (!dated.length && !keepOrder) return { rows: [], startMs: null, width: 0, px }
  if (!dated.length) return { rows: tasks.map((t, i) => ({ task: t, index: i, left: null, width: 0, baseline: null, milestone: false })), startMs: Date.now(), width: 0, px }
  const dates = dated.flatMap((t) => [t.planned_start_date, t.planned_end_date || t.planned_start_date, ...(showBaseline ? [t.baseline_start_date, t.baseline_end_date] : []), t.compare_start_date, t.compare_end_date]).filter(Boolean).map(toMs)
  const startMs = Math.min(...dates) - 2 * DAY_MS
  const endMs = Math.max(...dates) + 7 * DAY_MS
  const x = (d) => ((toMs(d) - startMs) / DAY_MS) * px
  const ordered = keepOrder
    ? tasks
    : [...dated].sort((a, b) => a.planned_start_date.localeCompare(b.planned_start_date) || String(a.task_name).localeCompare(String(b.task_name)))
  const rows = ordered
    .map((t, i) => {
      if (!t.planned_start_date) return { task: t, index: i, left: null, width: 0, baseline: null, milestone: false }
      const finish = t.planned_end_date || t.planned_start_date
      const left = x(t.planned_start_date)
      const width = Math.max(px, x(finish) - left + px) // inclusive finish day
      const baseline = showBaseline && t.baseline_start_date && t.baseline_end_date
        ? { left: x(t.baseline_start_date), width: Math.max(px, x(t.baseline_end_date) - x(t.baseline_start_date) + px) }
        : null
      const compare = t.compare_start_date && t.compare_end_date
        ? { left: x(t.compare_start_date), width: Math.max(px, x(t.compare_end_date) - x(t.compare_start_date) + px) }
        : null
      return { task: t, index: i, left, width, baseline, compare, milestone: !!t.is_milestone && !t.is_summary, summary: !!t.is_summary }
    })
  return { rows, startMs, width: ((endMs - startMs) / DAY_MS) * px, px }
}

function scaleTicks(startMs, width, px, zoom) {
  const ticks = []
  const days = Math.ceil(width / px)
  for (let i = 0; i <= days; i++) {
    const ms = startMs + i * DAY_MS
    const d = new Date(ms)
    const show = zoom === 'day' || (zoom === 'week' && d.getUTCDay() === 1) || (zoom === 'month' && d.getUTCDate() === 1)
    if (show) {
      const label = zoom === 'month'
        ? d.toLocaleDateString(undefined, { month: 'short', year: '2-digit', timeZone: 'UTC' })
        : zoom === 'week'
          ? d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' })
          : String(d.getUTCDate())
      ticks.push({ x: i * px, label, weekend: false })
    }
    if (zoom === 'day' && (d.getUTCDay() === 0 || d.getUTCDay() === 6)) ticks.push({ x: i * px, weekend: true })
  }
  return ticks
}

export default function ScheduleGanttChart({ tasks, dependencies = [], zoom = 'week', showBaseline = false, onTaskClick, keepOrder = false, hideNames = false }) {
  const { rows, startMs, width, px } = useMemo(() => layoutGantt(tasks, zoom, showBaseline, keepOrder), [tasks, zoom, showBaseline, keepOrder])
  const rowById = useMemo(() => new Map(rows.map((r) => [r.task.id, r])), [rows])
  // Today is read once per mount (render must stay pure).
  const [todayMs] = useState(() => toMs(iso(Date.now())))
  if (!rows.length) {
    return <p className="p-8 text-center text-sm text-gray-600 dark:text-gray-300">Tasks appear here once they have dates. Add tasks and press Recalculate.</p>
  }
  const height = rows.length * ROW_H
  const ticks = scaleTicks(startMs, width, px, zoom)
  const todayX = ((todayMs - startMs) / DAY_MS) * px
  const undated = keepOrder ? 0 : tasks.length - rows.length

  const arrows = dependencies
    .map((d) => {
      const a = rowById.get(d.predecessor_task_id)
      const b = rowById.get(d.successor_task_id)
      if (!a || !b || a.left === null || b.left === null) return null
      const x1 = a.left + a.width
      const y1 = a.index * ROW_H + ROW_H / 2
      const x2 = b.left
      const y2 = b.index * ROW_H + ROW_H / 2
      const mid = Math.max(x1 + 6, Math.min(x2 - 6, x1 + 12))
      return { id: d.id, path: `M${x1},${y1} H${mid} V${y2} H${x2 - 2}` }
    })
    .filter(Boolean)

  return (
    <div className="overflow-x-auto print:overflow-visible" data-testid="schedule-gantt">
      <div className="flex min-w-max">
        {/* Task names */}
        {!hideNames && <div className="sticky left-0 z-10 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700" style={{ width: NAME_W }}>
          <div className="h-8 border-b border-gray-200 dark:border-gray-700 px-3 text-xs font-medium text-gray-600 dark:text-gray-300 flex items-center">Task</div>
          {rows.map((r) => (
            <button
              key={r.task.id}
              type="button"
              onClick={() => onTaskClick?.(r.task)}
              className="w-full text-left px-3 text-sm truncate border-b border-gray-100 dark:border-gray-700/60 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
              style={{ height: ROW_H }}
              title={r.task.task_name}
            >
              {r.task.task_name}
            </button>
          ))}
        </div>}
        {/* Timeline */}
        <div className="relative" style={{ width }}>
          <div className="h-8 relative border-b border-gray-200 dark:border-gray-700">
            {ticks.filter((t) => !t.weekend).map((t) => (
              <span key={t.x} className="absolute top-2 text-[11px] text-gray-500 dark:text-gray-400" style={{ left: t.x + 2 }}>{t.label}</span>
            ))}
          </div>
          <div className="relative" style={{ height }}>
            {ticks.map((t) => (
              t.weekend
                ? <div key={`w${t.x}`} className="absolute top-0 bottom-0 bg-gray-50 dark:bg-gray-900/40" style={{ left: t.x, width: px }} />
                : <div key={`g${t.x}`} className="absolute top-0 bottom-0 border-l border-gray-100 dark:border-gray-700/60" style={{ left: t.x }} />
            ))}
            {rows.map((r) => (
              <div key={`row${r.task.id}`} className="absolute left-0 right-0 border-b border-gray-100 dark:border-gray-700/60" style={{ top: r.index * ROW_H, height: ROW_H }} />
            ))}
            {todayX >= 0 && todayX <= width && (
              <div className="absolute top-0 bottom-0 border-l-2 border-amber-500" style={{ left: todayX }} title="Today" />
            )}
            <svg className="absolute inset-0 pointer-events-none text-gray-400 dark:text-gray-500" width={width} height={height} aria-hidden="true">
              <defs>
                <marker id="gantt-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 z" fill="currentColor" />
                </marker>
              </defs>
              {arrows.map((a) => <path key={a.id} d={a.path} fill="none" stroke="currentColor" strokeWidth="1.2" markerEnd="url(#gantt-arrow)" />)}
            </svg>
            {rows.map((r) => {
              if (r.left === null) return null
              const top = r.index * ROW_H
              const critical = r.task.is_critical_path
              const pct = Math.min(100, Math.max(0, Number(r.task.percentage_complete || 0)))
              const summaryTone = critical ? 'bg-red-700 dark:bg-red-500' : 'bg-gray-800 dark:bg-gray-200'
              const label = `${r.task.task_name}: ${r.task.planned_start_date} → ${r.task.planned_end_date || r.task.planned_start_date}${critical ? ' (critical)' : ''}`
              return (
                <div key={`bar${r.task.id}`}>
                  {r.baseline && (
                    <div className="absolute h-1.5 rounded bg-gray-400/70 dark:bg-gray-500/70" style={{ left: r.baseline.left, width: r.baseline.width, top: top + ROW_H - 9 }} title="Baseline" />
                  )}
                  {r.compare && (
                    <div className="absolute h-1 rounded bg-amber-500/80 dark:bg-amber-400/80" style={{ left: r.compare.left, width: r.compare.width, top: top + ROW_H - 4 }} title="Compared baseline" />
                  )}
                  {r.summary ? (
                    <button
                      type="button"
                      onClick={() => onTaskClick?.(r.task)}
                      aria-label={label}
                      title={label}
                      className="absolute"
                      style={{ left: r.left, width: r.width, top: top + 10, height: ROW_H - 20 }}
                    >
                      {/* summary bracket: thin bar with end caps */}
                      <span className={`block h-1.5 rounded-sm ${summaryTone}`} />
                      <span className={`absolute left-0 top-0 h-full w-1 ${summaryTone}`} />
                      <span className={`absolute right-0 top-0 h-full w-1 ${summaryTone}`} />
                    </button>
                  ) : r.milestone ? (
                    <button
                      type="button"
                      onClick={() => onTaskClick?.(r.task)}
                      aria-label={label}
                      title={label}
                      className={`absolute w-3.5 h-3.5 rotate-45 ${critical ? 'bg-red-600' : 'bg-violet-600'}`}
                      style={{ left: r.left + px / 2 - 7, top: top + ROW_H / 2 - 7 }}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => onTaskClick?.(r.task)}
                      aria-label={label}
                      title={label}
                      className={`absolute rounded overflow-hidden ${critical ? 'bg-red-500/80 dark:bg-red-500/70' : 'bg-blue-500/80 dark:bg-blue-500/70'}`}
                      style={{ left: r.left, width: r.width, top: top + 7, height: ROW_H - 16 }}
                    >
                      <span className={`block h-full ${critical ? 'bg-red-700' : 'bg-blue-700'}`} style={{ width: `${pct}%` }} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
      {undated > 0 && <p className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">{undated} task(s) have no dates yet and are not shown. Press Recalculate to schedule them.</p>}
    </div>
  )
}
