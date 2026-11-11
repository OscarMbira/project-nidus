import { formatMinutes } from '@nidus/shared/utils/registerDateTime'
import { runbookProgressText } from '@nidus/shared/utils/runbookSummary'

/**
 * Live run summary for a migration runbook (v1337, PRD D4). `summary` comes from
 * summariseRunbook(steps). Shows progress, record totals and time against budget per window.
 * `varianceLabel` is the steps register's own label for its over / under budget field (from the DB);
 * when given, the window table adds that column: time taken − budget, signed (+ over, − under).
 */
export default function RunbookSummaryPanel({ summary, varianceLabel, formatNumber = (n) => Number(n).toLocaleString() }) {
  if (!summary) return null
  const pct = summary.total ? Math.round(((summary.done + summary.skipped) / summary.total) * 100) : 0
  const tiles = [
    { label: 'Steps done', value: `${summary.done + summary.skipped} / ${summary.total}` },
    { label: 'In progress', value: summary.inProgress },
    { label: 'Failed / blocked', value: summary.failed + summary.blocked, warn: summary.failed + summary.blocked > 0 },
    { label: 'Over budget', value: summary.overBudget, warn: summary.overBudget > 0 },
    { label: 'Records received', value: formatNumber(summary.received) },
    { label: 'Records loaded', value: formatNumber(summary.loaded) },
    { label: 'Records failed', value: formatNumber(summary.failedRecords), warn: summary.failedRecords > 0 },
    { label: '% success', value: summary.successPercent === null ? '—' : `${summary.successPercent}%` },
  ]

  return (
    <section aria-label="Run summary" className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Run summary</h2>
        <span className="text-sm text-gray-600 dark:text-gray-400">{runbookProgressText(summary)}</span>
      </div>
      <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Steps done">
        <div className="h-full bg-blue-600" style={{ width: `${pct}%` }} />
      </div>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-md bg-gray-50 p-2 dark:bg-gray-800">
            <dt className="text-xs text-gray-500 dark:text-gray-400">{t.label}</dt>
            <dd className={`text-lg font-semibold ${t.warn ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>{t.value}</dd>
          </div>
        ))}
      </dl>
      {summary.windows.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500 dark:border-gray-700 dark:text-gray-400">
                <th className="py-1 pr-4 font-medium">Window</th>
                <th className="py-1 pr-4 font-medium">Steps done</th>
                <th className="py-1 pr-4 font-medium">Time taken</th>
                <th className="py-1 pr-4 font-medium">Budget</th>
                {varianceLabel && <th className="py-1 pr-4 font-medium">{varianceLabel}</th>}
              </tr>
            </thead>
            <tbody>
              {summary.windows.map((w) => {
                const over = w.budgetMinutes > 0 && w.takenMinutes > w.budgetMinutes
                return (
                  <tr key={w.key} className="border-b border-gray-100 text-gray-800 last:border-0 dark:border-gray-800 dark:text-gray-200">
                    <td className="py-1 pr-4">{w.label}</td>
                    <td className="py-1 pr-4">{w.done} / {w.steps}</td>
                    <td className={`py-1 pr-4 ${over ? 'text-red-600 dark:text-red-400' : ''}`}>{w.takenMinutes ? formatMinutes(w.takenMinutes) : '—'}</td>
                    <td className="py-1 pr-4">{w.budgetMinutes ? formatMinutes(w.budgetMinutes) : '—'}</td>
                    {varianceLabel && (
                      <td className={`py-1 pr-4 tabular-nums ${w.varianceMinutes > 0 ? 'text-red-600 dark:text-red-400' : w.varianceMinutes < 0 ? 'text-green-700 dark:text-green-400' : ''}`}>
                        {w.varianceMinutes === null || w.varianceMinutes === undefined ? '—' : `${w.varianceMinutes > 0 ? '+' : ''}${formatMinutes(w.varianceMinutes)}`}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
