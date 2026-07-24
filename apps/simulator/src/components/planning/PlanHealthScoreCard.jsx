/** Compact health score widget for dashboards */
export default function PlanHealthScoreCard({ score, loading, onRecalculate }) {
  if (loading) {
    return (
      <div className="rounded-xl border border-gray-700 bg-gray-900/80 p-4 animate-pulse h-24">
        <div className="h-4 bg-gray-700 rounded w-1/3 mb-2" />
        <div className="h-8 bg-gray-700 rounded w-1/2" />
      </div>
    )
  }
  const v = score?.overall_score
  const label =
    v == null ? '—' : v >= 75 ? 'Healthy' : v >= 50 ? 'Watch' : 'At risk'
  const color =
    v == null ? 'text-gray-400' : v >= 75 ? 'text-emerald-400' : v >= 50 ? 'text-amber-400' : 'text-red-400'

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900/80 p-4 shadow-lg">
      <div className="text-sm text-gray-400 mb-1">Schedule health</div>
      <div className="flex items-baseline justify-between gap-2">
        <span className={`text-3xl font-semibold tabular-nums ${color}`}>{v ?? '—'}</span>
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      {onRecalculate && (
        <button
          type="button"
          onClick={onRecalculate}
          className="mt-3 text-xs text-blue-400 hover:text-blue-300"
        >
          Recalculate
        </button>
      )}
    </div>
  )
}
