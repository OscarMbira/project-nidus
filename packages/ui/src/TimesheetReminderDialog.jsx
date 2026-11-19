/**
 * v1343 (PRD A2) — send a timesheet reminder for a period. Lists the members with no entry
 * ("No time logged") or with draft entries; everyone is ticked by default and can be unticked.
 * Presentational: the page loads candidates (timesheetFlagService.loadReminderCandidates) and
 * sends through the app's sendTimesheetReminders.
 */
import { useState } from 'react'
import Modal from './Modal'

/**
 * @param {{ open: boolean, periodStart: string, periodEnd: string,
 *   onPeriodChange: (p: {periodStart: string, periodEnd: string}) => void,
 *   candidates: Array<{userId: string, name: string, email?: string|null, state: 'missing'|'draft', draftCount: number}>,
 *   loading?: boolean, sending?: boolean, error?: string,
 *   onSend: (selected: object[]) => void, onClose: () => void }} props
 */
export default function TimesheetReminderDialog({
  open, periodStart, periodEnd, onPeriodChange, candidates = [], loading = false, sending = false, error = '', onSend, onClose,
}) {
  // Everyone is ticked by default; remember only who was unticked.
  const [unticked, setUnticked] = useState(() => new Set())
  const toggle = (id) => setUnticked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const chosen = candidates.filter((c) => !unticked.has(c.userId))
  const close = () => { setUnticked(new Set()); onClose?.() }
  const input = 'rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1.5 text-sm text-gray-900 dark:text-slate-100'

  return (
    <Modal
      isOpen={open}
      onClose={close}
      title="Send timesheet reminder"
      size="lg"
      footer={(
        <div className="flex justify-end gap-2">
          <button type="button" onClick={close}
            className="rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-1.5 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800">
            Cancel
          </button>
          <button type="button" onClick={() => onSend?.(chosen)} disabled={!chosen.length || sending || loading}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {sending ? 'Sending…' : `Send to ${chosen.length}`}
          </button>
        </div>
      )}
    >
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <label className="text-sm text-gray-700 dark:text-slate-200">
          From
          <input type="date" value={periodStart} max={periodEnd} className={`block mt-1 ${input}`}
            onChange={(e) => onPeriodChange?.({ periodStart: e.target.value, periodEnd })} />
        </label>
        <label className="text-sm text-gray-700 dark:text-slate-200">
          To
          <input type="date" value={periodEnd} min={periodStart} className={`block mt-1 ${input}`}
            onChange={(e) => onPeriodChange?.({ periodStart, periodEnd: e.target.value })} />
        </label>
        <p className="text-xs text-gray-500 dark:text-slate-400 pb-2">In-app notification and email to each person ticked.</p>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-3" role="alert">{error}</p>}
      {loading ? (
        <p className="text-sm text-gray-500 dark:text-slate-400">Checking who still needs to log time…</p>
      ) : candidates.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-slate-400">Everyone on this project has submitted time for this period.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-slate-700">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 text-xs uppercase">
              <tr>
                <th className="px-3 py-2 w-8"><span className="sr-only">Send</span></th>
                <th className="px-3 py-2 text-left">Member</th>
                <th className="px-3 py-2 text-left">Why</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
              {candidates.map((c) => (
                <tr key={c.userId} className="text-gray-800 dark:text-slate-200">
                  <td className="px-3 py-2">
                    <input type="checkbox" aria-label={`Remind ${c.name}`} checked={!unticked.has(c.userId)} onChange={() => toggle(c.userId)} />
                  </td>
                  <td className="px-3 py-2">
                    {c.name}
                    {!c.email && <span className="block text-xs text-gray-500 dark:text-slate-400">No email — in-app only</span>}
                  </td>
                  <td className="px-3 py-2">
                    {c.state === 'missing' ? 'No time logged' : `${c.draftCount} draft ${c.draftCount === 1 ? 'entry' : 'entries'}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  )
}
