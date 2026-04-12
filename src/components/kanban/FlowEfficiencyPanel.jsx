import { differenceInCalendarDays } from 'date-fns'

/**
 * Flow efficiency ≈ cycle / lead for completed cards; blocked WIP summary; column age proxy.
 */
export default function FlowEfficiencyPanel({ cards = [], columns = [] }) {
  const done = cards.filter((c) => c.created_at && c.started_at && c.completed_at)
  const ratios = done.map((c) => {
    const lead = Math.max(
      differenceInCalendarDays(new Date(c.completed_at), new Date(c.created_at)),
      0.001,
    )
    const cycle = Math.max(
      differenceInCalendarDays(new Date(c.completed_at), new Date(c.started_at)),
      0,
    )
    return cycle / lead
  })
  const avgFlow =
    ratios.length > 0 ? ratios.reduce((a, b) => a + b, 0) / ratios.length : 0

  const blocked = cards.filter((c) => c.is_blocked)
  const wip = cards.filter((c) => c.started_at && !c.completed_at)
  const colMap = new Map(columns.map((c) => [c.id, c.column_name]))

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Flow efficiency (completed items)</h3>
        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
          {(avgFlow * 100).toFixed(1)}%
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Average of cycle time ÷ lead time (proxy for active vs total time).
        </p>
      </div>
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Blocked & WIP</h3>
        <p className="text-gray-700 dark:text-gray-300">
          Blocked cards: <span className="font-semibold text-amber-600">{blocked.length}</span>
        </p>
        <p className="text-gray-700 dark:text-gray-300 mt-1">
          In progress (not done): <span className="font-semibold">{wip.length}</span>
        </p>
      </div>
      {wip.length > 0 && (
        <div className="md:col-span-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Age of in-progress items (days since started)</h3>
          <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-300">
            {wip.slice(0, 15).map((c) => {
              const age = differenceInCalendarDays(new Date(), new Date(c.started_at))
              return (
                <li key={c.id} className="flex justify-between">
                  <span className="truncate">{colMap.get(c.column_id) || 'Column'}</span>
                  <span>{age}d</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
