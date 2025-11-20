import { differenceInCalendarDays, addDays, format } from 'date-fns'

// Simple burndown chart using SVG (no external charting library)
// Shows ideal vs current remaining story points for a sprint
export default function BurndownChart({ sprint, totalStoryPoints, completedStoryPoints }) {
  if (!sprint?.sprint_start_date || !sprint?.sprint_end_date || totalStoryPoints <= 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Burndown chart will appear when sprint dates and story points are defined.
      </p>
    )
  }

  const startDate = new Date(sprint.sprint_start_date)
  const endDate = new Date(sprint.sprint_end_date)
  const totalDays = Math.max(differenceInCalendarDays(endDate, startDate), 1)

  // Build ideal line: remaining points from start to end
  const idealPoints = []
  for (let i = 0; i <= totalDays; i++) {
    const remaining = totalStoryPoints - (totalStoryPoints * (i / totalDays))
    idealPoints.push({
      dayIndex: i,
      date: addDays(startDate, i),
      remaining,
    })
  }

  // Current remaining is a single point as of today
  const today = new Date()
  let dayIndexToday = differenceInCalendarDays(today, startDate)
  if (dayIndexToday < 0) dayIndexToday = 0
  if (dayIndexToday > totalDays) dayIndexToday = totalDays
  const currentRemaining = Math.max(totalStoryPoints - completedStoryPoints, 0)

  const width = 260
  const height = 120
  const padding = 20

  const xScale = (dayIndex) =>
    padding + (dayIndex / totalDays) * (width - 2 * padding)

  const yScale = (remaining) =>
    padding + ((totalStoryPoints - remaining) / totalStoryPoints) * (height - 2 * padding)

  const idealPath = idealPoints
    .map((p, idx) => {
      const x = xScale(p.dayIndex)
      const y = yScale(p.remaining)
      return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`
    })
    .join(' ')

  const todayX = xScale(dayIndexToday)
  const todayY = yScale(currentRemaining)

  const progressPercent = Math.round((completedStoryPoints / totalStoryPoints) * 100)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <div className="flex flex-col">
          <span className="text-gray-500 dark:text-gray-400">Remaining</span>
          <span className="font-semibold text-gray-900 dark:text-white">
            {currentRemaining} pts
          </span>
        </div>
        <div className="flex flex-col text-right">
          <span className="text-gray-500 dark:text-gray-400">Completed</span>
          <span className="font-semibold text-gray-900 dark:text-white">
            {completedStoryPoints} / {totalStoryPoints} pts ({progressPercent}%)
          </span>
        </div>
      </div>

      <svg width={width} height={height} className="w-full">
        {/* Axes */}
        <line
          x1={padding}
          y1={height - padding}
          x2={width - padding}
          y2={height - padding}
          stroke="#E5E7EB"
          strokeWidth="1"
        />
        <line
          x1={padding}
          y1={padding}
          x2={padding}
          y2={height - padding}
          stroke="#E5E7EB"
          strokeWidth="1"
        />

        {/* Ideal burndown line */}
        <path
          d={idealPath}
          fill="none"
          stroke="#93C5FD"
          strokeWidth="2"
        />

        {/* Current remaining point */}
        <circle
          cx={todayX}
          cy={todayY}
          r={4}
          fill="#2563EB"
          stroke="#1D4ED8"
          strokeWidth="1"
        />

        {/* Today dashed line */}
        <line
          x1={todayX}
          y1={padding}
          x2={todayX}
          y2={height - padding}
          stroke="#9CA3AF"
          strokeDasharray="4 4"
          strokeWidth="1"
        />

        {/* Labels */}
        <text
          x={padding}
          y={padding - 4}
          fontSize="10"
          fill="#6B7280"
        >
          {totalStoryPoints} pts
        </text>
        <text
          x={width - padding}
          y={height - padding + 12}
          fontSize="10"
          textAnchor="end"
          fill="#6B7280"
        >
          {format(endDate, 'MMM d')}
        </text>
        <text
          x={padding}
          y={height - padding + 12}
          fontSize="10"
          fill="#6B7280"
        >
          {format(startDate, 'MMM d')}
        </text>
      </svg>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        Ideal line (blue) vs current remaining (dot). Today is indicated by the dashed line.
      </p>
    </div>
  )
}


