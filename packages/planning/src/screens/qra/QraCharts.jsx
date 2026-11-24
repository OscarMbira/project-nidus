/**
 * v1355 — theme-aware histogram, S-curve and tornado. Colours use Tailwind so light and dark
 * both stay readable. No chart library.
 */

const bar = 'fill-blue-600 dark:fill-blue-400'
const line = 'stroke-blue-700 dark:stroke-blue-300'

export function HistogramChart({ bins = [], label = 'Count' }) {
  const max = Math.max(1, ...bins.map((b) => b.count || 0))
  const w = 360
  const h = 140
  const gap = 4
  const bw = bins.length ? (w - 16) / bins.length - gap : 0
  return (
    <svg role="img" aria-label={label} viewBox={`0 0 ${w} ${h}`} className="w-full h-36 text-gray-700 dark:text-gray-200">
      {bins.map((b, i) => {
        const bh = ((b.count || 0) / max) * (h - 24)
        return <rect key={i} className={bar} x={8 + i * (bw + gap)} y={h - 16 - bh} width={Math.max(1, bw)} height={bh} rx="2" />
      })}
    </svg>
  )
}

export function SCurveChart({ points = [] }) {
  if (points.length < 2) return <p className="text-sm text-gray-700 dark:text-gray-200">Not enough results for an S-curve.</p>
  const w = 360
  const h = 140
  const d = points.map((p, i) => {
    const x = 8 + (i / (points.length - 1)) * (w - 16)
    const y = 8 + (1 - Math.min(1, p.share || 0)) * (h - 24)
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  return (
    <svg role="img" aria-label="S-curve" viewBox={`0 0 ${w} ${h}`} className="w-full h-36">
      <path d={d} className={line} fill="none" strokeWidth="2" />
    </svg>
  )
}

export function TornadoChart({ rows = [] }) {
  if (!rows.length) return <p className="text-sm text-gray-700 dark:text-gray-200">No driver stood out in this run.</p>
  return (
    <ul className="space-y-2">
      {rows.map((row) => {
        const width = Math.round(Math.abs(row.correlation) * 100)
        const positive = row.correlation >= 0
        return (
          <li key={row.id} className="grid grid-cols-[8rem_1fr_3rem] gap-2 items-center text-sm">
            <span className="truncate text-gray-800 dark:text-gray-100" title={row.label}>{row.label}</span>
            <span className="h-3 rounded bg-gray-100 dark:bg-gray-700 overflow-hidden">
              <span
                className={`block h-3 rounded ${positive ? 'bg-amber-500' : 'bg-sky-500'}`}
                style={{ width: `${Math.max(4, width)}%` }}
              />
            </span>
            <span className="text-right tabular-nums text-gray-700 dark:text-gray-200">{row.correlation.toFixed(2)}</span>
          </li>
        )
      })}
    </ul>
  )
}
