/**
 * v1354 — the levelling preview: which tasks move, the finish impact, and the
 * before / after hours. Untick a row to leave that task where it is.
 */
import FieldLabelWithHelp from '@nidus/ui/FieldLabelWithHelp'

const card = 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4'
const th = 'px-2 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-200'

export function LevelPreview({
  mode, onMode, moves, accepted, onToggle, finishBefore, finishAfter, finishDelayDays,
  overloadedBefore, overloadedAfter, onApply, onUndo, canUndo, busy,
}) {
  return (
    <div className="space-y-4">
      <div className={card}>
        <FieldLabelWithHelp helpKey="public.levelling_runs.mode" htmlFor="level-mode" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
          How far tasks may move
        </FieldLabelWithHelp>
        <select id="level-mode" className="w-full max-w-md px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" value={mode} onChange={(e) => onMode(e.target.value)}>
          <option value="within_float">Within float — keep the project finish</option>
          <option value="beyond_float">Beyond float — the finish may move</option>
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className={card}><p className="text-xs text-gray-600 dark:text-gray-400">Finish now</p><p className="text-lg text-gray-900 dark:text-gray-100">{finishBefore || '—'}</p></div>
        <div className={card}><p className="text-xs text-gray-600 dark:text-gray-400">Finish after</p><p className="text-lg text-gray-900 dark:text-gray-100">{finishAfter || '—'}</p></div>
        <div className={card}><p className="text-xs text-gray-600 dark:text-gray-400">Finish moves</p><p className="text-lg text-gray-900 dark:text-gray-100">{finishDelayDays || 0} working days</p></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className={card}><p className="text-xs text-gray-600 dark:text-gray-400">People over their hours now</p><p className="text-lg text-gray-900 dark:text-gray-100">{overloadedBefore}</p></div>
        <div className={card}><p className="text-xs text-gray-600 dark:text-gray-400">People over their hours after</p><p className="text-lg text-gray-900 dark:text-gray-100">{overloadedAfter}</p></div>
      </div>

      <div className="overflow-x-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className={th} data-help="exempt">Apply</th>
              <th className={th} data-help="exempt">Task</th>
              <th className={th} data-help="exempt">From</th>
              <th className={th} data-help="exempt">To</th>
              <th className={th} data-help="exempt">Delay</th>
              <th className={th} data-help="exempt">Why</th>
            </tr>
          </thead>
          <tbody>
            {moves.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-6 text-gray-700 dark:text-gray-200">No task needs to move for this choice.</td></tr>
            )}
            {moves.map((m) => (
              <tr key={m.taskId} className="border-t border-gray-200 dark:border-gray-700">
                <td className="px-2 py-2"><input type="checkbox" aria-label={`Apply move for ${m.taskName || m.taskId}`} checked={accepted.has(m.taskId)} onChange={() => onToggle(m.taskId)} /></td>
                <td className="px-2 py-2 text-gray-900 dark:text-gray-100">{m.taskName || m.taskId}</td>
                <td className="px-2 py-2 text-gray-700 dark:text-gray-200">{m.oldStart}</td>
                <td className="px-2 py-2 text-gray-700 dark:text-gray-200">{m.newStart}</td>
                <td className="px-2 py-2 text-gray-700 dark:text-gray-200">{m.delayDays}</td>
                <td className="px-2 py-2 text-gray-700 dark:text-gray-200">{m.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy || moves.length === 0} onClick={onApply} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm disabled:opacity-50">Apply selected moves</button>
        <button type="button" disabled={busy || !canUndo} onClick={onUndo} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-800 dark:text-gray-100">Undo last run</button>
      </div>
    </div>
  )
}
