export default function DelaySummaryStats({ summary }) {
  if (!summary) return null
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
      {[
        ['Total', summary.total],
        ['Open', summary.openCount],
        ['Resolved', summary.resolvedCount],
        ['Days lost (sum)', summary.totalDaysLost],
        ['Auto-linked', summary.autoLinkedCount],
      ].map(([label, val]) => (
        <div
          key={label}
          className="rounded-lg border border-slate-600/50 bg-slate-800/40 dark:bg-slate-900/40 px-3 py-2"
        >
          <div className="text-xs text-slate-400">{label}</div>
          <div className="text-lg font-semibold text-slate-100">{val ?? 0}</div>
        </div>
      ))}
    </div>
  )
}
