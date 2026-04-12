import { calculatePercentiles } from '../../utils/flowMetricsCalculator'

/**
 * Histograms for lead time (created→done) and cycle time (started→done), days.
 */
export default function LeadTimeCycleTimeChart({ cards = [], slaDays = { p50: 5, p85: 10, p95: 14 } }) {
  const leadDays = cards
    .filter((c) => c.created_at && c.completed_at)
    .map((c) => Math.max((new Date(c.completed_at) - new Date(c.created_at)) / (1000 * 60 * 60 * 24), 0))
  const cycleDays = cards
    .filter((c) => c.started_at && c.completed_at)
    .map((c) => Math.max((new Date(c.completed_at) - new Date(c.started_at)) / (1000 * 60 * 60 * 24), 0))

  const leadPct = calculatePercentiles(leadDays)
  const cyclePct = calculatePercentiles(cycleDays)

  const maxBin = 20
  const hist = (values) => {
    const buckets = Array(maxBin).fill(0)
    values.forEach((v) => {
      const i = Math.min(Math.floor(v), maxBin - 1)
      buckets[i] += 1
    })
    const max = Math.max(1, ...buckets)
    return { buckets, max }
  }

  const H = ({ title, values, pct }) => {
    const { buckets, max } = hist(values)
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          p50 {pct.p50?.toFixed?.(1) ?? '—'} · p85 {pct.p85?.toFixed?.(1) ?? '—'} · p95 {pct.p95?.toFixed?.(1) ?? '—'} days
        </p>
        <div className="flex items-end gap-px h-24">
          {buckets.map((n, i) => (
            <div
              key={i}
              title={`${i}-${i + 1}d: ${n}`}
              className="flex-1 bg-blue-500/80 dark:bg-blue-600/80 rounded-t min-w-[3px]"
              style={{ height: `${(n / max) * 100}%` }}
            />
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-gray-500 mt-1">
          <span>0d</span>
          <span>SLA p50: {slaDays.p50}d</span>
          <span>{maxBin}d+</span>
        </div>
      </div>
    )
  }

  if (!cards.length) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">No completed cards in range for lead/cycle histograms.</p>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <H title="Lead time distribution" values={leadDays} pct={leadPct} />
      <H title="Cycle time distribution" values={cycleDays} pct={cyclePct} />
    </div>
  )
}
