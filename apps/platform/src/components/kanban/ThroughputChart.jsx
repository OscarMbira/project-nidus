import { format, startOfWeek, addWeeks, subWeeks, parseISO } from 'date-fns'

/**
 * Completed items per week + rolling average (last 4 weeks).
 */
export default function ThroughputChart({ cards = [], weeksBack = 12 }) {
  const completed = cards.filter((c) => c.completed_at)
  if (!completed.length) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">No completions in range for throughput chart.</p>
    )
  }

  const now = new Date()
  const start = subWeeks(startOfWeek(now, { weekStartsOn: 1 }), weeksBack)
  const buckets = []
  for (let i = 0; i <= weeksBack; i++) {
    const wk = addWeeks(start, i)
    const wkEnd = addWeeks(wk, 1)
    const count = completed.filter((c) => {
      const d = parseISO(c.completed_at)
      return d >= wk && d < wkEnd
    }).length
    buckets.push({ label: format(wk, 'MMM d'), count })
  }

  const roll = buckets.map((_, i) => {
    const slice = buckets.slice(Math.max(0, i - 3), i + 1)
    const sum = slice.reduce((s, b) => s + b.count, 0)
    return slice.length ? sum / slice.length : 0
  })
  const maxY = Math.max(1, ...buckets.map((b) => b.count), ...roll)

  const w = 320
  const h = 120
  const pad = 24
  const barW = (w - 2 * pad) / buckets.length
  const linePoints = roll
    .map((r, i) => {
      const x = pad + i * barW + barW / 2
      const y = h - pad - (r / maxY) * (h - 2 * pad)
      return `${x},${y}`
    })
    .join(' ')

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Throughput (items / week)</h3>
      <svg width={w} height={h} className="w-full">
        {[0, 0.5, 1].map((t) => (
          <line
            key={t}
            x1={pad}
            y1={pad + t * (h - 2 * pad)}
            x2={w - pad}
            y2={pad + t * (h - 2 * pad)}
            stroke="currentColor"
            className="text-gray-200 dark:text-gray-700"
          />
        ))}
        {buckets.map((b, i) => {
          const bh = (b.count / maxY) * (h - 2 * pad)
          return (
            <rect
              key={i}
              x={pad + i * barW + 1}
              y={h - pad - bh}
              width={barW - 2}
              height={bh}
              className="fill-violet-500/80"
            />
          )
        })}
        <polyline fill="none" stroke="#fbbf24" strokeWidth="1.5" points={linePoints} />
      </svg>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Bars: weekly completions. Line: 4-week rolling average.</p>
    </div>
  )
}
