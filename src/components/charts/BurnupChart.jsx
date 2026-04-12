import { differenceInCalendarDays, addDays, format } from 'date-fns'

/**
 * Burnup: cumulative completed vs total scope over sprint days (SVG).
 * totalScope may grow (scope change) — pass arrays per day from parent for accuracy, or static total.
 */
export default function BurnupChart({
  sprint,
  totalStoryPoints,
  completedStoryPoints,
  /** optional: cumulative completed by day index (same length as sprint days + 1) */
  completedByDay,
}) {
  if (!sprint?.sprint_start_date || !sprint?.sprint_end_date || totalStoryPoints <= 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Burnup chart appears when sprint dates and story points are defined.
      </p>
    )
  }

  const startDate = new Date(sprint.sprint_start_date)
  const endDate = new Date(sprint.sprint_end_date)
  const totalDays = Math.max(differenceInCalendarDays(endDate, startDate), 1)

  const completedSeries = []
  for (let i = 0; i <= totalDays; i++) {
    let cum = completedStoryPoints
    if (completedByDay && completedByDay.length) {
      cum = completedByDay[Math.min(i, completedByDay.length - 1)] ?? completedStoryPoints
    } else {
      const t = totalDays === 0 ? 1 : i / totalDays
      cum = Math.min(completedStoryPoints, completedStoryPoints * t)
    }
    completedSeries.push({
      dayIndex: i,
      date: addDays(startDate, i),
      completed: Math.max(0, cum),
    })
  }

  const width = 280
  const height = 120
  const padding = 20
  const maxY = Math.max(totalStoryPoints, completedStoryPoints, 1)

  const xScale = (dayIndex) => padding + (dayIndex / totalDays) * (width - 2 * padding)
  const yScale = (v) => padding + ((maxY - v) / maxY) * (height - 2 * padding)

  const donePath = completedSeries
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${xScale(p.dayIndex)} ${yScale(p.completed)}`)
    .join(' ')
  const totalScopePath = `M ${xScale(0)} ${yScale(totalStoryPoints)} L ${xScale(totalDays)} ${yScale(totalStoryPoints)}`

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>Scope: {totalStoryPoints} pts</span>
        <span>Done: {completedStoryPoints} pts</span>
      </div>
      <svg width={width} height={height} className="w-full max-w-full">
        <line
          x1={padding}
          y1={height - padding}
          x2={width - padding}
          y2={height - padding}
          stroke="currentColor"
          className="text-gray-300 dark:text-gray-600"
        />
        <line
          x1={padding}
          y1={padding}
          x2={padding}
          y2={height - padding}
          stroke="currentColor"
          className="text-gray-300 dark:text-gray-600"
        />
        <path
          d={totalScopePath}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-gray-400 dark:text-gray-500"
          strokeDasharray="4 2"
        />
        <path d={donePath} fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-500" />
      </svg>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {format(startDate, 'MMM d')} — {format(endDate, 'MMM d')}
      </p>
    </div>
  )
}
