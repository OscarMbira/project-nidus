/**
 * v1343 (PRD A2) — flag a timesheet entry for the approver: one or more reasons from the
 * managed catalogue + an optional note. Advisory: the approver still decides.
 * Presentational: the page loads the reasons and saves through timesheetFlagService.
 */
import { useState } from 'react'
import Modal from './Modal'
import FieldLabelWithHelp from './FieldLabelWithHelp.jsx'

/**
 * @param {{ open: boolean, entryLabel?: string, reasons: Array<{id: string, name: string, description?: string}>,
 *   saving?: boolean, onSubmit: (reasonIds: string[], note: string) => void, onClose: () => void }} props
 */
export default function TimesheetFlagDialog({ open, entryLabel = '', reasons = [], saving = false, onSubmit, onClose }) {
  const [picked, setPicked] = useState([])
  const [note, setNote] = useState('')
  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  const close = () => { setPicked([]); setNote(''); onClose?.() }
  const submit = () => { if (picked.length) onSubmit?.(picked, note.trim()) }

  return (
    <Modal
      isOpen={open}
      onClose={close}
      title={entryLabel ? `Flag entry — ${entryLabel}` : 'Flag entry'}
      size="md"
      footer={(
        <div className="flex justify-end gap-2">
          <button type="button" onClick={close}
            className="rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-1.5 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800">
            Cancel
          </button>
          <button type="button" onClick={submit} disabled={!picked.length || saving}
            className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50">
            {saving ? 'Flagging…' : 'Flag for approver'}
          </button>
        </div>
      )}
    >
      <p className="text-sm text-gray-600 dark:text-slate-300 mb-3">
        The approver sees the flag before deciding. It does not stop them approving or rejecting.
      </p>
      <fieldset>
        <legend className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">Reasons</legend>
        {reasons.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-slate-400">No flag reasons are set up yet. A PMO Admin can add them in Timesheet Review Reasons › Flag reasons.</p>
        ) : (
          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {reasons.map((r) => (
              <label data-help="exempt" key={r.id} className="flex items-start gap-2 text-sm text-gray-800 dark:text-slate-200 cursor-pointer">
                <input type="checkbox" className="mt-0.5" checked={picked.includes(r.id)} onChange={() => toggle(r.id)} />
                <span>
                  {r.name}
                  {r.description && <span className="block text-xs text-gray-500 dark:text-slate-400">{r.description}</span>}
                </span>
              </label>
            ))}
          </div>
        )}
      </fieldset>
      <FieldLabelWithHelp helpKey="public.timesheet_entry_flags.note" htmlFor="timesheet-flag-note" className="block mt-4 text-sm font-medium text-gray-700 dark:text-slate-200">
        Note <span className="font-normal text-gray-500 dark:text-slate-400">(optional)</span>
      </FieldLabelWithHelp>
      <textarea id="timesheet-flag-note" value={note} onChange={(e) => setNote(e.target.value)} rows={3}
        className="mt-1 w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none" />
    </Modal>
  )
}
